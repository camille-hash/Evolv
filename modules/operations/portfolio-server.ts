import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  OperationsPortfolioContractRow,
  OperationsPortfolioExposureRow,
  OperationsPortfolioExposureType,
  OperationsPortfolioResponse,
  OperationsPortfolioStatus,
} from "./portfolio-types";

type OperationsPortfolioProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type ContractRow = {
  administrator_id: string | null;
  client_id: string | null;
  contract_number: string | null;
  credit_amount: number | string | null;
  id: string;
  organization_id: string | null;
  status: string | null;
};

type ClientRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
};

type AdministratorRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
};

type RevenueEntryRow = {
  actual_amount: number | string | null;
  administrator_id: string | null;
  client_id: string | null;
  contract_id: string | null;
  expected_amount: number | string | null;
  organization_id: string | null;
  paid_at: string | null;
  status: string | null;
};

type ExpectedRevenueEntryRow = {
  business_status: string | null;
  cancelled_at: string | null;
  contract_id: string | null;
  expected_amount: number | string | null;
  id: string;
  lifecycle: string | null;
  organization_id: string | null;
};

type RecognizedRevenueEntryRow = {
  expected_revenue_entry_id: string | null;
  organization_id: string | null;
  recognized_amount: number | string | null;
  recognized_at: string | null;
  reversed_at: string | null;
};

type RequestContext = {
  profile: OperationsPortfolioProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerOperationsPortfolioSupabaseClient>;
  user: SupabaseUser;
};

type PortfolioDataset = {
  administrators: AdministratorRow[];
  clients: ClientRow[];
  contracts: ContractRow[];
  revenueEntries: RevenueEntryRow[];
};

type ExposureAccumulator = {
  attentionItems: Set<string>;
  contractsCount: number;
  estimatedRevenue: number;
  id: string;
  label: string;
  recognizedRevenue: number;
  totalCreditValue: number;
  type: OperationsPortfolioExposureType;
};

export type OperationsPortfolioResult =
  | ({ ok: true } & OperationsPortfolioResponse)
  | { error: string; ok: false; status: number };

const clientExposureThreshold = 50;
const administratorExposureThreshold = 60;
const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function getOperationsPortfolio(
  accessToken: string | null,
): Promise<OperationsPortfolioResult> {
  const context = await resolveOperationsPortfolioRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const dataset = await loadOperationsPortfolioDataset(context);

  if (!dataset.ok) {
    return dataset;
  }

  const contracts = buildPortfolioContractRows(dataset);
  const revenueByContractId = groupRevenueByContractId(dataset.revenueEntries);
  const activeContracts = dataset.contracts.filter(
    (contract) =>
      isOperationallyActivePortfolioContract(
        contract,
        revenueByContractId.get(contract.id) ?? [],
      ),
  );
  const totalPortfolioValue = roundCurrency(
    dataset.contracts.reduce(
      (total, contract) => total + (normalizeNumber(contract.credit_amount) ?? 0),
      0,
    ),
  );
  const activePortfolioValue = roundCurrency(
    activeContracts.reduce(
      (total, contract) => total + (normalizeNumber(contract.credit_amount) ?? 0),
      0,
    ),
  );
  const activeDataset = {
    ...dataset,
    contracts: activeContracts,
  };
  const clientExposures = buildExposureRows(
    activeDataset,
    "client",
    activePortfolioValue,
  );
  const administratorExposures = buildExposureRows(
    activeDataset,
    "administrator",
    activePortfolioValue,
  );
  const summary = buildPortfolioSummary({
    activeCreditValue: activePortfolioValue,
    administratorExposures,
    clientExposures,
    contracts,
    dataset,
    totalPortfolioValue,
  });

  return {
    administratorExposures,
    clientExposures,
    contracts,
    ok: true,
    summary,
  };
}

