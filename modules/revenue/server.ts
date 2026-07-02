import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  RevenueCalculationBase,
  RevenueCommissionPlanSnapshot,
  RevenueContractSnapshot,
  RevenueEntry,
  RevenueGenerationMode,
  RevenueGenerationResult,
  RevenueInstallmentDraft,
} from "./types";
import {
  validateRevenueCommissionPlanInput,
  validateRevenueContractInput,
} from "./validation";

type RevenueProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type ContractRow = {
  activated_at: string | null;
  administrator_id: string | null;
  approved_at: string | null;
  client_id: string | null;
  commission_plan_id: string | null;
  credit_amount: number | string | null;
  id: string;
  organization_id: string | null;
  signed_at: string | null;
  status: string | null;
  submitted_at: string | null;
};

type CommissionPlanRow = {
  commission_fixed_amount: number | string | null;
  commission_percentage: number | string | null;
  commission_type: string | null;
  id: string;
  organization_id: string | null;
  payment_installments: number | null;
  payment_trigger: string | null;
  status: string | null;
};

type RevenueEntryRow = {
  actual_amount: number | string | null;
  administrator_id: string | null;
  cancelled_at: string | null;
  client_id: string | null;
  contract_id: string | null;
  created_at: string | null;
  due_date: string | null;
  expected_amount: number | string | null;
  id: string;
  metadata: Record<string, unknown> | null;
  organization_id: string | null;
  paid_at: string | null;
  status: string | null;
  type: string | null;
  updated_at: string | null;
};

type ClientRow = {
  id: string;
  organization_id: string | null;
};

type RequestContext = {
  profile: RevenueProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "sdr";
  };
  supabase: ReturnType<typeof createServerRevenueSupabaseClient>;
  user: SupabaseUser;
};

export type RevenueListResult =
  | { ok: true; revenueEntries: RevenueEntry[] }
  | { error: string; ok: false; status: number };

export type RevenueGenerationServiceResult =
  | ({ ok: true } & RevenueGenerationResult)
  | { error: string; ok: false; status: number };

const contractColumns = [
  "id",
  "organization_id",
  "client_id",
  "administrator_id",
  "commission_plan_id",
  "credit_amount",
  "status",
  "signed_at",
  "submitted_at",
  "approved_at",
  "activated_at",
].join(",");

const commissionPlanColumns = [
  "id",
  "organization_id",
  "status",
  "commission_type",
  "commission_percentage",
  "commission_fixed_amount",
  "payment_trigger",
  "payment_installments",
].join(",");

