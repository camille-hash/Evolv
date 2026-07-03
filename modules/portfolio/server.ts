import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  PortfolioByAdministrator,
  PortfolioByStatus,
  PortfolioClient,
  PortfolioClientFilters,
  PortfolioSummary,
  PortfolioSummaryResponse,
} from "./types";

type PortfolioProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type ClientRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
  status: string | null;
};

type ContractRow = {
  administrator_id: string | null;
  client_id: string | null;
  created_at: string | null;
  credit_amount: number | string | null;
  id: string;
  organization_id: string | null;
  status: string | null;
  updated_at: string | null;
};

type RevenueEntryRow = {
  actual_amount: number | string | null;
  client_id: string | null;
  contract_id: string | null;
  expected_amount: number | string | null;
  organization_id: string | null;
  status: string | null;
};

type AdministratorRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
};

type RequestContext = {
  profile: PortfolioProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerPortfolioSupabaseClient>;
  user: SupabaseUser;
};

type PortfolioDataset = {
  administrators: AdministratorRow[];
  clients: ClientRow[];
  contracts: ContractRow[];
  revenueEntries: RevenueEntryRow[];
};

export type PortfolioSummaryResult =
  | ({ ok: true } & PortfolioSummaryResponse)
  | { error: string; ok: false; status: number };

export type PortfolioClientsResult =
  | { clients: PortfolioClient[]; ok: true }
  | { error: string; ok: false; status: number };

export type PortfolioAdministratorsResult =
  | { administrators: PortfolioByAdministrator[]; ok: true }
  | { error: string; ok: false; status: number };

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function getPortfolioSummary(
  accessToken: string | null,
): Promise<PortfolioSummaryResult> {
  const context = await resolvePortfolioRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const dataset = await loadPortfolioDataset(context);

  if (!dataset.ok) {
    return dataset;
  }

  const summary = buildPortfolioSummary(dataset);
  const byAdministrator = buildPortfolioByAdministrator(dataset);
  const byStatus = buildPortfolioByStatus(dataset);
  const topClients = buildPortfolioClients(dataset)
    .sort((left, right) => right.totalCreditAmount - left.totalCreditAmount)
    .slice(0, 10);

  return {
    byAdministrator,
    byStatus,
    ok: true,
    summary,
    topClients,
  };
}

export async function listPortfolioClients(
  accessToken: string | null,
  filters: PortfolioClientFilters,
): Promise<PortfolioClientsResult> {
  const context = await resolvePortfolioRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const dataset = await loadPortfolioDataset(context);

  if (!dataset.ok) {
    return dataset;
  }

  const normalizedFilters = normalizePortfolioClientFilters(filters);
  const filteredClients = dataset.clients.filter((client) => {
    if (normalizedFilters.status && client.status !== normalizedFilters.status) {
      return false;
    }

    if (!normalizedFilters.search) {
      return true;
    }

    return normalizeText(client.name)
      .toLowerCase()
      .includes(normalizedFilters.search.toLowerCase());
  });
  const filteredDataset: PortfolioDataset = {
    ...dataset,
    clients: filteredClients,
  };

  return {
    clients: buildPortfolioClients(filteredDataset)
      .sort((left, right) => right.totalCreditAmount - left.totalCreditAmount)
      .slice(
        normalizedFilters.offset,
        normalizedFilters.offset + normalizedFilters.limit,
      ),
    ok: true,
  };
}

export async function listPortfolioAdministrators(
  accessToken: string | null,
): Promise<PortfolioAdministratorsResult> {
  const context = await resolvePortfolioRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const dataset = await loadPortfolioDataset(context);

  if (!dataset.ok) {
    return dataset;
  }

  return {
    administrators: buildPortfolioByAdministrator(dataset),
    ok: true,
  };
}