function buildPortfolioContractRows(
  dataset: PortfolioDataset,
): OperationsPortfolioContractRow[] {
  const clientsById = new Map(
    dataset.clients.map((client) => [
      client.id,
      normalizeText(client.name) || "Cliente sem nome",
    ]),
  );
  const administratorsById = new Map(
    dataset.administrators.map((administrator) => [
      administrator.id,
      normalizeText(administrator.name) || "Administradora sem nome",
    ]),
  );
  const revenueByContractId = groupRevenueByContractId(dataset.revenueEntries);

  return dataset.contracts
    .map((contract) => {
      const revenueEntries = revenueByContractId.get(contract.id) ?? [];
      const creditValue = normalizeNumber(contract.credit_amount) ?? 0;
      const estimatedRevenue = sumEstimatedRevenue(revenueEntries);
      const recognizedRevenue = sumRecognizedRevenue(revenueEntries);
      const attentionItems = buildContractAttentionItems({
        administratorId: contract.administrator_id,
        clientId: contract.client_id,
        creditValue,
        estimatedRevenue,
        recognizedRevenue,
      });

      return {
        administratorName: contract.administrator_id
          ? administratorsById.get(contract.administrator_id) ??
            "Administradora nao encontrada"
          : "Administradora nao vinculada",
        attentionItems,
        clientName: contract.client_id
          ? clientsById.get(contract.client_id) ?? "Cliente nao encontrado"
          : "Cliente nao vinculado",
        contractNumber:
          normalizeNullableText(contract.contract_number) ?? undefined,
        creditValue,
        estimatedRevenue,
        id: contract.id,
        recognizedRevenue,
      };
    })
    .sort((left, right) => right.creditValue - left.creditValue);
}

function buildExposureRows(
  dataset: PortfolioDataset,
  type: OperationsPortfolioExposureType,
  totalPortfolioValue: number,
): OperationsPortfolioExposureRow[] {
  const contractsById = new Map(dataset.contracts.map((contract) => [contract.id, contract]));
  const revenueByContractId = groupRevenueByContractId(dataset.revenueEntries);
  const labelsById =
    type === "client"
      ? new Map(
          dataset.clients.map((client) => [
            client.id,
            normalizeText(client.name) || "Cliente sem nome",
          ]),
        )
      : new Map(
          dataset.administrators.map((administrator) => [
            administrator.id,
            normalizeText(administrator.name) || "Administradora sem nome",
          ]),
        );
  const groups = new Map<string, ExposureAccumulator>();

  for (const contract of dataset.contracts) {
    const groupId =
      type === "client"
        ? contract.client_id ?? "without-client"
        : contract.administrator_id ?? "without-administrator";
    const label =
      type === "client"
        ? contract.client_id
          ? labelsById.get(contract.client_id) ?? "Cliente nao encontrado"
          : "Sem cliente"
        : contract.administrator_id
          ? labelsById.get(contract.administrator_id) ??
            "Administradora nao encontrada"
          : "Sem administradora";
    const group =
      groups.get(groupId) ??
      ({
        attentionItems: new Set<string>(),
        contractsCount: 0,
        estimatedRevenue: 0,
        id: groupId,
        label,
        recognizedRevenue: 0,
        totalCreditValue: 0,
        type,
      } satisfies ExposureAccumulator);
    const creditValue = normalizeNumber(contract.credit_amount) ?? 0;
    const revenueEntries = revenueByContractId.get(contract.id) ?? [];
    const estimatedRevenue = sumEstimatedRevenue(revenueEntries);
    const recognizedRevenue = sumRecognizedRevenue(revenueEntries);

    group.contractsCount += 1;
    group.totalCreditValue = roundCurrency(group.totalCreditValue + creditValue);
    group.estimatedRevenue = roundCurrency(
      group.estimatedRevenue + estimatedRevenue,
    );
    group.recognizedRevenue = roundCurrency(
      group.recognizedRevenue + recognizedRevenue,
    );

    for (const attentionItem of buildContractAttentionItems({
      administratorId: contract.administrator_id,
      clientId: contract.client_id,
      creditValue,
      estimatedRevenue,
      recognizedRevenue,
    })) {
      group.attentionItems.add(attentionItem);
    }

    if (!contractsById.has(contract.id)) {
      group.attentionItems.add("contract not found");
    }

    groups.set(groupId, group);
  }

  return Array.from(groups.values())
    .map((group) => {
      const exposurePercentage =
        totalPortfolioValue > 0
          ? roundPercentage((group.totalCreditValue / totalPortfolioValue) * 100)
          : 0;
      const threshold =
        group.type === "client"
          ? clientExposureThreshold
          : administratorExposureThreshold;
      const exposureAttentionItems = new Set(group.attentionItems);

      if (totalPortfolioValue === 0) {
        exposureAttentionItems.add("total portfolio value equals zero");
      }

      if (exposurePercentage > threshold) {
        exposureAttentionItems.add(
          group.type === "client"
            ? "largest client exposure above 50%"
            : "largest administrator exposure above 60%",
        );
      }

      return {
        attentionItems: Array.from(exposureAttentionItems),
        contractsCount: group.contractsCount,
        estimatedRevenue: group.estimatedRevenue,
        exposurePercentage,
        id: group.id,
        label: group.label,
        recognizedRevenue: group.recognizedRevenue,
        status: resolvePortfolioStatus({
          attentionItemsCount: exposureAttentionItems.size,
          exposurePercentage,
          threshold,
          totalPortfolioValue,
        }),
        totalCreditValue: group.totalCreditValue,
        type: group.type,
      };
    })
    .sort((left, right) => right.totalCreditValue - left.totalCreditValue);
}

