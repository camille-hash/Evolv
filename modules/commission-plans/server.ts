import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { validateAdministratorBelongsToOrganization } from "@/modules/administrators/server";
import type {
  CommissionPaymentTrigger,
  CommissionPlan,
  CommissionPlanCreateInput,
  CommissionPlanListFilters,
  CommissionPlanScheduleItem,
  CommissionPlanScheduleItemInput,
  CommissionPlanStatus,
  CommissionPlanUpdateInput,
  CommissionScheduleEventType,
  CommissionType,
} from "./types";
import { validateCommissionFinancialRules } from "./validation";

type CommissionPlanProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type CommissionPlanRow = {
  administration_fee_percentage: number | string | null;
  administrator_id: string | null;
  commission_fixed_amount: number | string | null;
  commission_percentage: number | string | null;
  commission_type: string | null;
  contract_term_months: number | null;
  created_at: string | null;
  created_by: string | null;
  id: string;
  metadata: Record<string, unknown> | null;
  name: string | null;
  organization_id: string | null;
  payment_installments: number | null;
  payment_trigger: string | null;
  reference_credit_amount: number | string | null;
  status: string | null;
  total_schedule_amount: number | string | null;
  total_schedule_percentage: number | string | null;
  updated_at: string | null;
  updated_by: string | null;
};

type CommissionPlanScheduleItemRow = {
  amount: number | string | null;
  commission_plan_id: string | null;
  due_date: string | null;
  event_type: string | null;
  id: string;
  installment_number: number | null;
  offset_days: number | null;
  offset_months: number | null;
  organization_id: string | null;
  percentage: number | string | null;
  sort_order: number | null;
};

type RequestContext = {
  profile: CommissionPlanProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerCommissionPlansSupabaseClient>;
  user: SupabaseUser;
};

type CommissionPlanOrganizationSupabaseClient = {
  from(table: "commission_plans"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle<T>(): PromiseLike<{ data: T | null; error: unknown }>;
      };
    };
  };
};

export type CommissionPlanMutationResult =
  | { commissionPlan: CommissionPlan; ok: true }
  | { error: string; ok: false; status: number };

export type CommissionPlanListResult =
  | { commissionPlans: CommissionPlan[]; ok: true }
  | { error: string; ok: false; status: number };

export type CommissionPlanValidationResult =
  | { ok: true }
  | { error: string; ok: false; status: number };

