import {
  DM001_MODEL_ID,
  DM001_MODEL_NAME,
  DM001_MODEL_VERSION,
} from "./constants.ts";
import type {
  CommercialAttentionDecision,
  Dm001CalibrationStatus,
  Dm001Confidence,
  Dm001Decision,
  Dm001RecalculationMetadata,
  Dm001Rationale,
  Dm001ScoreContributor,
} from "./contracts.ts";

export type CommercialAttentionDecisionSnapshot = {
  modelId: "DM-001";
  modelName: "Commercial Attention Allocation";
  modelVersion: string;
  decision: Dm001Decision;
  recommendedAction: string;
  attentionScore: number | null;
  confidence: Dm001Confidence;
  calibrationStatus: Dm001CalibrationStatus;
  rationale: Dm001Rationale;
  signals: CommercialAttentionDecision["signals"];
  evidenceTrace: string[];
  scoreContributors: Dm001ScoreContributor[];
  metadata: CommercialAttentionPersistenceMetadata;
  output: CommercialAttentionDecision;
  generatedAt: string;
};

export type CommercialAttentionPersistenceMetadata = {
  persistedModelId: "DM-001";
  persistedModelName: "Commercial Attention Allocation";
  persistedModelVersion: string;
  recalculation?: Dm001RecalculationMetadata;
  serializedAt: string;
  signalCount: number;
  positiveSignalCount: number;
  negativeSignalCount: number;
  missingSignalCount: number;
  blockingConditionCount: number;
  conflictCount: number;
  deferredTimingSignalCount: number;
  insufficientKnowledgeCount: number;
};

export type PersistCommercialAttentionDecisionInput = {
  decision: CommercialAttentionDecision;
  leadId: string;
  organizationId: string;
  persistedAt?: string;
};

export type PersistedCommercialAttentionDecision = {
  id: string;
  leadId: string;
  organizationId: string;
  snapshot: CommercialAttentionDecisionSnapshot;
  createdAt: string;
};

export type CommercialAttentionDecisionOutputRecord = {
  organization_id: string;
  lead_id: string;
  model_id: "DM-001";
  model_name: "Commercial Attention Allocation";
  model_version: string;
  decision: Dm001Decision;
  recommended_action: string;
  attention_score: number | null;
  confidence: Dm001Confidence;
  calibration_status: Dm001CalibrationStatus;
  rationale: Dm001Rationale;
  signals: CommercialAttentionDecision["signals"];
  evidence_trace: string[];
  score_contributors: Dm001ScoreContributor[];
  output: CommercialAttentionDecision;
  metadata: CommercialAttentionPersistenceMetadata;
  generated_at: string;
};

export type CommercialAttentionDecisionStorage = {
  getLatestByLeadModelVersion(params: {
    leadId: string;
    modelId: "DM-001";
    modelVersion: string;
    organizationId: string;
  }): Promise<PersistedCommercialAttentionDecision | null>;
  insert(
    record: CommercialAttentionDecisionOutputRecord,
  ): Promise<PersistedCommercialAttentionDecision>;
};

export function serializeCommercialAttentionDecision(
  input: PersistCommercialAttentionDecisionInput,
): CommercialAttentionDecisionSnapshot {
  validatePersistenceInput(input);

  const serializedAt = input.persistedAt ?? new Date().toISOString();

  return {
    modelId: input.decision.modelId,
    modelName: input.decision.modelName,
    modelVersion: input.decision.modelVersion,
    decision: input.decision.decision,
    recommendedAction: input.decision.recommendedAction,
    attentionScore: input.decision.attentionScore,
    confidence: input.decision.confidence,
    calibrationStatus: input.decision.calibrationStatus,
    rationale: input.decision.rationale,
    signals: cloneSignals(input.decision.signals),
    evidenceTrace: [...input.decision.evidenceTrace],
    scoreContributors: input.decision.scoreContributors.map((contributor) => ({
      ...contributor,
    })),
    metadata: {
      persistedModelId: DM001_MODEL_ID,
      persistedModelName: DM001_MODEL_NAME,
      persistedModelVersion: DM001_MODEL_VERSION,
      serializedAt,
      signalCount: input.decision.metadata.signalCount,
      positiveSignalCount: input.decision.metadata.positiveSignalCount,
      negativeSignalCount: input.decision.metadata.negativeSignalCount,
      missingSignalCount: input.decision.metadata.missingSignalCount,
      blockingConditionCount: input.decision.metadata.blockingConditionCount,
      conflictCount: input.decision.metadata.conflictCount,
      deferredTimingSignalCount:
        input.decision.metadata.deferredTimingSignalCount,
      insufficientKnowledgeCount:
        input.decision.metadata.insufficientKnowledgeCount,
    },
    output: cloneDecision(input.decision),
    generatedAt: input.decision.generatedAt,
  };
}

