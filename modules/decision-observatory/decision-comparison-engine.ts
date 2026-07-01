import type {
  DecisionComparableOutput,
  DecisionComparisonChange,
  DecisionComparisonCollectionDiff,
  DecisionComparisonResult,
} from "./decision-comparison-engine.types";

export function compareDecisionOutputs(
  previousOutput: DecisionComparableOutput,
  currentOutput: DecisionComparableOutput,
): DecisionComparisonResult {
  const core = compareCoreFields(previousOutput, currentOutput);
  const rationale = compareRecordFields(
    previousOutput.rationale ?? null,
    currentOutput.rationale ?? null,
  );
  const metadata = compareRecordFields(
    previousOutput.metadata ?? null,
    currentOutput.metadata ?? null,
  );
  const evidence = compareCollections(
    previousOutput.evidenceTrace,
    currentOutput.evidenceTrace,
  );
  const contributors = compareCollections(
    previousOutput.scoreContributors,
    currentOutput.scoreContributors,
  );
  const scoreDelta = calculateScoreDelta(previousOutput.score, currentOutput.score);

  return {
    contributors,
    core,
    currentOutputId: currentOutput.id,
    evidence,
    metadata,
    previousOutputId: previousOutput.id,
    rationale,
    summary: {
      confidenceChanged: !isEqual(
        previousOutput.confidence,
        currentOutput.confidence,
      ),
      decisionChanged: !isEqual(previousOutput.decision, currentOutput.decision),
      hasChanges:
        core.some((change) => change.changed) ||
        rationale.some((change) => change.changed) ||
        metadata.some((change) => change.changed) ||
        evidence.added.length > 0 ||
        evidence.removed.length > 0 ||
        contributors.added.length > 0 ||
        contributors.removed.length > 0,
      modelChanged:
        previousOutput.modelId !== currentOutput.modelId ||
        previousOutput.modelVersion !== currentOutput.modelVersion,
      scoreChanged: scoreDelta !== 0 && scoreDelta !== null,
      scoreDelta,
    },
  };
}

function compareCoreFields(
  previousOutput: DecisionComparableOutput,
  currentOutput: DecisionComparableOutput,
) {
  return [
    compareField("modelId", previousOutput.modelId, currentOutput.modelId),
    compareField(
      "modelVersion",
      previousOutput.modelVersion,
      currentOutput.modelVersion,
    ),
    compareField("decision", previousOutput.decision, currentOutput.decision),
    compareField("score", previousOutput.score, currentOutput.score),
    compareField(
      "confidence",
      previousOutput.confidence,
      currentOutput.confidence,
    ),
    compareField(
      "recommendedAction",
      previousOutput.recommendedAction ?? null,
      currentOutput.recommendedAction ?? null,
    ),
  ];
}

function compareRecordFields(
  previousRecord: Record<string, unknown> | null,
  currentRecord: Record<string, unknown> | null,
): DecisionComparisonChange[] {
  const keys = new Set([
    ...Object.keys(previousRecord ?? {}),
    ...Object.keys(currentRecord ?? {}),
  ]);

  return Array.from(keys)
    .sort()
    .map((key) =>
      compareField(key, previousRecord?.[key] ?? null, currentRecord?.[key] ?? null),
    );
}

function compareField(
  field: string,
  previous: unknown,
  current: unknown,
): DecisionComparisonChange {
  return {
    changed: !isEqual(previous, current),
    current,
    field,
    previous,
  };
}

function compareCollections(
  previousCollection: unknown,
  currentCollection: unknown,
): DecisionComparisonCollectionDiff {
  const previous = toStableCollection(previousCollection);
  const current = toStableCollection(currentCollection);
  const previousSet = new Set(previous);
  const currentSet = new Set(current);

  return {
    added: current.filter((item) => !previousSet.has(item)),
    currentCount: current.length,
    previousCount: previous.length,
    removed: previous.filter((item) => !currentSet.has(item)),
    unchanged: current.filter((item) => previousSet.has(item)),
  };
}

function toStableCollection(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(toStableComparableString).sort();
}

function toStableComparableString(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (isRecord(value)) {
    const id =
      readString(value.evidenceId) ??
      readString(value.id) ??
      readString(value.sourceId);

    return id ?? stableStringify(value);
  }

  return stableStringify(value);
}

function calculateScoreDelta(
  previousScore: string | number | null,
  currentScore: string | number | null,
) {
  const previous = toNumber(previousScore);
  const current = toNumber(currentScore);

  if (previous === null || current === null) {
    return null;
  }

  return current - previous;
}

function toNumber(value: string | number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isEqual(previous: unknown, current: unknown) {
  return stableStringify(previous) === stableStringify(current);
}

function stableStringify(value: unknown): string {
  if (!isRecord(value)) {
    return JSON.stringify(value);
  }

  const sorted: Record<string, unknown> = {};

  for (const key of Object.keys(value).sort()) {
    sorted[key] = value[key];
  }

  return JSON.stringify(sorted);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
