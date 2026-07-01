import { DM001_INITIAL_CONFIDENCE_THRESHOLDS } from "./constants.ts";
import type {
  Dm001Confidence,
  Dm001ConfidenceResult,
  Dm001NormalizedSignal,
} from "./contracts.ts";

function countSignals(
  signals: Dm001NormalizedSignal[],
  signalType: Dm001NormalizedSignal["signalType"],
): number {
  return signals.filter((signal) => signal.signalType === signalType).length;
}

export function calculateCommercialAttentionConfidence(
  signals: Dm001NormalizedSignal[],
): Dm001ConfidenceResult {
  const positiveCount = countSignals(signals, "positive");
  const negativeCount = countSignals(signals, "negative");
  const missingCount = countSignals(signals, "missing");
  const blockingCount = countSignals(signals, "blocking");
  const conflictCount = countSignals(signals, "conflict");
  const insufficientKnowledgeCount = countSignals(
    signals,
    "insufficientKnowledge",
  );
  const usefulEvidenceCount = positiveCount + negativeCount + blockingCount;

  const boosters: string[] = [];
  const reducers: string[] = [];

  if (positiveCount > 0) {
    boosters.push("Positive traceable evidence exists.");
  }

  if (negativeCount > 0) {
    boosters.push("Negative traceable evidence exists.");
  }

  if (missingCount > 0) {
    reducers.push("Missing evidence exists.");
  }

  if (blockingCount > 0) {
    reducers.push("Blocking conditions exist.");
  }

  if (conflictCount > 0) {
    reducers.push("Conflicting evidence exists.");
  }

  if (insufficientKnowledgeCount > 0) {
    reducers.push("Knowledge is insufficient for modelling.");
  }

  let confidence: Dm001Confidence = "UNKNOWN";

  if (
    usefulEvidenceCount >=
      DM001_INITIAL_CONFIDENCE_THRESHOLDS.highUsefulEvidence &&
    reducers.length === 0
  ) {
    confidence = "HIGH";
  } else if (
    usefulEvidenceCount >=
      DM001_INITIAL_CONFIDENCE_THRESHOLDS.mediumUsefulEvidence &&
    conflictCount === 0
  ) {
    confidence = "MEDIUM";
  } else if (usefulEvidenceCount > 0 || reducers.length > 0) {
    confidence = "LOW";
  }

  return {
    confidence,
    boosters,
    reducers,
  };
}
