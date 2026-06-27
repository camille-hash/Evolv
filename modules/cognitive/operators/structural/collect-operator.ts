import type {
  CognitiveOperator,
  CognitiveSource,
  CollectedContext,
  OperationalContext,
  SourceAvailability,
} from "../../contracts";

const expectedCognitiveSources = [
  "lead",
  "timeline",
  "tasks",
  "notes",
  "simulations",
  "multi_quota",
  "check_points",
  "knowledge_gaps",
  "executive_briefing",
] as const;

type ExpectedCognitiveSource = (typeof expectedCognitiveSources)[number];

export const CollectOperator: CognitiveOperator<
  OperationalContext,
  CollectedContext
> = {
  description:
    "Collects declared operational context into a structural cognitive artifact.",
  execute(input) {
    assertRequiredContext(input);

    const sources = expectedCognitiveSources.map((sourceType) =>
      collectSource(sourceType, input),
    );
    const records = sources
      .filter((source) => source.availability === "available")
      .map((source) => ({
        sourceId: source.sourceId,
        sourceType: source.sourceType,
        value: input.data?.[source.sourceType],
      }));
    const stats = buildCollectionStats(sources);

    return {
      artifactType: "collected_context",
      confidence: "UNKNOWN",
      generatedAt: input.generatedAt,
      id: createArtifactId("collected_context", input),
      leadId: input.leadId,
      metadata: input.metadata,
      organizationId: input.organizationId,
      payload: {
        rawContext: input,
        records,
        sources,
        stats,
      },
      pipelineVersion: input.pipelineVersion,
      sourceOperators: [CollectOperator.id],
    };
  },
  id: "cognitive.operator.collect",
  version: "0.1.0",
};

function assertRequiredContext(input: OperationalContext) {
  if (!input.leadId.trim()) {
    throw new Error("OperationalContext.leadId is required.");
  }

  if (!input.organizationId.trim()) {
    throw new Error("OperationalContext.organizationId is required.");
  }
}

function collectSource(
  sourceType: ExpectedCognitiveSource,
  input: OperationalContext,
): CognitiveSource {
  const declaredSource = input.sources?.find(
    (source) => source.sourceType === sourceType || source.sourceId === sourceType,
  );
  const value = input.data?.[sourceType];
  const availability = resolveSourceAvailability(value, declaredSource);

  return {
    availability,
    label: declaredSource?.label ?? sourceType,
    metadata: declaredSource?.metadata,
    sourceId: declaredSource?.sourceId ?? sourceType,
    sourceType,
  };
}

function resolveSourceAvailability(
  value: unknown,
  declaredSource: CognitiveSource | undefined,
): SourceAvailability {
  if (typeof value === "undefined" || value === null) {
    return declaredSource?.availability ?? "unavailable";
  }

  if (Array.isArray(value)) {
    return value.length ? "available" : "empty";
  }

  if (isRecord(value)) {
    return "available";
  }

  if (typeof value === "string") {
    return value.trim() ? "available" : "empty";
  }

  return "available";
}

function buildCollectionStats(sources: CognitiveSource[]) {
  const availableSources = sources.filter(
    (source) => source.availability === "available",
  ).length;
  const emptySources = sources.filter(
    (source) => source.availability === "empty",
  ).length;
  const unavailableSources = sources.filter(
    (source) => source.availability === "unavailable",
  ).length;

  return {
    availableSources,
    emptySources,
    evidenceCandidates: availableSources,
    totalSources: sources.length,
    unavailableSources,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createArtifactId(prefix: string, context: OperationalContext) {
  return `${prefix}:${context.organizationId}:${context.leadId}:${context.generatedAt}`;
}
