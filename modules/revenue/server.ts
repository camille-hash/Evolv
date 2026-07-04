import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type { CommissionScheduleEventType } from "@/modules/commission-plans/types";
import type {
  ExpectedRevenueInput,
  RevenueCalculationBase,
  RevenueCommissionPlanSnapshot,
  RevenueCommissionScheduleItemSnapshot,
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

type CommissionEngineExpectedRevenueRow = {
  business_status: string | null;
  cancelled_at: string | null;
  contract_id: string | null;
  created_at: string | null;
  event_type: string | null;
  expected_amount: number | string | null;
  expected_date: string | null;
  id: string;
  lifecycle: string | null;
  metadata: Record<string, unknown> | null;
  organization_id: string | null;
  remaining_amount: number | string | null;
  updated_at: string | null;
};

type CommissionEngineRecognizedRevenueRow = {
  expected_revenue_entry_id: string | null;
  recognized_amount: number | string | null;
  recognized_at: string | null;
  reversed_at: string | null;
};

type CommissionPlanScheduleItemRow = {
  commission_plan_id: string | null;
  event_type: string | null;
  id: string;
  installment_number: number | null;
  offset_days: number | null;
  offset_months: number | null;
  organization_id: string | null;
  percentage: number | string | null;
  sort_order: number | null;
};

type ClientRow = {
  id: string;
  organization_id: string | null;
};

type RequestContext = {
  profile: RevenueProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
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

export type ExpectedRevenueCreationResult =
  | { ok: true; revenueEntry: RevenueEntry }
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

const commissionEngineExpectedRevenueColumns = [
  "id",
  "organization_id",
  "contract_id",
  "created_at",
  "event_type",
  "expected_amount",
  "expected_date",
  "lifecycle",
  "business_status",
  "remaining_amount",
  "metadata",
  "cancelled_at",
  "updated_at",
].join(",");

const commissionEngineRecognizedRevenueColumns = [
  "expected_revenue_entry_id",
  "recognized_amount",
  "recognized_at",
  "reversed_at",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export function calculateExpectedRevenue(input: {
  contract: RevenueContractSnapshot;
  commissionPlan: RevenueCommissionPlanSnapshot;
  triggerDate: string;
}): RevenueInstallmentDraft[] {
  if (input.commissionPlan.scheduleItems.length) {
    const installmentsTotal = input.commissionPlan.scheduleItems.length;

    return input.commissionPlan.scheduleItems.map((scheduleItem, index) => {
      const expectedAmount = roundCurrency(
        input.contract.creditAmount * (scheduleItem.percentage / 100),
      );

      return {
        dueDate: addRelativeOffsetToDate(input.triggerDate, {
          daysToAdd: scheduleItem.offsetDays ?? 0,
          monthsToAdd: scheduleItem.offsetMonths ?? 0,
        }),
        eventType: scheduleItem.eventType,
        expectedAmount,
        installmentNumber: scheduleItem.installmentNumber,
        installmentsTotal,
        metadata: {
          calculationBase: {
            commissionPercentage: scheduleItem.percentage,
            creditAmount: input.contract.creditAmount,
          },
          commissionPlanId: input.commissionPlan.id,
          contractId: input.contract.id,
          eventType: scheduleItem.eventType,
          installmentNumber: scheduleItem.installmentNumber,
          installmentsTotal,
          offsetDays: scheduleItem.offsetDays,
          offsetMonths: scheduleItem.offsetMonths,
          origin: "revenue_engine_schedule",
          scheduleItemId: scheduleItem.id,
          scheduleSortOrder: scheduleItem.sortOrder ?? index,
        },
      };
    });
  }

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
      eventType: "installment",
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

  const contractsResult = await listContractsByClient(context, clientId);

  if (!contractsResult.ok) {
    return contractsResult;
  }

  const commissionEngineEntries = await getCommissionEngineRevenueEntries(
    context,
    contractsResult.contracts,
  );

  if (!commissionEngineEntries.ok) {
    return commissionEngineEntries;
  }

  if (commissionEngineEntries.revenueEntries.length) {
    return {
      ok: true,
      revenueEntries: commissionEngineEntries.revenueEntries,
    };
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

export async function createExpectedRevenueForContract(
  accessToken: string | null,
  contractId: string,
  input: ExpectedRevenueInput,
): Promise<ExpectedRevenueCreationResult> {
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

  const contractResult = await getContractFromCurrentOrganization(
    context,
    contractId,
  );

  if (!contractResult.ok) {
    return contractResult;
  }

  const contract = contractResult.contract;
  const { data, error } = await context.supabase
    .from("revenue_entries")
    .insert({
      administrator_id: contract.administratorId,
      client_id: contract.clientId,
      contract_id: contract.id,
      due_date: input.dueDate ?? null,
      expected_amount: input.expectedAmount,
      metadata: {
        ...(input.metadata ?? {}),
        origin: "manual_contract_creation",
      },
      organization_id: context.profile.organization_id,
      status: "expected",
      type: "commission",
    })
    .select(revenueEntryColumns)
    .single<RevenueEntryRow>();

  if (error || !data?.organization_id) {
    logRevenueServerError("expected_revenue_insert_failed", {
      contractId: contract.id,
      error: formatSupabaseDebugError(error),
      hasData: Boolean(data),
      organizationId: context.profile.organization_id,
    });

    return {
      error: "Nao foi possivel criar a receita esperada.",
      ok: false,
      status: 500,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    revenueEntry: mapRevenueEntryRow(data),
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
  const commissionEngineEntries = await getCommissionEngineRevenueEntries(
    context,
    [contract],
  );

  if (!commissionEngineEntries.ok) {
    return commissionEngineEntries;
  }

  if (commissionEngineEntries.revenueEntries.length) {
    return {
      createdEntries: [],
      existingEntries: commissionEngineEntries.revenueEntries,
      ok: true,
      skippedReason: "commission_engine_revenue_exists",
    };
  }

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
    metadata: {
      ...installment.metadata,
      revenueEventType: installment.eventType,
    },
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
  const contractResult = await getContractFromCurrentOrganization(
    context,
    contractId,
  );

  if (!contractResult.ok) {
    return contractResult;
  }

  const commissionEngineEntries = await getCommissionEngineRevenueEntries(
    context,
    [contractResult.contract],
  );

  if (!commissionEngineEntries.ok) {
    return commissionEngineEntries;
  }

  if (commissionEngineEntries.revenueEntries.length) {
    return commissionEngineEntries;
  }

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

async function getCommissionEngineRevenueEntries(
  context: RequestContext,
  contracts: RevenueContractSnapshot[],
): Promise<RevenueListResult> {
  if (!contracts.length) {
    return {
      ok: true,
      revenueEntries: [],
    };
  }

  const contractsById = new Map(
    contracts.map((contract) => [contract.id, contract]),
  );
  const contractIds = contracts.map((contract) => contract.id);
  const { data, error } = await context.supabase
    .from("expected_revenue_entries")
    .select(commissionEngineExpectedRevenueColumns)
    .eq("organization_id", context.profile.organization_id)
    .in("contract_id", contractIds)
    .order("expected_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return {
      error: "Nao foi possivel carregar receitas previstas do Commission Engine.",
      ok: false,
      status: 500,
    };
  }

  const expectedRevenueEntries =
    ((data ?? []) as unknown as CommissionEngineExpectedRevenueRow[]).filter(
      (entry) =>
        entry.organization_id === context.profile.organization_id &&
        Boolean(entry.contract_id && contractsById.has(entry.contract_id)),
    );

  if (!expectedRevenueEntries.length) {
    return {
      ok: true,
      revenueEntries: [],
    };
  }

  const recognizedRevenueByExpectedId =
    await getRecognizedRevenueByExpectedRevenueId(
      context,
      expectedRevenueEntries.map((entry) => entry.id),
    );

  if (!recognizedRevenueByExpectedId.ok) {
    return recognizedRevenueByExpectedId;
  }

  return {
    ok: true,
    revenueEntries: expectedRevenueEntries.map((entry) =>
      mapCommissionEngineExpectedRevenueEntry(
        entry,
        contractsById.get(entry.contract_id ?? "") ?? null,
        recognizedRevenueByExpectedId.recognizedRevenueByExpectedId.get(
          entry.id,
        ) ?? null,
      ),
    ),
  };
}

async function getRecognizedRevenueByExpectedRevenueId(
  context: RequestContext,
  expectedRevenueEntryIds: string[],
) {
  if (!expectedRevenueEntryIds.length) {
    return {
      ok: true as const,
      recognizedRevenueByExpectedId: new Map<
        string,
        {
          latestRecognizedAt: string | null;
          recognizedAmount: number;
        }
      >(),
    };
  }

  const { data, error } = await context.supabase
    .from("recognized_revenue_entries")
    .select(commissionEngineRecognizedRevenueColumns)
    .eq("organization_id", context.profile.organization_id)
    .in("expected_revenue_entry_id", expectedRevenueEntryIds)
    .is("reversed_at", null);

  if (error) {
    return {
      error: "Nao foi possivel carregar receitas reconhecidas do Commission Engine.",
      ok: false as const,
      status: 500,
    };
  }

  const recognizedRevenueByExpectedId = new Map<
    string,
    {
      latestRecognizedAt: string | null;
      recognizedAmount: number;
    }
  >();

  for (const entry of (data ?? []) as unknown as CommissionEngineRecognizedRevenueRow[]) {
    if (!entry.expected_revenue_entry_id || entry.reversed_at) {
      continue;
    }

    const current = recognizedRevenueByExpectedId.get(
      entry.expected_revenue_entry_id,
    ) ?? {
      latestRecognizedAt: null,
      recognizedAmount: 0,
    };
    const recognizedAmount = normalizeNumber(entry.recognized_amount) ?? 0;

    recognizedRevenueByExpectedId.set(entry.expected_revenue_entry_id, {
      latestRecognizedAt: resolveLatestDate(
        current.latestRecognizedAt,
        entry.recognized_at,
      ),
      recognizedAmount: roundCurrency(
        current.recognizedAmount + recognizedAmount,
      ),
    });
  }

  return {
    ok: true as const,
    recognizedRevenueByExpectedId,
  };
}

async function listContractsByClient(
  context: RequestContext,
  clientId: string,
) {
  const { data, error } = await context.supabase
    .from("contracts")
    .select(contractColumns)
    .eq("organization_id", context.profile.organization_id)
    .eq("client_id", clientId);

  if (error) {
    return {
      error: "Nao foi possivel carregar contratos do cliente.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    contracts: ((data ?? []) as unknown as ContractRow[]).map(mapContractRow),
    ok: true as const,
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

  const scheduleItems = await listCommissionPlanScheduleItems(context, data.id);

  return {
    commissionPlan: mapCommissionPlanRow(data, scheduleItems),
    ok: true as const,
  };
}

async function listCommissionPlanScheduleItems(
  context: RequestContext,
  commissionPlanId: string,
): Promise<RevenueCommissionScheduleItemSnapshot[]> {
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
        "offset_months",
        "offset_days",
        "sort_order",
      ].join(","),
    )
    .eq("organization_id", context.profile.organization_id)
    .eq("commission_plan_id", commissionPlanId)
    .order("sort_order", { ascending: true });

  if (error) {
    logRevenueServerError("commission_plan_schedule_query_failed", {
      commissionPlanId,
      error: formatSupabaseDebugError(error),
      organizationId: context.profile.organization_id,
    });

    return [];
  }

  return ((data ?? []) as unknown as CommissionPlanScheduleItemRow[])
    .filter(
      (row) =>
        row.organization_id === context.profile.organization_id &&
        row.commission_plan_id === commissionPlanId,
    )
    .map(mapCommissionPlanScheduleItemRow)
    .filter((item) => item.percentage > 0);
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
  scheduleItems: RevenueCommissionScheduleItemSnapshot[],
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
    scheduleItems,
    status: row.status ?? "active",
  };
}

function mapCommissionPlanScheduleItemRow(
  row: CommissionPlanScheduleItemRow,
): RevenueCommissionScheduleItemSnapshot {
  return {
    eventType: normalizeScheduleEventType(row.event_type),
    id: row.id,
    installmentNumber: row.installment_number,
    offsetDays: row.offset_days,
    offsetMonths: row.offset_months,
    percentage: normalizeNumber(row.percentage) ?? 0,
    sortOrder: row.sort_order ?? 0,
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

function mapCommissionEngineExpectedRevenueEntry(
  row: CommissionEngineExpectedRevenueRow,
  contract: RevenueContractSnapshot | null,
  recognizedRevenue: {
    latestRecognizedAt: string | null;
    recognizedAmount: number;
  } | null,
): RevenueEntry {
  const recognizedAmount = recognizedRevenue?.recognizedAmount ?? 0;
  const status = normalizeCommissionEngineRevenueStatus(row, recognizedAmount);
  const now = new Date().toISOString();

  return {
    actualAmount: recognizedAmount > 0 ? recognizedAmount : null,
    administratorId: contract?.administratorId ?? null,
    cancelledAt: row.cancelled_at,
    clientId: contract?.clientId ?? null,
    contractId: row.contract_id ?? "",
    createdAt: row.created_at ?? now,
    dueDate: row.expected_date,
    expectedAmount: normalizeNumber(row.expected_amount) ?? 0,
    id: row.id,
    metadata: {
      ...(isRecord(row.metadata) ? row.metadata : {}),
      commissionEngine: {
        businessStatus: row.business_status,
        eventType: row.event_type,
        lifecycle: row.lifecycle,
        remainingAmount: normalizeNumber(row.remaining_amount) ?? 0,
        source: "expected_revenue_entries",
      },
    },
    organizationId: row.organization_id ?? "",
    paidAt: status === "paid" ? recognizedRevenue?.latestRecognizedAt ?? null : null,
    status,
    type: "commission",
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

function addRelativeOffsetToDate(
  value: string,
  offset: {
    daysToAdd: number;
    monthsToAdd: number;
  },
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  date.setMonth(date.getMonth() + offset.monthsToAdd);
  date.setDate(date.getDate() + offset.daysToAdd);

  return date.toISOString().slice(0, 10);
}

function normalizeScheduleEventType(
  value: string | null,
): CommissionScheduleEventType {
  return value === "contemplation" ? "contemplation" : "installment";
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

function normalizeCommissionEngineRevenueStatus(
  row: CommissionEngineExpectedRevenueRow,
  recognizedAmount: number,
) {
  if (row.cancelled_at || row.lifecycle === "cancelada") {
    return "cancelled";
  }

  if (row.business_status === "reconhecida" || row.lifecycle === "encerrada") {
    return "paid";
  }

  if (
    row.business_status === "parcialmente_reconhecida" ||
    recognizedAmount > 0
  ) {
    return "pending";
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

function resolveLatestDate(
  currentDate: string | null,
  nextDate: string | null,
) {
  if (!currentDate) {
    return nextDate;
  }

  if (!nextDate) {
    return currentDate;
  }

  return new Date(nextDate).getTime() > new Date(currentDate).getTime()
    ? nextDate
    : currentDate;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function logRevenueServerError(
  stage: string,
  payload: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.error("[EVOLV revenue]", {
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
