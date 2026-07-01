import type {
  CognitiveSource,
  OperationalContext,
} from "../cognitive/contracts";
import type { PersistedCommercialAttentionDecision } from "./dm-001/persistence.ts";

const decisionOutputsSourceType = "decision_outputs";

export type CommercialAttentionDecisionCognitiveRecord = {
  confidence: PersistedCommercialAttentionDecision["snapshot"]["confidence"];
  decision: PersistedCommercialAttentionDecision["snapshot"]["decision"];
  evidenceTrace: string[];
  generatedAt: string;
  id: string;
  metadata: Record<string, unknown>;
  modelId: PersistedCommercialAttentionDecision["snapshot"]["modelId"];
  modelVersion: string;
  occurredAt: string;
  rationale: PersistedCommercialAttentionDecision["snapshot"]["rationale"];
  score: PersistedCommercialAttentionDecision["snapshot"]["attentionScore"];
  sourceId: string;
};

export function withCommercialAttentionDecisionOutput(
  context: OperationalContext,
  persistedDecision: PersistedCommercialAttentionDecision | null,
): OperationalContext {
  const records = persistedDecision
    ? [mapCommercialAttentionDecisionToCognitiveRecord(persistedDecision)]
    : [];

  return {
    ...context,
    data: {
      ...(context.data ?? {}),
      [decisionOutputsSourceType]: records,
    },
    sources: upsertDecisionOutputsSource(context.sources, {
      availability: records.length ? "available" : "empty",
      label: "Decision Outputs",
      metadata: {
        source: "decision_model_outputs",
      },
      sourceId: decisionOutputsSourceType,
      sourceType: decisionOutputsSourceType,
    }),
  };
}

export function mapCommercialAttentionDecisionToCognitiveRecord(
  persistedDecision: PersistedCommercialAttentionDecision,
): CommercialAttentionDecisionCognitiveRecord {
  const snapshot = persistedDecision.snapshot;

  return {
    confidence: snapshot.confidence,
    decision: snapshot.decision,
    evidenceTrace: [...snapshot.evidenceTrace],
    generatedAt: snapshot.generatedAt,
    id: persistedDecision.id,
    metadata: {
      calibrationStatus: snapshot.calibrationStatus,
      createdAt: persistedDecision.createdAt,
      modelName: snapshot.modelName,
      organizationId: persistedDecision.organizationId,
      persistedOutputId: persistedDecision.id,
      recommendedAction: snapshot.recommendedAction,
      source: "decision_model_outputs",
    },
    modelId: snapshot.modelId,
    modelVersion: snapshot.modelVersion,
    occurredAt: snapshot.generatedAt,
    rationale: snapshot.rationale,
    score: snapshot.attentionScore,
    sourceId: persistedDecision.id,
  };
}

function upsertDecisionOutputsSource(
  sources: OperationalContext["sources"],
  decisionOutputsSource: CognitiveSource,
): CognitiveSource[] {
  const existingSources = sources ?? [];
  const unrelatedSources = existingSources.filter(
    (source) =>
      source.sourceType !== decisionOutputsSourceType &&
      source.sourceId !== decisionOutputsSourceType,
  );

  return [...unrelatedSources, decisionOutputsSource];
}
