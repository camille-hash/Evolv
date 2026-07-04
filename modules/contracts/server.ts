import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { validateAdministratorBelongsToOrganization } from "@/modules/administrators/server";
import { ensureContractCommissionSnapshotAndSchedule } from "@/modules/commission-engine/server";
import { validateCommissionPlanBelongsToOrganization } from "@/modules/commission-plans/server";
import type {
  Contract,
  ContractInput,
  ContractListFilters,
  ContractStatus,
} from "./types";

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

export type ContractMutationResult =
  | { contract: Contract; ok: true }
  | { error: string; ok: false; status: number };

export type ContractListResult =
  | { contracts: Contract[]; ok: true }
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

export async function listContracts(
  accessToken: string | null,
  filters: ContractListFilters,
): Promise<ContractListResult> {
  const context = await resolveContractRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const validation = await validateFilterRelationships(context, filters);

  if (!validation.ok) {
    return validation;
  }

  let query = context.supabase
    .from("contracts")
    .select(contractColumns)
    .eq("organization_id", context.profile.organization_id)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.leadId) {
    query = query.eq("lead_id", filters.leadId);
  }

  if (filters.clientId) {
    query = query.eq("client_id", filters.clientId);
  }

  if (filters.administratorId) {
    query = query.eq("administrator_id", filters.administratorId);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  return {
    contracts: ((data ?? []) as unknown as ContractRow[]).map(mapContractRow),
    ok: true,
  };
}

export async function getContractById(
  accessToken: string | null,
  contractId: string,
): Promise<ContractMutationResult> {
  if (!contractId.trim()) {
    return {
      error: "Informe o contrato.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveContractRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const validation = await validateContractOrganization(context, contractId);

  if (!validation.ok) {
    return validation;
  }

  return {
    contract: validation.contract,
    ok: true,
  };
}

export async function createContract(
  accessToken: string | null,
  input: ContractInput,
): Promise<ContractMutationResult> {
  const context = await resolveContractRequestContext(accessToken);

  if (!context.ok) {
    return context;
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
      ...toContractPayload(input),
      created_by: context.profile.id,
      credit_amount: input.creditAmount ?? 0,
      organization_id: context.profile.organization_id,
      status: input.status ?? "draft",
    })
    .select(contractColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel criar o contrato.",
      ok: false,
      status: 500,
    };
  }

  const contract = mapContractRow(data as unknown as ContractRow);
  const commissionEngineResult = await ensureCommissionEngineForContract(
    context,
    contract,
  );

  if (!commissionEngineResult.ok) {
    return commissionEngineResult;
  }

  return {
    contract,
    ok: true,
  };
}

