import type {
  ActivateCommissionScheduleForEventParams,
  ActivateCommissionScheduleForEventResult,
  BackfillCommissionEngineForContractsParams,
  BackfillCommissionEngineForContractsResult,
  BackfillCommissionEngineContractReport,
  CancelFutureCommissionEntriesForContractParams,
  CancelFutureCommissionEntriesForContractResult,
  ContractCommissionScheduleItem,
  ContractCommissionSummary,
  ContractCommissionSnapshot,
  ExpectedRevenueEntry,
  EnsureContractCommissionSnapshotParams,
  EnsureContractCommissionSnapshotResult,
  GetContractCommissionSummaryParams,
  GetContractCommissionSummaryResult,
  GetContractCommissionSummariesParams,
  GetContractCommissionSummariesResult,
  RecognizedRevenueEntry,
  ReactivateFutureCommissionEntriesForContractParams,
  ReactivateFutureCommissionEntriesForContractResult,
  RecognizeExpectedRevenueParams,
  RecognizeExpectedRevenueResult,
} from "./types";
import { resolveCommissionEventTypeForContractStatus } from "./contract-status-events.ts";

type ContractRow = {
  activated_at: string | null;
  commission_plan_id: string | null;
  contract_number: string | null;
  credit_amount: number | string | null;
  id: string;
  organization_id: string | null;
  status: string | null;
};

type CommissionPlanRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
  status: string | null;
};

type CommissionPlanScheduleItemRow = {
  event_type: string | null;
  id: string;
  offset_days: number | null;
  offset_months: number | null;
  organization_id: string | null;
  percentage: number | string | null;
  sort_order: number | null;
};

type ContractCommissionSnapshotRow = {
  business_status: string | null;
  contract_id: string | null;
  frozen_at: string | null;
  id: string;
  lifecycle: string | null;
  organization_id: string | null;
  snapshot_version: number | null;
  source_commission_plan_id: string | null;
  source_commission_plan_name: string | null;
};

type ContractCommissionSnapshotItemRow = {
  business_status: string | null;
  event_type: string | null;
  id: string;
  lifecycle: string | null;
  offset_days: number | null;
  offset_months: number | null;
  organization_id: string | null;
  percentage: number | string | null;
  snapshot_id: string | null;
  sort_order: number | null;
  source_plan_item_id: string | null;
};

type ContractCommissionScheduleItemRow = {
  base_credit_amount: number | string | null;
  business_status: string | null;
  cancelled_at: string | null;
  contract_id: string | null;
  due_date: string | null;
  event_type: string | null;
  expected_amount: number | string | null;
  id: string;
  lifecycle: string | null;
  metadata: unknown;
  offset_days: number | null;
  offset_months: number | null;
  organization_id: string | null;
  percentage: number | string | null;
  snapshot_id: string | null;
  snapshot_item_id: string | null;
  triggered_at: string | null;
  trigger_event_id: string | null;
};

type ExpectedRevenueEntryRow = {
  base_credit_amount: number | string | null;
  business_status: string | null;
  cancelled_at: string | null;
  commission_schedule_item_id: string | null;
  contract_id: string | null;
  event_type: string | null;
  expected_amount: number | string | null;
  expected_date: string | null;
  id: string;
  lifecycle: string | null;
  metadata: unknown;
  organization_id: string | null;
  percentage: number | string | null;
  recognized_amount: number | string | null;
  remaining_amount: number | string | null;
  snapshot_id: string | null;
  snapshot_item_id: string | null;
};

type RecognizedRevenueEntryRow = {
  business_status: string | null;
  contract_id: string | null;
  created_by: string | null;
  expected_revenue_entry_id: string | null;
  id: string;
  lifecycle: string | null;
  metadata: unknown;
  notes: string | null;
  organization_id: string | null;
  recognition_type: string | null;
  recognized_amount: number | string | null;
  recognized_at: string | null;
  reversed_at: string | null;
};

type RecognizeExpectedRevenueTransactionRow = {
  expected_revenue_entry: ExpectedRevenueEntryRow;
  recognized_revenue_entry: RecognizedRevenueEntryRow;
};

const snapshotColumns = [
  "id",
  "organization_id",
  "contract_id",
  "source_commission_plan_id",
  "source_commission_plan_name",
  "lifecycle",
  "business_status",
  "snapshot_version",
  "frozen_at",
].join(",");

const snapshotItemColumns = [
  "id",
  "organization_id",
  "snapshot_id",
  "source_plan_item_id",
  "event_type",
  "percentage",
  "offset_months",
  "offset_days",
  "sort_order",
  "lifecycle",
  "business_status",
].join(",");

const scheduleItemColumns = [
  "id",
  "organization_id",
  "contract_id",
  "snapshot_id",
  "snapshot_item_id",
  "event_type",
  "percentage",
  "base_credit_amount",
  "expected_amount",
  "lifecycle",
  "business_status",
  "trigger_event_id",
  "triggered_at",
  "due_date",
  "offset_months",
  "offset_days",
  "metadata",
  "cancelled_at",
].join(",");

const expectedRevenueColumns = [
  "id",
  "organization_id",
  "contract_id",
  "commission_schedule_item_id",
  "snapshot_id",
  "snapshot_item_id",
  "event_type",
  "base_credit_amount",
  "percentage",
  "expected_amount",
  "expected_date",
  "lifecycle",
  "business_status",
  "recognized_amount",
  "remaining_amount",
  "metadata",
  "cancelled_at",
].join(",");

const supportedOperationalEventTypes = new Set([
  "contract_signed",
  "contract_contemplated",
  "contract_settled",
]);

const emptyCommissionSummaryTotals = {
  expectedAmount: 0,
  recognizedAmount: 0,
  remainingAmount: 0,
};

const emptyCommissionSummarySchedule = {
  cancelled: 0,
  executed: 0,
  pending: 0,
  total: 0,
};

const emptyCommissionSummaryExpectedRevenue = {
  cancelled: 0,
  partiallyRecognized: 0,
  pending: 0,
  recognized: 0,
  total: 0,
};

export async function ensureContractCommissionSnapshotAndSchedule(
  params: EnsureContractCommissionSnapshotParams,
): Promise<EnsureContractCommissionSnapshotResult> {
  if (!params.commissionPlanId) {
    return {
      created: false,
      ok: true,
      scheduleItems: [],
      skippedReason: "missing_commission_plan",
      snapshot: null,
    };
  }

  const existingSnapshot = await findActiveSnapshot(params);

  if (!existingSnapshot.ok) {
    return existingSnapshot;
  }

  if (existingSnapshot.snapshot) {
    const existingSchedule = await listScheduleItems(
      params,
      existingSnapshot.snapshot.id,
    );

    if (!existingSchedule.ok) {
      return existingSchedule;
    }

    if (!existingSchedule.scheduleItems.length) {
      return {
        error:
          "Snapshot de comissao existente nao possui agenda financeira. Reprocessamento nao esta habilitado nesta entrega.",
        ok: false,
        status: 409,
      };
    }

    return {
      created: false,
      ok: true,
      scheduleItems: existingSchedule.scheduleItems,
      skippedReason: null,
      snapshot: existingSnapshot.snapshot,
    };
  }

  const contractResult = await getContract(params);

  if (!contractResult.ok) {
    return contractResult;
  }

  const planResult = await getCommissionPlan(params);

  if (!planResult.ok) {
    return planResult;
  }

  const planItemsResult = await listCommissionPlanScheduleItems(params);

  if (!planItemsResult.ok) {
    return planItemsResult;
  }

  if (!planItemsResult.planItems.length) {
    return {
      error: "Plano de comissao nao possui itens de regua para gerar snapshot.",
      ok: false,
      status: 409,
    };
  }

  const snapshotResult = await createSnapshot(
    params,
    planResult.plan,
  );

  if (!snapshotResult.ok) {
    return snapshotResult;
  }

  const snapshotItemsResult = await createSnapshotItems(
    params,
    snapshotResult.snapshot,
    planItemsResult.planItems,
  );

  if (!snapshotItemsResult.ok) {
    return snapshotItemsResult;
  }

  const scheduleResult = await createScheduleItems(
    params,
    contractResult.contract,
    snapshotResult.snapshot,
    snapshotItemsResult.snapshotItems,
  );

  if (!scheduleResult.ok) {
    return scheduleResult;
  }

  const frozenSnapshotResult = await freezeSnapshot(
    params,
    snapshotResult.snapshot.id,
  );

  if (!frozenSnapshotResult.ok) {
    return frozenSnapshotResult;
  }

  return {
    created: true,
    ok: true,
    scheduleItems: scheduleResult.scheduleItems,
    skippedReason: null,
    snapshot: frozenSnapshotResult.snapshot,
  };
}

