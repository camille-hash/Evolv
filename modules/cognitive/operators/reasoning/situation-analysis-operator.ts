import type {
  CognitiveConfidence,
  CognitiveOperator,
  Evidence,
  EvidenceSet,
  SituationConflict,
  SituationContext,
  SituationOpportunity,
  SituationPattern,
  SituationRisk,
} from "../../contracts";
import type {
  ConflictSeverity,
  OpportunityType,
  RiskSeverity,
  SituationMomentum,
  SituationState,
} from "../../types";

export const SituationAnalysisOperator: CognitiveOperator<
  EvidenceSet,
  SituationContext
> = {
  description:
    "Analyzes generic evidence patterns into a traceable situation context.",
  execute(input) {
    const evidence = input.payload.evidence;
    const patterns = buildSituationPatterns(evidence);
    const risks = buildSituationRisks(evidence);
    const opportunities = buildSituationOpportunities(evidence);
    const unresolvedConflicts = buildSituationConflicts(evidence);
    const consumed = collectConsumedEvidenceIds([
      ...patterns,
      ...risks,
      ...opportunities,
      ...unresolvedConflicts,
    ]);

    return {
      artifactType: "situation_context",
      confidence: resolveSituationConfidence(evidence, consumed),
      generatedAt: input.generatedAt,
      id: createArtifactId("situation_context", input),
      leadId: input.leadId,
      metadata: input.metadata,
      organizationId: input.organizationId,
      payload: {
        evidenceCoverage: {
          available: evidence.length,
          consumed,
          ignored: evidence
            .map((item) => item.evidenceId)
            .filter((evidenceId) => !consumed.includes(evidenceId)),
        },
        evidenceSet: input,
        momentum: resolveSituationMomentum(evidence, patterns),
        opportunities,
        patterns,
        risks,
        state: resolveSituationState(patterns),
        unresolvedConflicts,
      },
      pipelineVersion: input.pipelineVersion,
      sourceOperators: [...input.sourceOperators, SituationAnalysisOperator.id],
    };
  },
  id: "cognitive.operator.situation-analysis",
  version: "0.1.0",
};

type TraceableSituationItem = {
  evidenceIds: string[];
};

function buildSituationPatterns(evidence: Evidence[]): SituationPattern[] {
  const patterns: SituationPattern[] = [];
  const usefulEvidence = evidence.filter((item) => item.polarity !== "missing");
  const missingInformation = filterByEvidenceType(evidence, "missing_information");
  const missingNextAction = filterByEvidenceType(evidence, "missing_next_action");
  const positiveActivity = evidence.filter(
    (item) =>
      item.polarity === "positive" &&
      ["note", "simulation", "task", "timeline_event"].includes(
        item.evidenceType,
      ),
  );
  const negativeEvidence = evidence.filter((item) => item.polarity === "negative");
  const attentionTaskEvidence = evidence.filter(
    (item) =>
      item.polarity === "attention_required" &&
      (item.evidenceType === "task" ||
        item.evidenceType === "missing_next_action"),
  );

  if (!usefulEvidence.length || evidence.length < 2) {
    patterns.push(
      createPattern(
        "pattern.low-signal",
        "low_signal",
        "Few useful evidence items are available.",
        evidence.map((item) => item.evidenceId),
      ),
    );
  }

  if (missingInformation.length) {
    patterns.push(
      createPattern(
        "pattern.incomplete-context",
        "incomplete_context",
        "Missing information evidence is present.",
        missingInformation.map((item) => item.evidenceId),
      ),
    );
  }

  if (missingNextAction.length || attentionTaskEvidence.length) {
    patterns.push(
      createPattern(
        "pattern.awaiting-follow-up",
        "awaiting_follow_up",
        "Task or next-action evidence requires attention.",
        [...missingNextAction, ...attentionTaskEvidence].map(
          (item) => item.evidenceId,
        ),
      ),
    );
  }

  if (positiveActivity.length) {
    patterns.push(
      createPattern(
        "pattern.active-negotiation",
        "active_negotiation",
        "Positive activity evidence is present.",
        positiveActivity.map((item) => item.evidenceId),
      ),
    );
  }

  if (missingInformation.length >= 2 && usefulEvidence.length <= 1) {
    patterns.push(
      createPattern(
        "pattern.stalled",
        "stalled",
        "Missing evidence is high and useful evidence is low.",
        [...missingInformation, ...usefulEvidence].map(
          (item) => item.evidenceId,
        ),
      ),
    );
  }

  if (negativeEvidence.some((item) => item.occurredAt)) {
    patterns.push(
      createPattern(
        "pattern.cooling-down",
        "cooling_down",
        "Negative evidence with timestamp is present.",
        negativeEvidence.map((item) => item.evidenceId),
      ),
    );
  }

  return patterns;
}

function buildSituationRisks(evidence: Evidence[]): SituationRisk[] {
  const risks: SituationRisk[] = [];
  const missingEvidence = evidence.filter((item) => item.polarity === "missing");
  const negativeEvidence = evidence.filter((item) => item.polarity === "negative");
  const attentionEvidence = evidence.filter(
    (item) => item.polarity === "attention_required",
  );

  if (missingEvidence.length) {
    risks.push(
      createRisk(
        "risk.missing-evidence",
        resolveSeverity(missingEvidence),
        "Missing evidence may limit situation analysis.",
        missingEvidence.map((item) => item.evidenceId),
      ),
    );
  }

  if (negativeEvidence.length) {
    risks.push(
      createRisk(
        "risk.negative-evidence",
        resolveSeverity(negativeEvidence),
        "Negative evidence is present.",
        negativeEvidence.map((item) => item.evidenceId),
      ),
    );
  }

  if (attentionEvidence.length) {
    risks.push(
      createRisk(
        "risk.attention-required",
        resolveSeverity(attentionEvidence),
        "Attention-required evidence is present.",
        attentionEvidence.map((item) => item.evidenceId),
      ),
    );
  }

  return risks;
}

