import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  OperationsSearchCategory,
  OperationsSearchGroup,
  OperationsSearchItem,
  OperationsSearchResponse,
} from "./search-types";

type OperationsSearchProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type RequestContext = {
  profile: OperationsSearchProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerOperationsSearchSupabaseClient>;
  user: SupabaseUser;
};

type ClientRow = {
  email: string | null;
  id: string;
  name: string | null;
  organization_id: string | null;
  phone: string | null;
};

type AdministratorRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
};

type ContractRow = {
  administrator_id: string | null;
  client_id: string | null;
  contract_number: string | null;
  id: string;
  organization_id: string | null;
  status: string | null;
};

type ExpectedRevenueEntryRow = {
  business_status: string | null;
  cancelled_at: string | null;
  contract_id: string | null;
  expected_amount: number | string | null;
  expected_date: string | null;
  id: string;
  lifecycle: string | null;
  organization_id: string | null;
};

type RecognizedRevenueEntryRow = {
  expected_revenue_entry_id: string | null;
  id: string;
  organization_id: string | null;
  recognized_amount: number | string | null;
  recognized_at: string | null;
  reversed_at: string | null;
};

type SearchDataset = {
  administrators: AdministratorRow[];
  clients: ClientRow[];
  contracts: ContractRow[];
  expectedRevenueEntries: ExpectedRevenueEntryRow[];
  recognizedRevenueEntries: RecognizedRevenueEntryRow[];
};

export type OperationsSearchResult =
  | ({ ok: true } & OperationsSearchResponse)
  | { error: string; ok: false; status: number };

const genericAccessError =
  "Nao foi possivel concluir a pesquisa operacional. Entre em contato com o administrador.";

const minSearchLength = 2;
const maxResultsPerCategory = 5;

const groupLabels: Record<OperationsSearchCategory, string> = {
  administrators: "Administradoras",
  clients: "Clientes",
  contracts: "Contratos",
  receipts: "Recebimentos",
  revenues: "Receitas",
};

export async function searchOperationsWorkspace(
  accessToken: string | null,
  rawQuery: string,
): Promise<OperationsSearchResult> {
  const query = normalizeNullableText(rawQuery) ?? "";

  if (query.length < minSearchLength) {
    return {
      groups: [],
      ok: true,
      query,
      totalResults: 0,
    };
  }

  const context = await resolveOperationsSearchRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const dataset = await loadSearchDataset(context, query);

  if (!dataset.ok) {
    return dataset;
  }

  const groups = buildSearchGroups(dataset, query);

  return {
    groups,
    ok: true,
    query,
    totalResults: groups.reduce((total, group) => total + group.items.length, 0),
  };
}