const commissionPlanColumns = [
  "id",
  "organization_id",
  "administrator_id",
  "name",
  "status",
  "contract_term_months",
  "reference_credit_amount",
  "administration_fee_percentage",
  "commission_type",
  "commission_percentage",
  "commission_fixed_amount",
  "total_schedule_percentage",
  "total_schedule_amount",
  "payment_trigger",
  "payment_installments",
  "metadata",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function listCommissionPlans(
  accessToken: string | null,
  filters: CommissionPlanListFilters,
): Promise<CommissionPlanListResult> {
  const context = await resolveCommissionPlanRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  if (filters.administratorId) {
    const administratorValidation = await validateCommissionPlanAdministrator(
      context,
      filters.administratorId,
    );

    if (!administratorValidation.ok) {
      return administratorValidation;
    }
  }

  const normalizedFilters = normalizeCommissionPlanListFilters(filters);
  let query = context.supabase
    .from("commission_plans")
    .select(commissionPlanColumns)
    .eq("organization_id", context.profile.organization_id)
    .order("name", { ascending: true });

  if (normalizedFilters.administratorId) {
    query = query.eq("administrator_id", normalizedFilters.administratorId);
  }

  if (normalizedFilters.status) {
    query = query.eq("status", normalizedFilters.status);
  }

  if (normalizedFilters.search) {
    const searchPattern = `%${escapePostgrestSearch(normalizedFilters.search)}%`;
    query = query.or(`name.ilike.${searchPattern}`);
  }

  const { data, error } = await query.range(
    normalizedFilters.offset,
    normalizedFilters.offset + normalizedFilters.limit - 1,
  );

  if (error) {
    logCommissionPlanServerError("list_query_failed", {
      error: formatSupabaseDebugError(error),
      filters: normalizedFilters,
      organizationId: context.profile.organization_id,
    });

    return {
      error: "Nao foi possivel carregar os planos de comissao.",
      ok: false,
      status: 500,
    };
  }

  return {
    commissionPlans: await mapCommissionPlanRowsWithSchedule(
      context,
      ((data ?? []) as unknown as CommissionPlanRow[]).filter(
        (row) => row.organization_id === context.profile.organization_id,
      ),
    ),
    ok: true,
  };
}

export async function getCommissionPlanById(
  accessToken: string | null,
  commissionPlanId: string,
): Promise<CommissionPlanMutationResult> {
  if (!commissionPlanId.trim()) {
    return {
      error: "Informe o plano de comissao.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveCommissionPlanRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const result = await getCommissionPlanFromCurrentOrganization(
    context,
    commissionPlanId,
  );

  if (!result.ok) {
    return result;
  }

  return {
    commissionPlan: result.commissionPlan,
    ok: true,
  };
}

export async function createCommissionPlan(
  accessToken: string | null,
  input: CommissionPlanCreateInput,
): Promise<CommissionPlanMutationResult> {
  const context = await resolveCommissionPlanRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const administratorValidation = await validateCommissionPlanAdministrator(
    context,
    input.administratorId,
  );

  if (!administratorValidation.ok) {
    return administratorValidation;
  }

  const scheduleTotals = calculateScheduleTotals(input.scheduleItems ?? []);
  const { data, error } = await context.supabase
    .from("commission_plans")
    .insert({
      administration_fee_percentage: input.administrationFeePercentage ?? null,
      administrator_id: input.administratorId,
      commission_fixed_amount: input.commissionFixedAmount ?? null,
      commission_percentage:
        input.commissionPercentage ?? scheduleTotals.percentageOrNull,
      commission_type: input.commissionType,
      contract_term_months: input.contractTermMonths ?? null,
      created_by: context.profile.id,
      metadata: input.metadata ?? {},
      name: input.name,
      organization_id: context.profile.organization_id,
      payment_installments: input.paymentInstallments ?? 1,
      payment_trigger: input.paymentTrigger,
      reference_credit_amount: input.referenceCreditAmount ?? null,
      status: input.status ?? "active",
      total_schedule_amount: null,
      total_schedule_percentage: scheduleTotals.percentageOrNull,
      updated_by: context.profile.id,
    })
    .select(commissionPlanColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel criar o plano de comissao.",
      ok: false,
      status: 500,
    };
  }

  const commissionPlan = mapCommissionPlanRow(
    data as unknown as CommissionPlanRow,
    [],
  );

  if (input.scheduleItems?.length) {
    const scheduleResult = await replaceCommissionPlanScheduleItems(
      context,
      commissionPlan.id,
      input.scheduleItems,
    );

    if (!scheduleResult.ok) {
      return scheduleResult;
    }
  }

  const reloaded = await getCommissionPlanFromCurrentOrganization(
    context,
    commissionPlan.id,
  );

  if (!reloaded.ok) {
    return reloaded;
  }

  return {
    commissionPlan: reloaded.commissionPlan,
    ok: true,
  };
}

export async function updateCommissionPlan(
  accessToken: string | null,
  commissionPlanId: string,
  input: CommissionPlanUpdateInput,
): Promise<CommissionPlanMutationResult> {
  if (!commissionPlanId.trim()) {
    return {
      error: "Informe o plano de comissao.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveCommissionPlanRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const existing = await getCommissionPlanFromCurrentOrganization(
    context,
    commissionPlanId,
  );

  if (!existing.ok) {
    return existing;
  }

  const administratorId =
    input.administratorId ?? existing.commissionPlan.administratorId;
  const commissionType =
    input.commissionType ?? existing.commissionPlan.commissionType;
  const commissionPercentage =
    input.commissionPercentage !== undefined
      ? input.commissionPercentage
      : existing.commissionPlan.commissionPercentage;
  const commissionFixedAmount =
    input.commissionFixedAmount !== undefined
      ? input.commissionFixedAmount
      : existing.commissionPlan.commissionFixedAmount;
  const scheduleTotals =
    input.scheduleItems !== undefined
      ? calculateScheduleTotals(input.scheduleItems)
      : null;

  const administratorValidation = await validateCommissionPlanAdministrator(
    context,
    administratorId,
  );

  if (!administratorValidation.ok) {
    return administratorValidation;
  }

  const financialValidation = validateCommissionFinancialRules({
    commissionFixedAmount,
    commissionPercentage,
    commissionType,
  });

  if (!financialValidation.ok) {
    return financialValidation;
  }

  const payload: Record<string, unknown> = {
    updated_by: context.profile.id,
  };

  setIfDefined(payload, "administrator_id", input.administratorId);
  setIfDefined(payload, "name", input.name);
  setIfDefined(payload, "status", input.status);
  setIfDefined(payload, "contract_term_months", input.contractTermMonths);
  setIfDefined(payload, "reference_credit_amount", input.referenceCreditAmount);
  setIfDefined(
    payload,
    "administration_fee_percentage",
    input.administrationFeePercentage,
  );
  setIfDefined(payload, "commission_type", input.commissionType);
  setIfDefined(
    payload,
    "commission_percentage",
    input.commissionPercentage ?? scheduleTotals?.percentageOrNull,
  );
  setIfDefined(
    payload,
    "commission_fixed_amount",
    input.commissionFixedAmount,
  );
  setIfDefined(
    payload,
    "total_schedule_percentage",
    scheduleTotals?.percentageOrNull,
  );
  setIfDefined(
    payload,
    "total_schedule_amount",
    scheduleTotals ? null : undefined,
  );
  setIfDefined(payload, "payment_trigger", input.paymentTrigger);
  setIfDefined(payload, "payment_installments", input.paymentInstallments);
  setIfDefined(payload, "metadata", input.metadata);

  const { error } = await context.supabase
    .from("commission_plans")
    .update(payload)
    .eq("id", commissionPlanId)
    .eq("organization_id", context.profile.organization_id)
    .select(commissionPlanColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel atualizar o plano de comissao.",
      ok: false,
      status: 500,
    };
  }

  if (input.scheduleItems !== undefined) {
    const scheduleResult = await replaceCommissionPlanScheduleItems(
      context,
      commissionPlanId,
      input.scheduleItems,
    );

    if (!scheduleResult.ok) {
      return scheduleResult;
    }
  }

  const reloaded = await getCommissionPlanFromCurrentOrganization(
    context,
    commissionPlanId,
  );

  if (!reloaded.ok) {
    return reloaded;
  }

  return {
    commissionPlan: reloaded.commissionPlan,
    ok: true,
  };
}

export async function validateCommissionPlanBelongsToOrganization(
  supabase: CommissionPlanOrganizationSupabaseClient,
  commissionPlanId: string,
  organizationId: string,
): Promise<CommissionPlanValidationResult> {
  const { data, error } = await supabase
    .from("commission_plans")
    .select("id, organization_id")
    .eq("id", commissionPlanId)
    .maybeSingle<{ id: string; organization_id: string | null }>();

  if (error || !data?.organization_id) {
    return {
      error: "Plano de comissao nao encontrado.",
      ok: false,
      status: 404,
    };
  }

  if (data.organization_id !== organizationId) {
    return {
      error: "Plano de comissao nao encontrado.",
      ok: false,
      status: 404,
    };
  }

  return {
    ok: true,
  };
}

function createServerCommissionPlansSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase commission plans server environment is not configured.",
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

async function resolveCommissionPlanRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerCommissionPlansSupabaseClient(accessToken);
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
      .maybeSingle<CommissionPlanProfile>();

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

async function getCommissionPlanFromCurrentOrganization(
  context: RequestContext,
  commissionPlanId: string,
) {
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

  const scheduleItems = await listScheduleItemsByPlanIds(context, [data.id]);

  return {
    commissionPlan: mapCommissionPlanRow(
      data,
      scheduleItems.get(data.id) ?? [],
    ),
    ok: true as const,
  };
}

async function validateCommissionPlanAdministrator(
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

function normalizeCommissionPlanListFilters(
  filters: CommissionPlanListFilters,
) {
  return {
    administratorId: normalizeNullableText(filters.administratorId),
    limit: Math.min(Math.max(filters.limit ?? 50, 1), 100),
    offset: Math.max(filters.offset ?? 0, 0),
    search: normalizeNullableText(filters.search),
    status: filters.status ?? null,
  };
}

async function mapCommissionPlanRowsWithSchedule(
  context: RequestContext,
  rows: CommissionPlanRow[],
) {
  const scheduleItemsByPlanId = await listScheduleItemsByPlanIds(
    context,
    rows.map((row) => row.id),
  );

  return rows.map((row) =>
    mapCommissionPlanRow(row, scheduleItemsByPlanId.get(row.id) ?? []),
  );
}

function mapCommissionPlanRow(
  row: CommissionPlanRow,
  scheduleItems: CommissionPlanScheduleItem[],
): CommissionPlan {
  const now = new Date().toISOString();

  return {
    administrationFeePercentage: normalizeNumber(
      row.administration_fee_percentage,
    ),
    administratorId: row.administrator_id ?? "",
    commissionFixedAmount: normalizeNumber(row.commission_fixed_amount),
    commissionPercentage: normalizeNumber(row.commission_percentage),
    commissionType: normalizeCommissionType(row.commission_type),
    contractTermMonths: row.contract_term_months,
    createdAt: row.created_at ?? now,
    createdBy: row.created_by,
    id: row.id,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    name: normalizeText(row.name) || "Plano sem nome",
    organizationId: row.organization_id ?? "",
    paymentInstallments: row.payment_installments ?? 1,
    paymentTrigger: normalizePaymentTrigger(row.payment_trigger),
    referenceCreditAmount: normalizeNumber(row.reference_credit_amount),
    scheduleItems,
    status: normalizeCommissionPlanStatus(row.status),
    totalScheduleAmount: normalizeNumber(row.total_schedule_amount),
    totalSchedulePercentage: normalizeNumber(row.total_schedule_percentage),
    updatedAt: row.updated_at ?? row.created_at ?? now,
    updatedBy: row.updated_by,
  };
}

async function listScheduleItemsByPlanIds(
  context: RequestContext,
  commissionPlanIds: string[],
) {
  const scheduleItemsByPlanId = new Map<string, CommissionPlanScheduleItem[]>();
  const uniqueIds = Array.from(new Set(commissionPlanIds));

  if (!uniqueIds.length) {
    return scheduleItemsByPlanId;
  }

  const { data, error } = await context.supabase
    .from("commission_plan_schedule_items")
    .select(
      [
        "id",
        "organization_id",
        "commission_plan_id",
        "installment_number",
        "event_type",
        "percentage",
        "amount",
        "due_date",
        "offset_months",
        "offset_days",
        "sort_order",
      ].join(","),
    )
    .eq("organization_id", context.profile.organization_id)
    .in("commission_plan_id", uniqueIds)
    .order("sort_order", { ascending: true });

  if (error) {
    logCommissionPlanServerError("schedule_query_failed", {
      error: formatSupabaseDebugError(error),
      organizationId: context.profile.organization_id,
    });

    return scheduleItemsByPlanId;
  }

  for (const row of (data ?? []) as unknown as CommissionPlanScheduleItemRow[]) {
    if (
      !row.commission_plan_id ||
      row.organization_id !== context.profile.organization_id
    ) {
      continue;
    }

    scheduleItemsByPlanId.set(row.commission_plan_id, [
      ...(scheduleItemsByPlanId.get(row.commission_plan_id) ?? []),
      mapScheduleItemRow(row),
    ]);
  }

  return scheduleItemsByPlanId;
}

async function replaceCommissionPlanScheduleItems(
  context: RequestContext,
  commissionPlanId: string,
  scheduleItems: CommissionPlanScheduleItemInput[],
) {
  const deleteResult = await context.supabase
    .from("commission_plan_schedule_items")
    .delete()
    .eq("organization_id", context.profile.organization_id)
    .eq("commission_plan_id", commissionPlanId);

  if (deleteResult.error) {
    logCommissionPlanServerError("schedule_delete_failed", {
      commissionPlanId,
      error: formatSupabaseDebugError(deleteResult.error),
      organizationId: context.profile.organization_id,
    });

    return {
      error: "Nao foi possivel atualizar a regua de comissao.",
      ok: false as const,
      status: 500,
    };
  }

  if (!scheduleItems.length) {
    return {
      ok: true as const,
    };
  }

  const { error } = await context.supabase
    .from("commission_plan_schedule_items")
    .insert(
      scheduleItems.map((item, index) => ({
        amount: item.amount ?? 0,
        commission_plan_id: commissionPlanId,
        created_by: context.profile.id,
        due_date: item.dueDate ?? null,
        event_type: item.eventType,
        installment_number:
          item.eventType === "installment" ? item.installmentNumber : null,
        offset_days: item.offsetDays ?? null,
        offset_months: item.offsetMonths ?? null,
        organization_id: context.profile.organization_id,
        percentage: item.percentage,
        sort_order: item.sortOrder ?? index,
        updated_by: context.profile.id,
      })),
    );

  if (error) {
    logCommissionPlanServerError("schedule_insert_failed", {
      commissionPlanId,
      error: formatSupabaseDebugError(error),
      organizationId: context.profile.organization_id,
    });

    return {
      error: "Nao foi possivel salvar a regua de comissao.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    ok: true as const,
  };
}

function mapScheduleItemRow(
  row: CommissionPlanScheduleItemRow,
): CommissionPlanScheduleItem {
  return {
    amount: normalizeNumber(row.amount) ?? 0,
    dueDate: row.due_date,
    eventType: normalizeScheduleEventType(row.event_type),
    id: row.id,
    installmentNumber: row.installment_number,
    offsetDays: row.offset_days,
    offsetMonths: row.offset_months,
    percentage: normalizeNumber(row.percentage) ?? 0,
    sortOrder: row.sort_order ?? 0,
  };
}

function calculateScheduleTotals(scheduleItems: CommissionPlanScheduleItemInput[]) {
  const totals = scheduleItems.reduce(
    (summary, item) => ({
      percentage: summary.percentage + item.percentage,
    }),
    {
      percentage: 0,
    },
  );

  return {
    percentageOrNull:
      totals.percentage > 0 ? roundPercentage(totals.percentage) : null,
  };
}

function normalizeScheduleEventType(
  value: string | null,
): CommissionScheduleEventType {
  return value === "contemplation" ? "contemplation" : "installment";
}

function normalizeCommissionPlanStatus(
  value: string | null,
): CommissionPlanStatus {
  return value === "inactive" ? "inactive" : "active";
}

function normalizeCommissionType(value: string | null): CommissionType {
  if (value === "fixed" || value === "hybrid" || value === "percentage") {
    return value;
  }

  return "percentage";
}

function normalizePaymentTrigger(
  value: string | null,
): CommissionPaymentTrigger {
  if (
    value === "contract_signed" ||
    value === "contract_submitted" ||
    value === "contract_approved" ||
    value === "contract_activation" ||
    value === "manual"
  ) {
    return value;
  }

  return "contract_activation";
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
  profile: CommissionPlanProfile | null,
): profile is CommissionPlanProfile & {
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

function roundPercentage(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function escapePostgrestSearch(value: string) {
  return value.replace(/[%*,()]/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function logCommissionPlanServerError(
  stage: string,
  payload: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.error("[EVOLV commission-plans]", {
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