export async function updateContract(
  accessToken: string | null,
  contractId: string,
  input: ContractInput,
): Promise<ContractMutationResult> {
  if (!contractId.trim()) {
    return {
      error: "Informe o contrato.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveContractRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const contractValidation = await validateContractOrganization(
    context,
    contractId,
  );

  if (!contractValidation.ok) {
    return contractValidation;
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
    .update({
      ...toContractPayload(input),
      updated_by: context.profile.id,
    })
    .eq("id", contractId)
    .eq("organization_id", context.profile.organization_id)
    .select(contractColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel atualizar o contrato.",
      ok: false,
      status: 500,
    };
  }

  const contract = mapContractRow(data as unknown as ContractRow);
  const commissionEngineResult = await ensureCommissionEngineForContract(
    context,
    contract,
  );

  if (!commissionEngineResult.ok) {
    return commissionEngineResult;
  }

  return {
    contract,
    ok: true,
  };
}

export async function updateContractStatus(
  accessToken: string | null,
  contractId: string,
  status: ContractStatus,
): Promise<ContractMutationResult> {
  if (!contractId.trim()) {
    return {
      error: "Informe o contrato.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveContractRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const contractValidation = await validateContractOrganization(
    context,
    contractId,
  );

  if (!contractValidation.ok) {
    return contractValidation;
  }

  const payload = createStatusPayload(status, contractValidation.contract);
  const { data, error } = await context.supabase
    .from("contracts")
    .update({
      ...payload,
      updated_by: context.profile.id,
    })
    .eq("id", contractId)
    .eq("organization_id", context.profile.organization_id)
    .select(contractColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel atualizar o status do contrato.",
      ok: false,
      status: 500,
    };
  }

  return {
    contract: mapContractRow(data as unknown as ContractRow),
    ok: true,
  };
}

async function ensureCommissionEngineForContract(
  context: RequestContext,
  contract: Contract,
): Promise<ContractMutationResult | { ok: true }> {
  const result = await ensureContractCommissionSnapshotAndSchedule({
    commissionPlanId: contract.commissionPlanId,
    contractId: contract.id,
    createdBy: context.profile.id,
    organizationId: context.profile.organization_id,
    supabase: context.supabase,
  });

  if (!result.ok) {
    return result;
  }

  return {
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

async function validateContractOrganization(
  context: RequestContext,
  contractId: string,
) {
  const { data, error } = await context.supabase
    .from("contracts")
    .select(contractColumns)
    .eq("id", contractId)
    .maybeSingle<ContractRow>();

  if (error || !data?.organization_id) {
    return {
      error: "Contrato nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Contrato nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  return {
    contract: mapContractRow(data),
    ok: true as const,
  };
}

async function validateFilterRelationships(
  context: RequestContext,
  filters: ContractListFilters,
) {
  if (filters.leadId) {
    const leadValidation = await validateEntityOrganization(
      context,
      "crm_leads",
      filters.leadId,
      "Lead nao encontrado.",
    );

    if (!leadValidation.ok) {
      return leadValidation;
    }
  }

  if (filters.clientId) {
    const clientValidation = await validateEntityOrganization(
      context,
      "clients",
      filters.clientId,
      "Cliente nao encontrado.",
    );

    if (!clientValidation.ok) {
      return clientValidation;
    }
  }

  if (filters.administratorId) {
    const administratorValidation = await validateContractAdministrator(
      context,
      filters.administratorId,
    );

    if (!administratorValidation.ok) {
      return administratorValidation;
    }
  }

  return {
    ok: true as const,
  };
}

async function validateContractRelationships(
  context: RequestContext,
  input: ContractInput,
) {
  if (input.leadId) {
    const leadValidation = await validateEntityOrganization(
      context,
      "crm_leads",
      input.leadId,
      "Lead nao encontrado.",
    );

    if (!leadValidation.ok) {
      return leadValidation;
    }
  }

  if (input.clientId) {
    const clientValidation = await validateEntityOrganization(
      context,
      "clients",
      input.clientId,
      "Cliente nao encontrado.",
    );

    if (!clientValidation.ok) {
      return clientValidation;
    }
  }

  if (input.administratorId) {
    const administratorValidation = await validateContractAdministrator(
      context,
      input.administratorId,
    );

    if (!administratorValidation.ok) {
      return administratorValidation;
    }
  }

  if (input.commissionPlanId) {
    const planValidation = await validateContractCommissionPlanRelationship(
      context,
      input.commissionPlanId,
      input.administratorId ?? null,
    );

    if (!planValidation.ok) {
      return planValidation;
    }
  }

  return {
    ok: true as const,
  };
}

async function validateContractAdministrator(
  context: RequestContext,
  administratorId: string,
) {
  return validateAdministratorBelongsToOrganization(
    context.supabase as unknown as Parameters<
      typeof validateAdministratorBelongsToOrganization
    >[0],
    administratorId,
    context.profile.organization_id,
  );
}

async function validateContractCommissionPlan(
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

async function validateContractCommissionPlanRelationship(
  context: RequestContext,
  commissionPlanId: string,
  administratorId: string | null,
) {
  if (!administratorId) {
    return {
      error: "Plano de comissao exige administradora.",
      ok: false as const,
      status: 400,
    };
  }

  const planValidation = await validateContractCommissionPlan(
    context,
    commissionPlanId,
  );

  if (!planValidation.ok) {
    return planValidation;
  }

  const { data, error } = await context.supabase
    .from("commission_plans")
    .select("id, administrator_id, organization_id")
    .eq("id", commissionPlanId)
    .eq("organization_id", context.profile.organization_id)
    .maybeSingle<{
      administrator_id: string | null;
      id: string;
      organization_id: string | null;
    }>();

  if (error || !data?.organization_id) {
    return {
      error: "Plano de comissao nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.administrator_id !== administratorId) {
    return {
      error: "Plano de comissao nao pertence a administradora selecionada.",
      ok: false as const,
      status: 400,
    };
  }

  return {
    ok: true as const,
  };
}

async function validateEntityOrganization(
  context: RequestContext,
  table: "clients" | "crm_leads",
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

function toContractPayload(input: ContractInput) {
  const payload: Record<string, unknown> = {};

  setIfDefined(payload, "lead_id", input.leadId);
  setIfDefined(payload, "client_id", input.clientId);
  setIfDefined(payload, "administrator_id", input.administratorId);
  setIfDefined(payload, "commission_plan_id", input.commissionPlanId);
  setIfDefined(payload, "contract_number", input.contractNumber);
  setIfDefined(payload, "status", input.status);
  setIfDefined(payload, "product_type", input.productType);
  setIfDefined(payload, "credit_amount", input.creditAmount);
  setIfDefined(payload, "installment_amount", input.installmentAmount);
  setIfDefined(payload, "term_months", input.termMonths);
  setIfDefined(payload, "contemplation_model", input.contemplationModel);
  setIfDefined(payload, "signed_at", input.signedAt);
  setIfDefined(payload, "submitted_at", input.submittedAt);
  setIfDefined(payload, "approved_at", input.approvedAt);
  setIfDefined(payload, "activated_at", input.activatedAt);
  setIfDefined(payload, "cancelled_at", input.cancelledAt);
  setIfDefined(payload, "completed_at", input.completedAt);
  setIfDefined(payload, "rejected_at", input.rejectedAt);
  setIfDefined(payload, "metadata", input.metadata);

  return payload;
}

function createStatusPayload(status: ContractStatus, contract: Contract) {
  const timestamp = new Date().toISOString();
  const payload: Record<string, unknown> = {
    status,
  };

  if (status === "submitted" && !contract.submittedAt) {
    payload.submitted_at = timestamp;
  }

  if (status === "approved" && !contract.approvedAt) {
    payload.approved_at = timestamp;
  }

  if (status === "active" && !contract.activatedAt) {
    payload.activated_at = timestamp;
  }

  if (status === "cancelled" && !contract.cancelledAt) {
    payload.cancelled_at = timestamp;
  }

  if (status === "completed" && !contract.completedAt) {
    payload.completed_at = timestamp;
  }

  if (status === "rejected" && !contract.rejectedAt) {
    payload.rejected_at = timestamp;
  }

  return payload;
}

function setIfDefined(
  payload: Record<string, unknown>,
  key: string,
  value: unknown,
) {
  if (value !== undefined) {
    payload[key] = value;
  }
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