function buildPortfolioSummary(input: {
  activeCreditValue: number;
  administratorExposures: OperationsPortfolioExposureRow[];
  clientExposures: OperationsPortfolioExposureRow[];
  contracts: OperationsPortfolioContractRow[];
  dataset: PortfolioDataset;
  totalPortfolioValue: number;
}): OperationsPortfolioResponse["summary"] {
  const largestClientExposurePercentage =
    input.clientExposures[0]?.exposurePercentage ?? 0;
  const largestAdministratorExposurePercentage =
    input.administratorExposures[0]?.exposurePercentage ?? 0;
  const attentionItems = new Set<string>();

  if (input.totalPortfolioValue === 0) {
    attentionItems.add("total portfolio value equals zero");
  }

  if (largestClientExposurePercentage > clientExposureThreshold) {
    attentionItems.add("largest client exposure above 50%");
  }

  if (largestAdministratorExposurePercentage > administratorExposureThreshold) {
    attentionItems.add("largest administrator exposure above 60%");
  }

  for (const contract of input.contracts) {
    for (const item of contract.attentionItems) {
      attentionItems.add(item);
    }
  }

  return {
    activeCreditValue: input.activeCreditValue,
    attentionItems: Array.from(attentionItems),
    estimatedRevenue: roundCurrency(
      input.contracts.reduce(
        (total, contract) => total + contract.estimatedRevenue,
        0,
      ),
    ),
    largestAdministratorExposurePercentage,
    largestClientExposurePercentage,
    recognizedRevenue: roundCurrency(
      input.contracts.reduce(
        (total, contract) => total + contract.recognizedRevenue,
        0,
      ),
    ),
    totalAdministrators: input.dataset.administrators.length,
    totalClients: input.dataset.clients.length,
    totalContracts: input.contracts.length,
    totalPortfolioValue: input.totalPortfolioValue,
  };
}

function buildContractAttentionItems(input: {
  administratorId: string | null;
  clientId: string | null;
  creditValue: number;
  estimatedRevenue: number;
  recognizedRevenue: number;
}) {
  const attentionItems: string[] = [];

  if (input.creditValue <= 0) {
    attentionItems.push("contract with zero credit value");
  }

  if (!input.clientId) {
    attentionItems.push("contract without client");
  }

  if (!input.administratorId) {
    attentionItems.push("contract without administrator");
  }

  if (input.recognizedRevenue > input.estimatedRevenue) {
    attentionItems.push("recognized revenue greater than estimated revenue");
  }

  return attentionItems;
}

function buildOperationalContractAttentionItems(input: {
  administratorId: string | null;
  clientId: string | null;
  contractNumber: string | null;
  creditValue: number;
  estimatedRevenue: number;
  recognizedRevenue: number;
  sourceStatus: string | null;
}) {
  const attentionItems: string[] = [];

  if (!input.clientId) {
    attentionItems.push("Missing linked client");
  }

  if (!input.administratorId) {
    attentionItems.push("Missing linked administrator");
  }

  if (!normalizeNullableText(input.contractNumber)) {
    attentionItems.push("Missing contract number");
  }

  if (
    input.estimatedRevenue <= 0 &&
    input.sourceStatus !== "inactive" &&
    input.sourceStatus !== "cancelled" &&
    input.sourceStatus !== "rejected"
  ) {
    attentionItems.push("Zero estimated revenue");
  }

  if (input.recognizedRevenue > input.estimatedRevenue) {
    attentionItems.push("Recognized revenue greater than estimated revenue");
  }

  if (input.creditValue <= 0) {
    attentionItems.push("Zero credit value");
  }

  return attentionItems;
}

