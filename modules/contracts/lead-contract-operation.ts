import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { validateCommissionPlanBelongsToOrganization } from "@/modules/commission-plans/server";
import type { Contract, ContractStatus } from "./types";

type ContractProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type OrganizationRow = {
  id: string;
  organization_id: string | null;
};

type LeadRow = {
  email: string | null;
  id: string;
  nome: string | null;
  organization_id: string | null;
  telefone: string | null;
  valor_pretendido: number | string | null;
};

type ClientRow = {
  id: string;
  organization_id: string | null;
};

type ContractRow = {
  activated_at: string | null;
  administrator_id: string | null;
  approved_at: string | null;
  cancelled_at: string | null;
  client_id: string | null;
  commission_plan_id: string | null;
  completed_at: string | null;
  contemplation_model: string | null;
  contract_number: string | null;
  created_at: string | null;
  created_by: string | null;
  credit_amount: number | string | null;
  id: string;
  installment_amount: number | string | null;
  lead_id: string | null;
  metadata: Record<string, unknown> | null;
  organization_id: string;
  product_type: string | null;
  rejected_at: string | null;
  signed_at: string | null;
  status: string | null;
  submitted_at: string | null;
  term_months: number | null;
  updated_at: string | null;
  updated_by: string | null;
};

type RequestContext = {
  profile: ContractProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerContractsSupabaseClient>;
  user: SupabaseUser;
};

export type LeadContractInput = {
  administratorId?: string | null;
  clientId?: string | null;
  commissionPlanId?: string | null;
  contemplationModel?: string | null;
  contractNumber?: string | null;
  creditAmount?: number;
  installmentAmount?: number | null;
  metadata?: Record<string, unknown>;
  productType?: string | null;
  termMonths?: number | null;
};

export type LeadContractOperationResult =
  | {
      client: { id: string };
      contract: Contract;
      lead: { id: string };
      ok: true;
    }
  | { error: string; ok: false; status: number };

