import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type { ContractStatus } from "@/modules/contracts/types";
import type {
  ClientContract,
  ClientDetail,
  ClientDetailResponse,
  ClientListFilters,
  ClientListItem,
  ClientSummary,
} from "./types";

type ClientProfile = {
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

type ClientContractRow = {
  administrator_id: string | null;
  commission_plan_id: string | null;
  contract_number: string | null;
  created_at: string | null;
  credit_amount: number | string | null;
  id: string;
  installment_amount: number | string | null;
  lead_id: string | null;
  product_type: string | null;
  status: string | null;
  term_months: number | null;
  updated_at: string | null;
};

type RequestContext = {
  profile: ClientProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "sdr";
  };
  supabase: ReturnType<typeof createServerClientsSupabaseClient>;
  user: SupabaseUser;
};

export type ClientListResult =
  | { clients: ClientListItem[]; ok: true }
  | { error: string; ok: false; status: number };

export type ClientDetailResult =
  | ({ ok: true } & ClientDetailResponse)
  | { error: string; ok: false; status: number };

const clientColumns = [
  "id",
  "organization_id",
  "name",
  "email",
  "phone",
  "status",
  "created_at",
  "updated_at",
].join(",");

const clientContractColumns = [
  "id",
  "lead_id",
  "contract_number",
  "status",
  "product_type",
  "credit_amount",
  "installment_amount",
  "term_months",
  "administrator_id",
  "commission_plan_id",
  "created_at",
  "updated_at",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function listClients(
  accessToken: string | null,
  filters: ClientListFilters,
): Promise<ClientListResult> {
  const context = await resolveClientRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const normalizedFilters = normalizeClientListFilters(filters);
  let query = context.supabase
    .from("clients")
    .select(clientColumns)
    .eq("organization_id", context.profile.organization_id)
    .order("updated_at", { ascending: false });

  if (normalizedFilters.status) {
    query = query.eq("status", normalizedFilters.status);
  }

  if (normalizedFilters.search) {
    const searchPattern = `%${escapePostgrestSearch(normalizedFilters.search)}%`;
    query = query.or(
      [
        `name.ilike.${searchPattern}`,
        `email.ilike.${searchPattern}`,
        `phone.ilike.${searchPattern}`,
      ].join(","),
    );
  }

  const { data, error } = await query.range(
    normalizedFilters.offset,
    normalizedFilters.offset + normalizedFilters.limit - 1,
  );

  if (error) {
    return {
      error: "Nao foi possivel carregar os clientes.",
      ok: false,
      status: 500,
    };
  }

  const clients = ((data ?? []) as unknown as ClientRow[]).filter(
    (client) => client.organization_id === context.profile.organization_id,
  );
  const contractsByClientId = await listContractsGroupedByClient(
    context,
    clients.map((client) => client.id),
  );

  if (!contractsByClientId.ok) {
    return contractsByClientId;
  }

  return {
    clients: clients.map((client) =>
      mapClientListItem(client, contractsByClientId.contracts.get(client.id) ?? []),
    ),
    ok: true,
  };
}

export async function getClientById(
  accessToken: string | null,
  clientId: string,
): Promise<ClientDetailResult> {
  if (!clientId.trim()) {
    return {
      error: "Informe o cliente.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveClientRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const { data, error } = await context.supabase
    .from("clients")
    .select(clientColumns)
    .eq("id", clientId)
    .maybeSingle<ClientRow>();

  if (error || !data?.organization_id) {
    return {
      error: "Cliente nao encontrado.",
      ok: false,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Cliente nao encontrado.",
      ok: false,
      status: 404,
    };
  }

  const contractsResult = await listContractsForClient(context, data.id);

  if (!contractsResult.ok) {
    return contractsResult;
  }

  const contracts = contractsResult.contracts.map(mapClientContract);

  return {
    client: mapClientDetail(data),
    contracts,
    ok: true,
    summary: summarizeContracts(contracts),
  };
}

function createServerClientsSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase clients server environment is not configured.");
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

async function resolveClientRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerClientsSupabaseClient(accessToken);
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
      .maybeSingle<ClientProfile>();

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

async function listContractsGroupedByClient(
  context: RequestContext,
  clientIds: string[],
) {
  const contractsByClientId = new Map<string, ClientContractRow[]>();

  if (!clientIds.length) {
    return {
      contracts: contractsByClientId,
      ok: true as const,
    };
  }

  const { data, error } = await context.supabase
    .from("contracts")
    .select(`${clientContractColumns}, client_id, organization_id`)
    .eq("organization_id", context.profile.organization_id)
    .in("client_id", clientIds);

  if (error) {
    return {
      error: "Nao foi possivel carregar os contratos dos clientes.",
      ok: false as const,
      status: 500,
    };
  }

  for (const row of (data ?? []) as unknown as Array<
    ClientContractRow & { client_id: string | null; organization_id: string | null }
  >) {
    if (
      !row.client_id ||
      row.organization_id !== context.profile.organization_id
    ) {
      continue;
    }

    contractsByClientId.set(row.client_id, [
      ...(contractsByClientId.get(row.client_id) ?? []),
      row,
    ]);
  }

  return {
    contracts: contractsByClientId,
    ok: true as const,
  };
}

async function listContractsForClient(
  context: RequestContext,
  clientId: string,
) {
  const { data, error } = await context.supabase
    .from("contracts")
    .select(clientContractColumns)
    .eq("organization_id", context.profile.organization_id)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: "Nao foi possivel carregar os contratos do cliente.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    contracts: (data ?? []) as unknown as ClientContractRow[],
    ok: true as const,
  };
}

function normalizeClientListFilters(filters: ClientListFilters) {
  return {
    limit: Math.min(Math.max(filters.limit ?? 50, 1), 100),
    offset: Math.max(filters.offset ?? 0, 0),
    search: normalizeNullableText(filters.search),
    status: normalizeNullableText(filters.status),
  };
}

function mapClientListItem(
  client: ClientRow,
  contractRows: ClientContractRow[],
): ClientListItem {
  const contracts = contractRows.map(mapClientContract);
  const summary = summarizeContracts(contracts);

  return {
    activeContractsCount: summary.activeContractsCount,
    contractsCount: summary.contractsCount,
    createdAt: client.created_at ?? new Date().toISOString(),
    email: normalizeNullableText(client.email),
    id: client.id,
    name: normalizeText(client.name) || "Cliente sem nome",
    phone: normalizeNullableText(client.phone),
    status: normalizeText(client.status) || "active",
    totalCreditAmount: summary.totalCreditAmount,
    updatedAt: client.updated_at ?? client.created_at ?? new Date().toISOString(),
  };
}

function mapClientDetail(client: ClientRow): ClientDetail {
  return {
    createdAt: client.created_at ?? new Date().toISOString(),
    email: normalizeNullableText(client.email),
    id: client.id,
    name: normalizeText(client.name) || "Cliente sem nome",
    phone: normalizeNullableText(client.phone),
    status: normalizeText(client.status) || "active",
    updatedAt: client.updated_at ?? client.created_at ?? new Date().toISOString(),
  };
}

function mapClientContract(row: ClientContractRow): ClientContract {
  return {
    administratorId: row.administrator_id,
    commissionPlanId: row.commission_plan_id,
    contractNumber: row.contract_number,
    createdAt: row.created_at ?? new Date().toISOString(),
    creditAmount: normalizeNumber(row.credit_amount) ?? 0,
    id: row.id,
    installmentAmount: normalizeNumber(row.installment_amount),
    leadId: row.lead_id,
    productType: row.product_type,
    status: normalizeContractStatus(row.status),
    termMonths: row.term_months,
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

function summarizeContracts(contracts: ClientContract[]): ClientSummary {
  return contracts.reduce<ClientSummary>(
    (summary, contract) => ({
      activeContractsCount:
        summary.activeContractsCount + (contract.status === "active" ? 1 : 0),
      contractsCount: summary.contractsCount + 1,
      draftContractsCount:
        summary.draftContractsCount + (contract.status === "draft" ? 1 : 0),
      totalCreditAmount: summary.totalCreditAmount + contract.creditAmount,
    }),
    {
      activeContractsCount: 0,
      contractsCount: 0,
      draftContractsCount: 0,
      totalCreditAmount: 0,
    },
  );
}

function normalizeContractStatus(value: string | null): ContractStatus {
  if (
    value === "draft" ||
    value === "pending_documentation" ||
    value === "submitted" ||
    value === "approved" ||
    value === "active" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "rejected"
  ) {
    return value;
  }

  return "draft";
}

function isValidProfile(
  profile: ClientProfile | null,
): profile is ClientProfile & {
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
  if (value === null || value === undefined) {
    return null;
  }

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

function escapePostgrestSearch(value: string) {
  return value.replace(/[%*,()]/g, " ").trim();
}