export async function persistCommercialAttentionDecision(
  storage: CommercialAttentionDecisionStorage,
  input: PersistCommercialAttentionDecisionInput,
): Promise<PersistedCommercialAttentionDecision> {
  const record = createCommercialAttentionDecisionOutputRecord(input);

  return storage.insert(record);
}

export function createCommercialAttentionDecisionOutputRecord(
  input: PersistCommercialAttentionDecisionInput,
): CommercialAttentionDecisionOutputRecord {
  const snapshot = serializeCommercialAttentionDecision(input);

  return {
    organization_id: input.organizationId,
    lead_id: input.leadId,
    model_id: snapshot.modelId,
    model_name: snapshot.modelName,
    model_version: snapshot.modelVersion,
    decision: snapshot.decision,
    recommended_action: snapshot.recommendedAction,
    attention_score: snapshot.attentionScore,
    confidence: snapshot.confidence,
    calibration_status: snapshot.calibrationStatus,
    rationale: snapshot.rationale,
    signals: snapshot.signals,
    evidence_trace: snapshot.evidenceTrace,
    score_contributors: snapshot.scoreContributors,
    output: snapshot.output,
    metadata: snapshot.metadata,
    generated_at: snapshot.generatedAt,
  };
}

export async function getLatestCommercialAttentionDecision(
  storage: CommercialAttentionDecisionStorage,
  params: {
    leadId: string;
    organizationId: string;
    modelVersion?: string;
  },
): Promise<PersistedCommercialAttentionDecision | null> {
  return storage.getLatestByLeadModelVersion({
    leadId: params.leadId,
    modelId: DM001_MODEL_ID,
    modelVersion: params.modelVersion ?? DM001_MODEL_VERSION,
    organizationId: params.organizationId,
  });
}

function validatePersistenceInput(
  input: PersistCommercialAttentionDecisionInput,
): void {
  if (!input.leadId.trim()) {
    throw new Error("DM-001 persistence requires leadId.");
  }

  if (!input.organizationId.trim()) {
    throw new Error("DM-001 persistence requires organizationId.");
  }

  if (input.decision.modelId !== DM001_MODEL_ID) {
    throw new Error("DM-001 persistence received an incompatible modelId.");
  }

  if (input.decision.modelName !== DM001_MODEL_NAME) {
    throw new Error("DM-001 persistence received an incompatible modelName.");
  }

  if (input.decision.modelVersion !== DM001_MODEL_VERSION) {
    throw new Error(
      "DM-001 persistence received an incompatible modelVersion.",
    );
  }
}

function cloneDecision(
  decision: CommercialAttentionDecision,
): CommercialAttentionDecision {
  return {
    ...decision,
    signals: cloneSignals(decision.signals),
    evidenceTrace: [...decision.evidenceTrace],
    rationale: {
      evidenceUsed: [...decision.rationale.evidenceUsed],
      confidenceBoosters: [...decision.rationale.confidenceBoosters],
      confidenceReducers: [...decision.rationale.confidenceReducers],
      blockingConditions: [...decision.rationale.blockingConditions],
      nonBlockingConditions: [...decision.rationale.nonBlockingConditions],
      decisionReason: decision.rationale.decisionReason,
      unresolvedQuestions: [...decision.rationale.unresolvedQuestions],
    },
    scoreContributors: decision.scoreContributors.map((contributor) => ({
      ...contributor,
    })),
    metadata: {
      ...decision.metadata,
    },
  };
}

function cloneSignals(
  signals: CommercialAttentionDecision["signals"],
): CommercialAttentionDecision["signals"] {
  return signals.map((signal) => ({
    ...signal,
    evidence: {
      ...signal.evidence,
      metadata: signal.evidence.metadata
        ? { ...signal.evidence.metadata }
        : undefined,
    },
  }));
}
