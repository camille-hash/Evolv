import type { SupabaseClient } from "@supabase/supabase-js";

export type CommissionEngineSupabaseClient = SupabaseClient;

export type EnsureContractCommissionSnapshotParams = {
  commissionPlanId?: string | null;
  contractId: string;
  createdBy?: string | null;
  organizationId: string;
  supabase: CommissionEngineSupabaseClient;
};

export type ContractCommissionSnapshot = {
  businessStatus: string;
  contractId: string;
  frozenAt: string | null;
  id: string;
  lifecycle: string;
  organizationId: string;
  snapshotVersion: number;
  sourceCommissionPlanId: string | null;
  sourceCommissionPlanName: string | null;
};

export type ContractCommissionScheduleItem = {
  baseCreditAmount: number | null;
  businessStatus: string;
  cancelledAt: string | null;
  contractId: string;
  dueDate: string | null;
  eventType: string;
  expectedAmount: number | null;
  id: string;
  lifecycle: string;
  metadata: Record<string, unknown>;
  offsetDays: number;
  offsetMonths: number;
  organizationId: string;
  percentage: number;
  snapshotId: string;
  snapshotItemId: string;
  triggeredAt: string | null;
  triggerEventId: string | null;
};

export type ExpectedRevenueEntry = {
  baseCreditAmount: number;
  businessStatus: string;
  cancelledAt: string | null;
  commissionScheduleItemId: string;
  contractId: string;
  eventType: string;
  expectedAmount: number;
  expectedDate: string | null;
  id: string;
  lifecycle: string;
  metadata: Record<string, unknown>;
  organizationId: string;
  percentage: number;
  recognizedAmount: number;
  remainingAmount: number;
  snapshotId: string;
  snapshotItemId: string;
};

export type RecognizedRevenueEntry = {
  businessStatus: string;
  contractId: string;
  createdBy: string | null;
  expectedRevenueEntryId: string;
  id: string;
  lifecycle: string;
  metadata: Record<string, unknown>;
  notes: string | null;
  organizationId: string;
  recognitionType: string;
  recognizedAmount: number;
  recognizedAt: string;
  reversedAt: string | null;
};

export type ContractCommissionSummary = {
  expectedRevenue: {
    cancelled: number;
    partiallyRecognized: number;
    pending: number;
    recognized: number;
    total: number;
  };
  hasCommissionEngine: boolean;
  schedule: {
    cancelled: number;
    executed: number;
    pending: number;
    total: number;
  };
  snapshot: {
    businessStatus: string;
    frozenAt: string | null;
    id: string;
    lifecycle: string;
    sourceCommissionPlanName: string | null;
  } | null;
  totals: {
    expectedAmount: number;
    recognizedAmount: number;
    remainingAmount: number;
  };
};

export type ActivateCommissionScheduleForEventParams = {
  contractId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
  organizationId: string;
  supabase: CommissionEngineSupabaseClient;
  triggerEventId?: string | null;
};

export type GetContractCommissionSummaryParams = {
  contractId: string;
  organizationId: string;
  supabase: CommissionEngineSupabaseClient;
};

export type GetContractCommissionSummariesParams = {
  contractIds: string[];
  organizationId: string;
  supabase: CommissionEngineSupabaseClient;
};

export type BackfillCommissionEngineForContractsParams = {
  contractIds?: string[];
  dryRun?: boolean;
  organizationId: string;
  supabase: CommissionEngineSupabaseClient;
};

export type BackfillCommissionEngineContractReport = {
  contractId: string;
  contractNumber: string | null;
  error?: string;
  expectedRevenueEntriesAfter: number;
  expectedRevenueEntriesBefore: number;
  expectedRevenueEntriesCreated: number;
  ignoredReason: string | null;
  scheduleItemsAfter: number;
  scheduleItemsBefore: number;
  scheduleItemsCreated: number;
  snapshotCreated: boolean;
  snapshotId: string | null;
  status: string;
  wouldActivateEventType: string | null;
};

export type BackfillCommissionEngineForContractsResult =
  | {
      contractsAnalyzed: number;
      contractsIgnored: number;
      dryRun: boolean;
      errors: Array<{
        contractId: string;
        contractNumber: string | null;
        error: string;
      }>;
      ok: true;
      results: BackfillCommissionEngineContractReport[];
      scheduleItemsCreated: number;
      snapshotsCreated: number;
      expectedRevenueEntriesCreated: number;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export type RecognizeExpectedRevenueParams = {
  createdBy?: string | null;
  expectedRevenueEntryId: string;
  metadata?: Record<string, unknown>;
  notes?: string | null;
  organizationId: string;
  recognitionType?: string | null;
  recognizedAmount: number;
  recognizedAt: string;
  supabase: CommissionEngineSupabaseClient;
};

export type EnsureContractCommissionSnapshotResult =
  | {
      created: boolean;
      ok: true;
      scheduleItems: ContractCommissionScheduleItem[];
      snapshot: ContractCommissionSnapshot | null;
      skippedReason: "missing_commission_plan" | null;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export type ActivateCommissionScheduleForEventResult =
  | {
      activated: boolean;
      expectedRevenueEntries: ExpectedRevenueEntry[];
      ok: true;
      scheduleItems: ContractCommissionScheduleItem[];
      skippedReason: "expected_revenue_already_exists" | null;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export type CancelFutureCommissionEntriesForContractParams = {
  cancelledAt?: string;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  contractId: string;
  metadata?: Record<string, unknown>;
  organizationId: string;
  supabase: CommissionEngineSupabaseClient;
};

export type CancelFutureCommissionEntriesForContractResult =
  | {
      cancelledExpectedRevenueEntries: number;
      cancelledScheduleItems: number;
      ok: true;
      skippedReason:
        | "no_pending_expected_revenue"
        | "no_pending_schedule_or_expected_revenue"
        | null;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export type ReactivateFutureCommissionEntriesForContractParams =
  ActivateCommissionScheduleForEventParams;

export type ReactivateFutureCommissionEntriesForContractResult =
  | {
      activationResult: Extract<
        ActivateCommissionScheduleForEventResult,
        { ok: true }
      >;
      ok: true;
      restoredExpectedRevenueEntries: number;
      restoredScheduleItems: number;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export type RecognizeExpectedRevenueResult =
  | {
      expectedRevenueEntry: ExpectedRevenueEntry;
      ok: true;
      recognizedRevenueEntry: RecognizedRevenueEntry;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export type GetContractCommissionSummaryResult =
  | ({
      ok: true;
    } & ContractCommissionSummary)
  | {
      error: string;
      ok: false;
      status: number;
    };

export type GetContractCommissionSummariesResult =
  | {
      ok: true;
      summaries: Map<string, ContractCommissionSummary>;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };
