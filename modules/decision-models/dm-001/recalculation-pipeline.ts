import type {
  CommercialAttentionDecision,
  Dm001RecalculationMetadata,
} from "./contracts.ts";
import type {
  CommercialAttentionDecisionOutputRecord,
  CommercialAttentionDecisionStorage,
  PersistedCommercialAttentionDecision,
} from "./persistence.ts";
import type {
  Dm001AssemblerRequestContext,
  ExecuteDm001ForLeadServerSideResult,
} from "./decision-context-assembler.ts";
import {
  executeDm001ForLeadServerSide,
  executeDm001ForLeadWithServerContext,
} from "./decision-context-assembler.ts";

export const DM001_RECALCULATION_REASONS = [
  "lead_updated",
  "note_created",
  "task_created",
  "task_updated",
  "task_completed",
  "simulation_created",
  "knowledge_item_updated",
  "manual_recalculation",
] as const;

export type Dm001RecalculationReason =
  (typeof DM001_RECALCULATION_REASONS)[number];

export type Dm001IgnoredRecalculationReason =
  "decision_model_output_created";

export type RecalculateDm001ForLeadOptions = {
  generatedAt?: string;
  persistedAt?: string;
  reason: Dm001RecalculationReason | Dm001IgnoredRecalculationReason;
  requestedAt?: string;
  storage: CommercialAttentionDecisionStorage;
};

export type RecalculateDm001ForLeadServerSideOptions = Omit<
  RecalculateDm001ForLeadOptions,
  "storage"
>;

export type RecalculateDm001ForLeadResult =
  | {
      decision: CommercialAttentionDecision;
      ok: true;
      persistedDecision: PersistedCommercialAttentionDecision;
      recalculation: Dm001RecalculationMetadata;
      skipped: false;
    }
  | {
      ok: true;
      recalculation: Dm001RecalculationMetadata;
      skipped: true;
    }
  | Extract<ExecuteDm001ForLeadServerSideResult, { ok: false }>;

export async function recalculateDm001ForLeadWithServerContext(
  context: Dm001AssemblerRequestContext,
  leadId: string,
  options: RecalculateDm001ForLeadOptions,
): Promise<RecalculateDm001ForLeadResult> {
  const recalculation = createRecalculationMetadata(options);

  if (options.reason === "decision_model_output_created") {
    return {
      ok: true,
      recalculation,
      skipped: true,
    };
  }

  const result = await executeDm001ForLeadWithServerContext(context, leadId, {
    generatedAt: options.generatedAt,
    persistedAt: options.persistedAt,
    storage: createRecalculationStorage(options.storage, recalculation),
  });

  if (!result.ok) {
    return result;
  }

  return {
    decision: addRecalculationToDecision(result.decision, recalculation),
    ok: true,
    persistedDecision: addRecalculationToPersistedDecision(
      result.persistedDecision,
      recalculation,
    ),
    recalculation,
    skipped: false,
  };
}

export async function recalculateDm001ForLeadServerSide(
  accessToken: string | null,
  leadId: string,
  options: RecalculateDm001ForLeadServerSideOptions,
): Promise<RecalculateDm001ForLeadResult> {
  const recalculation = createRecalculationMetadata(options);

  if (options.reason === "decision_model_output_created") {
    return {
      ok: true,
      recalculation,
      skipped: true,
    };
  }

  const result = await executeDm001ForLeadServerSide(accessToken, leadId, {
    generatedAt: options.generatedAt,
    persistedAt: options.persistedAt,
    recalculation,
  });

  if (!result.ok) {
    return result;
  }

  return {
    decision: addRecalculationToDecision(result.decision, recalculation),
    ok: true,
    persistedDecision: addRecalculationToPersistedDecision(
      result.persistedDecision,
      recalculation,
    ),
    recalculation,
    skipped: false,
  };
}

function createRecalculationMetadata(options: {
  reason: Dm001RecalculationReason | Dm001IgnoredRecalculationReason;
  requestedAt?: string;
}): Dm001RecalculationMetadata {
  return {
    reason: options.reason,
    requestedAt: options.requestedAt ?? new Date().toISOString(),
  };
}

function createRecalculationStorage(
  storage: CommercialAttentionDecisionStorage,
  recalculation: Dm001RecalculationMetadata,
): CommercialAttentionDecisionStorage {
  return {
    getLatestByLeadModelVersion(params) {
      return storage.getLatestByLeadModelVersion(params);
    },
    insert(record) {
      return storage.insert(addRecalculationToRecord(record, recalculation));
    },
  };
}

function addRecalculationToRecord(
  record: CommercialAttentionDecisionOutputRecord,
  recalculation: Dm001RecalculationMetadata,
): CommercialAttentionDecisionOutputRecord {
  return {
    ...record,
    metadata: {
      ...record.metadata,
      recalculation,
    },
    output: addRecalculationToDecision(record.output, recalculation),
  };
}

function addRecalculationToDecision(
  decision: CommercialAttentionDecision,
  recalculation: Dm001RecalculationMetadata,
): CommercialAttentionDecision {
  return {
    ...decision,
    metadata: {
      ...decision.metadata,
      recalculation,
    },
  };
}

function addRecalculationToPersistedDecision(
  persisted: PersistedCommercialAttentionDecision,
  recalculation: Dm001RecalculationMetadata,
): PersistedCommercialAttentionDecision {
  return {
    ...persisted,
    snapshot: {
      ...persisted.snapshot,
      metadata: {
        ...persisted.snapshot.metadata,
        recalculation,
      },
      output: addRecalculationToDecision(
        persisted.snapshot.output,
        recalculation,
      ),
    },
  };
}
