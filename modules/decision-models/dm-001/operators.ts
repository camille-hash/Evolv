import { DM001_CONTEXT_CATEGORIES } from "./constants.ts";
import type {
  Dm001DecisionContext,
  Dm001EvidenceReference,
  Dm001Input,
  Dm001NormalizedSignal,
  Dm001NormalizedSignalType,
} from "./contracts.ts";

const EMPTY_EVIDENCE: Dm001EvidenceReference[] = [];

const SIGNAL_FIELDS: Array<{
  field: keyof Dm001DecisionContext[keyof Dm001DecisionContext];
  signalType: Dm001NormalizedSignalType;
}> = [
  { field: "positive", signalType: "positive" },
  { field: "negative", signalType: "negative" },
  { field: "missing", signalType: "missing" },
  { field: "blocking", signalType: "blocking" },
  { field: "nonBlocking", signalType: "nonBlocking" },
  { field: "conflicts", signalType: "conflict" },
  { field: "deferred", signalType: "deferred" },
  { field: "insufficientKnowledge", signalType: "insufficientKnowledge" },
];

export function validateCommercialAttentionInput(input: Dm001Input): void {
  if (!input.leadId.trim()) {
    throw new Error("DM-001 requires leadId.");
  }

  if (!input.organizationId.trim()) {
    throw new Error("DM-001 requires organizationId.");
  }

  for (const category of DM001_CONTEXT_CATEGORIES) {
    if (!input.decisionContext[category]) {
      throw new Error(`DM-001 requires decisionContext.${category}.`);
    }
  }
}

export function extractCommercialAttentionSignals(
  decisionContext: Dm001DecisionContext,
): Dm001NormalizedSignal[] {
  return DM001_CONTEXT_CATEGORIES.flatMap((category) => {
    const group = decisionContext[category];

    return SIGNAL_FIELDS.flatMap(({ field, signalType }) => {
      const evidenceItems = group[field] ?? EMPTY_EVIDENCE;

      return evidenceItems.map((evidence) => ({
        category,
        signalType,
        evidence,
      }));
    });
  });
}

export function collectEvidenceIds(signals: Dm001NormalizedSignal[]): string[] {
  return Array.from(new Set(signals.map((signal) => signal.evidence.evidenceId)));
}
