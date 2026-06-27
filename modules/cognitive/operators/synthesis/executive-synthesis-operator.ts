import type {
  CognitiveOperator,
  EvidenceReference,
  RecommendedAttention,
  SituationContext,
  SituationNarrative,
  SituationRisk,
  ExecutiveSituation,
} from "../../contracts";
import type {
  AttentionLevel,
  SituationPriority,
} from "../../types";

export const ExecutiveSynthesisOperator: CognitiveOperator<
  SituationContext,
  ExecutiveSituation
> = {
  description:
    "Synthesizes a generic executive situation from traceable situation context.",
  execute(input) {
    const priority = resolveExecutivePriority(input);
    const evidenceTrace = buildEvidenceTrace(input);

    return {
      artifactType: "executive_situation",
      confidence: input.confidence,
      generatedAt: input.generatedAt,
      id: createArtifactId("executive_situation", input),
      leadId: input.leadId,
      metadata: input.metadata,
      organizationId: input.organizationId,
      payload: {
        currentState: input.payload.state,
        evidenceTrace,
        momentum: input.payload.momentum,
        narrative: buildSituationNarrative(input),
        opportunities: input.payload.opportunities,
        priority,
        recommendedAttention: buildRecommendedAttention(input, priority),
        risks: input.payload.risks,
      },
      pipelineVersion: input.pipelineVersion,
      sourceOperators: [...input.sourceOperators, ExecutiveSynthesisOperator.id],
    };
  },
  id: "cognitive.operator.executive-synthesis",
  version: "0.1.0",
};

function resolveExecutivePriority(
  situation: SituationContext,
): SituationPriority {
  if (
    situation.payload.state === "low_signal" &&
    !hasSevereRiskOrConflict(situation)
  ) {
    return situation.payload.risks.length ? "medium" : "low";
  }

  if (hasCriticalRisk(situation.payload.risks)) {
    return "critical";
  }

  if (
    situation.payload.unresolvedConflicts.some(
      (conflict) => conflict.severity === "high",
    )
  ) {
    return "high";
  }

  if (
    situation.payload.opportunities.length >= 2 &&
    situation.payload.momentum === "accelerating"
  ) {
    return "high";
  }

  if (situation.payload.risks.some((risk) => risk.severity === "high")) {
    return "high";
  }

  if (situation.payload.opportunities.length || situation.payload.risks.length) {
    return "medium";
  }

  return "low";
}

function buildRecommendedAttention(
  situation: SituationContext,
  priority: SituationPriority,
): RecommendedAttention {
  const riskEvidenceIds = situation.payload.risks.flatMap(
    (risk) => risk.evidenceIds,
  );
  const conflictEvidenceIds = situation.payload.unresolvedConflicts.flatMap(
    (conflict) => conflict.evidenceIds,
  );
  const opportunityEvidenceIds = situation.payload.opportunities.flatMap(
    (opportunity) => opportunity.evidenceIds,
  );
  const evidenceIds = [
    ...new Set([
      ...riskEvidenceIds,
      ...conflictEvidenceIds,
      ...opportunityEvidenceIds,
    ]),
  ];

  return {
    evidenceIds,
    level: mapPriorityToAttention(priority),
    reason: buildAttentionReason(situation),
  };
}

function buildSituationNarrative(
  situation: SituationContext,
): SituationNarrative {
  const evidenceIds = [
    ...new Set([
      ...situation.payload.patterns.flatMap((pattern) => pattern.evidenceIds),
      ...situation.payload.risks.flatMap((risk) => risk.evidenceIds),
      ...situation.payload.opportunities.flatMap(
        (opportunity) => opportunity.evidenceIds,
      ),
      ...situation.payload.unresolvedConflicts.flatMap(
        (conflict) => conflict.evidenceIds,
      ),
    ]),
  ];

  return {
    evidenceIds,
    summary: [
      `Current state is ${situation.payload.state}.`,
      `Momentum is ${situation.payload.momentum}.`,
      `${situation.payload.risks.length} risk items and ${situation.payload.opportunities.length} opportunity items are present.`,
    ].join(" "),
  };
}

function buildEvidenceTrace(situation: SituationContext): EvidenceReference[] {
  return [
    ...situation.payload.patterns.flatMap((pattern) =>
      pattern.evidenceIds.map((evidenceId) => ({
        evidenceId,
        relation: "pattern" as const,
        sourceId: pattern.patternId,
      })),
    ),
    ...situation.payload.risks.flatMap((risk) =>
      risk.evidenceIds.map((evidenceId) => ({
        evidenceId,
        relation: "risk" as const,
        sourceId: risk.riskId,
      })),
    ),
    ...situation.payload.opportunities.flatMap((opportunity) =>
      opportunity.evidenceIds.map((evidenceId) => ({
        evidenceId,
        relation: "opportunity" as const,
        sourceId: opportunity.opportunityId,
      })),
    ),
    ...situation.payload.unresolvedConflicts.flatMap((conflict) =>
      conflict.evidenceIds.map((evidenceId) => ({
        evidenceId,
        relation: "conflict" as const,
        sourceId: conflict.conflictId,
      })),
    ),
  ];
}

function buildAttentionReason(situation: SituationContext) {
  if (situation.payload.risks.length) {
    return "Risk items are present in the situation context.";
  }

  if (situation.payload.unresolvedConflicts.length) {
    return "Unresolved conflicts are present in the situation context.";
  }

  if (situation.payload.opportunities.length) {
    return "Opportunity items are present in the situation context.";
  }

  return "No specific attention driver is present.";
}

function mapPriorityToAttention(priority: SituationPriority): AttentionLevel {
  if (priority === "critical") {
    return "critical";
  }

  if (priority === "high") {
    return "high";
  }

  if (priority === "medium") {
    return "medium";
  }

  return "low";
}

function hasSevereRiskOrConflict(situation: SituationContext) {
  return (
    hasCriticalRisk(situation.payload.risks) ||
    situation.payload.unresolvedConflicts.some(
      (conflict) => conflict.severity === "high",
    )
  );
}

function hasCriticalRisk(risks: SituationRisk[]) {
  return risks.some((risk) => risk.severity === "critical");
}

function createArtifactId(prefix: string, artifact: SituationContext) {
  return `${prefix}:${artifact.organizationId}:${artifact.leadId}:${artifact.generatedAt}`;
}
