import { DM001_INITIAL_PRIORITY_THRESHOLDS } from "./constants.ts";
import type {
  Dm001Confidence,
  Dm001Decision,
  Dm001NormalizedSignal,
} from "./contracts.ts";

function hasSignal(
  signals: Dm001NormalizedSignal[],
  signalType: Dm001NormalizedSignal["signalType"],
): boolean {
  return signals.some((signal) => signal.signalType === signalType);
}

function hasAnyPositiveSignal(signals: Dm001NormalizedSignal[]): boolean {
  return hasSignal(signals, "positive");
}

function hasAnyNegativeSignal(signals: Dm001NormalizedSignal[]): boolean {
  return hasSignal(signals, "negative");
}

export function classifyCommercialAttentionPriority(params: {
  signals: Dm001NormalizedSignal[];
  attentionScore: number;
  confidence: Dm001Confidence;
}): Dm001Decision {
  const { signals, attentionScore, confidence } = params;

  if (hasSignal(signals, "blocking")) {
    return "INVESTIGATE";
  }

  if (hasSignal(signals, "deferred")) {
    return "WAIT";
  }

  if (hasSignal(signals, "insufficientKnowledge")) {
    return "INVESTIGATE";
  }

  if (
    confidence === "UNKNOWN" ||
    (confidence === "LOW" && hasSignal(signals, "missing"))
  ) {
    return "INVESTIGATE";
  }

  if (
    attentionScore <= DM001_INITIAL_PRIORITY_THRESHOLDS.disengage &&
    hasAnyNegativeSignal(signals) &&
    !hasAnyPositiveSignal(signals)
  ) {
    return "DISENGAGE";
  }

  if (
    attentionScore >= DM001_INITIAL_PRIORITY_THRESHOLDS.actNow &&
    confidence !== "LOW"
  ) {
    return "ACT_NOW";
  }

  if (attentionScore >= DM001_INITIAL_PRIORITY_THRESHOLDS.nurture) {
    return "NURTURE";
  }

  if (
    attentionScore <= DM001_INITIAL_PRIORITY_THRESHOLDS.disengage &&
    hasAnyNegativeSignal(signals)
  ) {
    return "DISENGAGE";
  }

  return "INVESTIGATE";
}