const contractColumns = [
  "id",
  "organization_id",
  "lead_id",
  "client_id",
  "administrator_id",
  "commission_plan_id",
  "contract_number",
  "status",
  "product_type",
  "credit_amount",
  "installment_amount",
  "term_months",
  "contemplation_model",
  "signed_at",
  "submitted_at",
  "approved_at",
  "activated_at",
  "cancelled_at",
  "completed_at",
  "rejected_at",
  "metadata",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export function parseLeadContractInput(value: unknown) {
  if (!isRecord(value)) {
    return invalid("Informe os dados do contrato.");
  }

  const input: LeadContractInput = {};

  const nullableTextFields = [
    ["clientId", "clientId"],
    ["administratorId", "administratorId"],
    ["commissionPlanId", "commissionPlanId"],
    ["contractNumber", "contractNumber"],
    ["productType", "productType"],
    ["contemplationModel", "contemplationModel"],
  ] as const;

  for (const [sourceKey, targetKey] of nullableTextFields) {
    if (sourceKey in value) {
      input[targetKey] = normalizeNullableText(value[sourceKey]);
    }
  }

  if ("creditAmount" in value) {
    const creditAmount = normalizeNonNegativeNumber(value.creditAmount);

    if (creditAmount === null) {
      return invalid("Valor de credito invalido.");
    }

    input.creditAmount = creditAmount;
  }

  if ("installmentAmount" in value) {
    const installmentAmount = normalizeNullableNonNegativeNumber(
      value.installmentAmount,
    );

    if (installmentAmount === undefined) {
      return invalid("Valor de parcela invalido.");
    }

    input.installmentAmount = installmentAmount;
  }

  if ("termMonths" in value) {
    const termMonths = normalizeNullablePositiveInteger(value.termMonths);

    if (termMonths === undefined) {
      return invalid("Prazo do contrato invalido.");
    }

    input.termMonths = termMonths;
  }

  if ("metadata" in value) {
    if (!isRecord(value.metadata)) {
      return invalid("Metadata do contrato invalida.");
    }

    input.metadata = value.metadata;
  }

  return {
    input,
    ok: true as const,
  };
}

export async function createContractFromLead(
  accessToken: string | null,
  leadId: string,
  input: LeadContractInput,
): Promise<LeadContractOperationResult> {
  if (!leadId.trim()) {
    return {
      error: "Informe o lead.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveContractRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await getLeadFromCurrentOrganization(context, leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const clientValidation = input.clientId
    ? await getClientFromCurrentOrganization(context, input.clientId)
    : await createClientFromLead(context, leadValidation.lead);

  if (!clientValidation.ok) {
    return clientValidation;
  }

  const relationshipValidation = await validateContractRelationships(
    context,
    input,
  );

  if (!relationshipValidation.ok) {
    return relationshipValidation;
  }

  const { data, error } = await context.supabase
    .from("contracts")
    .insert({
      administrator_id: input.administratorId ?? null,
      client_id: clientValidation.client.id,
      commission_plan_id: input.commissionPlanId ?? null,
      contemplation_model: input.contemplationModel ?? null,
      contract_number: input.contractNumber ?? null,
      created_by: context.profile.id,
      credit_amount:
        input.creditAmount ??
        normalizeNumber(leadValidation.lead.valor_pretendido) ??
        0,
      installment_amount: input.installmentAmount ?? null,
      lead_id: leadValidation.lead.id,
      metadata: {
        ...(input.metadata ?? {}),
        createdFromLead: true,
        origin: "lead_create_contract_operation",
        source: "crm",
      },
      organization_id: context.profile.organization_id,
      product_type: input.productType ?? null,
      status: "draft",
      term_months: input.termMonths ?? null,
      updated_by: context.profile.id,
    })
    .select(contractColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel criar o contrato a partir do lead.",
      ok: false,
      status: 500,
    };
  }

  return {
    client: { id: clientValidation.client.id },
    contract: mapContractRow(data as unknown as ContractRow),
    lead: { id: leadValidation.lead.id },
    ok: true,
  };
}

function createServerContractsSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase contracts server environment is not configured.");
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

async function resolveContractRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerContractsSupabaseClient(accessToken);
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
      .maybeSingle<ContractProfile>();

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

async function getLeadFromCurrentOrganization(
  context: RequestContext,
  leadId: string,
) {
  const { data, error } = await context.supabase
    .from("crm_leads")
    .select("id, organization_id, nome, telefone, email, valor_pretendido")
    .eq("id", leadId)
    .maybeSingle<LeadRow>();

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

async function getClientFromCurrentOrganization(
  context: RequestContext,
  clientId: string,
) {
  const { data, error } = await context.supabase
    .from("clients")
    .select("id, organization_id")
    .eq("id", clientId)
    .maybeSingle<ClientRow>();

  if (error || !data?.organization_id) {
    return {
      error: "Cliente nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Cliente nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  return {
    client: { id: data.id },
    ok: true as const,
  };
}

async function createClientFromLead(context: RequestContext, lead: LeadRow) {
  const { data, error } = await context.supabase
    .from("clients")
    .insert({
      email: normalizeNullableText(lead.email),
      name: normalizeNullableText(lead.nome) ?? "Cliente sem nome",
      organization_id: context.profile.organization_id,
      owner_profile_id: context.profile.id,
      phone: normalizeNullableText(lead.telefone),
      status: "active",
    })
    .select("id, organization_id")
    .single<ClientRow>();

  if (error || !data?.organization_id) {
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

  return {
    client: { id: data.id },
    ok: true as const,
  };
}

async function validateContractRelationships(
  context: RequestContext,
  input: LeadContractInput,
) {
  if (input.administratorId) {
    const administratorValidation = await validateEntityOrganization(
      context,
      "administrators",
      input.administratorId,
      "Administradora nao encontrada.",
    );

    if (!administratorValidation.ok) {
      return administratorValidation;
    }
  }

  if (input.commissionPlanId) {
    const planValidation = await validateLeadContractCommissionPlan(
      context,
      input.commissionPlanId,
    );

    if (!planValidation.ok) {
      return planValidation;
    }
  }

  return {
    ok: true as const,
  };
}

async function validateLeadContractCommissionPlan(
  context: RequestContext,
  commissionPlanId: string,
) {
  return validateCommissionPlanBelongsToOrganization(
    context.supabase as unknown as Parameters<
      typeof validateCommissionPlanBelongsToOrganization
    >[0],
    commissionPlanId,
    context.profile.organization_id,
  );
}

async function validateEntityOrganization(
  context: RequestContext,
  table: "administrators",
  id: string,
  error: string,
) {
  const { data, error: queryError } = await context.supabase
    .from(table)
    .select("id, organization_id")
    .eq("id", id)
    .maybeSingle<OrganizationRow>();

  if (queryError || !data?.organization_id) {
    return {
      error,
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error,
      ok: false as const,
      status: 404,
    };
  }

  return {
    ok: true as const,
  };
}

function isValidProfile(
  profile: ContractProfile | null,
): profile is ContractProfile & {
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

function mapContractRow(row: ContractRow): Contract {
  const now = new Date().toISOString();

  return {
    activatedAt: row.activated_at,
    administratorId: row.administrator_id,
    approvedAt: row.approved_at,
    cancelledAt: row.cancelled_at,
    clientId: row.client_id,
    commissionPlanId: row.commission_plan_id,
    completedAt: row.completed_at,
    contemplationModel: row.contemplation_model,
    contractNumber: row.contract_number,
    createdAt: row.created_at ?? now,
    createdBy: row.created_by,
    creditAmount: normalizeNumber(row.credit_amount) ?? 0,
    id: row.id,
    installmentAmount: normalizeNumber(row.installment_amount),
    leadId: row.lead_id,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    organizationId: row.organization_id,
    productType: row.product_type,
    rejectedAt: row.rejected_at,
    signedAt: row.signed_at,
    status: normalizeContractStatus(row.status),
    submittedAt: row.submitted_at,
    termMonths: row.term_months,
    updatedAt: row.updated_at ?? row.created_at ?? now,
    updatedBy: row.updated_by,
  };
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

function normalizeNonNegativeNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
}

function normalizeNullableNonNegativeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizeNonNegativeNumber(value) ?? undefined;
}

function normalizeNullablePositiveInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }

  return value;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function invalid(error: string) {
  return {
    error,
    ok: false as const,
    status: 400,
  };
}
