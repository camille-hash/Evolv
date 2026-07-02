import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  OperationsContractRow,
  OperationsContractsResponse,
  OperationsContractStatus,
} from "./contracts-types";

type OperationsContractsProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
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
  contract_id: string | null;
  expected_amount: number | string | null;
  organization_id: string | null;
  status: string | null;
};

type RequestContext = {
  profile: OperationsContractsProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "sdr";
  };
  supabase: ReturnType<typeof createServerOperationsContractsSupabaseClient>;
  user: SupabaseUser;
};

export type OperationsContractsResult =
  | ({ ok: true } & OperationsContractsResponse)
  | { error: string; ok: false; status: number };

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function listOperationsContracts(
  accessToken: string | null,
): Promise<OperationsContractsResult> {
  const context = await resolveOperationsContractsRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const dataset = await loadOperationsContractsDataset(context);

  if (!dataset.ok) {
    return dataset;
  }

  const contracts = buildOperationsContractRows(dataset)
    .sort((left, right) => {
      const leftDate = left.updatedAt ?? left.createdAt ?? "";
      const rightDate = right.updatedAt ?? right.createdAt ?? "";

      return new Date(rightDate).getTime() - new Date(leftDate).getTime();
    });

  return {
    contracts,
    ok: true,
    summary: summarizeContracts(contracts),
  };
}

function buildOperationsContractRows(dataset: {
  administrators: AdministratorRow[];
  clients: ClientRow[];
  contracts: ContractRow[];
  revenueEntries: RevenueEntryRow[];
}): OperationsContractRow[] {
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

  return dataset.contracts.map((contract) => {
    const creditValue = normalizeNumber(contract.credit_amount) ?? 0;
    const revenueEntries = revenueByContractId.get(contract.id) ?? [];
    const estimatedRevenue = sumEstimatedRevenue(revenueEntries);
    const recognizedRevenue = sumRecognizedRevenue(revenueEntries);
    const clientName = contract.client_id
      ? clientsById.get(contract.client_id) ?? "Cliente nao encontrado"
      : "Cliente nao vinculado";
    const administratorName = contract.administrator_id
      ? administratorsById.get(contract.administrator_id) ??
        "Administradora nao encontrada"
      : "Administradora nao vinculada";
    const attentionItems = buildContractAttentionItems({
      administratorId: contract.administrator_id,
      clientId: contract.client_id,
      contractNumber: contract.contract_number,
      creditValue,
      estimatedRevenue,
      recognizedRevenue,
    });

    return {
      administratorName,
      attentionItems,
      clientName,
      contractNumber: normalizeNullableText(contract.contract_number) ?? undefined,
      createdAt: contract.created_at ?? undefined,
      creditValue,
      estimatedRevenue,
      id: contract.id,
      recognizedRevenue,
      status: resolveOperationsContractStatus(contract.status, attentionItems),
      updatedAt: contract.updated_at ?? contract.created_at ?? undefined,
    };
  });
}

function summarizeContracts(
  contracts: OperationsContractRow[],
): OperationsContractsResponse["summary"] {
  return contracts.reduce(
    (summary, contract) => ({
      activeContracts:
        summary.activeContracts + (contract.status === "active" ? 1 : 0),
      attentionContracts:
        summary.attentionContracts + (contract.attentionItems.length ? 1 : 0),
      estimatedRevenue: roundCurrency(
        summary.estimatedRevenue + contract.estimatedRevenue,
      ),
      recognizedRevenue: roundCurrency(
        summary.recognizedRevenue + contract.recognizedRevenue,
      ),
      totalContracts: summary.totalContracts + 1,
      totalCreditValue: roundCurrency(
        summary.totalCreditValue + contract.creditValue,
      ),
    }),
    {
      activeContracts: 0,
      attentionContracts: 0,
      estimatedRevenue: 0,
      recognizedRevenue: 0,
      totalContracts: 0,
      totalCreditValue: 0,
    },
  );
}

function buildContractAttentionItems(input: {
  administratorId: string | null;
  clientId: string | null;
  contractNumber: string | null;
  creditValue: number;
  estimatedRevenue: number;
  recognizedRevenue: number;
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

function resolveOperationsContractStatus(
  status: string | null,
  attentionItems: string[],
): OperationsContractStatus {
  if (status === "completed") {
    return "completed";
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

async function loadOperationsContractsDataset(context: RequestContext) {
  const [contractsResult, clientsResult, administratorsResult, revenueResult] =
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
            "status",
            "credit_amount",
            "created_at",
            "updated_at",
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
            "status",
            "expected_amount",
            "actual_amount",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
    ]);

  if (
    contractsResult.error ||
    clientsResult.error ||
    administratorsResult.error ||
    revenueResult.error
  ) {
    return {
      error: "Nao foi possivel carregar os contratos operacionais.",
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
      (revenueResult.data ?? []) as unknown as RevenueEntryRow[]
    ).filter(
      (revenueEntry) =>
        revenueEntry.organization_id === context.profile.organization_id,
    ),
  };
}

function createServerOperationsContractsSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase operations contracts server environment is not configured.",
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

async function resolveOperationsContractsRequestContext(
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
    const supabase = createServerOperationsContractsSupabaseClient(accessToken);
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
      .maybeSingle<OperationsContractsProfile>();

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

function isValidProfile(
  profile: OperationsContractsProfile | null,
): profile is OperationsContractsProfile & {
  is_active: true;
  organization_id: string;
  role: "admin" | "sdr";
} {
  return Boolean(
    profile?.id &&
      profile.organization_id &&
      profile.is_active === true &&
      (profile.role === "admin" || profile.role === "sdr"),
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
