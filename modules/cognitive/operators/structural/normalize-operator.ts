import type {
  CognitiveOperator,
  CollectedContext,
  NormalizedContext,
  NormalizedRecord,
} from "../../contracts";

export const NormalizeOperator: CognitiveOperator<
  CollectedContext,
  NormalizedContext
> = {
  description:
    "Normalizes collected context into a minimal structural artifact without interpretation.",
  execute(input) {
    const records = input.payload.records.flatMap(normalizeCollectedRecord);
    const sourceMap = buildSourceMap(records, input);

    return {
      artifactType: "normalized_context",
      confidence: input.confidence,
      generatedAt: input.generatedAt,
      id: createArtifactId("normalized_context", input),
      leadId: input.leadId,
      metadata: input.metadata,
      organizationId: input.organizationId,
      payload: {
        records,
        sourceMap,
        sources: input.payload.sources,
        stats: {
          inputRecords: input.payload.records.length,
          normalizedRecords: records.length,
          sources: input.payload.sources.length,
        },
      },
      pipelineVersion: input.pipelineVersion,
      sourceOperators: [...input.sourceOperators, NormalizeOperator.id],
    };
  },
  id: "cognitive.operator.normalize",
  version: "0.1.0",
};

function normalizeCollectedRecord(
  record: Record<string, unknown>,
): NormalizedRecord[] {
  const source = readString(record.sourceType) ?? "unknown";
  const value = record.value;

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, source));
  }

  return [normalizeValue(value, source)];
}

function normalizeValue(value: unknown, source: string): NormalizedRecord {
  if (!isRecord(value)) {
    return {
      content: {
        value,
      },
      metadata: {
        raw: value,
      },
      source,
    };
  }

  const sourceId = readFirstString(value, ["sourceId", "id", "externalId"]);
  const occurredAt = readFirstString(value, [
    "occurredAt",
    "createdAt",
    "updatedAt",
    "timestamp",
    "date",
  ]);

  return {
    content: omitKeys(value, [
      "source",
      "sourceId",
      "id",
      "externalId",
      "occurredAt",
      "createdAt",
      "updatedAt",
      "timestamp",
      "date",
      "metadata",
    ]),
    metadata: {
      ...(isRecord(value.metadata) ? value.metadata : {}),
      raw: value,
    },
    ...(occurredAt ? { occurredAt } : {}),
    source,
    ...(sourceId ? { sourceId } : {}),
  };
}

function buildSourceMap(records: NormalizedRecord[], input: CollectedContext) {
  const sourceMap: Record<string, string[]> = Object.fromEntries(
    input.payload.sources.map((source) => [source.sourceId, [source.sourceType]]),
  );

  for (const record of records) {
    const key = record.sourceId ?? record.source;
    const sources = sourceMap[key] ?? [];

    sourceMap[key] = sources.includes(record.source)
      ? sources
      : [...sources, record.source];
  }

  return sourceMap;
}

function omitKeys(
  value: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key)),
  );
}

function readFirstString(
  value: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const result = readString(value[key]);

    if (result) {
      return result;
    }
  }

  return undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createArtifactId(prefix: string, artifact: CollectedContext) {
  return `${prefix}:${artifact.organizationId}:${artifact.leadId}:${artifact.generatedAt}`;
}
