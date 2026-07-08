import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { getContractCommissionSummary } from "@/modules/commission-engine/server";
import type { ContractCommissionSummary } from "@/modules/commission-engine/types";
import type {
  OperationsClientRow,
  OperationsClientsResponse,
  OperationsClientStatus,
} from "./clients-types";

type OperationsClientsProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type ClientRow = {
  created_at: string | null;
  email: string | null;
  id: string;
  name: string | null;
  organization_id: string | null;
  phone: string | null;
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
  id: string;
  name: string | null;
  organization_id: string | null;
};

type RevenueEntryRow = {
  actual_amount: number | string | null;
  contract_id: string | null;
  expected_amount: number | string | null;
  organization_id: string | null;
  status: string | null;
};

type RequestContext = {
  profile: OperationsClientsProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerOperationsClientsSupabaseClient>;
  user: SupabaseUser;
};

export type OperationsClientsResult =
  | ({ ok: true } & OperationsClientsResponse)
  | { error: string; ok: false; status: number };

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function listOperationsClients(
  accessToken: string | null,
): Promise<OperationsClientsResult> {
  const context = await resolveOperationsClientsRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const dataset = await loadOperationsClientsDataset(context);

  if (!dataset.ok) {
    return dataset;
  }

  const clients = buildOperationsClientRows(dataset).sort((left, right) => {
    const leftDate = left.updatedAt ?? left.createdAt ?? "";
    const rightDate = right.updatedAt ?? right.createdAt ?? "";

    return new Date(rightDate).getTime() - new Date(leftDate).getTime();
  });

  return {
    clients,
    ok: true,
    summary: summarizeClients(clients),
  };
}

function buildOperationsClientRows(dataset: {
  administrators: AdministratorRow[];
  clients: ClientRow[];
  commissionSummaries: Map<string, ContractCommissionSummary>;
  contracts: ContractRow[];
  revenueEntries: RevenueEntryRow[];
}): OperationsClientRow[] {
  const contractsByClientId = groupContractsByClientId(dataset.contracts);
  const revenueByContractId = groupRevenueByContractId(dataset.revenueEntries);
  const administratorsById = new Map(
    dataset.administrators.map((administrator) => [
      administrator.id,
      normalizeText(administrator.name) || "Administradora sem nome",
    ]),
  );

  return dataset.clients.map((client) => {
    const contracts = contractsByClientId.get(client.id) ?? [];
    const contractSummary = contracts.reduce(
      (summary, contract) => {
        const revenueEntries = revenueByContractId.get(contract.id) ?? [];
        const creditValue = normalizeNumber(contract.credit_amount) ?? 0;
        const commissionSummary = dataset.commissionSummaries.get(contract.id);
        const estimatedRevenue = resolveOperationalEstimatedRevenue(
          sumEstimatedRevenue(revenueEntries),
          commissionSummary?.totals.expectedAmount ?? 0,
        );
        const recognizedRevenue = sumRecognizedRevenue(revenueEntries);
        const administratorName = contract.administrator_id
          ? administratorsById.get(contract.administrator_id) ??
            "Administradora nao encontrada"
          : null;

        summary.contractsCount += 1;
        summary.totalCreditValue = roundCurrency(
          summary.totalCreditValue + creditValue,
        );
        summary.estimatedRevenue = roundCurrency(
          summary.estimatedRevenue + estimatedRevenue,
        );
        summary.recognizedRevenue = roundCurrency(
          summary.recognizedRevenue + recognizedRevenue,
        );
        summary.updatedAt = pickLatestDate(
          summary.updatedAt,
          contract.updated_at ?? contract.created_at,
        );

        if (contract.status === "active") {
          summary.activeContractsCount += 1;
        }

        if (administratorName) {
          summary.administrators.add(administratorName);
        }

        for (const attentionItem of buildContractAttentionItems({
          administratorId: contract.administrator_id,
          contractNumber: contract.contract_number,
          creditValue,
          estimatedRevenue,
          recognizedRevenue,
        })) {
          summary.attentionItems.add(attentionItem);
        }

        return summary;
      },
      {
        activeContractsCount: 0,
        administrators: new Set<string>(),
        attentionItems: new Set<string>(),
        contractsCount: 0,
        estimatedRevenue: 0,
        recognizedRevenue: 0,
        totalCreditValue: 0,
        updatedAt: client.updated_at ?? client.created_at,
      },
    );

    if (contracts.length === 0) {
      contractSummary.attentionItems.add("Client without linked contract");
    }

    if (contractSummary.totalCreditValue <= 0) {
      contractSummary.attentionItems.add("Client with zero total credit value");
    }

    return {
      activeContractsCount: contractSummary.activeContractsCount,
      administrators: Array.from(contractSummary.administrators).sort((left, right) =>
        left.localeCompare(right),
      ),
      attentionItems: Array.from(contractSummary.attentionItems),
      contractsCount: contractSummary.contractsCount,
      createdAt: client.created_at ?? undefined,
      email: normalizeNullableText(client.email) ?? undefined,
      estimatedRevenue: contractSummary.estimatedRevenue,
      id: client.id,
      name: normalizeText(client.name) || "Cliente sem nome",
      phone: normalizeNullableText(client.phone) ?? undefined,
      recognizedRevenue: contractSummary.recognizedRevenue,
      status: resolveOperationsClientStatus(
        client.status,
        contractSummary.attentionItems.size,
      ),
      totalCreditValue: contractSummary.totalCreditValue,
      updatedAt: contractSummary.updatedAt ?? undefined,
    };
  });
}