export async function activateCommissionScheduleForEvent(
  params: ActivateCommissionScheduleForEventParams,
): Promise<ActivateCommissionScheduleForEventResult> {
  const normalizedEventType = params.eventType.trim();

  if (!normalizedEventType) {
    return commissionEngineError("Evento de comissao invalido.", 400);
  }

  if (!isSupportedOperationalEventType(normalizedEventType)) {
    return commissionEngineError(
      "Evento operacional de comissao ainda nao suportado.",
      400,
    );
  }

  const occurredAt = normalizeDate(params.occurredAt);

  if (!occurredAt) {
    return commissionEngineError("Data do evento de comissao invalida.", 400);
  }

  const scheduleResult = await listScheduleItemsForEvent(
    params,
    resolveScheduleEventTypes(normalizedEventType),
  );

  if (!scheduleResult.ok) {
    return scheduleResult;
  }

  if (!scheduleResult.scheduleItems.length) {
    return commissionEngineError(
      "Agenda financeira de comissao nao encontrada para o evento informado.",
      404,
    );
  }

  if (
    scheduleResult.scheduleItems.some(
      (scheduleItem) =>
        scheduleItem.cancelledAt || scheduleItem.lifecycle === "cancelada",
    )
  ) {
    return commissionEngineError(
      "Agenda financeira de comissao cancelada.",
      409,
    );
  }

  const activatedScheduleItems: ContractCommissionScheduleItem[] = [];
  const expectedRevenueEntries: ExpectedRevenueEntry[] = [];
  let createdAnyExpectedRevenue = false;

  for (const scheduleItem of scheduleResult.scheduleItems) {
    const existingExpectedRevenueResult = await findActiveExpectedRevenueEntry(
      params,
      scheduleItem.id,
    );

    if (!existingExpectedRevenueResult.ok) {
      return existingExpectedRevenueResult;
    }

    if (existingExpectedRevenueResult.expectedRevenueEntry) {
      activatedScheduleItems.push(scheduleItem);
      expectedRevenueEntries.push(
        existingExpectedRevenueResult.expectedRevenueEntry,
      );
      continue;
    }

    const expectedAmount = getScheduleExpectedAmount(scheduleItem);

    if (expectedAmount === null || scheduleItem.baseCreditAmount === null) {
      return commissionEngineError(
        "Agenda financeira de comissao nao possui base suficiente para receita prevista.",
        409,
      );
    }

    const dueDate = calculateDueDate(
      occurredAt,
      scheduleItem.offsetMonths,
      scheduleItem.offsetDays,
    );
    const activatedScheduleResult = await updateScheduleItemActivation(
      params,
      scheduleItem,
      occurredAt.toISOString(),
      dueDate,
      normalizedEventType,
    );

    if (!activatedScheduleResult.ok) {
      return activatedScheduleResult;
    }

    const expectedRevenueResult = await createExpectedRevenueEntry(
      params,
      activatedScheduleResult.scheduleItem,
      dueDate,
      expectedAmount,
      normalizedEventType,
    );

    if (!expectedRevenueResult.ok) {
      return expectedRevenueResult;
    }

    createdAnyExpectedRevenue = true;
    activatedScheduleItems.push(activatedScheduleResult.scheduleItem);
    expectedRevenueEntries.push(expectedRevenueResult.expectedRevenueEntry);
  }

  return {
    activated: createdAnyExpectedRevenue,
    expectedRevenueEntries,
    ok: true,
    scheduleItems: activatedScheduleItems,
    skippedReason: createdAnyExpectedRevenue
      ? null
      : "expected_revenue_already_exists",
  };
}

export async function recognizeExpectedRevenue(
  params: RecognizeExpectedRevenueParams,
): Promise<RecognizeExpectedRevenueResult> {
  if (!Number.isFinite(params.recognizedAmount) || params.recognizedAmount <= 0) {
    return commissionEngineError(
      "Valor reconhecido deve ser maior que zero.",
      400,
    );
  }

  const recognizedAt = normalizeDate(params.recognizedAt);

  if (!recognizedAt) {
    return commissionEngineError(
      "Data de reconhecimento de receita invalida.",
      400,
    );
  }

  const { data, error } = await params.supabase
    .rpc("recognize_expected_revenue_transaction", {
      p_created_by: params.createdBy ?? null,
      p_expected_revenue_entry_id: params.expectedRevenueEntryId,
      p_metadata: params.metadata ?? {},
      p_notes: normalizeOptionalText(params.notes),
      p_organization_id: params.organizationId,
      p_recognition_type: normalizeOptionalText(params.recognitionType),
      p_recognized_amount: params.recognizedAmount,
      p_recognized_at: recognizedAt.toISOString(),
    })
    .maybeSingle<RecognizeExpectedRevenueTransactionRow>();

  if (error || !data) {
    return commissionEngineError(
      error?.message ?? "Nao foi possivel reconhecer receita prevista.",
      mapRecognizeRevenueRpcStatus(error?.code),
    );
  }

  return {
    expectedRevenueEntry: mapExpectedRevenueEntryRow(
      data.expected_revenue_entry,
    ),
    ok: true,
    recognizedRevenueEntry: mapRecognizedRevenueEntryRow(
      data.recognized_revenue_entry,
    ),
  };
}

export async function cancelFutureCommissionEntriesForContract(
  params: CancelFutureCommissionEntriesForContractParams,
): Promise<CancelFutureCommissionEntriesForContractResult> {
  const cancelledAt = normalizeDate(params.cancelledAt ?? new Date().toISOString());

  if (!cancelledAt) {
    return commissionEngineError("Data de cancelamento invalida.", 400);
  }

  const expectedRevenueLookup = await params.supabase
    .from("expected_revenue_entries")
    .select(expectedRevenueColumns)
    .eq("organization_id", params.organizationId)
    .eq("contract_id", params.contractId)
    .is("cancelled_at", null)
    .neq("lifecycle", "cancelada");

  if (expectedRevenueLookup.error) {
    return commissionEngineError(
      "Nao foi possivel localizar receitas previstas para cancelamento.",
      500,
    );
  }

  const expectedEntriesToCancel = (
    ((expectedRevenueLookup.data ?? []) as unknown as ExpectedRevenueEntryRow[])
      .filter((entry) => entry.organization_id === params.organizationId)
      .map(mapExpectedRevenueEntryRow)
  ).filter((entry) => entry.remainingAmount > 0);
  const expectedEntryIdsToCancel = expectedEntriesToCancel.map((entry) => entry.id);
  const linkedScheduleItemIds = expectedEntriesToCancel.map(
    (entry) => entry.commissionScheduleItemId,
  );
  const pendingScheduleLookup = await params.supabase
    .from("contract_commission_schedule_items")
    .select(scheduleItemColumns)
    .eq("organization_id", params.organizationId)
    .eq("contract_id", params.contractId)
    .is("cancelled_at", null)
    .neq("lifecycle", "cancelada")
    .eq("business_status", "pendente");

  if (pendingScheduleLookup.error) {
    return commissionEngineError(
      "Nao foi possivel localizar agenda de comissao para cancelamento.",
      500,
    );
  }

  const scheduleItemIdsToCancel = Array.from(
    new Set([
      ...linkedScheduleItemIds,
      ...(((pendingScheduleLookup.data ?? []) as unknown as ContractCommissionScheduleItemRow[])
        .filter((item) => item.organization_id === params.organizationId)
        .map((item) => item.id)),
    ]),
  );
  const scheduleItemsLookup =
    scheduleItemIdsToCancel.length > 0
      ? await params.supabase
          .from("contract_commission_schedule_items")
          .select(scheduleItemColumns)
          .eq("organization_id", params.organizationId)
          .in("id", scheduleItemIdsToCancel)
      : null;

  if (scheduleItemsLookup?.error) {
    return commissionEngineError(
      "Nao foi possivel carregar agenda de comissao para cancelar os futuros.",
      500,
    );
  }

  const scheduleItemsToCancel = (
    ((scheduleItemsLookup?.data ?? []) as unknown as ContractCommissionScheduleItemRow[])
      .filter((item) => item.organization_id === params.organizationId)
      .map(mapScheduleItemRow)
  );

  if (!expectedEntryIdsToCancel.length && !scheduleItemIdsToCancel.length) {
    return {
      cancelledExpectedRevenueEntries: 0,
      cancelledScheduleItems: 0,
      ok: true,
      skippedReason: "no_pending_schedule_or_expected_revenue",
    };
  }

  const cancellationReason =
    normalizeOptionalText(params.cancellationReason) ??
    "Contrato inativado com cancelamento de lancamentos futuros.";
  const cancellationMetadata = {
    ...(params.metadata ?? {}),
    cancelledBy: params.cancelledBy ?? null,
    cancelledAt: cancelledAt.toISOString(),
    cancellationReason,
    source: "contract_inactive_transition",
  };

  let cancelledExpectedRevenueEntries = 0;
  let cancelledScheduleItems = 0;

  if (expectedEntryIdsToCancel.length) {
    for (const entry of expectedEntriesToCancel) {
      const { error } = await params.supabase
        .from("expected_revenue_entries")
        .update({
          business_status: "cancelada",
          cancelled_at: cancelledAt.toISOString(),
          cancelled_reason: cancellationReason,
          lifecycle: "cancelada",
          metadata: {
            ...entry.metadata,
            cancellation: cancellationMetadata,
          },
          remaining_amount: 0,
        })
        .eq("organization_id", params.organizationId)
        .eq("id", entry.id);

      if (error) {
        return commissionEngineError(
          "Nao foi possivel cancelar receitas previstas pendentes.",
          500,
        );
      }

      cancelledExpectedRevenueEntries += 1;
    }
  }

  if (scheduleItemIdsToCancel.length) {
    for (const scheduleItem of scheduleItemsToCancel) {
      const { error } = await params.supabase
        .from("contract_commission_schedule_items")
        .update({
          business_status: "cancelada",
          cancelled_at: cancelledAt.toISOString(),
          cancelled_reason: cancellationReason,
          lifecycle: "cancelada",
          metadata: {
            ...scheduleItem.metadata,
            cancellation: cancellationMetadata,
          },
        })
        .eq("organization_id", params.organizationId)
        .eq("id", scheduleItem.id);

      if (error) {
        return commissionEngineError(
          "Nao foi possivel cancelar agenda futura de comissao.",
          500,
        );
      }

      cancelledScheduleItems += 1;
    }
  }

  return {
    cancelledExpectedRevenueEntries,
    cancelledScheduleItems,
    ok: true,
    skippedReason: expectedEntryIdsToCancel.length
      ? null
      : "no_pending_expected_revenue",
  };
}

