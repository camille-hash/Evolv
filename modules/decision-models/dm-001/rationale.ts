import type {
  Dm001ConfidenceResult,
  Dm001Decision,
  Dm001NormalizedSignal,
  Dm001Rationale,
} from "./contracts.ts";

function summariesFor(
  signals: Dm001NormalizedSignal[],
  signalType: Dm001NormalizedSignal["signalType"],
): string[] {
  return signals
    .filter((signal) => signal.signalType === signalType)
    .map((signal) => signal.evidence.summary);
}

function buildDecisionReason(decision: Dm001Decision): string {
  switch (decision) {
    case "ACT_NOW":
      return "Positive evidence and current timing support immediate commercial attention.";
    case "NURTURE":
      return "Positive evidence exists, but the relationship should continue developing.";
    case "INVESTIGATE":
      return "The decision requires clarification because evidence is missing, blocked, or insufficient.";
    case "WAIT":
      return "Interest may exist, but timing evidence indicates action should be scheduled later.";
    case "DISENGAGE":
      return "Negative evidence dominates and current attention is not justified.";
  }
}

export function buildCommercialAttentionRationale(params: {
  decision: Dm001Decision;
  signals: Dm001NormalizedSignal[];
  confidenceResult: Dm001ConfidenceResult;
}): Dm001Rationale {
  const { decision, signals, confidenceResult } = params;

  return {
    evidenceUsed: signals.map((signal) => signal.evidence.summary),
    confidenceBoosters: confidenceResult.boosters,
    confidenceReducers: confidenceResult.reducers,
    blockingConditions: summariesFor(signals, "blocking"),
    nonBlockingConditions: summariesFor(signals, "nonBlocking"),
    decisionReason: buildDecisionReason(decision),
    unresolvedQuestions: [
      ...summariesFor(signals, "missing"),
      ...summariesFor(signals, "insufficientKnowledge"),
      ...summariesFor(signals, "conflict"),
    ],
  };
}
