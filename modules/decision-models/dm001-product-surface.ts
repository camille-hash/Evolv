import type { PersistedCommercialAttentionDecision } from "./dm-001/persistence.ts";

export type CommercialAttentionProductDecision = {
  attentionScore: number | null;
  confidence: string;
  decision: string;
  generatedAt: string;
  modelVersion: string;
  rationaleSummary: string;
  recommendedAction: string;
};

export function mapCommercialAttentionDecisionToProductSurface(
  persistedDecision: PersistedCommercialAttentionDecision | null,
): CommercialAttentionProductDecision | null {
  if (!persistedDecision) {
    return null;
  }

  const snapshot = persistedDecision.snapshot;

  return {
    attentionScore: snapshot.attentionScore,
    confidence: snapshot.confidence,
    decision: snapshot.decision,
    generatedAt: snapshot.generatedAt,
    modelVersion: snapshot.modelVersion,
    rationaleSummary: snapshot.rationale.decisionReason,
    recommendedAction: snapshot.recommendedAction,
  };
}