export async function reactivateFutureCommissionEntriesForContract(
  params: ReactivateFutureCommissionEntriesForContractParams,
): Promise<ReactivateFutureCommissionEntriesForContractResult> {
  const normalizedEventType = params.eventType.trim();

  if (!normalizedEventType) {
    return commissionEngineError("Evento de comissao invalido.", 400);
  }

  if (!isSupportedOperationalEventType(normalizedEventType)) {
    return commissionEngineError(
      "Evento operacional de comissao ainda nao suportado.",
      400,
    );
  }

  const occurredAt = normalizeDate(params.occurredAt);

  if (!occurredAt) {
    return commissionEngineError("Data de reativacao de comissao invalida.", 400);
  }

  const scheduleResult = await listScheduleItemsForEvent(
    params,
    resolveScheduleEventTypes(normalizedEventType),
  );

  if (!scheduleResult.ok) {
    return scheduleResult;
  }

  if (!scheduleResult.scheduleItems.length) {
    return commissionEngineError(
      "Agenda financeira de comissao nao encontrada para a reativacao do contrato.",
      404,
    );
  }

  const expectedRevenueResult = await listExpectedRevenueEntriesByContract({
    contractId: params.contractId,
    organizationId: params.organizationId,
    supabase: params.supabase,
  });

  if (!expectedRevenueResult.ok) {
    return expectedRevenueResult;
  }

  const activeExpectedRevenueByScheduleItemId = new Map<string, ExpectedRevenueEntry>();
  const cancelledExpectedRevenueByScheduleItemId = new Map<
    string,
    ExpectedRevenueEntry
  >();

  for (const entry of expectedRevenueResult.expectedRevenueEntries) {
    if (!entry.commissionScheduleItemId) {
      continue;
    }

    if (entry.cancelledAt || entry.lifecycle === "cancelada") {
      if (!cancelledExpectedRevenueByScheduleItemId.has(entry.commissionScheduleItemId)) {
        cancelledExpectedRevenueByScheduleItemId.set(
          entry.commissionScheduleItemId,
          entry,
        );
      }

      continue;
    }

    if (!activeExpectedRevenueByScheduleItemId.has(entry.commissionScheduleItemId)) {
      activeExpectedRevenueByScheduleItemId.set(
        entry.commissionScheduleItemId,
        entry,
      );
    }
  }

  let restoredExpectedRevenueEntries = 0;
  let restoredScheduleItems = 0;

  for (const scheduleItem of scheduleResult.scheduleItems) {
    if (!scheduleItem.cancelledAt && scheduleItem.lifecycle !== "cancelada") {
      continue;
    }

    const dueDate = calculateDueDate(
      occurredAt,
      scheduleItem.offsetMonths,
      scheduleItem.offsetDays,
    );
    const activeExpectedRevenueEntry = activeExpectedRevenueByScheduleItemId.get(
      scheduleItem.id,
    );
    const cancelledExpectedRevenueEntry =
      cancelledExpectedRevenueByScheduleItemId.get(scheduleItem.id);

    if (activeExpectedRevenueEntry) {
      const restoredScheduleItemResult = await restoreCancelledScheduleItem(
        params,
        scheduleItem,
        occurredAt.toISOString(),
        activeExpectedRevenueEntry.expectedDate ?? dueDate,
        normalizedEventType,
        "executada",
      );

      if (!restoredScheduleItemResult.ok) {
        return restoredScheduleItemResult;
      }

      restoredScheduleItems += 1;
      continue;
    }

    if (cancelledExpectedRevenueEntry) {
      const restoredScheduleItemResult = await restoreCancelledScheduleItem(
        params,
        scheduleItem,
        occurredAt.toISOString(),
        dueDate,
        normalizedEventType,
        "executada",
      );

      if (!restoredScheduleItemResult.ok) {
        return restoredScheduleItemResult;
      }

      const restoredExpectedRevenueResult =
        await restoreCancelledExpectedRevenueEntry(
          params,
          cancelledExpectedRevenueEntry,
          dueDate,
          normalizedEventType,
        );

      if (!restoredExpectedRevenueResult.ok) {
        return restoredExpectedRevenueResult;
      }

      restoredScheduleItems += 1;
      restoredExpectedRevenueEntries += 1;
      continue;
    }

    const restoredScheduleItemResult = await restoreCancelledScheduleItem(
      params,
      scheduleItem,
      null,
      null,
      normalizedEventType,
      "pendente",
    );

    if (!restoredScheduleItemResult.ok) {
      return restoredScheduleItemResult;
    }

    restoredScheduleItems += 1;
  }

  const activationResult = await activateCommissionScheduleForEvent(params);

  if (!activationResult.ok) {
    return activationResult;
  }

  return {
    activationResult,
    ok: true,
    restoredExpectedRevenueEntries,
    restoredScheduleItems,
  };
}

export async function getContractCommissionSummary(
  params: GetContractCommissionSummaryParams,
): Promise<GetContractCommissionSummaryResult> {
  const snapshotResult = await findActiveSnapshot(params);

  if (!snapshotResult.ok) {
    return snapshotResult;
  }

  if (!snapshotResult.snapshot) {
    return {
      expectedRevenue: emptyCommissionSummaryExpectedRevenue,
      hasCommissionEngine: false,
      ok: true,
      schedule: emptyCommissionSummarySchedule,
      snapshot: null,
      totals: emptyCommissionSummaryTotals,
    };
  }

  const [scheduleResult, expectedRevenueResult] = await Promise.all([
    listScheduleItems(params, snapshotResult.snapshot.id),
    listExpectedRevenueEntriesByContract(params),
  ]);

  if (!scheduleResult.ok) {
    return scheduleResult;
  }

  if (!expectedRevenueResult.ok) {
    return expectedRevenueResult;
  }

  const recognizedRevenueResult = await sumRecognizedRevenueEntries(
    params,
    expectedRevenueResult.expectedRevenueEntries.map((entry) => entry.id),
  );

  if (!recognizedRevenueResult.ok) {
    return recognizedRevenueResult;
  }

  return {
    expectedRevenue: summarizeExpectedRevenue(
      expectedRevenueResult.expectedRevenueEntries,
    ),
    hasCommissionEngine: true,
    ok: true,
    schedule: summarizeSchedule(scheduleResult.scheduleItems),
    snapshot: {
      businessStatus: snapshotResult.snapshot.businessStatus,
      frozenAt: snapshotResult.snapshot.frozenAt,
      id: snapshotResult.snapshot.id,
      lifecycle: snapshotResult.snapshot.lifecycle,
      sourceCommissionPlanName:
        snapshotResult.snapshot.sourceCommissionPlanName,
    },
    totals: {
      expectedAmount: sumExpectedAmount(
        expectedRevenueResult.expectedRevenueEntries,
      ),
      recognizedAmount: recognizedRevenueResult.recognizedAmount,
      remainingAmount: sumRemainingAmount(
        expectedRevenueResult.expectedRevenueEntries,
      ),
    },
  };
}

export async function getContractCommissionSummaries(
  params: GetContractCommissionSummariesParams,
): Promise<GetContractCommissionSummariesResult> {
  const contractIds = Array.from(
    new Set(params.contractIds.map((contractId) => contractId.trim()).filter(Boolean)),
  );
  const summaries = new Map<string, ContractCommissionSummary>();

  for (const contractId of contractIds) {
    summaries.set(contractId, buildEmptyContractCommissionSummary());
  }

  if (!contractIds.length) {
    return {
      ok: true,
      summaries,
    };
  }

  const snapshotsResult = await listActiveSnapshotsByContract(params, contractIds);

  if (!snapshotsResult.ok) {
    return snapshotsResult;
  }

  if (!snapshotsResult.snapshots.length) {
    return {
      ok: true,
      summaries,
    };
  }

  const snapshotsByContractId = new Map(
    snapshotsResult.snapshots.map((snapshot) => [snapshot.contractId, snapshot]),
  );
  const snapshotIds = snapshotsResult.snapshots.map((snapshot) => snapshot.id);
  const [scheduleResult, expectedRevenueResult] = await Promise.all([
    listScheduleItemsBySnapshotIds(params, snapshotIds),
    listExpectedRevenueEntriesByContractIds(params, contractIds),
  ]);

  if (!scheduleResult.ok) {
    return scheduleResult;
  }

  if (!expectedRevenueResult.ok) {
    return expectedRevenueResult;
  }

  const recognizedRevenueResult = await sumRecognizedRevenueEntriesByExpectedId(
    params,
    expectedRevenueResult.expectedRevenueEntries.map((entry) => entry.id),
  );

  if (!recognizedRevenueResult.ok) {
    return recognizedRevenueResult;
  }

  const scheduleBySnapshotId = groupScheduleItemsBySnapshotId(
    scheduleResult.scheduleItems,
  );
  const expectedRevenueByContractId = groupExpectedRevenueEntriesByContractId(
    expectedRevenueResult.expectedRevenueEntries,
  );

  for (const contractId of contractIds) {
    const snapshot = snapshotsByContractId.get(contractId);

    if (!snapshot) {
      continue;
    }

    const expectedRevenueEntries =
      expectedRevenueByContractId.get(contractId) ?? [];

    summaries.set(contractId, {
      expectedRevenue: summarizeExpectedRevenue(expectedRevenueEntries),
      hasCommissionEngine: true,
      schedule: summarizeSchedule(scheduleBySnapshotId.get(snapshot.id) ?? []),
      snapshot: {
        businessStatus: snapshot.businessStatus,
        frozenAt: snapshot.frozenAt,
        id: snapshot.id,
        lifecycle: snapshot.lifecycle,
        sourceCommissionPlanName: snapshot.sourceCommissionPlanName,
      },
      totals: {
        expectedAmount: sumExpectedAmount(expectedRevenueEntries),
        recognizedAmount: sumRecognizedAmountForExpectedEntries(
          expectedRevenueEntries,
          recognizedRevenueResult.recognizedAmountByExpectedId,
        ),
        remainingAmount: sumRemainingAmount(expectedRevenueEntries),
      },
    });
  }

  return {
    ok: true,
    summaries,
  };
}

export async function backfillCommissionEngineForContracts(
  params: BackfillCommissionEngineForContractsParams,
): Promise<BackfillCommissionEngineForContractsResult> {
  const contractsResult = await listContractsForBackfill(params);

  if (!contractsResult.ok) {
    return contractsResult;
  }

  const results: BackfillCommissionEngineContractReport[] = [];
  const errors: Array<{
    contractId: string;
    contractNumber: string | null;
    error: string;
  }> = [];
  let contractsIgnored = 0;
  let expectedRevenueEntriesCreated = 0;
  let scheduleItemsCreated = 0;
  let snapshotsCreated = 0;

  for (const contract of contractsResult.contracts) {
    const report = await backfillSingleContract(params, contract);
    results.push(report);

    if (report.error) {
      errors.push({
        contractId: report.contractId,
        contractNumber: report.contractNumber,
        error: report.error,
      });
      continue;
    }

    if (report.ignoredReason) {
      contractsIgnored += 1;
    }

    if (report.snapshotCreated) {
      snapshotsCreated += 1;
    }

    scheduleItemsCreated += report.scheduleItemsCreated;
    expectedRevenueEntriesCreated += report.expectedRevenueEntriesCreated;
  }

  return {
    contractsAnalyzed: contractsResult.contracts.length,
    contractsIgnored,
    dryRun: Boolean(params.dryRun),
    errors,
    expectedRevenueEntriesCreated,
    ok: true,
    results,
    scheduleItemsCreated,
    snapshotsCreated,
  };
}

async function findActiveSnapshot(params: EnsureContractCommissionSnapshotParams) {
  const { data, error } = await params.supabase
    .from("contract_commission_snapshots")
    .select(snapshotColumns)
    .eq("organization_id", params.organizationId)
    .eq("contract_id", params.contractId)
    .is("superseded_at", null)
    .maybeSingle<ContractCommissionSnapshotRow>();

  if (error) {
    return commissionEngineError(
      "Nao foi possivel verificar snapshot de comissao existente.",
      500,
    );
  }

  return {
    ok: true as const,
    snapshot: data ? mapSnapshotRow(data) : null,
  };
}

async function listContractsForBackfill(
  params: BackfillCommissionEngineForContractsParams,
) {
  let query = params.supabase
    .from("contracts")
    .select(
      [
        "id",
        "organization_id",
        "contract_number",
        "commission_plan_id",
        "status",
        "activated_at",
        "credit_amount",
      ].join(","),
    )
    .eq("organization_id", params.organizationId)
    .order("created_at", { ascending: true });

  if (params.contractIds?.length) {
    query = query.in("id", params.contractIds);
  } else {
    query = query.not("commission_plan_id", "is", null);
  }

  const { data, error } = await query;

  if (error) {
    return commissionEngineError(
      "Nao foi possivel carregar contratos para backfill do Commission Engine.",
      500,
    );
  }

  return {
    contracts: ((data ?? []) as unknown as ContractRow[]).filter(
      (contract) => contract.organization_id === params.organizationId,
    ),
    ok: true as const,
  };
}

async function backfillSingleContract(
  params: BackfillCommissionEngineForContractsParams,
  contract: ContractRow,
): Promise<BackfillCommissionEngineContractReport> {
  const baseReport = await buildBackfillBaseReport(params, contract);

  if ("error" in baseReport) {
    return baseReport;
  }

  if (!contract.commission_plan_id) {
    return {
      ...baseReport,
      ignoredReason: "missing_commission_plan",
    };
  }

  if (params.dryRun) {
    let scheduleItemsCreated = 0;

    if (!baseReport.snapshotId) {
      const planItemsResult = await listCommissionPlanScheduleItems({
        commissionPlanId: contract.commission_plan_id,
        contractId: contract.id,
        organizationId: params.organizationId,
        supabase: params.supabase,
      });

      if (!planItemsResult.ok) {
        return {
          ...baseReport,
          error: planItemsResult.error,
        };
      }

      scheduleItemsCreated = planItemsResult.planItems.length;
    }

    return {
      ...baseReport,
      expectedRevenueEntriesCreated:
        baseReport.wouldActivateEventType &&
        baseReport.expectedRevenueEntriesBefore === 0
          ? baseReport.scheduleItemsBefore || scheduleItemsCreated
          : 0,
      ignoredReason: baseReport.wouldActivateEventType ? null : "status_not_mapped",
      scheduleItemsCreated,
      snapshotCreated: !baseReport.snapshotId,
    };
  }

  const ensureResult = await ensureContractCommissionSnapshotAndSchedule({
    commissionPlanId: contract.commission_plan_id,
    contractId: contract.id,
    organizationId: params.organizationId,
    supabase: params.supabase,
  });

  if (!ensureResult.ok) {
    return {
      ...baseReport,
      error: ensureResult.error,
    };
  }

  const scheduleItemsAfterEnsure = ensureResult.scheduleItems.length;
  const snapshotCreated = ensureResult.created;
  const scheduleItemsCreated = ensureResult.created
    ? ensureResult.scheduleItems.length
    : 0;
  const snapshotId = ensureResult.snapshot?.id ?? baseReport.snapshotId;
  const eventType = resolveCommissionEventTypeForContractStatus(contract.status);

  if (!eventType) {
    return {
      ...baseReport,
      ignoredReason: "status_not_mapped",
      scheduleItemsAfter: scheduleItemsAfterEnsure,
      scheduleItemsCreated,
      snapshotCreated,
      snapshotId,
    };
  }

  const expectedRevenueBeforeActivationResult =
    await listExpectedRevenueEntriesByContract({
      contractId: contract.id,
      organizationId: params.organizationId,
      supabase: params.supabase,
    });

  if (!expectedRevenueBeforeActivationResult.ok) {
    return {
      ...baseReport,
      error: expectedRevenueBeforeActivationResult.error,
      scheduleItemsAfter: scheduleItemsAfterEnsure,
      scheduleItemsCreated,
      snapshotCreated,
      snapshotId,
    };
  }

  const activationResult = await activateCommissionScheduleForEvent({
    contractId: contract.id,
    eventType,
    metadata: {
      source: "commission_engine_backfill",
      status: contract.status ?? "unknown",
    },
    occurredAt: contract.activated_at ?? new Date().toISOString(),
    organizationId: params.organizationId,
    supabase: params.supabase,
    triggerEventId: `commission-backfill:${contract.id}:${eventType}`,
  });

  if (!activationResult.ok) {
    return {
      ...baseReport,
      error: activationResult.error,
      scheduleItemsAfter: scheduleItemsAfterEnsure,
      scheduleItemsCreated,
      snapshotCreated,
      snapshotId,
    };
  }

  const expectedRevenueAfterActivationResult =
    await listExpectedRevenueEntriesByContract({
      contractId: contract.id,
      organizationId: params.organizationId,
      supabase: params.supabase,
    });

  if (!expectedRevenueAfterActivationResult.ok) {
    return {
      ...baseReport,
      error: expectedRevenueAfterActivationResult.error,
      scheduleItemsAfter: scheduleItemsAfterEnsure,
      scheduleItemsCreated,
      snapshotCreated,
      snapshotId,
    };
  }

  return {
    ...baseReport,
    expectedRevenueEntriesAfter:
      expectedRevenueAfterActivationResult.expectedRevenueEntries.length,
    expectedRevenueEntriesBefore:
      expectedRevenueBeforeActivationResult.expectedRevenueEntries.length,
    expectedRevenueEntriesCreated: Math.max(
      expectedRevenueAfterActivationResult.expectedRevenueEntries.length -
        expectedRevenueBeforeActivationResult.expectedRevenueEntries.length,
      0,
    ),
    ignoredReason: null,
    scheduleItemsAfter: scheduleItemsAfterEnsure,
    scheduleItemsCreated,
    snapshotCreated,
    snapshotId,
  };
}