const revenueEntryColumns = [
  "id",
  "organization_id",
  "contract_id",
  "client_id",
  "administrator_id",
  "type",
  "status",
  "expected_amount",
  "actual_amount",
  "due_date",
  "paid_at",
  "cancelled_at",
  "metadata",
  "created_at",
  "updated_at",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export function calculateExpectedRevenue(input: {
  contract: RevenueContractSnapshot;
  commissionPlan: RevenueCommissionPlanSnapshot;
  triggerDate: string;
}): RevenueInstallmentDraft[] {
  const calculationBase: RevenueCalculationBase = {
    commissionFixedAmount: input.commissionPlan.commissionFixedAmount,
    commissionPercentage: input.commissionPlan.commissionPercentage,
    commissionType: input.commissionPlan.commissionType,
    creditAmount: input.contract.creditAmount,
  };
  const totalExpectedAmount = calculateTotalExpectedAmount(calculationBase);
  const installmentsTotal = input.commissionPlan.paymentInstallments;
  const baseInstallmentAmount =
    Math.floor((totalExpectedAmount / installmentsTotal) * 100) / 100;
  let distributedAmount = 0;

  return Array.from({ length: installmentsTotal }, (_, index) => {
    const installmentNumber = index + 1;
    const expectedAmount =
      installmentNumber === installmentsTotal
        ? roundCurrency(totalExpectedAmount - distributedAmount)
        : baseInstallmentAmount;

    distributedAmount = roundCurrency(distributedAmount + expectedAmount);

    return {
      dueDate: addMonthsToDate(input.triggerDate, index),
      expectedAmount,
      installmentNumber,
      installmentsTotal,
      metadata: {
        calculationBase,
        commissionPlanId: input.commissionPlan.id,
        contractId: input.contract.id,
        installmentNumber,
        installmentsTotal,
        origin: "revenue_engine",
      },
    };
  });
}

export async function generateRevenueForContract(
  accessToken: string | null,
  contractId: string,
  mode: RevenueGenerationMode = "create_missing",
): Promise<RevenueGenerationServiceResult> {
  if (!contractId.trim()) {
    return {
      error: "Informe o contrato.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveRevenueRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  return generateRevenueForContractInContext(context, contractId, mode, {
    allowManualTrigger: true,
  });
}

export async function listContractRevenue(
  accessToken: string | null,
  contractId: string,
): Promise<RevenueListResult> {
  if (!contractId.trim()) {
    return {
      error: "Informe o contrato.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveRevenueRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const contractValidation = await getContractFromCurrentOrganization(
    context,
    contractId,
  );

  if (!contractValidation.ok) {
    return contractValidation;
  }

  const entries = await getRevenueEntriesByContract(context, contractId);

  if (!entries.ok) {
    return entries;
  }

  return {
    ok: true,
    revenueEntries: entries.revenueEntries,
  };
}

export async function listClientRevenue(
  accessToken: string | null,
  clientId: string,
): Promise<RevenueListResult> {
  if (!clientId.trim()) {
    return {
      error: "Informe o cliente.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveRevenueRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const clientValidation = await validateClientOrganization(context, clientId);

  if (!clientValidation.ok) {
    return clientValidation;
  }

  const { data, error } = await context.supabase
    .from("revenue_entries")
    .select(revenueEntryColumns)
    .eq("organization_id", context.profile.organization_id)
    .eq("client_id", clientId)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return {
      error: "Nao foi possivel carregar as receitas do cliente.",
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    revenueEntries: ((data ?? []) as unknown as RevenueEntryRow[]).map(
      mapRevenueEntryRow,
    ),
  };
}

export async function maybeGenerateRevenueForContractStatus(
  accessToken: string | null,
  contractId: string,
) {
  if (!contractId.trim()) {
    return;
  }

  const context = await resolveRevenueRequestContext(accessToken);

  if (!context.ok) {
    return;
  }

  await generateRevenueForContractInContext(context, contractId, "create_missing", {
    allowManualTrigger: false,
    silentWhenNotEligible: true,
  });
}

async function generateRevenueForContractInContext(
  context: RequestContext,
  contractId: string,
  mode: RevenueGenerationMode,
  options: {
    allowManualTrigger: boolean;
    silentWhenNotEligible?: boolean;
  },
): Promise<RevenueGenerationServiceResult> {
  const contractResult = await getContractFromCurrentOrganization(
    context,
    contractId,
  );

  if (!contractResult.ok) {
    return contractResult;
  }

  const contract = contractResult.contract;
  const contractValidation = validateRevenueContractInput(contract);

  if (!contractValidation.ok) {
    return contractValidation;
  }

  const planResult = await getCommissionPlanFromCurrentOrganization(
    context,
    contract.commissionPlanId,
  );

  if (!planResult.ok) {
    return planResult;
  }

  const commissionPlan = planResult.commissionPlan;
  const planValidation = validateRevenueCommissionPlanInput(commissionPlan);

  if (!planValidation.ok) {
    return planValidation;
  }

  const triggerDate = resolveRevenueTriggerDate(
    contract,
    commissionPlan,
    options.allowManualTrigger,
  );

  if (!triggerDate) {
    if (options.silentWhenNotEligible) {
      return {
        createdEntries: [],
        existingEntries: [],
        ok: true,
        skippedReason: "trigger_not_reached",
      };
    }

    return {
      error: "Contrato ainda nao atingiu o gatilho de receita.",
      ok: false,
      status: 409,
    };
  }

  const existingEntriesResult = await getRevenueEntriesByContract(
    context,
    contract.id,
  );

  if (!existingEntriesResult.ok) {
    return existingEntriesResult;
  }

  const existingEntries = existingEntriesResult.revenueEntries;

  if (mode === "create_missing" && hasBlockingRevenueEntry(existingEntries)) {
    return {
      createdEntries: [],
      existingEntries,
      ok: true,
      skippedReason: "revenue_already_exists",
    };
  }

  if (mode === "replace_expected") {
    const cancelResult = await cancelExpectedRevenueEntries(
      context,
      contract.id,
    );

    if (!cancelResult.ok) {
      return cancelResult;
    }
  }

  const installments = calculateExpectedRevenue({
    commissionPlan,
    contract,
    triggerDate,
  });
  const payload = installments.map((installment) => ({
    administrator_id: contract.administratorId,
    client_id: contract.clientId,
    contract_id: contract.id,
    due_date: installment.dueDate,
    expected_amount: installment.expectedAmount,
    metadata: installment.metadata,
    organization_id: context.profile.organization_id,
    status: "expected",
    type: "commission",
  }));

  const { data, error } = await context.supabase
    .from("revenue_entries")
    .insert(payload)
    .select(revenueEntryColumns);

  if (error) {
    return {
      error: "Nao foi possivel gerar as receitas do contrato.",
      ok: false,
      status: 500,
    };
  }

  return {
    createdEntries: ((data ?? []) as unknown as RevenueEntryRow[]).map(
      mapRevenueEntryRow,
    ),
    existingEntries,
    ok: true,
    skippedReason: null,
  };
}

async function cancelExpectedRevenueEntries(
  context: RequestContext,
  contractId: string,
) {
  const { error } = await context.supabase
    .from("revenue_entries")
    .update({
      cancelled_at: new Date().toISOString(),
      status: "cancelled",
    })
    .eq("organization_id", context.profile.organization_id)
    .eq("contract_id", contractId)
    .eq("status", "expected");

  if (error) {
    return {
      error: "Nao foi possivel substituir as receitas previstas.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    ok: true as const,
  };
}

async function getRevenueEntriesByContract(
  context: RequestContext,
  contractId: string,
): Promise<RevenueListResult> {
  const { data, error } = await context.supabase
    .from("revenue_entries")
    .select(revenueEntryColumns)
    .eq("organization_id", context.profile.organization_id)
    .eq("contract_id", contractId)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return {
      error: "Nao foi possivel carregar as receitas do contrato.",
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    revenueEntries: ((data ?? []) as unknown as RevenueEntryRow[]).map(
      mapRevenueEntryRow,
    ),
  };
}

async function getContractFromCurrentOrganization(
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

async function getCommissionPlanFromCurrentOrganization(
  context: RequestContext,
  commissionPlanId: string | null,
) {
  if (!commissionPlanId) {
    return {
      error: "Contrato nao possui plano de comissao.",
      ok: false as const,
      status: 400,
    };
  }

  const { data, error } = await context.supabase
    .from("commission_plans")
    .select(commissionPlanColumns)
    .eq("id", commissionPlanId)
    .maybeSingle<CommissionPlanRow>();

  if (error || !data?.organization_id) {
    return {
      error: "Plano de comissao nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Plano de comissao nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  return {
    commissionPlan: mapCommissionPlanRow(data),
    ok: true as const,
  };
}

async function validateClientOrganization(
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
    ok: true as const,
  };
}

function createServerRevenueSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase revenue server environment is not configured.");
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

async function resolveRevenueRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerRevenueSupabaseClient(accessToken);
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
      .maybeSingle<RevenueProfile>();

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

function calculateTotalExpectedAmount(input: RevenueCalculationBase) {
  const percentageAmount =
    input.commissionType === "percentage" || input.commissionType === "hybrid"
      ? input.creditAmount * ((input.commissionPercentage ?? 0) / 100)
      : 0;
  const fixedAmount =
    input.commissionType === "fixed" || input.commissionType === "hybrid"
      ? input.commissionFixedAmount ?? 0
      : 0;

  return roundCurrency(percentageAmount + fixedAmount);
}

function resolveRevenueTriggerDate(
  contract: RevenueContractSnapshot,
  commissionPlan: RevenueCommissionPlanSnapshot,
  allowManualTrigger: boolean,
) {
  if (commissionPlan.paymentTrigger === "manual") {
    return allowManualTrigger ? new Date().toISOString() : null;
  }

  if (commissionPlan.paymentTrigger === "contract_signed") {
    return contract.signedAt;
  }

  if (commissionPlan.paymentTrigger === "contract_submitted") {
    return contract.status === "submitted" ||
      contract.status === "approved" ||
      contract.status === "active" ||
      contract.status === "completed"
      ? contract.submittedAt
      : null;
  }

  if (commissionPlan.paymentTrigger === "contract_approved") {
    return contract.status === "approved" ||
      contract.status === "active" ||
      contract.status === "completed"
      ? contract.approvedAt
      : null;
  }

  if (commissionPlan.paymentTrigger === "contract_activation") {
    return contract.status === "active" || contract.status === "completed"
      ? contract.activatedAt
      : null;
  }

  return null;
}

function hasBlockingRevenueEntry(entries: RevenueEntry[]) {
  return entries.some(
    (entry) =>
      entry.status === "expected" ||
      entry.status === "pending" ||
      entry.status === "paid" ||
      entry.status === "overdue",
  );
}

function mapContractRow(row: ContractRow): RevenueContractSnapshot {
  return {
    activatedAt: row.activated_at,
    administratorId: row.administrator_id,
    approvedAt: row.approved_at,
    clientId: row.client_id,
    commissionPlanId: row.commission_plan_id,
    creditAmount: normalizeNumber(row.credit_amount) ?? 0,
    id: row.id,
    organizationId: row.organization_id ?? "",
    signedAt: row.signed_at,
    status: row.status ?? "draft",
    submittedAt: row.submitted_at,
  };
}

function mapCommissionPlanRow(
  row: CommissionPlanRow,
): RevenueCommissionPlanSnapshot {
  return {
    commissionFixedAmount: normalizeNumber(row.commission_fixed_amount),
    commissionPercentage: normalizeNumber(row.commission_percentage),
    commissionType:
      row.commission_type === "fixed" || row.commission_type === "hybrid"
        ? row.commission_type
        : "percentage",
    id: row.id,
    organizationId: row.organization_id ?? "",
    paymentInstallments: row.payment_installments ?? 1,
    paymentTrigger:
      row.payment_trigger === "contract_signed" ||
      row.payment_trigger === "contract_submitted" ||
      row.payment_trigger === "contract_approved" ||
      row.payment_trigger === "manual"
        ? row.payment_trigger
        : "contract_activation",
    status: row.status ?? "active",
  };
}

function mapRevenueEntryRow(row: RevenueEntryRow): RevenueEntry {
  const now = new Date().toISOString();

  return {
    actualAmount: normalizeNumber(row.actual_amount),
    administratorId: row.administrator_id,
    cancelledAt: row.cancelled_at,
    clientId: row.client_id,
    contractId: row.contract_id ?? "",
    createdAt: row.created_at ?? now,
    dueDate: row.due_date,
    expectedAmount: normalizeNumber(row.expected_amount) ?? 0,
    id: row.id,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    organizationId: row.organization_id ?? "",
    paidAt: row.paid_at,
    status: normalizeRevenueStatus(row.status),
    type: normalizeRevenueType(row.type),
    updatedAt: row.updated_at ?? row.created_at ?? now,
  };
}

function addMonthsToDate(value: string, monthsToAdd: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  date.setMonth(date.getMonth() + monthsToAdd);

  return date.toISOString().slice(0, 10);
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeRevenueStatus(value: string | null) {
  if (
    value === "cancelled" ||
    value === "expected" ||
    value === "overdue" ||
    value === "paid" ||
    value === "pending"
  ) {
    return value;
  }

  return "expected";
}

function normalizeRevenueType(value: string | null) {
  if (
    value === "adjustment" ||
    value === "bonus" ||
    value === "chargeback" ||
    value === "commission"
  ) {
    return value;
  }

  return "commission";
}

function isValidProfile(
  profile: RevenueProfile | null,
): profile is RevenueProfile & {
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