async function loadSearchDataset(context: RequestContext, query: string) {
  const queryPattern = `%${escapeLikePattern(query)}%`;
  const clientsPromise = context.supabase
    .from("clients")
    .select("id, organization_id, name, email, phone")
    .eq("organization_id", context.profile.organization_id)
    .or(
      `name.ilike.${queryPattern},email.ilike.${queryPattern},phone.ilike.${queryPattern}`,
    )
    .limit(maxResultsPerCategory);
  const administratorsPromise = context.supabase
    .from("administrators")
    .select("id, organization_id, name")
    .eq("organization_id", context.profile.organization_id)
    .ilike("name", queryPattern)
    .limit(maxResultsPerCategory);
  const directContractsPromise = context.supabase
    .from("contracts")
    .select("id, organization_id, contract_number, status, client_id, administrator_id")
    .eq("organization_id", context.profile.organization_id)
    .ilike("contract_number", queryPattern)
    .limit(maxResultsPerCategory);

  const [clientsResult, administratorsResult, directContractsResult] =
    await Promise.all([
      clientsPromise,
      administratorsPromise,
      directContractsPromise,
    ]);

  if (
    clientsResult.error ||
    administratorsResult.error ||
    directContractsResult.error
  ) {
    return {
      error: "Nao foi possivel carregar a busca operacional.",
      ok: false as const,
      status: 500,
    };
  }

  const clients = ((clientsResult.data ?? []) as unknown as ClientRow[]).filter(
    (client) => client.organization_id === context.profile.organization_id,
  );
  const administrators = (
    (administratorsResult.data ?? []) as unknown as AdministratorRow[]
  ).filter(
    (administrator) =>
      administrator.organization_id === context.profile.organization_id,
  );
  const directContracts = (
    (directContractsResult.data ?? []) as unknown as ContractRow[]
  ).filter(
    (contract) => contract.organization_id === context.profile.organization_id,
  );

  const relatedContractIds = new Set<string>();
  const clientIds = clients.map((client) => client.id);
  const administratorIds = administrators.map((administrator) => administrator.id);

  const relatedContractQueries = [];

  if (clientIds.length > 0) {
    relatedContractQueries.push(
      context.supabase
        .from("contracts")
        .select(
          "id, organization_id, contract_number, status, client_id, administrator_id",
        )
        .eq("organization_id", context.profile.organization_id)
        .in("client_id", clientIds)
        .limit(maxResultsPerCategory),
    );
  }

  if (administratorIds.length > 0) {
    relatedContractQueries.push(
      context.supabase
        .from("contracts")
        .select(
          "id, organization_id, contract_number, status, client_id, administrator_id",
        )
        .eq("organization_id", context.profile.organization_id)
        .in("administrator_id", administratorIds)
        .limit(maxResultsPerCategory),
    );
  }

  const relatedContractResults = relatedContractQueries.length
    ? await Promise.all(relatedContractQueries)
    : [];

  if (relatedContractResults.some((result) => result.error)) {
    return {
      error: "Nao foi possivel carregar contratos relacionados para a busca.",
      ok: false as const,
      status: 500,
    };
  }

  const contractsById = new Map<string, ContractRow>();

  for (const contract of directContracts) {
    contractsById.set(contract.id, contract);
    relatedContractIds.add(contract.id);
  }

  for (const result of relatedContractResults) {
    for (const contract of (result.data ?? []) as unknown as ContractRow[]) {
      if (contract.organization_id !== context.profile.organization_id) {
        continue;
      }

      contractsById.set(contract.id, contract);
      relatedContractIds.add(contract.id);
    }
  }

  const contractIds = [...relatedContractIds].slice(0, maxResultsPerCategory * 3);

  if (contractIds.length === 0) {
    return {
      administrators,
      clients,
      contracts: [...contractsById.values()],
      expectedRevenueEntries: [],
      ok: true as const,
      recognizedRevenueEntries: [],
    };
  }

  const [expectedRevenueResult, recognizedBridgeResult] = await Promise.all([
    context.supabase
      .from("expected_revenue_entries")
      .select(
        "id, organization_id, contract_id, expected_amount, expected_date, cancelled_at, lifecycle, business_status",
      )
      .eq("organization_id", context.profile.organization_id)
      .in("contract_id", contractIds)
      .limit(maxResultsPerCategory * 6),
    context.supabase
      .from("expected_revenue_entries")
      .select("id")
      .eq("organization_id", context.profile.organization_id)
      .in("contract_id", contractIds)
      .limit(maxResultsPerCategory * 12),
  ]);

  if (expectedRevenueResult.error || recognizedBridgeResult.error) {
    return {
      error: "Nao foi possivel carregar receitas relacionadas para a busca.",
      ok: false as const,
      status: 500,
    };
  }

  const expectedRevenueEntries = (
    (expectedRevenueResult.data ?? []) as unknown as ExpectedRevenueEntryRow[]
  ).filter((entry) => entry.organization_id === context.profile.organization_id);

  const expectedRevenueIds = ((recognizedBridgeResult.data ?? []) as Array<{ id: string }>)
    .map((entry) => entry.id)
    .slice(0, maxResultsPerCategory * 12);

  const recognizedRevenueResult = expectedRevenueIds.length
    ? await context.supabase
        .from("recognized_revenue_entries")
        .select(
          "id, organization_id, expected_revenue_entry_id, recognized_amount, recognized_at, reversed_at",
        )
        .eq("organization_id", context.profile.organization_id)
        .in("expected_revenue_entry_id", expectedRevenueIds)
        .is("reversed_at", null)
        .limit(maxResultsPerCategory * 6)
    : { data: [], error: null };

  if (recognizedRevenueResult.error) {
    return {
      error: "Nao foi possivel carregar recebimentos relacionados para a busca.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    administrators,
    clients,
    contracts: [...contractsById.values()],
    expectedRevenueEntries,
    ok: true as const,
    recognizedRevenueEntries: (
      (recognizedRevenueResult.data ?? []) as unknown as RecognizedRevenueEntryRow[]
    ).filter(
      (entry) => entry.organization_id === context.profile.organization_id,
    ),
  };
}

function buildSearchGroups(dataset: SearchDataset, query: string) {
  const clientsById = new Map(dataset.clients.map((client) => [client.id, client]));
  const administratorsById = new Map(
    dataset.administrators.map((administrator) => [administrator.id, administrator]),
  );
  const contractsById = new Map(
    dataset.contracts.map((contract) => [contract.id, contract]),
  );
  const expectedRevenueById = new Map(
    dataset.expectedRevenueEntries.map((entry) => [entry.id, entry]),
  );
  const normalizedQuery = normalizeSearchValue(query);

  const clientItems = rankItems(
    dataset.clients.map((client) => ({
      item: buildClientSearchItem(client),
      searchText: [
        client.name,
        client.email,
        client.phone,
      ].join(" "),
    })),
    normalizedQuery,
  );

  const administratorItems = rankItems(
    dataset.administrators.map((administrator) => ({
      item: buildAdministratorSearchItem(administrator),
      searchText: administrator.name ?? "",
    })),
    normalizedQuery,
  );

  const contractItems = rankItems(
    dataset.contracts.map((contract) => ({
      item: buildContractSearchItem({
        administrator: contract.administrator_id
          ? administratorsById.get(contract.administrator_id) ?? null
          : null,
        client: contract.client_id ? clientsById.get(contract.client_id) ?? null : null,
        contract,
      }),
      searchText: [
        contract.contract_number,
        contract.status,
        contract.client_id ? clientsById.get(contract.client_id)?.name : null,
        contract.administrator_id
          ? administratorsById.get(contract.administrator_id)?.name
          : null,
      ].join(" "),
    })),
    normalizedQuery,
  );

  const revenueItems = rankItems(
    dataset.expectedRevenueEntries
      .filter((entry) => !isCancelledExpectedRevenue(entry))
      .map((entry) => {
        const contract = entry.contract_id
          ? contractsById.get(entry.contract_id) ?? null
          : null;
        const client = contract?.client_id
          ? clientsById.get(contract.client_id) ?? null
          : null;
        const administrator = contract?.administrator_id
          ? administratorsById.get(contract.administrator_id) ?? null
          : null;

        return {
          item: buildRevenueSearchItem({
            administrator,
            client,
            contract,
            entry,
          }),
          searchText: [
            entry.expected_date,
            contract?.contract_number,
            client?.name,
            administrator?.name,
          ].join(" "),
        };
      }),
    normalizedQuery,
  );

  const receiptItems = rankItems(
    dataset.recognizedRevenueEntries.map((recognizedEntry) => {
      const expectedEntry = recognizedEntry.expected_revenue_entry_id
        ? expectedRevenueById.get(recognizedEntry.expected_revenue_entry_id) ?? null
        : null;
      const contract =
        expectedEntry?.contract_id
          ? contractsById.get(expectedEntry.contract_id) ?? null
          : null;
      const client = contract?.client_id
        ? clientsById.get(contract.client_id) ?? null
        : null;
      const administrator = contract?.administrator_id
        ? administratorsById.get(contract.administrator_id) ?? null
        : null;

      return {
        item: buildReceiptSearchItem({
          administrator,
          client,
          contract,
          expectedEntry,
          recognizedEntry,
        }),
        searchText: [
          recognizedEntry.recognized_at,
          contract?.contract_number,
          client?.name,
          administrator?.name,
        ].join(" "),
      };
    }),
    normalizedQuery,
  );

  return (
    [
      createGroup("clients", clientItems),
      createGroup("contracts", contractItems),
      createGroup("administrators", administratorItems),
      createGroup("revenues", revenueItems),
      createGroup("receipts", receiptItems),
    ] satisfies OperationsSearchGroup[]
  ).filter((group) => group.items.length > 0);
}

function createGroup(
  id: OperationsSearchCategory,
  items: OperationsSearchItem[],
): OperationsSearchGroup {
  return {
    id,
    items: items.slice(0, maxResultsPerCategory),
    label: groupLabels[id],
  };
}

function rankItems(
  items: Array<{ item: OperationsSearchItem; searchText: string }>,
  normalizedQuery: string,
) {
  return items
    .map(({ item, searchText }) => ({
      item,
      score: calculateMatchScore(searchText, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.item);
}

function calculateMatchScore(searchText: string, normalizedQuery: string) {
  const normalizedText = normalizeSearchValue(searchText);

  if (!normalizedText || !normalizedQuery) {
    return 0;
  }

  if (normalizedText === normalizedQuery) {
    return 400;
  }

  if (normalizedText.startsWith(normalizedQuery)) {
    return 300;
  }

  if (normalizedText.includes(` ${normalizedQuery}`)) {
    return 220;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return 160;
  }

  return 0;
}

function buildClientSearchItem(client: ClientRow): OperationsSearchItem {
  return {
    href: `/operations/clients?clientId=${encodeURIComponent(client.id)}&origem=busca`,
    id: client.id,
    identifier: client.phone ?? client.email ?? undefined,
    subtitle: [normalizeNullableText(client.email), normalizeNullableText(client.phone)]
      .filter(Boolean)
      .join(" | ") || "Cliente operacional",
    title: normalizeNullableText(client.name) ?? "Cliente sem nome",
    type: "clients",
  };
}

function buildAdministratorSearchItem(
  administrator: AdministratorRow,
): OperationsSearchItem {
  return {
    href: `/operations/administrators?administratorId=${encodeURIComponent(administrator.id)}&origem=busca`,
    id: administrator.id,
    subtitle: "Administradora operacional",
    title: normalizeNullableText(administrator.name) ?? "Administradora sem nome",
    type: "administrators",
  };
}

function buildContractSearchItem(input: {
  administrator: AdministratorRow | null;
  client: ClientRow | null;
  contract: ContractRow;
}): OperationsSearchItem {
  const contractLabel = normalizeNullableText(input.contract.contract_number)
    ? `Contrato ${input.contract.contract_number}`
    : "Contrato sem numero";

  return {
    href: `/operations/contracts?contractId=${encodeURIComponent(input.contract.id)}&origem=busca`,
    id: input.contract.id,
    identifier: input.contract.contract_number ?? undefined,
    subtitle: [
      normalizeNullableText(input.client?.name) ?? "Cliente nao vinculado",
      normalizeNullableText(input.administrator?.name) ??
        "Administradora nao vinculada",
      normalizeNullableText(input.contract.status) ?? "sem situacao",
    ].join(" | "),
    title: contractLabel,
    type: "contracts",
  };
}

function buildRevenueSearchItem(input: {
  administrator: AdministratorRow | null;
  client: ClientRow | null;
  contract: ContractRow | null;
  entry: ExpectedRevenueEntryRow;
}): OperationsSearchItem {
  const contractNumber = normalizeNullableText(input.contract?.contract_number);
  const amount = formatCurrency(normalizeNumber(input.entry.expected_amount) ?? 0);
  const expectedDate = formatDate(input.entry.expected_date) ?? "sem vencimento";

  return {
    href: `/operations/revenue?entryId=${encodeURIComponent(input.entry.id)}&contractId=${encodeURIComponent(input.contract?.id ?? input.entry.contract_id ?? "")}&origem=busca`,
    id: input.entry.id,
    identifier: contractNumber ?? undefined,
    subtitle: [
      normalizeNullableText(input.client?.name) ?? "Cliente nao vinculado",
      normalizeNullableText(input.administrator?.name) ??
        "Administradora nao vinculada",
      `Vencimento ${expectedDate}`,
    ].join(" | "),
    title: `${amount} previsto${contractNumber ? ` no contrato ${contractNumber}` : ""}`,
    type: "revenues",
  };
}

function buildReceiptSearchItem(input: {
  administrator: AdministratorRow | null;
  client: ClientRow | null;
  contract: ContractRow | null;
  expectedEntry: ExpectedRevenueEntryRow | null;
  recognizedEntry: RecognizedRevenueEntryRow;
}): OperationsSearchItem {
  const contractNumber = normalizeNullableText(input.contract?.contract_number);
  const amount = formatCurrency(
    normalizeNumber(input.recognizedEntry.recognized_amount) ?? 0,
  );
  const recognizedAt =
    formatDate(input.recognizedEntry.recognized_at) ?? "data nao informada";

  return {
    href: `/operations/revenue?entryId=${encodeURIComponent(input.expectedEntry?.id ?? input.recognizedEntry.id)}&contractId=${encodeURIComponent(input.contract?.id ?? input.expectedEntry?.contract_id ?? "")}&origem=busca`,
    id: input.recognizedEntry.id,
    identifier: contractNumber ?? undefined,
    subtitle: [
      normalizeNullableText(input.client?.name) ?? "Cliente nao vinculado",
      normalizeNullableText(input.administrator?.name) ??
        "Administradora nao vinculada",
      `Recebido em ${recognizedAt}`,
    ].join(" | "),
    title: `${amount} recebido${contractNumber ? ` no contrato ${contractNumber}` : ""}`,
    type: "receipts",
  };
}

function isCancelledExpectedRevenue(entry: ExpectedRevenueEntryRow) {
  return Boolean(entry.cancelled_at || entry.lifecycle === "cancelada");
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizeSearchValue(value: unknown) {
  return (normalizeNullableText(value) ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function normalizeNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function escapeLikePattern(value: string) {
  return value.replace(/[%_,]/g, (character) => `\\${character}`);
}

function createServerOperationsSearchSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase operations search server environment is not configured.",
    );
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function resolveOperationsSearchRequestContext(
  accessToken: string | null,
) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerOperationsSearchSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Sessao invalida.",
        ok: false as const,
        status: 401,
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, organization_id, role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle<OperationsSearchProfile>();

    if (profileError || !isValidProfile(profile)) {
      return {
        error: "Perfil nao encontrado.",
        ok: false as const,
        status: 403,
      };
    }

    return {
      ok: true as const,
      profile,
      supabase,
      user: userData.user,
    };
  } catch {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 500,
    };
  }
}

function isValidProfile(
  profile: OperationsSearchProfile | null,
): profile is OperationsSearchProfile & {
  is_active: true;
  organization_id: string;
  role: "admin" | "master" | "sdr";
} {
  return Boolean(
    profile?.id &&
      profile.organization_id &&
      profile.is_active === true &&
      (profile.role === "admin" ||
        profile.role === "master" ||
        profile.role === "sdr"),
  );
}