async function buildBackfillBaseReport(
  params: BackfillCommissionEngineForContractsParams,
  contract: ContractRow,
) {
  const snapshotResult = await findActiveSnapshot({
    commissionPlanId: contract.commission_plan_id,
    contractId: contract.id,
    organizationId: params.organizationId,
    supabase: params.supabase,
  });

  if (!snapshotResult.ok) {
    return {
      contractId: contract.id,
      contractNumber: contract.contract_number,
      error: snapshotResult.error,
      expectedRevenueEntriesAfter: 0,
      expectedRevenueEntriesBefore: 0,
      expectedRevenueEntriesCreated: 0,
      ignoredReason: null,
      scheduleItemsAfter: 0,
      scheduleItemsBefore: 0,
      scheduleItemsCreated: 0,
      snapshotCreated: false,
      snapshotId: null,
      status: contract.status ?? "draft",
      wouldActivateEventType: resolveCommissionEventTypeForContractStatus(
        contract.status,
      ),
    } satisfies BackfillCommissionEngineContractReport;
  }

  const expectedRevenueResult = await listExpectedRevenueEntriesByContract({
    contractId: contract.id,
    organizationId: params.organizationId,
    supabase: params.supabase,
  });

  if (!expectedRevenueResult.ok) {
    return {
      contractId: contract.id,
      contractNumber: contract.contract_number,
      error: expectedRevenueResult.error,
      expectedRevenueEntriesAfter: 0,
      expectedRevenueEntriesBefore: 0,
      expectedRevenueEntriesCreated: 0,
      ignoredReason: null,
      scheduleItemsAfter: 0,
      scheduleItemsBefore: 0,
      scheduleItemsCreated: 0,
      snapshotCreated: false,
      snapshotId: snapshotResult.snapshot?.id ?? null,
      status: contract.status ?? "draft",
      wouldActivateEventType: resolveCommissionEventTypeForContractStatus(
        contract.status,
      ),
    } satisfies BackfillCommissionEngineContractReport;
  }

  let scheduleItemsBefore = 0;

  if (snapshotResult.snapshot) {
    const scheduleResult = await listScheduleItems(
      {
        commissionPlanId: contract.commission_plan_id,
        contractId: contract.id,
        organizationId: params.organizationId,
        supabase: params.supabase,
      },
      snapshotResult.snapshot.id,
    );

    if (!scheduleResult.ok) {
      return {
        contractId: contract.id,
        contractNumber: contract.contract_number,
        error: scheduleResult.error,
        expectedRevenueEntriesAfter:
          expectedRevenueResult.expectedRevenueEntries.length,
        expectedRevenueEntriesBefore:
          expectedRevenueResult.expectedRevenueEntries.length,
        expectedRevenueEntriesCreated: 0,
        ignoredReason: null,
        scheduleItemsAfter: 0,
        scheduleItemsBefore: 0,
        scheduleItemsCreated: 0,
        snapshotCreated: false,
        snapshotId: snapshotResult.snapshot.id,
        status: contract.status ?? "draft",
        wouldActivateEventType: resolveCommissionEventTypeForContractStatus(
          contract.status,
        ),
      } satisfies BackfillCommissionEngineContractReport;
    }

    scheduleItemsBefore = scheduleResult.scheduleItems.length;
  }

  return {
    contractId: contract.id,
    contractNumber: contract.contract_number,
    expectedRevenueEntriesAfter: expectedRevenueResult.expectedRevenueEntries.length,
    expectedRevenueEntriesBefore:
      expectedRevenueResult.expectedRevenueEntries.length,
    expectedRevenueEntriesCreated: 0,
    ignoredReason: null,
    scheduleItemsAfter: scheduleItemsBefore,
    scheduleItemsBefore,
    scheduleItemsCreated: 0,
    snapshotCreated: false,
    snapshotId: snapshotResult.snapshot?.id ?? null,
    status: contract.status ?? "draft",
    wouldActivateEventType: resolveCommissionEventTypeForContractStatus(
      contract.status,
    ),
  } satisfies BackfillCommissionEngineContractReport;
}

async function getContract(params: EnsureContractCommissionSnapshotParams) {
  const { data, error } = await params.supabase
    .from("contracts")
    .select("id, organization_id, credit_amount")
    .eq("organization_id", params.organizationId)
    .eq("id", params.contractId)
    .maybeSingle<ContractRow>();

  if (error || !data?.organization_id) {
    return commissionEngineError("Contrato nao encontrado para snapshot.", 404);
  }

  return {
    contract: {
      creditAmount: normalizeNumber(data.credit_amount) ?? 0,
      id: data.id,
      organizationId: data.organization_id,
    },
    ok: true as const,
  };
}

async function getCommissionPlan(params: EnsureContractCommissionSnapshotParams) {
  const { data, error } = await params.supabase
    .from("commission_plans")
    .select("id, organization_id, name, status")
    .eq("organization_id", params.organizationId)
    .eq("id", params.commissionPlanId)
    .maybeSingle<CommissionPlanRow>();

  if (error || !data?.organization_id) {
    return commissionEngineError(
      "Plano de comissao nao encontrado para snapshot.",
      404,
    );
  }

  return {
    ok: true as const,
    plan: data,
  };
}

async function listCommissionPlanScheduleItems(
  params: EnsureContractCommissionSnapshotParams,
) {
  const { data, error } = await params.supabase
    .from("commission_plan_schedule_items")
    .select(
      [
        "id",
        "organization_id",
        "event_type",
        "percentage",
        "offset_months",
        "offset_days",
        "sort_order",
      ].join(","),
    )
    .eq("organization_id", params.organizationId)
    .eq("commission_plan_id", params.commissionPlanId)
    .order("sort_order", { ascending: true });

  if (error) {
    return commissionEngineError(
      "Nao foi possivel carregar a regua do plano de comissao.",
      500,
    );
  }

  return {
    ok: true as const,
    planItems: ((data ?? []) as unknown as CommissionPlanScheduleItemRow[])
      .filter((row) => row.organization_id === params.organizationId)
      .map(mapPlanScheduleItemRow)
      .filter((row) => row.percentage > 0),
  };
}

async function createSnapshot(
  params: EnsureContractCommissionSnapshotParams,
  plan: CommissionPlanRow,
) {
  const { data, error } = await params.supabase
    .from("contract_commission_snapshots")
    .insert({
      business_status: "valido",
      contract_id: params.contractId,
      created_by: params.createdBy ?? null,
      lifecycle: "criado",
      organization_id: params.organizationId,
      snapshot_version: 1,
      source_commission_plan_id: plan.id,
      source_commission_plan_name: plan.name ?? null,
    })
    .select(snapshotColumns)
    .single<ContractCommissionSnapshotRow>();

  if (error || !data) {
    return commissionEngineError(
      "Nao foi possivel criar snapshot de comissao.",
      500,
    );
  }

  return {
    ok: true as const,
    snapshot: mapSnapshotRow(data),
  };
}

async function createSnapshotItems(
  params: EnsureContractCommissionSnapshotParams,
  snapshot: ContractCommissionSnapshot,
  planItems: ReturnType<typeof mapPlanScheduleItemRow>[],
) {
  const { data, error } = await params.supabase
    .from("contract_commission_snapshot_items")
    .insert(
      planItems.map((item) => ({
        business_status: "valido",
        event_type: item.eventType,
        lifecycle: "criado",
        metadata: {},
        offset_days: item.offsetDays,
        offset_months: item.offsetMonths,
        organization_id: params.organizationId,
        percentage: item.percentage,
        snapshot_id: snapshot.id,
        sort_order: item.sortOrder,
        source_plan_item_id: item.id,
      })),
    )
    .select(snapshotItemColumns);

  if (error || !data) {
    return commissionEngineError(
      "Nao foi possivel criar itens do snapshot de comissao.",
      500,
    );
  }

  const snapshotItems = ((data ?? []) as unknown as ContractCommissionSnapshotItemRow[])
    .filter((item) => item.organization_id === params.organizationId)
    .map(mapSnapshotItemRow);

  if (snapshotItems.length !== planItems.length) {
    return commissionEngineError(
      "Snapshot de comissao criado parcialmente. Reprocessamento nao esta habilitado nesta entrega.",
      409,
    );
  }

  return {
    ok: true as const,
    snapshotItems,
  };
}