function buildSituationOpportunities(evidence: Evidence[]): SituationOpportunity[] {
  const positiveEvidence = evidence.filter((item) => item.polarity === "positive");
  const dataCompletionEvidence = evidence.filter(
    (item) => item.polarity === "missing",
  );
  const relationshipEvidence = evidence.filter((item) =>
    ["note", "timeline_event", "check_point"].includes(item.evidenceType),
  );

  return [
    ...buildOpportunityIfPresent(
      "opportunity.relationship-signal",
      "relationship_signal",
      "Relationship evidence is available.",
      relationshipEvidence,
    ),
    ...buildOpportunityIfPresent(
      "opportunity.commercial-interest",
      "commercial_interest",
      "Positive evidence is available.",
      positiveEvidence,
    ),
    ...buildOpportunityIfPresent(
      "opportunity.data-completion",
      "data_completion",
      "Missing evidence identifies data completion needs.",
      dataCompletionEvidence,
    ),
  ];
}

function buildSituationConflicts(evidence: Evidence[]): SituationConflict[] {
  const conflicts: SituationConflict[] = [];
  const sources = [...new Set(evidence.map((item) => item.source))];

  for (const source of sources) {
    const sourceEvidence = evidence.filter((item) => item.source === source);
    const hasPositive = sourceEvidence.some((item) => item.polarity === "positive");
    const hasNegative = sourceEvidence.some((item) => item.polarity === "negative");
    const hasMissing = sourceEvidence.some((item) => item.polarity === "missing");

    if (hasPositive && hasNegative) {
      conflicts.push(
        createConflict(
          `conflict.${source}.polarity`,
          "high",
          "Positive and negative evidence share the same source.",
          sourceEvidence.map((item) => item.evidenceId),
        ),
      );
    }

    if ((hasPositive || hasNegative) && hasMissing) {
      conflicts.push(
        createConflict(
          `conflict.${source}.missing`,
          "medium",
          "Available and missing evidence share the same source.",
          sourceEvidence.map((item) => item.evidenceId),
        ),
      );
    }
  }

  return conflicts;
}

function resolveSituationState(patterns: SituationPattern[]): SituationState {
  const states = patterns.map((pattern) => pattern.state);

  if (states.includes("stalled")) {
    return "stalled";
  }

  if (states.includes("awaiting_follow_up")) {
    return "awaiting_follow_up";
  }

  if (states.includes("active_negotiation")) {
    return "active_negotiation";
  }

  if (states.includes("incomplete_context")) {
    return "incomplete_context";
  }

  if (states.includes("cooling_down")) {
    return "cooling_down";
  }

  return "low_signal";
}

function resolveSituationMomentum(
  evidence: Evidence[],
  patterns: SituationPattern[],
): SituationMomentum {
  if (!evidence.length || patterns.some((pattern) => pattern.state === "low_signal")) {
    return "unknown";
  }

  if (patterns.some((pattern) => pattern.state === "stalled")) {
    return "stalled";
  }

  if (patterns.some((pattern) => pattern.state === "cooling_down")) {
    return "cooling";
  }

  if (patterns.some((pattern) => pattern.state === "active_negotiation")) {
    return "stable";
  }

  return "unknown";
}

function resolveSituationConfidence(
  evidence: Evidence[],
  consumedEvidenceIds: string[],
): CognitiveConfidence {
  if (!evidence.length) {
    return "UNKNOWN";
  }

  if (consumedEvidenceIds.length >= 5) {
    return "HIGH";
  }

  if (consumedEvidenceIds.length >= 2) {
    return "MEDIUM";
  }

  return "LOW";
}

function resolveSeverity(evidence: Evidence[]): RiskSeverity {
  if (evidence.some((item) => item.relevance === "critical")) {
    return "critical";
  }

  if (evidence.some((item) => item.relevance === "high")) {
    return "high";
  }

  if (evidence.some((item) => item.relevance === "medium")) {
    return "medium";
  }

  return "low";
}

function filterByEvidenceType(
  evidence: Evidence[],
  evidenceType: Evidence["evidenceType"],
) {
  return evidence.filter((item) => item.evidenceType === evidenceType);
}

function createPattern(
  patternId: string,
  state: SituationState,
  description: string,
  evidenceIds: string[],
): SituationPattern {
  return {
    description,
    evidenceIds,
    patternId,
    state,
  };
}

function createRisk(
  riskId: string,
  severity: RiskSeverity,
  description: string,
  evidenceIds: string[],
): SituationRisk {
  return {
    description,
    evidenceIds,
    riskId,
    severity,
  };
}

function buildOpportunityIfPresent(
  opportunityId: string,
  opportunityType: OpportunityType,
  description: string,
  evidence: Evidence[],
): SituationOpportunity[] {
  if (!evidence.length) {
    return [];
  }

  return [
    {
      description,
      evidenceIds: evidence.map((item) => item.evidenceId),
      opportunityId,
      opportunityType,
    },
  ];
}

function createConflict(
  conflictId: string,
  severity: ConflictSeverity,
  description: string,
  evidenceIds: string[],
): SituationConflict {
  return {
    conflictId,
    description,
    evidenceIds,
    severity,
  };
}

function collectConsumedEvidenceIds(items: TraceableSituationItem[]) {
  return [...new Set(items.flatMap((item) => item.evidenceIds))];
}

function createArtifactId(prefix: string, artifact: EvidenceSet) {
  return `${prefix}:${artifact.organizationId}:${artifact.leadId}:${artifact.generatedAt}`;
}