function summarizeClients(
  clients: OperationsClientRow[],
): OperationsClientsResponse["summary"] {
  return clients.reduce(
    (summary, client) => ({
      activeClients:
        summary.activeClients + (client.status === "active" ? 1 : 0),
      clientsWithAttention:
        summary.clientsWithAttention + (client.attentionItems.length ? 1 : 0),
      clientsWithContracts:
        summary.clientsWithContracts + (client.contractsCount > 0 ? 1 : 0),
      clientsWithoutContracts:
        summary.clientsWithoutContracts + (client.contractsCount === 0 ? 1 : 0),
      estimatedRevenue: roundCurrency(
        summary.estimatedRevenue + client.estimatedRevenue,
      ),
      recognizedRevenue: roundCurrency(
        summary.recognizedRevenue + client.recognizedRevenue,
      ),
      totalClients: summary.totalClients + 1,
      totalCreditValue: roundCurrency(
        summary.totalCreditValue + client.totalCreditValue,
      ),
    }),
    {
      activeClients: 0,
      clientsWithAttention: 0,
      clientsWithContracts: 0,
      clientsWithoutContracts: 0,
      estimatedRevenue: 0,
      recognizedRevenue: 0,
      totalClients: 0,
      totalCreditValue: 0,
    },
  );
}

function buildContractAttentionItems(input: {
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

function resolveOperationsClientStatus(
  status: string | null,
  attentionItemsCount: number,
): OperationsClientStatus {
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

async function loadOperationsClientsDataset(context: RequestContext) {
  const [clientsResult, contractsResult, administratorsResult, revenueResult] =
    await Promise.all([
      context.supabase
        .from("clients")
        .select(
          [
            "id",
            "organization_id",
            "name",
            "email",
            "phone",
            "status",
            "created_at",
            "updated_at",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
      context.supabase
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
            "status",
            "expected_amount",
            "actual_amount",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
    ]);

  if (
    clientsResult.error ||
    contractsResult.error ||
    administratorsResult.error ||
    revenueResult.error
  ) {
    return {
      error: "Nao foi possivel carregar os clientes operacionais.",
      ok: false as const,
      status: 500,
    };
  }

  const contracts = ((contractsResult.data ?? []) as unknown as ContractRow[]).filter(
    (contract) => contract.organization_id === context.profile.organization_id,
  );
  const commissionSummariesResult = await loadCommissionSummaries(
    context,
    contracts,
  );

  if (!commissionSummariesResult.ok) {
    return commissionSummariesResult;
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
    commissionSummaries: commissionSummariesResult.commissionSummaries,
    contracts,
    ok: true as const,
    revenueEntries: (
      (revenueResult.data ?? []) as unknown as RevenueEntryRow[]
    ).filter(
      (revenueEntry) =>
        revenueEntry.organization_id === context.profile.organization_id,
    ),
  };
}

function createServerOperationsClientsSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase operations clients server environment is not configured.",
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

async function resolveOperationsClientsRequestContext(
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
    const supabase = createServerOperationsClientsSupabaseClient(accessToken);
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
      .maybeSingle<OperationsClientsProfile>();

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

function sumEstimatedRevenue(revenueEntries: RevenueEntryRow[]) {
  return roundCurrency(
    revenueEntries.reduce((total, entry) => {
      if (entry.status !== "expected" && entry.status !== "pending") {
        return total;
      }

      return total + (normalizeNumber(entry.expected_amount) ?? 0);
    }, 0),
  );
}

function resolveOperationalEstimatedRevenue(
  legacyEstimatedRevenue: number,
  commissionExpectedRevenue: number,
) {
  if (legacyEstimatedRevenue > 0) {
    return legacyEstimatedRevenue;
  }

  return roundCurrency(commissionExpectedRevenue);
}

function sumRecognizedRevenue(revenueEntries: RevenueEntryRow[]) {
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

async function loadCommissionSummaries(
  context: RequestContext,
  contracts: ContractRow[],
) {
  const commissionSummaries = new Map<string, ContractCommissionSummary>();

  for (const contract of contracts) {
    const summary = await getContractCommissionSummary({
      contractId: contract.id,
      organizationId: context.profile.organization_id,
      supabase: context.supabase,
    });

    if (!summary.ok) {
      return {
        error: "Nao foi possivel carregar resumo de comissao dos contratos.",
        ok: false as const,
        status: summary.status,
      };
    }

    commissionSummaries.set(contract.id, {
      expectedRevenue: summary.expectedRevenue,
      hasCommissionEngine: summary.hasCommissionEngine,
      schedule: summary.schedule,
      snapshot: summary.snapshot,
      totals: summary.totals,
    });
  }

  return {
    commissionSummaries,
    ok: true as const,
  };
}

function isValidProfile(
  profile: OperationsClientsProfile | null,
): profile is OperationsClientsProfile & {
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