async function createScheduleItems(
  params: EnsureContractCommissionSnapshotParams,
  contract: {
    creditAmount: number;
    id: string;
    organizationId: string;
  },
  snapshot: ContractCommissionSnapshot,
  snapshotItems: ReturnType<typeof mapSnapshotItemRow>[],
) {
  const { data, error } = await params.supabase
    .from("contract_commission_schedule_items")
    .insert(
      snapshotItems.map((item) => ({
        base_credit_amount: contract.creditAmount,
        business_status: "pendente",
        contract_id: contract.id,
        event_type: item.eventType,
        expected_amount: roundCurrency(contract.creditAmount * (item.percentage / 100)),
        lifecycle: "criada",
        metadata: {},
        offset_days: item.offsetDays,
        offset_months: item.offsetMonths,
        organization_id: contract.organizationId,
        percentage: item.percentage,
        snapshot_id: snapshot.id,
        snapshot_item_id: item.id,
      })),
    )
    .select(scheduleItemColumns);

  if (error || !data) {
    return commissionEngineError(
      "Nao foi possivel criar agenda financeira de comissao.",
      500,
    );
  }

  const scheduleItems = ((data ?? []) as unknown as ContractCommissionScheduleItemRow[])
    .filter((item) => item.organization_id === params.organizationId)
    .map(mapScheduleItemRow);

  if (scheduleItems.length !== snapshotItems.length) {
    return commissionEngineError(
      "Agenda financeira criada parcialmente. Reprocessamento nao esta habilitado nesta entrega.",
      409,
    );
  }

  return {
    ok: true as const,
    scheduleItems,
  };
}

async function freezeSnapshot(
  params: EnsureContractCommissionSnapshotParams,
  snapshotId: string,
) {
  const { data, error } = await params.supabase
    .from("contract_commission_snapshots")
    .update({
      business_status: "valido",
      frozen_at: new Date().toISOString(),
      lifecycle: "congelado",
    })
    .eq("organization_id", params.organizationId)
    .eq("id", snapshotId)
    .select(snapshotColumns)
    .single<ContractCommissionSnapshotRow>();

  if (error || !data) {
    return commissionEngineError(
      "Nao foi possivel congelar snapshot de comissao.",
      500,
    );
  }

  return {
    ok: true as const,
    snapshot: mapSnapshotRow(data),
  };
}

async function listScheduleItems(
  params: EnsureContractCommissionSnapshotParams,
  snapshotId: string,
) {
  const { data, error } = await params.supabase
    .from("contract_commission_schedule_items")
    .select(scheduleItemColumns)
    .eq("organization_id", params.organizationId)
    .eq("snapshot_id", snapshotId)
    .order("created_at", { ascending: true });

  if (error) {
    return commissionEngineError(
      "Nao foi possivel carregar agenda financeira de comissao.",
      500,
    );
  }

  return {
    ok: true as const,
    scheduleItems: ((data ?? []) as unknown as ContractCommissionScheduleItemRow[])
      .filter((item) => item.organization_id === params.organizationId)
      .map(mapScheduleItemRow),
  };
}

async function listScheduleItemsForEvent(
  params: ActivateCommissionScheduleForEventParams,
  eventTypes: string[],
) {
  const { data, error } = await params.supabase
    .from("contract_commission_schedule_items")
    .select(scheduleItemColumns)
    .eq("organization_id", params.organizationId)
    .eq("contract_id", params.contractId)
    .in("event_type", eventTypes)
    .order("offset_months", { ascending: true })
    .order("offset_days", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return commissionEngineError(
      "Nao foi possivel localizar agenda financeira de comissao.",
      500,
    );
  }

  return {
    ok: true as const,
    scheduleItems: ((data ?? []) as unknown as ContractCommissionScheduleItemRow[])
      .filter((item) => item.organization_id === params.organizationId)
      .map(mapScheduleItemRow),
  };
}

async function findActiveExpectedRevenueEntry(
  params: ActivateCommissionScheduleForEventParams,
  scheduleItemId: string,
) {
  const { data, error } = await params.supabase
    .from("expected_revenue_entries")
    .select(expectedRevenueColumns)
    .eq("organization_id", params.organizationId)
    .eq("commission_schedule_item_id", scheduleItemId)
    .neq("lifecycle", "cancelada")
    .is("cancelled_at", null)
    .maybeSingle<ExpectedRevenueEntryRow>();

  if (error) {
    return commissionEngineError(
      "Nao foi possivel verificar receita prevista existente.",
      500,
    );
  }

  return {
    expectedRevenueEntry: data ? mapExpectedRevenueEntryRow(data) : null,
    ok: true as const,
  };
}

async function restoreCancelledScheduleItem(
  params: ActivateCommissionScheduleForEventParams,
  scheduleItem: ContractCommissionScheduleItem,
  occurredAt: string | null,
  dueDate: string | null,
  operationalEventType: string,
  businessStatus: "executada" | "pendente",
) {
  const { data, error } = await params.supabase
    .from("contract_commission_schedule_items")
    .update({
      business_status: businessStatus,
      cancelled_at: null,
      cancelled_reason: null,
      due_date: dueDate,
      lifecycle: businessStatus === "executada" ? "ativa" : "criada",
      metadata: {
        ...scheduleItem.metadata,
        reactivation: {
          metadata: params.metadata ?? {},
          operationalEventType,
          restoredAt: new Date().toISOString(),
        },
      },
      trigger_event_id:
        businessStatus === "executada" ? params.triggerEventId ?? null : null,
      triggered_at: businessStatus === "executada" ? occurredAt : null,
    })
    .eq("organization_id", params.organizationId)
    .eq("id", scheduleItem.id)
    .select(scheduleItemColumns)
    .single<ContractCommissionScheduleItemRow>();

  if (error || !data) {
    return commissionEngineError(
      "Nao foi possivel restaurar agenda financeira cancelada do contrato.",
      500,
    );
  }

  return {
    ok: true as const,
    scheduleItem: mapScheduleItemRow(data),
  };
}

async function restoreCancelledExpectedRevenueEntry(
  params: ActivateCommissionScheduleForEventParams,
  expectedRevenueEntry: ExpectedRevenueEntry,
  dueDate: string,
  operationalEventType: string,
) {
  const remainingAmount = roundCurrency(
    Math.max(
      expectedRevenueEntry.expectedAmount - expectedRevenueEntry.recognizedAmount,
      0,
    ),
  );
  const businessStatus =
    remainingAmount <= 0
      ? "reconhecida"
      : expectedRevenueEntry.recognizedAmount > 0
        ? "parcialmente_reconhecida"
        : "aguardando_reconhecimento";
  const { data, error } = await params.supabase
    .from("expected_revenue_entries")
    .update({
      business_status: businessStatus,
      cancelled_at: null,
      cancelled_reason: null,
      expected_date: dueDate,
      lifecycle: "ativa",
      metadata: {
        ...expectedRevenueEntry.metadata,
        reactivation: {
          metadata: params.metadata ?? {},
          operationalEventType,
          restoredAt: new Date().toISOString(),
          triggerEventId: params.triggerEventId ?? null,
        },
      },
      remaining_amount: remainingAmount,
    })
    .eq("organization_id", params.organizationId)
    .eq("id", expectedRevenueEntry.id)
    .select(expectedRevenueColumns)
    .single<ExpectedRevenueEntryRow>();

  if (error || !data) {
    return commissionEngineError(
      "Nao foi possivel restaurar receita prevista cancelada do contrato.",
      500,
    );
  }

  return {
    expectedRevenueEntry: mapExpectedRevenueEntryRow(data),
    ok: true as const,
  };
}

async function updateScheduleItemActivation(
  params: ActivateCommissionScheduleForEventParams,
  scheduleItem: ContractCommissionScheduleItem,
  occurredAt: string,
  dueDate: string,
  operationalEventType: string,
) {
  const { data, error } = await params.supabase
    .from("contract_commission_schedule_items")
    .update({
      business_status: "executada",
      due_date: dueDate,
      lifecycle: "ativa",
      metadata: {
        ...scheduleItem.metadata,
        activation: {
          metadata: params.metadata ?? {},
          operationalEventType,
        },
      },
      trigger_event_id: params.triggerEventId ?? null,
      triggered_at: occurredAt,
    })
    .eq("organization_id", params.organizationId)
    .eq("id", scheduleItem.id)
    .select(scheduleItemColumns)
    .single<ContractCommissionScheduleItemRow>();

  if (error || !data) {
    return commissionEngineError(
      "Nao foi possivel ativar agenda financeira de comissao.",
      500,
    );
  }

  return {
    ok: true as const,
    scheduleItem: mapScheduleItemRow(data),
  };
}

