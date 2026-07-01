import { DM001_INITIAL_DEFAULT_WEIGHTS } from "./constants.ts";
import type {
  Dm001NormalizedSignal,
  Dm001ScoreContributor,
  Dm001ScoreResult,
} from "./contracts.ts";

function resolveSignalScore(signal: Dm001NormalizedSignal): number {
  if (signal.signalType === "negative") {
    return DM001_INITIAL_DEFAULT_WEIGHTS.negative;
  }

  if (signal.signalType === "nonBlocking") {
    return DM001_INITIAL_DEFAULT_WEIGHTS.nonBlocking;
  }

  if (signal.signalType !== "positive") {
    return 0;
  }

  if (signal.category === "continuity") {
    return DM001_INITIAL_DEFAULT_WEIGHTS.continuityPositive;
  }

  if (signal.category === "timing") {
    return DM001_INITIAL_DEFAULT_WEIGHTS.timingPositive;
  }

  if (signal.category === "productFit") {
    return DM001_INITIAL_DEFAULT_WEIGHTS.productFitPositive;
  }

  return DM001_INITIAL_DEFAULT_WEIGHTS.standardPositive;
}

function buildContributor(signal: Dm001NormalizedSignal): Dm001ScoreContributor {
  const value = resolveSignalScore(signal);

  return {
    category: signal.category,
    signalType: signal.signalType,
    evidenceId: signal.evidence.evidenceId,
    value,
    reason: `${signal.category}:${signal.signalType}`,
  };
}

export function calculateCommercialAttentionScore(
  signals: Dm001NormalizedSignal[],
): Dm001ScoreResult {
  const contributors = signals.map(buildContributor);
  const attentionScore = contributors.reduce(
    (total, contributor) => total + contributor.value,
    0,
  );

  return {
    attentionScore,
    contributors,
  };
}
