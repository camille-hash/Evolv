import {
  DM001_CALIBRATION_STATUS,
  DM001_MODEL_ID,
  DM001_MODEL_NAME,
  DM001_MODEL_VERSION,
  DM001_RECOMMENDED_ACTIONS,
} from "./constants.ts";
import { calculateCommercialAttentionConfidence } from "./confidence.ts";
import type {
  CommercialAttentionDecision,
  Dm001Input,
  Dm001NormalizedSignal,
} from "./contracts.ts";
import {
  collectEvidenceIds,
  extractCommercialAttentionSignals,
  validateCommercialAttentionInput,
} from "./operators.ts";
import { classifyCommercialAttentionPriority } from "./priority.ts";
import { buildCommercialAttentionRationale } from "./rationale.ts";
import { calculateCommercialAttentionScore } from "./scoring.ts";

function countSignals(
  signals: Dm001NormalizedSignal[],
  signalType: Dm001NormalizedSignal["signalType"],
): number {
  return signals.filter((signal) => signal.signalType === signalType).length;
}

export function executeCommercialAttentionAllocation(
  input: Dm001Input,
): CommercialAttentionDecision {
  validateCommercialAttentionInput(input);

  const signals = extractCommercialAttentionSignals(input.decisionContext);
  const scoreResult = calculateCommercialAttentionScore(signals);
  const confidenceResult = calculateCommercialAttentionConfidence(signals);
  const decision = classifyCommercialAttentionPriority({
    signals,
    attentionScore: scoreResult.attentionScore,
    confidence: confidenceResult.confidence,
  });
  const rationale = buildCommercialAttentionRationale({
    decision,
    signals,
    confidenceResult,
  });

  return {
    modelId: DM001_MODEL_ID,
    modelName: DM001_MODEL_NAME,
    modelVersion: DM001_MODEL_VERSION,
    decision,
    recommendedAction: DM001_RECOMMENDED_ACTIONS[decision],
    attentionScore: scoreResult.attentionScore,
    confidence: confidenceResult.confidence,
    rationale,
    signals: signals.map((signal) => ({
      ...signal,
      evidence: {
        ...signal.evidence,
        metadata: signal.evidence.metadata
          ? { ...signal.evidence.metadata }
          : undefined,
      },
    })),
    evidenceTrace: collectEvidenceIds(signals),
    scoreContributors: scoreResult.contributors,
    calibrationStatus: DM001_CALIBRATION_STATUS,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    metadata: {
      calibrationStatus: DM001_CALIBRATION_STATUS,
      recalculation: readRecalculationMetadata(input.metadata),
      signalCount: signals.length,
      positiveSignalCount: countSignals(signals, "positive"),
      negativeSignalCount: countSignals(signals, "negative"),
      missingSignalCount: countSignals(signals, "missing"),
      blockingConditionCount: countSignals(signals, "blocking"),
      conflictCount: countSignals(signals, "conflict"),
      deferredTimingSignalCount: countSignals(signals, "deferred"),
      insufficientKnowledgeCount: countSignals(
        signals,
        "insufficientKnowledge",
      ),
    },
  };
}

function readRecalculationMetadata(metadata: Dm001Input["metadata"]) {
  const recalculation = metadata?.recalculation;

  if (!recalculation || typeof recalculation !== "object") {
    return undefined;
  }

  const reason = (recalculation as Record<string, unknown>).reason;
  const requestedAt = (recalculation as Record<string, unknown>).requestedAt;

  if (typeof reason !== "string" || typeof requestedAt !== "string") {
    return undefined;
  }

  return {
    reason,
    requestedAt,
  };
}
