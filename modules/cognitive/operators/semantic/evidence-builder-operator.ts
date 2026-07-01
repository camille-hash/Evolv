import type {
  CognitiveOperator,
  Evidence,
  EvidenceSet,
  NormalizedContext,
} from "../../contracts";
import type {
  EvidencePolarity,
  EvidenceRelevance,
  EvidenceSource,
  EvidenceType,
} from "../../types";

const evidenceSources = [
  "lead",
  "timeline",
  "tasks",
  "notes",
  "simulations",
  "multi_quota",
  "check_points",
  "knowledge_gaps",
  "executive_briefing",
  "decision_outputs",
] as const satisfies readonly EvidenceSource[];

const evidenceTypeBySource: Record<EvidenceSource, EvidenceType> = {
  check_points: "check_point",
  decision_outputs: "decision_output",
  executive_briefing: "executive_briefing",
  knowledge_gaps: "knowledge_gap",
  lead: "lead_profile",
  multi_quota: "multi_quota_study",
  notes: "note",
  simulations: "simulation",
  tasks: "task",
  timeline: "timeline_event",
};

export const EvidenceBuilderOperator: CognitiveOperator<
  NormalizedContext,
  EvidenceSet
> = {
  description:
    "Builds structural evidence from normalized context without situation analysis.",
  execute(input) {
    const recordEvidence = input.payload.records.map((record, index) =>
      buildRecordEvidence(record, index),
    );
    const missingEvidence = buildMissingEvidence(input);
    const evidence = [...recordEvidence, ...missingEvidence];

    return {
      artifactType: "evidence_set",
      confidence: "UNKNOWN",
      generatedAt: input.generatedAt,
      id: createArtifactId("evidence_set", input),
      leadId: input.leadId,
      metadata: input.metadata,
      organizationId: input.organizationId,
      payload: {
        evidence,
        groups: {
          byPolarity: countBy(evidence, (item) => item.polarity),
          byRelevance: countBy(evidence, (item) => item.relevance),
          bySource: countBy(evidence, (item) => item.source),
          byType: countBy(evidence, (item) => item.evidenceType),
        },
        statistics: buildEvidenceStatistics(evidence),
      },
      pipelineVersion: input.pipelineVersion,
      sourceOperators: [...input.sourceOperators, EvidenceBuilderOperator.id],
    };
  },
  id: "cognitive.operator.evidence-builder",
  version: "0.1.0",
};

function buildRecordEvidence(
  record: NormalizedContext["payload"]["records"][number],
  index: number,
): Evidence {
  const source = normalizeEvidenceSource(record.source);

  return {
    confidence: "UNKNOWN",
    content: record.content,
    evidenceId: createEvidenceId(source, record.sourceId ?? String(index)),
    evidenceType: evidenceTypeBySource[source],
    metadata: {
      raw: record.metadata.raw ?? record.metadata,
    },
    ...(record.occurredAt ? { occurredAt: record.occurredAt } : {}),
    polarity: "neutral",
    relevance: "medium",
    source,
    ...(record.sourceId ? { sourceId: record.sourceId } : {}),
    tags: [source, evidenceTypeBySource[source]],
    title: `Evidence from ${source}`,
  };
}

function buildMissingEvidence(input: NormalizedContext): Evidence[] {
  const missingEvidence: Evidence[] = [];
  const unavailableSources = input.payload.sources.filter(
    (source) => source.availability === "unavailable",
  );
  const tasksSource = input.payload.sources.find(
    (source) => source.sourceType === "tasks",
  );
  const simulationsSource = input.payload.sources.find(
    (source) => source.sourceType === "simulations",
  );
  const multiQuotaSource = input.payload.sources.find(
    (source) => source.sourceType === "multi_quota",
  );

  if (tasksSource?.availability !== "available") {
    missingEvidence.push(
      buildMissingEvidenceItem({
        description: "The tasks source has no available structural records.",
        evidenceType: "missing_next_action",
        relevance: "high",
        source: "tasks",
        title: "Missing next action",
      }),
    );
  }

  if (
    simulationsSource?.availability !== "available" &&
    multiQuotaSource?.availability !== "available"
  ) {
    missingEvidence.push(
      buildMissingEvidenceItem({
        description:
          "Simulation and multi-quota sources have no available structural records.",
        evidenceType: "missing_simulation",
        relevance: "medium",
        source: "simulations",
        title: "Missing simulation",
      }),
    );
  }

  for (const source of unavailableSources) {
    if (source.sourceType === "tasks" || source.sourceType === "simulations") {
      continue;
    }

    missingEvidence.push(
      buildMissingEvidenceItem({
        description: `The ${source.sourceType} source is unavailable.`,
        evidenceType: "missing_information",
        relevance: source.sourceType === "lead" ? "critical" : "medium",
        source: normalizeEvidenceSource(source.sourceType),
        title: `Missing information from ${source.sourceType}`,
      }),
    );
  }

  return missingEvidence;
}

function buildMissingEvidenceItem({
  description,
  evidenceType,
  relevance,
  source,
  title,
}: {
  description: string;
  evidenceType: EvidenceType;
  relevance: EvidenceRelevance;
  source: EvidenceSource;
  title: string;
}): Evidence {
  return {
    confidence: "UNKNOWN",
    content: {},
    description,
    evidenceId: createEvidenceId(source, evidenceType),
    evidenceType,
    polarity: "missing",
    relevance,
    source,
    tags: [source, evidenceType, "missing"],
    title,
  };
}

function buildEvidenceStatistics(evidence: Evidence[]) {
  return {
    attentionRequired: countPolarity(evidence, "attention_required"),
    missing: countPolarity(evidence, "missing"),
    negative: countPolarity(evidence, "negative"),
    neutral: countPolarity(evidence, "neutral"),
    positive: countPolarity(evidence, "positive"),
    total: evidence.length,
  };
}

function countPolarity(evidence: Evidence[], polarity: EvidencePolarity) {
  return evidence.filter((item) => item.polarity === polarity).length;
}

function countBy(
  evidence: Evidence[],
  getKey: (item: Evidence) => string,
): Record<string, number> {
  return evidence.reduce<Record<string, number>>((groups, item) => {
    const key = getKey(item);

    return {
      ...groups,
      [key]: (groups[key] ?? 0) + 1,
    };
  }, {});
}

function normalizeEvidenceSource(source: string): EvidenceSource {
  return evidenceSources.includes(source as EvidenceSource)
    ? (source as EvidenceSource)
    : "lead";
}

function createEvidenceId(source: EvidenceSource, suffix: string) {
  return `evidence:${source}:${suffix}`;
}

function createArtifactId(prefix: string, artifact: NormalizedContext) {
  return `${prefix}:${artifact.organizationId}:${artifact.leadId}:${artifact.generatedAt}`;
}