async function createExpectedRevenueEntry(
  params: ActivateCommissionScheduleForEventParams,
  scheduleItem: ContractCommissionScheduleItem,
  dueDate: string,
  expectedAmount: number,
  operationalEventType: string,
) {
  const { data, error } = await params.supabase
    .from("expected_revenue_entries")
    .insert({
      base_credit_amount: scheduleItem.baseCreditAmount,
      business_status: "aguardando_reconhecimento",
      commission_schedule_item_id: scheduleItem.id,
      contract_id: scheduleItem.contractId,
      event_type: scheduleItem.eventType,
      expected_amount: expectedAmount,
      expected_date: dueDate,
      lifecycle: "ativa",
      metadata: {
        source: "commission_schedule_activation",
        triggerEventId: params.triggerEventId ?? null,
        triggerMetadata: params.metadata ?? {},
        triggerType: operationalEventType,
      },
      organization_id: params.organizationId,
      percentage: scheduleItem.percentage,
      recognized_amount: 0,
      remaining_amount: expectedAmount,
      snapshot_id: scheduleItem.snapshotId,
      snapshot_item_id: scheduleItem.snapshotItemId,
    })
    .select(expectedRevenueColumns)
    .single<ExpectedRevenueEntryRow>();

  if (error || !data) {
    const existingExpectedRevenueResult = await findActiveExpectedRevenueEntry(
      params,
      scheduleItem.id,
    );

    if (
      existingExpectedRevenueResult.ok &&
      existingExpectedRevenueResult.expectedRevenueEntry
    ) {
      return {
        expectedRevenueEntry:
          existingExpectedRevenueResult.expectedRevenueEntry,
        ok: true as const,
      };
    }

    return commissionEngineError(
      "Nao foi possivel criar receita prevista de comissao.",
      500,
    );
  }

  return {
    expectedRevenueEntry: mapExpectedRevenueEntryRow(data),
    ok: true as const,
  };
}

async function listExpectedRevenueEntriesByContract(
  params: GetContractCommissionSummaryParams,
) {
  const { data, error } = await params.supabase
    .from("expected_revenue_entries")
    .select(expectedRevenueColumns)
    .eq("organization_id", params.organizationId)
    .eq("contract_id", params.contractId);

  if (error) {
    return commissionEngineError(
      "Nao foi possivel carregar receitas previstas de comissao.",
      500,
    );
  }

  return {
    expectedRevenueEntries: (
      (data ?? []) as unknown as ExpectedRevenueEntryRow[]
    )
      .filter((entry) => entry.organization_id === params.organizationId)
      .map(mapExpectedRevenueEntryRow),
    ok: true as const,
  };
}

async function listActiveSnapshotsByContract(
  params: GetContractCommissionSummariesParams,
  contractIds: string[],
) {
  const { data, error } = await params.supabase
    .from("contract_commission_snapshots")
    .select(snapshotColumns)
    .eq("organization_id", params.organizationId)
    .in("contract_id", contractIds)
    .is("superseded_at", null);

  if (error) {
    return commissionEngineError(
      "Nao foi possivel verificar snapshots de comissao existentes.",
      500,
    );
  }

  return {
    ok: true as const,
    snapshots: ((data ?? []) as unknown as ContractCommissionSnapshotRow[])
      .filter((snapshot) => snapshot.organization_id === params.organizationId)
      .map(mapSnapshotRow),
  };
}

async function listScheduleItemsBySnapshotIds(
  params: GetContractCommissionSummariesParams,
  snapshotIds: string[],
) {
  if (!snapshotIds.length) {
    return {
      ok: true as const,
      scheduleItems: [],
    };
  }

  const { data, error } = await params.supabase
    .from("contract_commission_schedule_items")
    .select(scheduleItemColumns)
    .eq("organization_id", params.organizationId)
    .in("snapshot_id", snapshotIds)
    .order("created_at", { ascending: true });

  if (error) {
    return commissionEngineError(
      "Nao foi possivel carregar agendas financeiras de comissao.",
      500,
    );
  }

  return {
    ok: true as const,
    scheduleItems: ((data ?? []) as unknown as ContractCommissionScheduleItemRow[])
      .filter((item) => item.organization_id === params.organizationId)
      .map(mapScheduleItemRow),
  };
}

async function listExpectedRevenueEntriesByContractIds(
  params: GetContractCommissionSummariesParams,
  contractIds: string[],
) {
  if (!contractIds.length) {
    return {
      expectedRevenueEntries: [],
      ok: true as const,
    };
  }

  const { data, error } = await params.supabase
    .from("expected_revenue_entries")
    .select(expectedRevenueColumns)
    .eq("organization_id", params.organizationId)
    .in("contract_id", contractIds);

  if (error) {
    return commissionEngineError(
      "Nao foi possivel carregar receitas previstas de comissao.",
      500,
    );
  }

  return {
    expectedRevenueEntries: (
      (data ?? []) as unknown as ExpectedRevenueEntryRow[]
    )
      .filter((entry) => entry.organization_id === params.organizationId)
      .map(mapExpectedRevenueEntryRow),
    ok: true as const,
  };
}

async function sumRecognizedRevenueEntriesByExpectedId(
  params: GetContractCommissionSummariesParams,
  expectedRevenueEntryIds: string[],
) {
  const recognizedAmountByExpectedId = new Map<string, number>();

  if (!expectedRevenueEntryIds.length) {
    return {
      ok: true as const,
      recognizedAmountByExpectedId,
    };
  }

  const { data, error } = await params.supabase
    .from("recognized_revenue_entries")
    .select("expected_revenue_entry_id, recognized_amount, reversed_at")
    .eq("organization_id", params.organizationId)
    .in("expected_revenue_entry_id", expectedRevenueEntryIds)
    .is("reversed_at", null);

  if (error) {
    return commissionEngineError(
      "Nao foi possivel somar receitas reconhecidas de comissao.",
      500,
    );
  }

  for (const entry of (data ?? []) as unknown as RecognizedRevenueEntryRow[]) {
    if (!entry.expected_revenue_entry_id || entry.reversed_at) {
      continue;
    }

    recognizedAmountByExpectedId.set(
      entry.expected_revenue_entry_id,
      roundCurrency(
        (recognizedAmountByExpectedId.get(entry.expected_revenue_entry_id) ?? 0) +
          (normalizeNumber(entry.recognized_amount) ?? 0),
      ),
    );
  }

  return {
    ok: true as const,
    recognizedAmountByExpectedId,
  };
}

async function sumRecognizedRevenueEntries(
  params: GetContractCommissionSummaryParams,
  expectedRevenueEntryIds: string[],
) {
  if (!expectedRevenueEntryIds.length) {
    return {
      ok: true as const,
      recognizedAmount: 0,
    };
  }

  const { data, error } = await params.supabase
    .from("recognized_revenue_entries")
    .select("expected_revenue_entry_id, recognized_amount, reversed_at")
    .eq("organization_id", params.organizationId)
    .in("expected_revenue_entry_id", expectedRevenueEntryIds)
    .is("reversed_at", null);

  if (error) {
    return commissionEngineError(
      "Nao foi possivel somar receitas reconhecidas de comissao.",
      500,
    );
  }

  return {
    ok: true as const,
    recognizedAmount: roundCurrency(
      ((data ?? []) as unknown as RecognizedRevenueEntryRow[]).reduce(
        (total, entry) =>
          total + (normalizeNumber(entry.recognized_amount) ?? 0),
        0,
      ),
    ),
  };
}

function mapPlanScheduleItemRow(row: CommissionPlanScheduleItemRow) {
  return {
    eventType: normalizeEventType(row.event_type),
    id: row.id,
    offsetDays: row.offset_days ?? 0,
    offsetMonths: row.offset_months ?? 0,
    percentage: normalizeNumber(row.percentage) ?? 0,
    sortOrder: row.sort_order ?? 0,
  };
}

function mapSnapshotRow(row: ContractCommissionSnapshotRow): ContractCommissionSnapshot {
  return {
    businessStatus: row.business_status ?? "valido",
    contractId: row.contract_id ?? "",
    frozenAt: row.frozen_at,
    id: row.id,
    lifecycle: row.lifecycle ?? "criado",
    organizationId: row.organization_id ?? "",
    snapshotVersion: row.snapshot_version ?? 1,
    sourceCommissionPlanId: row.source_commission_plan_id,
    sourceCommissionPlanName: row.source_commission_plan_name,
  };
}

function mapSnapshotItemRow(row: ContractCommissionSnapshotItemRow) {
  return {
    eventType: normalizeEventType(row.event_type),
    id: row.id,
    offsetDays: row.offset_days ?? 0,
    offsetMonths: row.offset_months ?? 0,
    percentage: normalizeNumber(row.percentage) ?? 0,
    sortOrder: row.sort_order ?? 0,
  };
}