function buildPortfolioSummary(dataset: PortfolioDataset): PortfolioSummary {
  const initialSummary: PortfolioSummary = {
    activeContractsCount: 0,
    activeCreditAmount: 0,
    cancelledContractsCount: 0,
    cancelledRevenueAmount: 0,
    clientsCount: dataset.clients.length,
    completedContractsCount: 0,
    contractsCount: dataset.contracts.length,
    draftContractsCount: 0,
    expectedRevenueAmount: 0,
    overdueRevenueAmount: 0,
    paidRevenueAmount: 0,
    pendingRevenueAmount: 0,
    totalCreditAmount: 0,
  };

  const contractSummary = dataset.contracts.reduce(
    (summary, contract) => {
      const creditAmount = normalizeNumber(contract.credit_amount) ?? 0;
      const status = normalizeText(contract.status) || "draft";

      summary.totalCreditAmount = roundCurrency(
        summary.totalCreditAmount + creditAmount,
      );

      if (status === "active") {
        summary.activeContractsCount += 1;
        summary.activeCreditAmount = roundCurrency(
          summary.activeCreditAmount + creditAmount,
        );
      }

      if (status === "draft") {
        summary.draftContractsCount += 1;
      }

      if (status === "cancelled") {
        summary.cancelledContractsCount += 1;
      }

      if (status === "completed") {
        summary.completedContractsCount += 1;
      }

      return summary;
    },
    { ...initialSummary },
  );

  return dataset.revenueEntries.reduce((summary, revenueEntry) => {
    applyRevenueAmount(summary, revenueEntry);

    return summary;
  }, contractSummary);
}

function buildPortfolioByAdministrator(
  dataset: PortfolioDataset,
): PortfolioByAdministrator[] {
  const administratorsById = new Map(
    dataset.administrators.map((administrator) => [
      administrator.id,
      normalizeText(administrator.name) || "Administradora sem nome",
    ]),
  );
  const entriesByContractId = groupRevenueEntriesByContractId(
    dataset.revenueEntries,
  );
  const groups = new Map<string, PortfolioByAdministrator>();

  for (const contract of dataset.contracts) {
    const groupKey = contract.administrator_id ?? "without-administrator";
    const group =
      groups.get(groupKey) ??
      createAdministratorGroup(
        contract.administrator_id,
        contract.administrator_id
          ? administratorsById.get(contract.administrator_id) ??
              "Administradora nao encontrada"
          : "Sem administradora",
      );
    const creditAmount = normalizeNumber(contract.credit_amount) ?? 0;

    group.contractsCount += 1;
    group.totalCreditAmount = roundCurrency(
      group.totalCreditAmount + creditAmount,
    );

    if (contract.status === "active") {
      group.activeContractsCount += 1;
    }

    for (const entry of entriesByContractId.get(contract.id) ?? []) {
      if (entry.status === "expected") {
        group.expectedRevenueAmount = roundCurrency(
          group.expectedRevenueAmount +
            (normalizeNumber(entry.expected_amount) ?? 0),
        );
      }

      if (entry.status === "paid") {
        group.paidRevenueAmount = roundCurrency(
          group.paidRevenueAmount + getPaidRevenueAmount(entry),
        );
      }
    }

    groups.set(groupKey, group);
  }

  return Array.from(groups.values()).sort(
    (left, right) => right.totalCreditAmount - left.totalCreditAmount,
  );
}

function buildPortfolioByStatus(dataset: PortfolioDataset): PortfolioByStatus[] {
  const entriesByContractId = groupRevenueEntriesByContractId(
    dataset.revenueEntries,
  );
  const groups = new Map<string, PortfolioByStatus>();

  for (const contract of dataset.contracts) {
    const status = normalizeText(contract.status) || "draft";
    const group =
      groups.get(status) ??
      ({
        contractsCount: 0,
        expectedRevenueAmount: 0,
        status,
        totalCreditAmount: 0,
      } satisfies PortfolioByStatus);

    group.contractsCount += 1;
    group.totalCreditAmount = roundCurrency(
      group.totalCreditAmount + (normalizeNumber(contract.credit_amount) ?? 0),
    );

    for (const entry of entriesByContractId.get(contract.id) ?? []) {
      if (entry.status === "expected") {
        group.expectedRevenueAmount = roundCurrency(
          group.expectedRevenueAmount +
            (normalizeNumber(entry.expected_amount) ?? 0),
        );
      }
    }

    groups.set(status, group);
  }

  return Array.from(groups.values()).sort((left, right) =>
    left.status.localeCompare(right.status),
  );
}