function resolveOperationalPortfolioContractStatus(
  status: string | null,
  attentionItems: string[],
) {
  if (status === "completed") {
    return "completed";
  }

  if (status === "inactive") {
    return "inactive";
  }

  if (status === "cancelled" || status === "rejected") {
    return "cancelled";
  }

  if (attentionItems.length > 0) {
    return "attention";
  }

  if (status === "active") {
    return "active";
  }

  return "draft";
}

function isOperationallyActivePortfolioContract(
  contract: ContractRow,
  revenueEntries: RevenueEntryRow[],
) {
  const creditValue = normalizeNumber(contract.credit_amount) ?? 0;
  const estimatedRevenue = sumEstimatedRevenue(revenueEntries);
  const recognizedRevenue = sumRecognizedRevenue(revenueEntries);
  const attentionItems = buildOperationalContractAttentionItems({
    administratorId: contract.administrator_id,
    clientId: contract.client_id,
    contractNumber: contract.contract_number,
    creditValue,
    estimatedRevenue,
    recognizedRevenue,
    sourceStatus: contract.status,
  });

  return (
    resolveOperationalPortfolioContractStatus(contract.status, attentionItems) ===
    "active"
  );
}

function resolvePortfolioStatus(input: {
  attentionItemsCount: number;
  exposurePercentage: number;
  threshold: number;
  totalPortfolioValue: number;
}): OperationsPortfolioStatus {
  if (input.totalPortfolioValue === 0) {
    return "empty";
  }

  if (input.exposurePercentage > input.threshold) {
    return "concentrated";
  }

  if (input.attentionItemsCount > 0) {
    return "attention";
  }

  return "healthy";
}