function mapScheduleItemRow(
  row: ContractCommissionScheduleItemRow,
): ContractCommissionScheduleItem {
  return {
    baseCreditAmount: normalizeNumber(row.base_credit_amount),
    businessStatus: row.business_status ?? "pendente",
    cancelledAt: row.cancelled_at,
    contractId: row.contract_id ?? "",
    dueDate: row.due_date,
    eventType: normalizeEventType(row.event_type),
    expectedAmount: normalizeNumber(row.expected_amount),
    id: row.id,
    lifecycle: row.lifecycle ?? "criada",
    metadata: normalizeMetadata(row.metadata),
    offsetDays: row.offset_days ?? 0,
    offsetMonths: row.offset_months ?? 0,
    organizationId: row.organization_id ?? "",
    percentage: normalizeNumber(row.percentage) ?? 0,
    snapshotId: row.snapshot_id ?? "",
    snapshotItemId: row.snapshot_item_id ?? "",
    triggeredAt: row.triggered_at,
    triggerEventId: row.trigger_event_id,
  };
}

function mapExpectedRevenueEntryRow(
  row: ExpectedRevenueEntryRow,
): ExpectedRevenueEntry {
  return {
    baseCreditAmount: normalizeNumber(row.base_credit_amount) ?? 0,
    businessStatus: row.business_status ?? "aguardando_reconhecimento",
    cancelledAt: row.cancelled_at,
    commissionScheduleItemId: row.commission_schedule_item_id ?? "",
    contractId: row.contract_id ?? "",
    eventType: normalizeEventType(row.event_type),
    expectedAmount: normalizeNumber(row.expected_amount) ?? 0,
    expectedDate: row.expected_date,
    id: row.id,
    lifecycle: row.lifecycle ?? "criada",
    metadata: normalizeMetadata(row.metadata),
    organizationId: row.organization_id ?? "",
    percentage: normalizeNumber(row.percentage) ?? 0,
    recognizedAmount: normalizeNumber(row.recognized_amount) ?? 0,
    remainingAmount: normalizeNumber(row.remaining_amount) ?? 0,
    snapshotId: row.snapshot_id ?? "",
    snapshotItemId: row.snapshot_item_id ?? "",
  };
}

function summarizeSchedule(scheduleItems: ContractCommissionScheduleItem[]) {
  return scheduleItems.reduce(
    (summary, scheduleItem) => ({
      cancelled:
        summary.cancelled +
        (scheduleItem.cancelledAt || scheduleItem.lifecycle === "cancelada"
          ? 1
          : 0),
      executed:
        summary.executed +
        (scheduleItem.businessStatus === "executada" ? 1 : 0),
      pending:
        summary.pending +
        (scheduleItem.businessStatus === "pendente" ? 1 : 0),
      total: summary.total + 1,
    }),
    { ...emptyCommissionSummarySchedule },
  );
}

function buildEmptyContractCommissionSummary(): ContractCommissionSummary {
  return {
    expectedRevenue: { ...emptyCommissionSummaryExpectedRevenue },
    hasCommissionEngine: false,
    schedule: { ...emptyCommissionSummarySchedule },
    snapshot: null,
    totals: { ...emptyCommissionSummaryTotals },
  };
}

function groupScheduleItemsBySnapshotId(
  scheduleItems: ContractCommissionScheduleItem[],
) {
  const groupedItems = new Map<string, ContractCommissionScheduleItem[]>();

  for (const scheduleItem of scheduleItems) {
    groupedItems.set(scheduleItem.snapshotId, [
      ...(groupedItems.get(scheduleItem.snapshotId) ?? []),
      scheduleItem,
    ]);
  }

  return groupedItems;
}

function groupExpectedRevenueEntriesByContractId(
  expectedRevenueEntries: ExpectedRevenueEntry[],
) {
  const groupedEntries = new Map<string, ExpectedRevenueEntry[]>();

  for (const expectedRevenueEntry of expectedRevenueEntries) {
    groupedEntries.set(expectedRevenueEntry.contractId, [
      ...(groupedEntries.get(expectedRevenueEntry.contractId) ?? []),
      expectedRevenueEntry,
    ]);
  }

  return groupedEntries;
}

function summarizeExpectedRevenue(expectedRevenueEntries: ExpectedRevenueEntry[]) {
  return expectedRevenueEntries.reduce(
    (summary, expectedRevenueEntry) => ({
      cancelled:
        summary.cancelled +
        (expectedRevenueEntry.cancelledAt ||
        expectedRevenueEntry.lifecycle === "cancelada"
          ? 1
          : 0),
      partiallyRecognized:
        summary.partiallyRecognized +
        (expectedRevenueEntry.businessStatus === "parcialmente_reconhecida"
          ? 1
          : 0),
      pending:
        summary.pending +
        (expectedRevenueEntry.businessStatus === "aguardando_reconhecimento"
          ? 1
          : 0),
      recognized:
        summary.recognized +
        (expectedRevenueEntry.businessStatus === "reconhecida" ? 1 : 0),
      total: summary.total + 1,
    }),
    { ...emptyCommissionSummaryExpectedRevenue },
  );
}

function sumRecognizedAmountForExpectedEntries(
  expectedRevenueEntries: ExpectedRevenueEntry[],
  recognizedAmountByExpectedId: Map<string, number>,
) {
  return roundCurrency(
    expectedRevenueEntries.reduce(
      (total, expectedRevenueEntry) =>
        total + (recognizedAmountByExpectedId.get(expectedRevenueEntry.id) ?? 0),
      0,
    ),
  );
}

function sumExpectedAmount(expectedRevenueEntries: ExpectedRevenueEntry[]) {
  return roundCurrency(
    expectedRevenueEntries.reduce(
      (total, expectedRevenueEntry) =>
        total + resolveExpectedRevenueOperationalAmount(expectedRevenueEntry),
      0,
    ),
  );
}

function sumRemainingAmount(expectedRevenueEntries: ExpectedRevenueEntry[]) {
  return roundCurrency(
    expectedRevenueEntries.reduce(
      (total, expectedRevenueEntry) =>
        total + expectedRevenueEntry.remainingAmount,
      0,
    ),
  );
}

function resolveExpectedRevenueOperationalAmount(
  expectedRevenueEntry: ExpectedRevenueEntry,
) {
  if (
    expectedRevenueEntry.cancelledAt ||
    expectedRevenueEntry.lifecycle === "cancelada"
  ) {
    return expectedRevenueEntry.recognizedAmount;
  }

  return expectedRevenueEntry.expectedAmount;
}

function mapRecognizedRevenueEntryRow(
  row: RecognizedRevenueEntryRow,
): RecognizedRevenueEntry {
  return {
    businessStatus: row.business_status ?? "reconhecida",
    contractId: row.contract_id ?? "",
    createdBy: row.created_by,
    expectedRevenueEntryId: row.expected_revenue_entry_id ?? "",
    id: row.id,
    lifecycle: row.lifecycle ?? "criada",
    metadata: normalizeMetadata(row.metadata),
    notes: row.notes,
    organizationId: row.organization_id ?? "",
    recognitionType: row.recognition_type ?? "partial",
    recognizedAmount: normalizeNumber(row.recognized_amount) ?? 0,
    recognizedAt: row.recognized_at ?? "",
    reversedAt: row.reversed_at,
  };
}

function commissionEngineError(error: string, status: number) {
  return {
    error,
    ok: false as const,
    status,
  };
}

function mapRecognizeRevenueRpcStatus(code: string | undefined) {
  if (code === "22023") {
    return 400;
  }

  if (code === "P0002") {
    return 404;
  }

  if (code === "P0001") {
    return 409;
  }

  return 500;
}

function normalizeEventType(value: string | null) {
  const normalized = value?.trim();

  return normalized || "installment";
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

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized || null;
}

function calculateDueDate(
  occurredAt: Date,
  offsetMonths: number,
  offsetDays: number,
) {
  const dueDate = new Date(occurredAt.getTime());
  dueDate.setMonth(dueDate.getMonth() + offsetMonths);
  dueDate.setDate(dueDate.getDate() + offsetDays);

  return dueDate.toISOString().slice(0, 10);
}

function getScheduleExpectedAmount(scheduleItem: ContractCommissionScheduleItem) {
  if (scheduleItem.expectedAmount !== null) {
    return scheduleItem.expectedAmount;
  }

  if (scheduleItem.baseCreditAmount === null) {
    return null;
  }

  return roundCurrency(
    scheduleItem.baseCreditAmount * (scheduleItem.percentage / 100),
  );
}

function isSupportedOperationalEventType(eventType: string) {
  return (
    supportedOperationalEventTypes.has(eventType) ||
    eventType === "installment" ||
    eventType === "contemplation"
  );
}

function resolveScheduleEventTypes(eventType: string) {
  if (eventType === "contract_signed") {
    return ["installment"];
  }

  if (eventType === "contract_contemplated") {
    return ["contemplation"];
  }

  return [eventType];
}