function buildPortfolioClients(dataset: PortfolioDataset): PortfolioClient[] {
  const contractsByClientId = groupContractsByClientId(dataset.contracts);
  const entriesByContractId = groupRevenueEntriesByContractId(
    dataset.revenueEntries,
  );

  return dataset.clients.map((client) => {
    const contracts = contractsByClientId.get(client.id) ?? [];
    const portfolioClient = contracts.reduce<PortfolioClient>(
      (summary, contract) => {
        const creditAmount = normalizeNumber(contract.credit_amount) ?? 0;

        summary.contractsCount += 1;
        summary.totalCreditAmount = roundCurrency(
          summary.totalCreditAmount + creditAmount,
        );

        if (contract.status === "active") {
          summary.activeContractsCount += 1;
        }

        summary.lastContractAt = pickLatestDate(
          summary.lastContractAt,
          contract.updated_at ?? contract.created_at,
        );

        for (const entry of entriesByContractId.get(contract.id) ?? []) {
          if (entry.status === "expected") {
            summary.expectedRevenueAmount = roundCurrency(
              summary.expectedRevenueAmount +
                (normalizeNumber(entry.expected_amount) ?? 0),
            );
          }

          if (entry.status === "paid") {
            summary.paidRevenueAmount = roundCurrency(
              summary.paidRevenueAmount + getPaidRevenueAmount(entry),
            );
          }
        }

        return summary;
      },
      {
        activeContractsCount: 0,
        clientId: client.id,
        clientName: normalizeText(client.name) || "Cliente sem nome",
        contractsCount: 0,
        expectedRevenueAmount: 0,
        lastContractAt: null,
        paidRevenueAmount: 0,
        totalCreditAmount: 0,
      },
    );

    return portfolioClient;
  });
}

async function loadPortfolioDataset(context: RequestContext) {
  const [
    clientsResult,
    contractsResult,
    revenueEntriesResult,
    administratorsResult,
  ] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, organization_id, name, status")
      .eq("organization_id", context.profile.organization_id),
    context.supabase
      .from("contracts")
      .select(
        [
          "id",
          "organization_id",
          "client_id",
          "administrator_id",
          "status",
          "credit_amount",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .eq("organization_id", context.profile.organization_id),
    context.supabase
      .from("revenue_entries")
      .select(
        [
          "organization_id",
          "contract_id",
          "client_id",
          "status",
          "expected_amount",
          "actual_amount",
        ].join(","),
      )
      .eq("organization_id", context.profile.organization_id),
    context.supabase
      .from("administrators")
      .select("id, organization_id, name")
      .eq("organization_id", context.profile.organization_id),
  ]);

  if (
    clientsResult.error ||
    contractsResult.error ||
    revenueEntriesResult.error ||
    administratorsResult.error
  ) {
    return {
      error: "Nao foi possivel carregar a carteira.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    administrators: (
      (administratorsResult.data ?? []) as unknown as AdministratorRow[]
    ).filter(
      (administrator) =>
        administrator.organization_id === context.profile.organization_id,
    ),
    clients: ((clientsResult.data ?? []) as unknown as ClientRow[]).filter(
      (client) => client.organization_id === context.profile.organization_id,
    ),
    contracts: ((contractsResult.data ?? []) as unknown as ContractRow[]).filter(
      (contract) => contract.organization_id === context.profile.organization_id,
    ),
    ok: true as const,
    revenueEntries: (
      (revenueEntriesResult.data ?? []) as unknown as RevenueEntryRow[]
    ).filter(
      (revenueEntry) =>
        revenueEntry.organization_id === context.profile.organization_id,
    ),
  };
}

function createServerPortfolioSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase portfolio server environment is not configured.");
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

async function resolvePortfolioRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerPortfolioSupabaseClient(accessToken);
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
      .maybeSingle<PortfolioProfile>();

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

function applyRevenueAmount(
  summary: PortfolioSummary,
  revenueEntry: RevenueEntryRow,
) {
  const expectedAmount = normalizeNumber(revenueEntry.expected_amount) ?? 0;

  if (revenueEntry.status === "expected") {
    summary.expectedRevenueAmount = roundCurrency(
      summary.expectedRevenueAmount + expectedAmount,
    );
  }

  if (revenueEntry.status === "pending") {
    summary.pendingRevenueAmount = roundCurrency(
      summary.pendingRevenueAmount + expectedAmount,
    );
  }

  if (revenueEntry.status === "paid") {
    summary.paidRevenueAmount = roundCurrency(
      summary.paidRevenueAmount + getPaidRevenueAmount(revenueEntry),
    );
  }

  if (revenueEntry.status === "overdue") {
    summary.overdueRevenueAmount = roundCurrency(
      summary.overdueRevenueAmount + expectedAmount,
    );
  }

  if (revenueEntry.status === "cancelled") {
    summary.cancelledRevenueAmount = roundCurrency(
      summary.cancelledRevenueAmount + expectedAmount,
    );
  }
}

function createAdministratorGroup(
  administratorId: string | null,
  administratorName: string,
): PortfolioByAdministrator {
  return {
    activeContractsCount: 0,
    administratorId,
    administratorName,
    contractsCount: 0,
    expectedRevenueAmount: 0,
    paidRevenueAmount: 0,
    totalCreditAmount: 0,
  };
}

function groupContractsByClientId(contracts: ContractRow[]) {
  const groupedContracts = new Map<string, ContractRow[]>();

  for (const contract of contracts) {
    if (!contract.client_id) {
      continue;
    }

    groupedContracts.set(contract.client_id, [
      ...(groupedContracts.get(contract.client_id) ?? []),
      contract,
    ]);
  }

  return groupedContracts;
}

function groupRevenueEntriesByContractId(revenueEntries: RevenueEntryRow[]) {
  const groupedEntries = new Map<string, RevenueEntryRow[]>();

  for (const entry of revenueEntries) {
    if (!entry.contract_id) {
      continue;
    }

    groupedEntries.set(entry.contract_id, [
      ...(groupedEntries.get(entry.contract_id) ?? []),
      entry,
    ]);
  }

  return groupedEntries;
}

function getPaidRevenueAmount(revenueEntry: RevenueEntryRow) {
  return (
    normalizeNumber(revenueEntry.actual_amount) ??
    normalizeNumber(revenueEntry.expected_amount) ??
    0
  );
}

function normalizePortfolioClientFilters(filters: PortfolioClientFilters) {
  return {
    limit: Math.min(Math.max(filters.limit ?? 50, 1), 100),
    offset: Math.max(filters.offset ?? 0, 0),
    search: normalizeNullableText(filters.search),
    status: normalizeNullableText(filters.status),
  };
}

function pickLatestDate(current: string | null, candidate: string | null) {
  if (!candidate) {
    return current;
  }

  if (!current) {
    return candidate;
  }

  return new Date(candidate).getTime() > new Date(current).getTime()
    ? candidate
    : current;
}

function isValidProfile(
  profile: PortfolioProfile | null,
): profile is PortfolioProfile & {
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

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeNumber(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizeText(value: unknown) {
  return normalizeNullableText(value) ?? "";
}