async function loadOperationsPortfolioDataset(context: RequestContext) {
  const [
    contractsResult,
    clientsResult,
    administratorsResult,
    revenueResult,
    expectedRevenueResult,
    recognizedRevenueResult,
  ] =
    await Promise.all([
      context.supabase
        .from("contracts")
        .select(
          [
            "id",
            "organization_id",
            "client_id",
            "administrator_id",
            "contract_number",
            "credit_amount",
            "status",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("clients")
        .select("id, organization_id, name")
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("administrators")
        .select("id, organization_id, name")
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("revenue_entries")
        .select(
          [
            "organization_id",
            "contract_id",
            "client_id",
            "administrator_id",
            "status",
            "expected_amount",
            "actual_amount",
            "paid_at",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("expected_revenue_entries")
        .select(
          [
            "id",
            "organization_id",
            "contract_id",
            "expected_amount",
            "cancelled_at",
            "lifecycle",
            "business_status",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("recognized_revenue_entries")
        .select(
          [
            "organization_id",
            "expected_revenue_entry_id",
            "recognized_amount",
            "recognized_at",
            "reversed_at",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id)
        .is("reversed_at", null),
    ]);

  if (
    contractsResult.error ||
    clientsResult.error ||
    administratorsResult.error ||
    revenueResult.error ||
    expectedRevenueResult.error ||
    recognizedRevenueResult.error
  ) {
    return {
      error: "Nao foi possivel carregar a carteira operacional.",
      ok: false as const,
      status: 500,
    };
  }

  const contracts = ((contractsResult.data ?? []) as unknown as ContractRow[]).filter(
    (contract) => contract.organization_id === context.profile.organization_id,
  );

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
    contracts,
    ok: true as const,
    revenueEntries: buildUnifiedRevenueEntries({
      contracts,
      expectedRevenueEntries: (
        (expectedRevenueResult.data ?? []) as unknown as ExpectedRevenueEntryRow[]
      ).filter(
        (entry) => entry.organization_id === context.profile.organization_id,
      ),
      legacyRevenueEntries: (
        (revenueResult.data ?? []) as unknown as RevenueEntryRow[]
      ).filter(
        (entry) => entry.organization_id === context.profile.organization_id,
      ),
      recognizedRevenueEntries: (
        (recognizedRevenueResult.data ?? []) as unknown as RecognizedRevenueEntryRow[]
      ).filter(
        (entry) => entry.organization_id === context.profile.organization_id,
      ),
    }),
  };
}

function createServerOperationsPortfolioSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase operations portfolio server environment is not configured.",
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

async function resolveOperationsPortfolioRequestContext(
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
    const supabase = createServerOperationsPortfolioSupabaseClient(accessToken);
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
      .maybeSingle<OperationsPortfolioProfile>();

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

function groupRevenueByContractId(revenueEntries: RevenueEntryRow[]) {
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

function buildUnifiedRevenueEntries(input: {
  contracts: ContractRow[];
  expectedRevenueEntries: ExpectedRevenueEntryRow[];
  legacyRevenueEntries: RevenueEntryRow[];
  recognizedRevenueEntries: RecognizedRevenueEntryRow[];
}) {
  const contractsById = new Map(
    input.contracts.map((contract) => [contract.id, contract]),
  );
  const recognizedRevenueByExpectedId = new Map<string, number>();

  for (const entry of input.recognizedRevenueEntries) {
    if (!entry.expected_revenue_entry_id || entry.reversed_at) {
      continue;
    }

    recognizedRevenueByExpectedId.set(
      entry.expected_revenue_entry_id,
      roundCurrency(
        (recognizedRevenueByExpectedId.get(entry.expected_revenue_entry_id) ?? 0) +
          (normalizeNumber(entry.recognized_amount) ?? 0),
      ),
    );
  }

  const contractsWithCommissionRevenue = new Set<string>();
  const commissionEngineEntries: RevenueEntryRow[] = [];

  for (const entry of input.expectedRevenueEntries) {
    if (!entry.contract_id) {
      continue;
    }

    contractsWithCommissionRevenue.add(entry.contract_id);

    const contract = contractsById.get(entry.contract_id) ?? null;
    const recognizedAmount = recognizedRevenueByExpectedId.get(entry.id) ?? 0;
    const status = normalizeCommissionEngineRevenueStatus(
      entry,
      recognizedAmount,
    );
    const effectiveExpectedAmount = resolveOperationalExpectedAmount(
      entry,
      recognizedAmount,
    );

    if (status === "cancelled" && effectiveExpectedAmount <= 0) {
      continue;
    }

    commissionEngineEntries.push({
      actual_amount: recognizedAmount > 0 ? recognizedAmount : null,
      administrator_id: contract?.administrator_id ?? null,
      client_id: contract?.client_id ?? null,
      contract_id: entry.contract_id,
      expected_amount: effectiveExpectedAmount,
      organization_id: entry.organization_id,
      paid_at: null,
      status,
    });
  }

  const legacyFallbackEntries = input.legacyRevenueEntries.filter(
    (entry) =>
      !entry.contract_id || !contractsWithCommissionRevenue.has(entry.contract_id),
  );

  return [...commissionEngineEntries, ...legacyFallbackEntries];
}

function sumEstimatedRevenue(revenueEntries: RevenueEntryRow[]) {
  return roundCurrency(
    revenueEntries.reduce((total, entry) => {
      if (
        entry.status !== "expected" &&
        entry.status !== "pending" &&
        entry.status !== "cancelled"
      ) {
        return total;
      }

      return total + (normalizeNumber(entry.expected_amount) ?? 0);
    }, 0),
  );
}

function sumRecognizedRevenue(revenueEntries: RevenueEntryRow[]) {
  return roundCurrency(
    revenueEntries.reduce((total, entry) => {
      if (entry.status !== "paid" && entry.status !== "cancelled") {
        return total;
      }

      return (
        total +
        (normalizeNumber(entry.actual_amount) ??
          normalizeNumber(entry.expected_amount) ??
          0)
      );
    }, 0),
  );
}

function isValidProfile(
  profile: OperationsPortfolioProfile | null,
): profile is OperationsPortfolioProfile & {
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

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercentage(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function normalizeCommissionEngineRevenueStatus(
  entry: ExpectedRevenueEntryRow,
  recognizedAmount: number,
) {
  if (entry.cancelled_at || entry.lifecycle === "cancelada") {
    return "cancelled";
  }

  if (
    entry.business_status === "reconhecida" ||
    entry.lifecycle === "encerrada"
  ) {
    return "paid";
  }

  if (
    entry.business_status === "parcialmente_reconhecida" ||
    recognizedAmount > 0
  ) {
    return "pending";
  }

  return "expected";
}

function resolveOperationalExpectedAmount(
  entry: ExpectedRevenueEntryRow,
  recognizedAmount: number,
) {
  if (entry.cancelled_at || entry.lifecycle === "cancelada") {
    return recognizedAmount;
  }

  return normalizeNumber(entry.expected_amount) ?? 0;
}
