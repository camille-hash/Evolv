import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { getContractCommissionSummaries } from "@/modules/commission-engine/server";
import type { ContractCommissionSummary } from "@/modules/commission-engine/types";
import type { PortfolioSummaryResponse } from "@/modules/portfolio/types";
import { buildOperationsHealthScore } from "./health-score";
import { buildOperationalIntelligence } from "./intelligence";
import type {
  OperationAttentionItem,
  OperationDrilldownCard,
  OperationMovementItem,
  OperationalHealthStatus,
  OperationsSnapshotMetric,
  OperationsSummary,
} from "./types";

export type OperationsSummaryResult =
  | { ok: true; summary: OperationsSummary }
  | { error: string; ok: false; status: number };

type OperationsSummaryProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type ClientRow = {
  created_at: string | null;
  id: string;
  name: string | null;
  organization_id: string | null;
  status: string | null;
  updated_at: string | null;
};

type ContractRow = {
  administrator_id: string | null;
  client_id: string | null;
  contract_number: string | null;
  created_at: string | null;
  credit_amount: number | string | null;
  id: string;
  organization_id: string | null;
  status: string | null;
  updated_at: string | null;
};

type AdministratorRow = {
  created_at: string | null;
  id: string;
  name: string | null;
  organization_id: string | null;
  status: string | null;
  updated_at: string | null;
};

type RevenueEntryRow = {
  actual_amount: number | string | null;
  administrator_id?: string | null;
  client_id?: string | null;
  contract_id: string | null;
  due_date?: string | null;
  expected_amount: number | string | null;
  id?: string;
  organization_id: string | null;
  paid_at?: string | null;
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
  recognized_at?: string | null;
  reversed_at: string | null;
};

type SummaryRequestContext = {
  profile: OperationsSummaryProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerOperationsSummarySupabaseClient>;
  user: SupabaseUser;
};

type OperationsSummaryDataset = {
  administrators: AdministratorRow[];
  clients: ClientRow[];
  commissionSummaries: Map<string, ContractCommissionSummary>;
  contracts: ContractRow[];
  legacyRevenueEntries: RevenueEntryRow[];
  unifiedRevenueEntries: RevenueEntryRow[];
};

type ContractSummaryRow = {
  administratorId: string | null;
  clientId: string | null;
  contractNumber: string | null;
  createdAt: string | null;
  creditValue: number;
  estimatedRevenue: number;
  id: string;
  recognizedRevenue: number;
  sourceStatus: string | null;
  status: string;
  updatedAt: string | null;
};

type ClientSummaryRow = {
  activeContractsCount: number;
  attentionItems: string[];
  contractsCount: number;
  createdAt?: string;
  estimatedRevenue: number;
  id: string;
  name: string;
  recognizedRevenue: number;
  status: string;
  totalCreditValue: number;
  updatedAt?: string;
};

type AdministratorSummaryRow = {
  activeContractsCount: number;
  attentionItems: string[];
  contractsCount: number;
  estimatedRevenue: number;
  id: string;
  name: string;
  recognizedRevenue: number;
  status: string;
  totalCreditValue: number;
};

type RevenueSummary = {
  divergentEntries: number;
  expectedRevenue: number;
  pendingRevenue: number;
  recognizedRevenue: number;
};

type PortfolioLightSummary = {
  attentionItems: string[];
  totalPortfolioValue: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});
const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";
const clientExposureThreshold = 50;
const administratorExposureThreshold = 60;

export async function getOperationsSummary(
  accessToken: string | null,
): Promise<OperationsSummaryResult> {
  const context = await resolveOperationsSummaryRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const dataset = await loadOperationsSummaryDataset(context);

  if (!dataset.ok) {
    return dataset;
  }

  const contractRows = buildSummaryContractRows(dataset);
  const clientRows = buildSummaryClientRows(dataset);
  const administratorRows = buildSummaryAdministratorRows(dataset);
  const revenueSummary = summarizeRevenueEntries(
    excludeNonOperationalContractEntries(
      buildRevenueRowsForSummary(dataset.unifiedRevenueEntries, dataset.contracts),
    ),
  );
  const portfolioLightSummary = buildPortfolioLightSummary({
    contracts: dataset.contracts,
    revenueEntries: dataset.unifiedRevenueEntries,
  });
  const portfolioSummary = buildPortfolioSummaryResponse({
    administrators: administratorRows,
    clients: clientRows,
    contracts: contractRows,
    portfolio: {
      summary: {
        totalPortfolioValue: portfolioLightSummary.totalPortfolioValue,
      },
    },
    revenue: {
      entries: buildRevenueRowsForSummary(
        dataset.unifiedRevenueEntries,
        dataset.contracts,
      ),
      summary: revenueSummary,
    },
  });
  const attentionItems = buildAttentionItems({
    administrators: {
      summary: summarizeAdministrators(administratorRows),
    },
    clients: {
      summary: summarizeClients(clientRows),
    },
    contracts: {
      summary: summarizeContracts(contractRows),
    },
    portfolio: {
      summary: portfolioLightSummary,
    },
    portfolioSummary,
    revenue: {
      summary: revenueSummary,
    },
  });
  const healthStatus = resolveHealthStatus(attentionItems);
  const intelligence = buildOperationalIntelligence({
    attentionItems,
    portfolio: portfolioSummary,
  });
  const healthScore = buildOperationsHealthScore({
    attentionItems,
    insights: intelligence.insights,
    portfolio: portfolioSummary,
  });

  return {
    ok: true,
    summary: {
      attentionItems,
      drilldowns: buildDrilldowns(portfolioSummary),
      generatedAt: new Date().toISOString(),
      healthScore,
      healthStatus,
      insights: intelligence.insights,
      movementFeed: buildMovementFeed(portfolioSummary),
      priorityBanner: intelligence.priorityBanner,
      snapshot: buildSnapshot(portfolioSummary, healthStatus),
    },
  };
}

function createServerOperationsSummarySupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase operations summary server environment is not configured.",
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

