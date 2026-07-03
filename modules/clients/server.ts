import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type { ContractStatus } from "@/modules/contracts/types";
import type {
  ClientContract,
  ClientDetail,
  ClientDetailResponse,
  ClientListFilters,
  ClientListItem,
  ClientSummary,
  LeadClientConversion,
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

type LeadRow = {
  email: string | null;
  id: string;
  nome: string | null;
  organization_id: string | null;
  telefone: string | null;
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

type CommissionPlanRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
};

type RequestContext = {
  profile: ClientProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerClientsSupabaseClient>;
  user: SupabaseUser;
};

export type ClientListResult =
  | { clients: ClientListItem[]; ok: true }
  | { details?: unknown; error: string; ok: false; status: number };

export type ClientDetailResult =
  | ({ ok: true } & ClientDetailResponse)
  | { details?: unknown; error: string; ok: false; status: number };

export type LeadClientConversionResult =
  | ({ ok: true } & LeadClientConversion)
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
  logClientReadDebug("query_payload", {
    filters: normalizedFilters,
    organizationId: context.profile.organization_id,
    route: "GET /api/clients",
    table: "clients",
  });

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

  logClientReadDebug("query_result", {
    error: formatSupabaseDebugError(error),
    found: Array.isArray(data) && data.length > 0,
    route: "GET /api/clients",
    rows: Array.isArray(data) ? data.length : null,
  });

  if (error) {
    return {
      details: formatSupabaseDebugError(error),
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

  logClientReadDebug("query_payload", {
    clientId,
    organizationId: context.profile.organization_id,
    route: "GET /api/clients/[id]",
    table: "clients",
  });

  const { data, error } = await context.supabase
    .from("clients")
    .select(clientColumns)
    .eq("id", clientId)
    .eq("organization_id", context.profile.organization_id)
    .maybeSingle<ClientRow>();

  logClientReadDebug("query_result", {
    clientId: data?.id ?? null,
    error: formatSupabaseDebugError(error),
    found: Boolean(data),
    organizationId: data?.organization_id ?? null,
    route: "GET /api/clients/[id]",
  });

  if (error || !data?.organization_id) {
    return {
      details: formatSupabaseDebugError(error),
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
  const commissionPlansById = await listCommissionPlansById(
    context,
    contractsResult.contracts
      .map((contract) => contract.commission_plan_id)
      .filter((id): id is string => Boolean(id)),
  );

  const contracts = contractsResult.contracts.map((contract) =>
    mapClientContract(contract, commissionPlansById),
  );

  return {
    client: mapClientDetail(data),
    contracts,
    ok: true,
    summary: summarizeContracts(contracts),
  };
}

export async function convertLeadToClient(
  accessToken: string | null,
  leadId: string,
): Promise<LeadClientConversionResult> {
  logClientConversionDebug("request", {
    hasAccessToken: Boolean(accessToken),
    leadId,
  });

  if (!leadId.trim()) {
    return {
      error: "Informe o lead.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveClientRequestContext(accessToken);

  if (!context.ok) {
    logClientConversionDebug("profile_error", {
      error: context.error,
      status: context.status,
    });
    return context;
  }

  const leadResult = await getLeadFromCurrentOrganization(context, leadId);

  if (!leadResult.ok) {
    logClientConversionDebug("lead_lookup_error", {
      error: leadResult.error,
      status: leadResult.status,
    });
    return leadResult;
  }

  const existingClient = await findExistingClientForLead(context, leadResult.lead);

  if (!existingClient.ok) {
    logClientConversionDebug("existing_client_lookup_error", {
      error: existingClient.error,
      status: existingClient.status,
    });
    return existingClient;
  }

  logClientConversionDebug("existing_client_lookup_result", {
    clientId: existingClient.client?.id ?? null,
    found: Boolean(existingClient.client),
  });

  if (existingClient.client) {
    const updatedClient = await updateClientFromLead(
      context,
      existingClient.client,
      leadResult.lead,
    );

    if (!updatedClient.ok) {
      return updatedClient;
    }

    logClientConversionDebug("return_payload", {
      clientId: updatedClient.client.id,
      created: false,
      leadId: leadResult.lead.id,
    });

    return {
      client: mapClientDetail(updatedClient.client),
      created: false,
      lead: { id: leadResult.lead.id },
      ok: true,
    };
  }

  const createdClient = await createClientFromLead(context, leadResult.lead);

  if (!createdClient.ok) {
    return createdClient;
  }

  logClientConversionDebug("return_payload", {
    clientId: createdClient.client.id,
    created: true,
    leadId: leadResult.lead.id,
  });

  return {
    client: mapClientDetail(createdClient.client),
    created: true,
    lead: { id: leadResult.lead.id },
    ok: true,
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
    logClientConversionDebug("session_resolved", {
      hasAccessToken: false,
      hasSession: false,
      ok: false,
      userId: null,
    });

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

    logClientConversionDebug("session_resolved", {
      hasSession: Boolean(userData.user && !userError),
      error: formatSupabaseDebugError(userError),
      ok: Boolean(userData.user && !userError),
      userId: userData.user?.id ?? null,
    });

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

    logClientConversionDebug("profile_resolved", {
      authenticatedUserId: userData.user.id,
      error: formatSupabaseDebugError(profileError),
      organizationId: profile?.organization_id ?? null,
      profileId: profile?.id ?? null,
      role: profile?.role ?? null,
      valid: isValidProfile(profile),
    });

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
  } catch (error) {
    logClientConversionDebug("caught_exception", normalizeCaughtException(error));

    return {
      error:
        error instanceof Error
          ? error.message
          : "Erro inesperado ao resolver sessao.",
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
    logClientReadDebug("contracts_enrichment_error", {
      clientIds,
      error: formatSupabaseDebugError(error),
      route: "GET /api/clients",
    });

    return {
      contracts: contractsByClientId,
      ok: true as const,
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
    logClientReadDebug("contracts_enrichment_error", {
      clientId,
      error: formatSupabaseDebugError(error),
      route: "GET /api/clients/[id]",
    });

    return {
      contracts: [] as ClientContractRow[],
      ok: true as const,
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
  const contracts = contractRows.map((contract) => mapClientContract(contract));
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

function mapClientContract(
  row: ClientContractRow,
  commissionPlansById = new Map<string, string>(),
): ClientContract {
  return {
    administratorId: row.administrator_id,
    commissionPlanId: row.commission_plan_id,
    commissionPlanName: row.commission_plan_id
      ? commissionPlansById.get(row.commission_plan_id) ?? null
      : null,
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

async function listCommissionPlansById(
  context: RequestContext,
  commissionPlanIds: string[],
) {
  const commissionPlansById = new Map<string, string>();
  const uniqueIds = Array.from(new Set(commissionPlanIds));

  if (!uniqueIds.length) {
    return commissionPlansById;
  }

  const { data, error } = await context.supabase
    .from("commission_plans")
    .select("id, organization_id, name")
    .eq("organization_id", context.profile.organization_id)
    .in("id", uniqueIds);

  if (error) {
    logClientReadDebug("commission_plans_enrichment_error", {
      error: formatSupabaseDebugError(error),
      route: "GET /api/clients/[id]",
    });

    return commissionPlansById;
  }

  for (const row of (data ?? []) as unknown as CommissionPlanRow[]) {
    if (row.organization_id !== context.profile.organization_id) {
      continue;
    }

    commissionPlansById.set(row.id, normalizeText(row.name) || "Plano sem nome");
  }

  return commissionPlansById;
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

async function getLeadFromCurrentOrganization(
  context: RequestContext,
  leadId: string,
) {
  logClientConversionDebug("lead_lookup_query", {
    leadId,
    organizationId: context.profile.organization_id,
    table: "crm_leads",
  });

  const { data, error } = await context.supabase
    .from("crm_leads")
    .select("id, organization_id, nome, telefone, email")
    .eq("id", leadId)
    .maybeSingle<LeadRow>();

  logClientConversionDebug("lead_lookup_result", {
    error: formatSupabaseDebugError(error),
    found: Boolean(data),
    leadId: data?.id ?? null,
    organizationId: data?.organization_id ?? null,
  });

  if (error || !data?.organization_id) {
    return {
      error: "Lead nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Lead nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  return {
    lead: data,
    ok: true as const,
  };
}

async function findExistingClientForLead(context: RequestContext, lead: LeadRow) {
  const filters = buildClientMatchFilters(lead);

  logClientConversionDebug("existing_client_lookup_query", {
    filters,
    leadId: lead.id,
    organizationId: context.profile.organization_id,
    table: "clients",
  });

  if (!filters.length) {
    return {
      client: null,
      ok: true as const,
    };
  }

  const { data, error } = await context.supabase
    .from("clients")
    .select(clientColumns)
    .eq("organization_id", context.profile.organization_id)
    .or(filters.join(","))
    .order("updated_at", { ascending: false })
    .limit(1);

  logClientConversionDebug("existing_client_lookup_query_result", {
    error: formatSupabaseDebugError(error),
    rows: Array.isArray(data) ? data.length : null,
  });

  if (error) {
    return {
      error: "Nao foi possivel localizar cliente existente.",
      ok: false as const,
      status: 500,
    };
  }

  const client = ((data ?? []) as unknown as ClientRow[]).find(
    (item) => item.organization_id === context.profile.organization_id,
  );

  return {
    client: client ?? null,
    ok: true as const,
  };
}

async function createClientFromLead(context: RequestContext, lead: LeadRow) {
  const payload = {
    email: normalizeNullableText(lead.email),
    name: normalizeNullableText(lead.nome) ?? "Cliente sem nome",
    organization_id: context.profile.organization_id,
    phone: normalizeNullableText(lead.telefone),
    status: "active",
    created_by: context.profile.id,
    updated_by: context.profile.id,
  };

  logClientConversionDebug("insert_attempt", {
    leadId: lead.id,
    organizationId: context.profile.organization_id,
    payload,
  });

  const { data, error } = await context.supabase
    .from("clients")
    .insert(payload)
    .select(clientColumns)
    .single<ClientRow>();

  if (error || !data?.organization_id) {
    logClientConversionDebug("insert_result", {
      data,
      error,
    });

    return {
      error: "Nao foi possivel criar o cliente a partir do lead.",
      ok: false as const,
      status: 500,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 500,
    };
  }

  logClientConversionDebug("insert_result", {
    data,
    error,
  });

  return {
    client: data,
    ok: true as const,
  };
}

async function updateClientFromLead(
  context: RequestContext,
  client: ClientRow,
  lead: LeadRow,
) {
  const { data, error } = await context.supabase
    .from("clients")
    .update({
      email: normalizeNullableText(client.email) ?? normalizeNullableText(lead.email),
      name:
        normalizeNullableText(client.name) ??
        normalizeNullableText(lead.nome) ??
        "Cliente sem nome",
      phone:
        normalizeNullableText(client.phone) ?? normalizeNullableText(lead.telefone),
      status: normalizeNullableText(client.status) ?? "active",
      updated_by: context.profile.id,
    })
    .eq("id", client.id)
    .eq("organization_id", context.profile.organization_id)
    .select(clientColumns)
    .single<ClientRow>();

  if (error || !data?.organization_id) {
    logClientConversionDebug("update_result", {
      clientId: client.id,
      error: formatSupabaseDebugError(error),
      hasData: Boolean(data),
      organizationId: data?.organization_id ?? null,
    });

    return {
      error: "Nao foi possivel atualizar o cliente convertido.",
      ok: false as const,
      status: 500,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 500,
    };
  }

  logClientConversionDebug("update_result", {
    clientId: data.id,
    organizationId: data.organization_id,
  });

  return {
    client: data,
    ok: true as const,
  };
}

function buildClientMatchFilters(lead: LeadRow) {
  const email = normalizeNullableText(lead.email);
  const phone = normalizeNullableText(lead.telefone);
  const name = normalizeNullableText(lead.nome);

  if (email) {
    return [`email.eq.${escapePostgrestSearch(email)}`];
  }

  if (phone) {
    return [`phone.eq.${escapePostgrestSearch(phone)}`];
  }

  if (name) {
    return [`name.eq.${escapePostgrestSearch(name)}`];
  }

  return [];
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

function logClientConversionDebug(
  stage: string,
  payload: Record<string, unknown>,
) {
  const logPayload = {
    ...payload,
    stage,
  };

  if (stage === "caught_exception") {
    console.error("[EVOLV clients]", logPayload);
    return;
  }

  console.info("[EVOLV clients]", logPayload);
}

function logClientReadDebug(stage: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[EVOLV clients]", {
    ...payload,
    stage,
  });
}

function formatSupabaseDebugError(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const record = error as Record<string, unknown>;

  return {
    code: typeof record.code === "string" ? record.code : null,
    details: typeof record.details === "string" ? record.details : null,
    hint: typeof record.hint === "string" ? record.hint : null,
    message: typeof record.message === "string" ? record.message : null,
  };
}

function normalizeCaughtException(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
    name: "UnknownError",
    stack: null,
  };
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