async function resolveOperationsSummaryRequestContext(
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
    const supabase = createServerOperationsSummarySupabaseClient(accessToken);
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
      .maybeSingle<OperationsSummaryProfile>();

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

async function loadOperationsSummaryDataset(context: SummaryRequestContext) {
  const [
    clientsResult,
    contractsResult,
    administratorsResult,
    legacyRevenueResult,
    expectedRevenueResult,
    recognizedRevenueResult,
  ] = await Promise.all([
    context.supabase
      .from("clients")
      .select(
        [
          "id",
          "organization_id",
          "name",
          "status",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .eq("organization_id", context.profile.organization_id),
    loadOperationsSummaryContractRows(context),
    context.supabase
      .from("administrators")
      .select(
        [
          "id",
          "organization_id",
          "name",
          "status",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .eq("organization_id", context.profile.organization_id),
    context.supabase
      .from("revenue_entries")
      .select(
        [
          "id",
          "organization_id",
          "contract_id",
          "client_id",
          "administrator_id",
          "status",
          "expected_amount",
          "actual_amount",
          "due_date",
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
    clientsResult.error ||
    contractsResult.error ||
    administratorsResult.error ||
    legacyRevenueResult.error ||
    expectedRevenueResult.error ||
    recognizedRevenueResult.error
  ) {
    return {
      error: "Nao foi possivel carregar o resumo operacional.",
      ok: false as const,
      status: 500,
    };
  }

  const contracts = ((contractsResult.data ?? []) as unknown as ContractRow[]).filter(
    (contract) => contract.organization_id === context.profile.organization_id,
  );
  const commissionSummariesResult = await getContractCommissionSummaries({
    contractIds: contracts.map((contract) => contract.id),
    organizationId: context.profile.organization_id,
    supabase: context.supabase,
  });

  if (!commissionSummariesResult.ok) {
    return {
      error: "Nao foi possivel carregar resumo de comissao dos contratos.",
      ok: false as const,
      status: commissionSummariesResult.status,
    };
  }

  const legacyRevenueEntries = (
    (legacyRevenueResult.data ?? []) as unknown as RevenueEntryRow[]
  ).filter(
    (entry) => entry.organization_id === context.profile.organization_id,
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
    commissionSummaries: commissionSummariesResult.summaries,
    contracts,
    legacyRevenueEntries,
    ok: true as const,
    unifiedRevenueEntries: buildUnifiedRevenueEntries({
      contracts,
      expectedRevenueEntries: (
        (expectedRevenueResult.data ?? []) as unknown as ExpectedRevenueEntryRow[]
      ).filter(
        (entry) => entry.organization_id === context.profile.organization_id,
      ),
      legacyRevenueEntries,
      recognizedRevenueEntries: (
        (recognizedRevenueResult.data ?? []) as unknown as RecognizedRevenueEntryRow[]
      ).filter(
        (entry) => entry.organization_id === context.profile.organization_id,
      ),
    }),
  };
}

async function loadOperationsSummaryContractRows(context: SummaryRequestContext) {
  const resultWithIdentification = await context.supabase
    .from("contracts")
    .select(
      [
        "id",
        "organization_id",
        "client_id",
        "administrator_id",
        "contract_group",
        "contract_quota",
        "contract_number",
        "status",
        "credit_amount",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("organization_id", context.profile.organization_id);

  if (!isMissingContractIdentificationColumnsError(resultWithIdentification.error)) {
    return resultWithIdentification;
  }

  return context.supabase
    .from("contracts")
    .select(
      [
        "id",
        "organization_id",
        "client_id",
        "administrator_id",
        "contract_number",
        "status",
        "credit_amount",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("organization_id", context.profile.organization_id);
}

function buildSummaryContractRows(
  dataset: OperationsSummaryDataset,
): ContractSummaryRow[] {
  const revenueByContractId = groupRevenueByContractId(dataset.legacyRevenueEntries);

  return dataset.contracts.map((contract) => {
    const creditValue = normalizeNumber(contract.credit_amount) ?? 0;
    const commissionSummary = dataset.commissionSummaries.get(contract.id);
    const revenueEntries = revenueByContractId.get(contract.id) ?? [];
    const estimatedRevenue = resolveOperationalEstimatedRevenue(
      sumLegacyEstimatedRevenue(revenueEntries),
      commissionSummary?.totals.expectedAmount ?? 0,
      commissionSummary?.hasCommissionEngine === true,
    );
    const recognizedRevenue = sumLegacyRecognizedRevenue(revenueEntries);
    const attentionItems = buildOperationalContractAttentionItems({
      administratorId: contract.administrator_id,
      clientId: contract.client_id,
      contractNumber: contract.contract_number,
      creditValue,
      estimatedRevenue,
      recognizedRevenue,
      sourceStatus: contract.status,
    });

    return {
      administratorId: contract.administrator_id,
      clientId: contract.client_id,
      contractNumber: contract.contract_number,
      createdAt: contract.created_at,
      creditValue,
      estimatedRevenue,
      id: contract.id,
      recognizedRevenue,
      sourceStatus: contract.status,
      status: resolveOperationsContractStatus(contract.status, attentionItems),
      updatedAt: contract.updated_at ?? contract.created_at,
    };
  });
}

function buildSummaryClientRows(dataset: OperationsSummaryDataset) {
  const contractsByClientId = groupContractsByClientId(dataset.contracts);
  const revenueByContractId = groupRevenueByContractId(dataset.legacyRevenueEntries);

  return dataset.clients.map<ClientSummaryRow>((client) => {
    const contracts = contractsByClientId.get(client.id) ?? [];
    const summary = contracts.reduce(
      (current, contract) => {
        const revenueEntries = revenueByContractId.get(contract.id) ?? [];
        const creditValue = normalizeNumber(contract.credit_amount) ?? 0;
        const commissionSummary = dataset.commissionSummaries.get(contract.id);
        const estimatedRevenue = resolveClientEstimatedRevenue(
          sumLegacyEstimatedRevenue(revenueEntries),
          commissionSummary?.totals.expectedAmount ?? 0,
        );
        const recognizedRevenue = sumLegacyRecognizedRevenue(revenueEntries);

        current.contractsCount += 1;
        current.totalCreditValue = roundCurrency(
          current.totalCreditValue + creditValue,
        );
        current.estimatedRevenue = roundCurrency(
          current.estimatedRevenue + estimatedRevenue,
        );
        current.recognizedRevenue = roundCurrency(
          current.recognizedRevenue + recognizedRevenue,
        );
        current.updatedAt = pickLatestDate(
          current.updatedAt,
          contract.updated_at ?? contract.created_at,
        );

        if (contract.status === "active") {
          current.activeContractsCount += 1;
        }

        for (const attentionItem of buildClientContractAttentionItems({
          administratorId: contract.administrator_id,
          contractNumber: contract.contract_number,
          creditValue,
          estimatedRevenue,
          recognizedRevenue,
        })) {
          current.attentionItems.add(attentionItem);
        }

        return current;
      },
      {
        activeContractsCount: 0,
        attentionItems: new Set<string>(),
        contractsCount: 0,
        estimatedRevenue: 0,
        recognizedRevenue: 0,
        totalCreditValue: 0,
        updatedAt: client.updated_at ?? client.created_at,
      },
    );

    if (contracts.length === 0) {
      summary.attentionItems.add("Client without linked contract");
    }

    if (summary.totalCreditValue <= 0) {
      summary.attentionItems.add("Client with zero total credit value");
    }

    return {
      activeContractsCount: summary.activeContractsCount,
      attentionItems: Array.from(summary.attentionItems),
      contractsCount: summary.contractsCount,
      createdAt: client.created_at ?? undefined,
      estimatedRevenue: summary.estimatedRevenue,
      id: client.id,
      name: normalizeText(client.name) || "Cliente sem nome",
      recognizedRevenue: summary.recognizedRevenue,
      status: resolveOperationsClientStatus(client.status, summary.attentionItems.size),
      totalCreditValue: summary.totalCreditValue,
      updatedAt: summary.updatedAt ?? undefined,
    };
  });
}

function buildSummaryAdministratorRows(
  dataset: OperationsSummaryDataset,
): AdministratorSummaryRow[] {
  const revenueByContractId = groupRevenueByContractId(dataset.legacyRevenueEntries);
  const totalCreditValue = roundCurrency(
    dataset.contracts.reduce(
      (total, contract) => total + (normalizeNumber(contract.credit_amount) ?? 0),
      0,
    ),
  );
  const administrators = new Map<
    string,
    {
      activeContractsCount: number;
      attentionItems: Set<string>;
      clients: Set<string>;
      contractsCount: number;
      estimatedRevenue: number;
      id: string;
      name: string;
      recognizedRevenue: number;
      sourceStatus: string | null;
      totalCreditValue: number;
    }
  >();

  for (const administrator of dataset.administrators) {
    administrators.set(administrator.id, {
      activeContractsCount: 0,
      attentionItems: new Set<string>(),
      clients: new Set<string>(),
      contractsCount: 0,
      estimatedRevenue: 0,
      id: administrator.id,
      name: normalizeText(administrator.name) || "Administradora sem nome",
      recognizedRevenue: 0,
      sourceStatus: administrator.status,
      totalCreditValue: 0,
    });
  }

  for (const contract of dataset.contracts) {
    if (!contract.administrator_id) {
      continue;
    }

    const administrator =
      administrators.get(contract.administrator_id) ??
      createMissingAdministratorAccumulator(contract.administrator_id);
    const revenueEntries = revenueByContractId.get(contract.id) ?? [];
    const creditValue = normalizeNumber(contract.credit_amount) ?? 0;
    const estimatedRevenue = sumLegacyEstimatedRevenue(revenueEntries);
    const recognizedRevenue = sumLegacyRecognizedRevenue(revenueEntries);

    administrator.contractsCount += 1;
    administrator.totalCreditValue = roundCurrency(
      administrator.totalCreditValue + creditValue,
    );
    administrator.estimatedRevenue = roundCurrency(
      administrator.estimatedRevenue + estimatedRevenue,
    );
    administrator.recognizedRevenue = roundCurrency(
      administrator.recognizedRevenue + recognizedRevenue,
    );

    if (contract.status === "active") {
      administrator.activeContractsCount += 1;
    }

    if (contract.client_id) {
      administrator.clients.add(contract.client_id);
    }

    for (const attentionItem of buildAdministratorContractAttentionItems({
      clientId: contract.client_id,
      contractNumber: contract.contract_number,
      creditValue,
      estimatedRevenue,
      isActiveContract: contract.status === "active",
      recognizedRevenue,
    })) {
      administrator.attentionItems.add(attentionItem);
    }

    administrators.set(contract.administrator_id, administrator);
  }

  return Array.from(administrators.values()).map((administrator) => {
    if (administrator.contractsCount === 0) {
      administrator.attentionItems.add("administrator without linked contract");
    }

    const exposurePercentage =
      totalCreditValue > 0
        ? roundPercentage(
            (administrator.totalCreditValue / totalCreditValue) * 100,
          )
        : 0;

    if (exposurePercentage > administratorExposureThreshold) {
      administrator.attentionItems.add(
        "administrator concentrates more than 60% of portfolio",
      );
    }

    return {
      activeContractsCount: administrator.activeContractsCount,
      attentionItems: Array.from(administrator.attentionItems),
      contractsCount: administrator.contractsCount,
      estimatedRevenue: administrator.estimatedRevenue,
      id: administrator.id,
      name: administrator.name,
      recognizedRevenue: administrator.recognizedRevenue,
      status: resolveAdministratorStatus({
        attentionItemsCount: administrator.attentionItems.size,
        contractsCount: administrator.contractsCount,
        exposurePercentage,
        sourceStatus: administrator.sourceStatus,
      }),
      totalCreditValue: administrator.totalCreditValue,
    };
  });
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
  const recognizedRevenueByExpectedId = new Map<
    string,
    {
      latestRecognizedAt: string | null;
      recognizedAmount: number;
    }
  >();

  for (const entry of input.recognizedRevenueEntries) {
    if (!entry.expected_revenue_entry_id || entry.reversed_at) {
      continue;
    }

    const current =
      recognizedRevenueByExpectedId.get(entry.expected_revenue_entry_id) ?? {
        latestRecognizedAt: null,
        recognizedAmount: 0,
      };

    recognizedRevenueByExpectedId.set(entry.expected_revenue_entry_id, {
      latestRecognizedAt: resolveLatestDate(
        current.latestRecognizedAt,
        entry.recognized_at ?? null,
      ),
      recognizedAmount: roundCurrency(
        current.recognizedAmount +
          (normalizeNumber(entry.recognized_amount) ?? 0),
      ),
    });
  }

  const contractsWithCommissionRevenue = new Set<string>();
  const commissionEngineEntries: RevenueEntryRow[] = [];

  for (const entry of input.expectedRevenueEntries) {
    if (!entry.contract_id) {
      continue;
    }

    contractsWithCommissionRevenue.add(entry.contract_id);

    const contract = contractsById.get(entry.contract_id) ?? null;
    const recognizedRevenue =
      recognizedRevenueByExpectedId.get(entry.id) ?? null;
    const recognizedAmount = recognizedRevenue?.recognizedAmount ?? 0;
    const status = normalizeCommissionEngineRevenueStatus(entry, recognizedAmount);
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
      id: entry.id,
      organization_id: entry.organization_id,
      paid_at:
        status === "paid"
          ? recognizedRevenue?.latestRecognizedAt ?? null
          : null,
      status,
    });
  }

  const legacyFallbackEntries = input.legacyRevenueEntries.filter(
    (entry) =>
      !entry.contract_id || !contractsWithCommissionRevenue.has(entry.contract_id),
  );

  return [...commissionEngineEntries, ...legacyFallbackEntries];
}

function buildRevenueRowsForSummary(
  revenueEntries: RevenueEntryRow[],
  contracts: ContractRow[],
) {
  const contractsById = new Map(
    contracts.map((contract) => [contract.id, contract]),
  );

  return revenueEntries.map((entry) => {
    const contract = entry.contract_id
      ? contractsById.get(entry.contract_id) ?? null
      : null;
    const expectedAmount = normalizeNumber(entry.expected_amount) ?? 0;
    const recognizedAmount =
      entry.status === "paid"
        ? normalizeNumber(entry.actual_amount) ?? expectedAmount
        : normalizeNumber(entry.actual_amount) ?? 0;
    const attentionItems = buildRevenueAttentionItems({
      administratorId: entry.administrator_id ?? contract?.administrator_id ?? null,
      clientId: entry.client_id ?? contract?.client_id ?? null,
      contract,
      contractId: entry.contract_id,
      expectedAmount,
      recognizedAmount,
      status: entry.status,
    });

    return {
      contractStatus: normalizeNullableText(contract?.status) ?? undefined,
      expectedAmount,
      recognizedAmount,
      status: resolveOperationsRevenueStatus(entry.status, attentionItems),
    };
  });
}

function buildPortfolioLightSummary(input: {
  contracts: ContractRow[];
  revenueEntries: RevenueEntryRow[];
}): PortfolioLightSummary {
  const revenueByContractId = groupRevenueByContractId(input.revenueEntries);
  const totalPortfolioValue = roundCurrency(
    input.contracts.reduce(
      (total, contract) => total + (normalizeNumber(contract.credit_amount) ?? 0),
      0,
    ),
  );
  const activeContracts = input.contracts.filter((contract) =>
    isOperationallyActivePortfolioContract(
      contract,
      revenueByContractId.get(contract.id) ?? [],
    ),
  );
  const activePortfolioValue = roundCurrency(
    activeContracts.reduce(
      (total, contract) => total + (normalizeNumber(contract.credit_amount) ?? 0),
      0,
    ),
  );
  const attentionItems = new Set<string>();
  const largestClientExposurePercentage = calculateLargestExposurePercentage(
    activeContracts,
    "client",
    activePortfolioValue,
  );
  const largestAdministratorExposurePercentage = calculateLargestExposurePercentage(
    activeContracts,
    "administrator",
    activePortfolioValue,
  );

  if (totalPortfolioValue === 0) {
    attentionItems.add("total portfolio value equals zero");
  }

  if (largestClientExposurePercentage > clientExposureThreshold) {
    attentionItems.add("largest client exposure above 50%");
  }

  if (largestAdministratorExposurePercentage > administratorExposureThreshold) {
    attentionItems.add("largest administrator exposure above 60%");
  }

  for (const contract of input.contracts) {
    const revenueEntries = revenueByContractId.get(contract.id) ?? [];
    const creditValue = normalizeNumber(contract.credit_amount) ?? 0;
    const estimatedRevenue = sumPortfolioEstimatedRevenue(revenueEntries);
    const recognizedRevenue = sumPortfolioRecognizedRevenue(revenueEntries);

    for (const item of buildPortfolioContractAttentionItems({
      administratorId: contract.administrator_id,
      clientId: contract.client_id,
      creditValue,
      estimatedRevenue,
      recognizedRevenue,
    })) {
      attentionItems.add(item);
    }
  }

  return {
    attentionItems: Array.from(attentionItems),
    totalPortfolioValue,
  };
}

function summarizeContracts(contracts: ContractSummaryRow[]) {
  return contracts.reduce(
    (summary, contract) => ({
      activeContracts:
        summary.activeContracts + (contract.status === "active" ? 1 : 0),
      attentionContracts:
        summary.attentionContracts + (contract.status === "attention" ? 1 : 0),
      totalContracts: summary.totalContracts + 1,
    }),
    {
      activeContracts: 0,
      attentionContracts: 0,
      totalContracts: 0,
    },
  );
}

function summarizeClients(clients: ClientSummaryRow[]) {
  return clients.reduce(
    (summary, client) => ({
      clientsWithAttention:
        summary.clientsWithAttention + (client.attentionItems.length ? 1 : 0),
      clientsWithoutContracts:
        summary.clientsWithoutContracts + (client.contractsCount === 0 ? 1 : 0),
    }),
    {
      clientsWithAttention: 0,
      clientsWithoutContracts: 0,
    },
  );
}

function summarizeAdministrators(administrators: AdministratorSummaryRow[]) {
  return administrators.reduce(
    (summary, administrator) => ({
      administratorsWithAttention:
        summary.administratorsWithAttention +
        (administrator.attentionItems.length ? 1 : 0),
      administratorsWithoutContracts:
        summary.administratorsWithoutContracts +
        (administrator.contractsCount === 0 ? 1 : 0),
    }),
    {
      administratorsWithAttention: 0,
      administratorsWithoutContracts: 0,
    },
  );
}

function summarizeRevenueEntries(
  entries: ReturnType<typeof buildRevenueRowsForSummary>,
): RevenueSummary {
  return entries.reduce(
    (summary, entry) => ({
      divergentEntries:
        summary.divergentEntries + (entry.status === "attention" ? 1 : 0),
      expectedRevenue: roundCurrency(
        summary.expectedRevenue + entry.expectedAmount,
      ),
      pendingRevenue: roundCurrency(
        summary.pendingRevenue +
          (entry.status === "expected" || entry.status === "pending"
            ? Math.max(entry.expectedAmount - entry.recognizedAmount, 0)
            : 0),
      ),
      recognizedRevenue: roundCurrency(
        summary.recognizedRevenue + entry.recognizedAmount,
      ),
    }),
    {
      divergentEntries: 0,
      expectedRevenue: 0,
      pendingRevenue: 0,
      recognizedRevenue: 0,
    },
  );
}

function excludeNonOperationalContractEntries(
  entries: ReturnType<typeof buildRevenueRowsForSummary>,
) {
  return entries.filter((entry) => {
    if (!isNonOperationalContractStatus(entry.contractStatus)) {
      return true;
    }

    return entry.status === "recognized" || entry.recognizedAmount > 0;
  });
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

function calculateLargestExposurePercentage(
  contracts: ContractRow[],
  type: "administrator" | "client",
  totalPortfolioValue: number,
) {
  if (totalPortfolioValue <= 0) {
    return 0;
  }

  const exposureById = new Map<string, number>();

  for (const contract of contracts) {
    const groupId =
      type === "client"
        ? contract.client_id ?? "without-client"
        : contract.administrator_id ?? "without-administrator";

    exposureById.set(
      groupId,
      roundCurrency(
        (exposureById.get(groupId) ?? 0) +
          (normalizeNumber(contract.credit_amount) ?? 0),
      ),
    );
  }

  return Math.max(
    0,
    ...Array.from(exposureById.values()).map((value) =>
      roundPercentage((value / totalPortfolioValue) * 100),
    ),
  );
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
  if (!canGenerateOperationalContractAttention(input.sourceStatus)) {
    return [];
  }

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

  if (input.estimatedRevenue <= 0) {
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

function buildClientContractAttentionItems(input: {
  administratorId: string | null;
  contractNumber: string | null;
  creditValue: number;
  estimatedRevenue: number;
  recognizedRevenue: number;
}) {
  const attentionItems: string[] = [];

  if (!input.administratorId) {
    attentionItems.push("Client with contract missing administrator");
  }

  if (!normalizeNullableText(input.contractNumber)) {
    attentionItems.push("Client with contract missing contract number");
  }

  if (input.estimatedRevenue <= 0) {
    attentionItems.push("Client with zero estimated revenue");
  }

  if (input.recognizedRevenue > input.estimatedRevenue) {
    attentionItems.push(
      "Client with recognized revenue greater than estimated revenue",
    );
  }

  if (input.creditValue <= 0) {
    attentionItems.push("Client with zero total credit value");
  }

  return attentionItems;
}

function buildAdministratorContractAttentionItems(input: {
  clientId: string | null;
  contractNumber: string | null;
  creditValue: number;
  estimatedRevenue: number;
  isActiveContract: boolean;
  recognizedRevenue: number;
}) {
  const attentionItems: string[] = [];

  if (!input.clientId) {
    attentionItems.push("linked contract without client");
  }

  if (!normalizeNullableText(input.contractNumber)) {
    attentionItems.push("linked contract without contract number");
  }

  if (input.creditValue <= 0) {
    attentionItems.push("linked contract with zero credit value");
  }

  if (input.isActiveContract && input.estimatedRevenue <= 0) {
    attentionItems.push("active linked contract with zero estimated revenue");
  }

  if (input.recognizedRevenue > input.estimatedRevenue) {
    attentionItems.push("recognized revenue greater than estimated revenue");
  }

  return attentionItems;
}

function buildPortfolioContractAttentionItems(input: {
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

function buildRevenueAttentionItems(input: {
  administratorId: string | null;
  clientId: string | null;
  contract: ContractRow | null;
  contractId: string | null;
  expectedAmount: number;
  recognizedAmount: number;
  status: string | null;
}) {
  const attentionItems: string[] = [];

  if (!input.contractId || !input.contract) {
    attentionItems.push("Contrato nao vinculado corretamente.");
  }

  if (!input.clientId) {
    attentionItems.push("Cliente nao vinculado.");
  }

  if (!input.administratorId) {
    attentionItems.push("Administradora nao vinculada.");
  }

  if (input.expectedAmount <= 0) {
    attentionItems.push("Valor previsto igual a zero.");
  }

  if (input.recognizedAmount > input.expectedAmount) {
    attentionItems.push("Valor reconhecido maior que o valor previsto.");
  }

  if (input.status === "paid" && (!input.contractId || !input.contract)) {
    attentionItems.push("Receita reconhecida sem contrato valido.");
  }

  return attentionItems;
}

function createMissingAdministratorAccumulator(administratorId: string) {
  return {
    activeContractsCount: 0,
    attentionItems: new Set<string>(),
    clients: new Set<string>(),
    contractsCount: 0,
    estimatedRevenue: 0,
    id: administratorId,
    name: "Administradora nao encontrada",
    recognizedRevenue: 0,
    sourceStatus: null,
    totalCreditValue: 0,
  };
}

function resolveOperationsContractStatus(
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

  if (status === "active" && attentionItems.length > 0) {
    return "attention";
  }

  if (status === "active") {
    return "active";
  }

  if (
    status === "draft" ||
    status === "pending_documentation" ||
    status === "submitted" ||
    status === "approved"
  ) {
    return "pending";
  }

  return "unknown";
}

function resolveOperationsClientStatus(
  status: string | null,
  attentionItemsCount: number,
) {
  if (attentionItemsCount > 0) {
    return "attention";
  }

  if (status === "active") {
    return "active";
  }

  if (status === "inactive" || status === "archived") {
    return "inactive";
  }

  return "unknown";
}

function resolveAdministratorStatus(input: {
  attentionItemsCount: number;
  contractsCount: number;
  exposurePercentage: number;
  sourceStatus: string | null;
}) {
  if (input.contractsCount === 0 || input.sourceStatus === "inactive") {
    return "inactive";
  }

  if (input.exposurePercentage > administratorExposureThreshold) {
    return "concentrated";
  }

  if (input.attentionItemsCount > 0) {
    return "attention";
  }

  return "healthy";
}

function resolveOperationsRevenueStatus(
  status: string | null,
  attentionItems: string[],
) {
  if (attentionItems.length > 0) {
    return "attention";
  }

  if (status === "paid") {
    return "recognized";
  }

  if (status === "pending" || status === "overdue") {
    return "pending";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  return "expected";
}

function isOperationallyActivePortfolioContract(
  contract: ContractRow,
  revenueEntries: RevenueEntryRow[],
) {
  const creditValue = normalizeNumber(contract.credit_amount) ?? 0;
  const estimatedRevenue = sumPortfolioEstimatedRevenue(revenueEntries);
  const recognizedRevenue = sumPortfolioRecognizedRevenue(revenueEntries);
  const attentionItems = buildOperationalContractAttentionItems({
    administratorId: contract.administrator_id,
    clientId: contract.client_id,
    contractNumber: contract.contract_number,
    creditValue,
    estimatedRevenue,
    recognizedRevenue,
    sourceStatus: contract.status,
  });

  return resolveOperationsContractStatus(contract.status, attentionItems) === "active";
}

function resolveOperationalEstimatedRevenue(
  legacyEstimatedRevenue: number,
  commissionExpectedRevenue: number,
  hasActiveCommissionEngine: boolean,
) {
  if (hasActiveCommissionEngine) {
    return roundCurrency(commissionExpectedRevenue);
  }

  if (legacyEstimatedRevenue > 0) {
    return legacyEstimatedRevenue;
  }

  return roundCurrency(commissionExpectedRevenue);
}

function resolveClientEstimatedRevenue(
  legacyEstimatedRevenue: number,
  commissionExpectedRevenue: number,
) {
  if (legacyEstimatedRevenue > 0) {
    return legacyEstimatedRevenue;
  }

  return roundCurrency(commissionExpectedRevenue);
}

function sumLegacyEstimatedRevenue(revenueEntries: RevenueEntryRow[]) {
  return roundCurrency(
    revenueEntries.reduce((total, entry) => {
      if (entry.status !== "expected" && entry.status !== "pending") {
        return total;
      }

      return total + (normalizeNumber(entry.expected_amount) ?? 0);
    }, 0),
  );
}

function sumLegacyRecognizedRevenue(revenueEntries: RevenueEntryRow[]) {
  return roundCurrency(
    revenueEntries.reduce((total, entry) => {
      if (entry.status !== "paid") {
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

function sumPortfolioEstimatedRevenue(revenueEntries: RevenueEntryRow[]) {
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

function sumPortfolioRecognizedRevenue(revenueEntries: RevenueEntryRow[]) {
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

function resolveLatestDate(currentValue: string | null, nextValue: string | null) {
  if (!nextValue) {
    return currentValue;
  }

  if (!currentValue) {
    return nextValue;
  }

  return new Date(nextValue).getTime() >= new Date(currentValue).getTime()
    ? nextValue
    : currentValue;
}

function isNonOperationalContractStatus(status: string | undefined) {
  return (
    status === "inactive" ||
    status === "cancelled" ||
    status === "rejected"
  );
}

function isValidProfile(
  profile: OperationsSummaryProfile | null,
): profile is OperationsSummaryProfile & {
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

function isMissingContractIdentificationColumnsError(
  error: { code?: string | null; message?: string | null } | null,
) {
  if (!error || error.code !== "42703") {
    return false;
  }

  const message = error.message ?? "";

  return (
    message.includes("contract_group") || message.includes("contract_quota")
  );
}

function buildPortfolioSummaryResponse(input: {
  administrators: {
    activeContractsCount: number;
    contractsCount: number;
    estimatedRevenue: number;
    id: string;
    name: string;
    recognizedRevenue: number;
    totalCreditValue: number;
  }[];
  clients: {
    activeContractsCount: number;
    contractsCount: number;
    createdAt?: string;
    estimatedRevenue: number;
    id: string;
    name: string;
    recognizedRevenue: number;
    totalCreditValue: number;
    updatedAt?: string;
  }[];
  contracts: {
    creditValue: number;
    estimatedRevenue: number;
    recognizedRevenue: number;
    sourceStatus?: string | null;
    status: string;
  }[];
  portfolio: {
    summary: {
      totalPortfolioValue: number;
    };
  };
  revenue: {
    entries: {
      expectedAmount: number;
      recognizedAmount: number;
      status: string;
    }[];
    summary: {
      expectedRevenue: number;
      pendingRevenue: number;
      recognizedRevenue: number;
    };
  };
}): PortfolioSummaryResponse {
  const byStatus = new Map<
    string,
    { contractsCount: number; expectedRevenueAmount: number; totalCreditAmount: number }
  >();

  for (const contract of input.contracts) {
    const status = normalizeContractSourceStatus(contract.sourceStatus);
    const current =
      byStatus.get(status) ?? {
        contractsCount: 0,
        expectedRevenueAmount: 0,
        totalCreditAmount: 0,
      };

    current.contractsCount += 1;
    current.expectedRevenueAmount = roundCurrency(
      current.expectedRevenueAmount + contract.estimatedRevenue,
    );
    current.totalCreditAmount = roundCurrency(
      current.totalCreditAmount + contract.creditValue,
    );
    byStatus.set(status, current);
  }

  const cancelledRevenueAmount = input.revenue.entries
    .filter((entry) => entry.status === "cancelled")
    .reduce((total, entry) => total + entry.expectedAmount, 0);

  return {
    byAdministrator: input.administrators
      .map((administrator) => ({
        activeContractsCount: administrator.activeContractsCount,
        administratorId: administrator.id,
        administratorName: administrator.name,
        contractsCount: administrator.contractsCount,
        expectedRevenueAmount: administrator.estimatedRevenue,
        paidRevenueAmount: administrator.recognizedRevenue,
        totalCreditAmount: administrator.totalCreditValue,
      }))
      .sort((left, right) => right.totalCreditAmount - left.totalCreditAmount),
    byStatus: Array.from(byStatus.entries())
      .map(([status, summary]) => ({
        contractsCount: summary.contractsCount,
        expectedRevenueAmount: summary.expectedRevenueAmount,
        status,
        totalCreditAmount: summary.totalCreditAmount,
      }))
      .sort((left, right) => left.status.localeCompare(right.status)),
    summary: {
      activeContractsCount: input.contracts.filter(
        (contract) => normalizeContractSourceStatus(contract.sourceStatus) === "active",
      ).length,
      activeCreditAmount: roundCurrency(
        input.contracts
          .filter((contract) => contract.status === "active")
          .reduce((total, contract) => total + contract.creditValue, 0),
      ),
      cancelledContractsCount: input.contracts.filter(
        (contract) =>
          ["cancelled", "rejected"].includes(
            normalizeContractSourceStatus(contract.sourceStatus),
          ),
      ).length,
      cancelledRevenueAmount: roundCurrency(cancelledRevenueAmount),
      clientsCount: input.clients.length,
      completedContractsCount: input.contracts.filter(
        (contract) =>
          normalizeContractSourceStatus(contract.sourceStatus) === "completed",
      ).length,
      contractsCount: input.contracts.length,
      draftContractsCount: input.contracts.filter(
        (contract) =>
          ["approved", "draft", "pending_documentation", "submitted"].includes(
            normalizeContractSourceStatus(contract.sourceStatus),
          ),
      ).length,
      expectedRevenueAmount: input.revenue.summary.expectedRevenue,
      overdueRevenueAmount: 0,
      paidRevenueAmount: input.revenue.summary.recognizedRevenue,
      pendingRevenueAmount: input.revenue.summary.pendingRevenue,
      totalCreditAmount: input.portfolio.summary.totalPortfolioValue,
    },
    topClients: input.clients
      .map((client) => ({
        activeContractsCount: client.activeContractsCount,
        clientId: client.id,
        clientName: client.name,
        contractsCount: client.contractsCount,
        expectedRevenueAmount: client.estimatedRevenue,
        lastContractAt: client.updatedAt ?? client.createdAt ?? null,
        paidRevenueAmount: client.recognizedRevenue,
        totalCreditAmount: client.totalCreditValue,
      }))
      .sort((left, right) => right.totalCreditAmount - left.totalCreditAmount),
  };
}

function buildSnapshot(
  portfolio: PortfolioSummaryResponse,
  healthStatus: OperationalHealthStatus,
): OperationsSnapshotMetric[] {
  return [
    {
      id: "health",
      label: "Saude operacional",
      tone: healthStatus,
      value: formatHealthStatus(healthStatus),
    },
    {
      id: "contracts",
      label: "Contratos",
      tone: portfolio.summary.contractsCount > 0 ? "healthy" : "neutral",
      value: String(portfolio.summary.contractsCount),
    },
    {
      id: "active-credit",
      label: "Credito ativo",
      tone: portfolio.summary.activeCreditAmount > 0 ? "healthy" : "neutral",
      value: currencyFormatter.format(portfolio.summary.activeCreditAmount),
    },
    {
      id: "expected-revenue",
      label: "Receita prevista",
      tone:
        portfolio.summary.expectedRevenueAmount > 0 ? "healthy" : "neutral",
      value: currencyFormatter.format(portfolio.summary.expectedRevenueAmount),
    },
  ];
}

function buildAttentionItems(input: {
  administrators: {
    summary: {
      administratorsWithAttention: number;
      administratorsWithoutContracts: number;
    };
  };
  clients: {
    summary: {
      clientsWithAttention: number;
      clientsWithoutContracts: number;
    };
  };
  contracts: {
    summary: {
      attentionContracts: number;
      totalContracts: number;
    };
  };
  portfolio: {
    summary: {
      attentionItems: string[];
    };
  };
  portfolioSummary: PortfolioSummaryResponse;
  revenue: {
    summary: {
      divergentEntries: number;
      pendingRevenue: number;
    };
  };
}): OperationAttentionItem[] {
  const attentionItems: OperationAttentionItem[] = [];
  const { portfolioSummary } = input;

  if (input.contracts.summary.attentionContracts > 0) {
    attentionItems.push({
      area: "contracts",
      description: "Existem contratos com dados incompletos ou divergentes.",
      href: "/operations/contracts",
      id: "contracts-with-attention",
      severity: "high",
      title: "Contratos com atencao",
      value: String(input.contracts.summary.attentionContracts),
    });
  }

  if (portfolioSummary.summary.cancelledContractsCount > 0) {
    attentionItems.push({
      area: "contracts",
      description: "Existem contratos cancelados na carteira.",
      href: "/operations/contracts",
      id: "cancelled-contracts",
      severity: "high",
      title: "Contratos cancelados",
      value: String(portfolioSummary.summary.cancelledContractsCount),
    });
  }

  if (input.revenue.summary.divergentEntries > 0) {
    attentionItems.push({
      area: "revenue",
      description: "Existem receitas com valores reconhecidos acima do previsto.",
      href: "/operations/revenue",
      id: "divergent-revenue",
      severity: "critical",
      title: "Receita divergente",
      value: String(input.revenue.summary.divergentEntries),
    });
  }

  if (input.revenue.summary.pendingRevenue > 0) {
    attentionItems.push({
      area: "revenue",
      description: "Receitas pendentes aguardam evolucao operacional.",
      href: "/operations/revenue",
      id: "pending-revenue",
      severity: "medium",
      title: "Receita pendente",
      value: currencyFormatter.format(input.revenue.summary.pendingRevenue),
    });
  }

  if (input.clients.summary.clientsWithAttention > 0) {
    attentionItems.push({
      area: "clients",
      description: "Clientes possuem pendencias operacionais no read model.",
      href: "/operations/clients",
      id: "clients-with-attention",
      severity: "medium",
      title: "Clientes com atencao",
      value: String(input.clients.summary.clientsWithAttention),
    });
  }

  if (input.administrators.summary.administratorsWithAttention > 0) {
    attentionItems.push({
      area: "administrators",
      description: "Administradoras possuem concentracao ou pendencias vinculadas.",
      href: "/operations/administrators",
      id: "administrators-with-attention",
      severity: "medium",
      title: "Administradoras com atencao",
      value: String(input.administrators.summary.administratorsWithAttention),
    });
  }

  if (input.portfolio.summary.attentionItems.length > 0) {
    attentionItems.push({
      area: "portfolio",
      description: "A carteira possui sinais operacionais de atencao.",
      href: "/operations/portfolio",
      id: "portfolio-with-attention",
      severity: "medium",
      title: "Carteira com atencao",
      value: String(input.portfolio.summary.attentionItems.length),
    });
  }

  if (input.contracts.summary.totalContracts === 0) {
    attentionItems.push({
      area: "contracts",
      description: "Ainda nao existem contratos para consolidar operacao.",
      href: "/operations/contracts",
      id: "empty-contracts",
      severity: "low",
      title: "Carteira sem contratos",
      value: "0",
    });
  }

  return attentionItems;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeContractSourceStatus(status: string | null | undefined) {
  return status?.trim().toLowerCase() || "unknown";
}

function buildDrilldowns(
  portfolio: PortfolioSummaryResponse,
): OperationDrilldownCard[] {
  const topAdministrator = portfolio.byAdministrator[0];
  const topClient = portfolio.topClients[0];

  return [
    {
      description: "Volume consolidado de clientes com dados de carteira.",
      id: "clients",
      label: "Clientes",
      status: portfolio.summary.clientsCount > 0 ? "healthy" : "neutral",
      value: String(portfolio.summary.clientsCount),
    },
    {
      description: "Contratos ativos dentro da carteira operacional.",
      id: "active-contracts",
      label: "Contratos ativos",
      status:
        portfolio.summary.activeContractsCount > 0 ? "healthy" : "attention",
      value: String(portfolio.summary.activeContractsCount),
    },
    {
      description: topAdministrator
        ? topAdministrator.administratorName
        : "Nenhuma administradora com carteira consolidada.",
      id: "top-administrator",
      label: "Principal administradora",
      status: topAdministrator ? "healthy" : "neutral",
      value: topAdministrator
        ? currencyFormatter.format(topAdministrator.totalCreditAmount)
        : "Sem dados",
    },
    {
      description: topClient
        ? topClient.clientName
        : "Nenhum cliente com contrato consolidado.",
      id: "top-client",
      label: "Principal cliente",
      status: topClient ? "healthy" : "neutral",
      value: topClient
        ? currencyFormatter.format(topClient.totalCreditAmount)
        : "Sem dados",
    },
  ];
}

function buildMovementFeed(
  portfolio: PortfolioSummaryResponse,
): OperationMovementItem[] {
  const generatedAt = new Date().toISOString();
  const movements: OperationMovementItem[] = [];

  for (const client of portfolio.topClients.slice(0, 3)) {
    movements.push({
      description: `${client.contractsCount} contrato(s), ${currencyFormatter.format(client.totalCreditAmount)} em credito.`,
      id: `client-${client.clientId}`,
      occurredAt: client.lastContractAt ?? generatedAt,
      title: client.clientName,
      type: "client",
    });
  }

  for (const administrator of portfolio.byAdministrator.slice(0, 2)) {
    movements.push({
      description: `${administrator.contractsCount} contrato(s), ${currencyFormatter.format(administrator.expectedRevenueAmount)} em receita prevista.`,
      id: `administrator-${administrator.administratorId ?? "none"}`,
      occurredAt: generatedAt,
      title: administrator.administratorName,
      type: "administrator",
    });
  }

  return movements
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    )
    .slice(0, 5);
}

function resolveHealthStatus(
  attentionItems: OperationAttentionItem[],
): OperationalHealthStatus {
  if (attentionItems.some((item) => item.severity === "critical")) {
    return "critical";
  }

  if (attentionItems.some((item) => item.severity === "high")) {
    return "attention";
  }

  if (attentionItems.length > 0) {
    return "neutral";
  }

  return "healthy";
}

function formatHealthStatus(status: OperationalHealthStatus) {
  if (status === "critical") {
    return "Critico";
  }

  if (status === "attention") {
    return "Atencao";
  }

  if (status === "neutral") {
    return "Neutro";
  }

  return "Saudavel";
}

function canGenerateOperationalContractAttention(status: string | null) {
  return (
    status !== "inactive" &&
    status !== "cancelled" &&
    status !== "rejected"
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

function roundPercentage(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
