import type {
  CognitiveOperator,
  EvidenceReference,
  ExecutiveSituation,
  TraceAssemblyInput,
} from "../../contracts";

export const TraceAssemblyOperator: CognitiveOperator<
  TraceAssemblyInput,
  ExecutiveSituation
> = {
  description:
    "Assembles and validates evidence trace references for executive situations.",
  execute(input) {
    const evidenceIds = new Set(
      input.evidenceSet.payload.evidence.map((evidence) => evidence.evidenceId),
    );
    const initialTrace = input.executiveSituation.payload.evidenceTrace.length
      ? input.executiveSituation.payload.evidenceTrace
      : buildTraceFromSituation(input);
    const { missingReferences, trace } = cleanTrace(initialTrace, evidenceIds);

    return {
      ...input.executiveSituation,
      metadata: {
        ...input.executiveSituation.metadata,
        traceAssembledAt: input.executiveSituation.generatedAt,
        traceEvidenceCount: trace.length,
        traceMissingReferences: missingReferences,
      },
      payload: {
        ...input.executiveSituation.payload,
        evidenceTrace: trace,
        narrative: {
          ...input.executiveSituation.payload.narrative,
          evidenceIds: filterEvidenceIds(
            input.executiveSituation.payload.narrative.evidenceIds,
            evidenceIds,
          ),
        },
        recommendedAttention: {
          ...input.executiveSituation.payload.recommendedAttention,
          evidenceIds: filterEvidenceIds(
            input.executiveSituation.payload.recommendedAttention.evidenceIds,
            evidenceIds,
          ),
        },
      },
      sourceOperators: [
        ...input.executiveSituation.sourceOperators,
        TraceAssemblyOperator.id,
      ],
    };
  },
  id: "cognitive.operator.trace-assembly",
  version: "0.1.0",
};

function buildTraceFromSituation(input: TraceAssemblyInput): EvidenceReference[] {
  return [
    ...input.situationContext.payload.patterns.flatMap((pattern) =>
      pattern.evidenceIds.map((evidenceId) => ({
        contribution: "state" as const,
        evidenceId,
        relation: "pattern" as const,
        sourceId: pattern.patternId,
      })),
    ),
    ...input.situationContext.payload.risks.flatMap((risk) =>
      risk.evidenceIds.map((evidenceId) => ({
        contribution: "risk" as const,
        evidenceId,
        relation: "risk" as const,
        sourceId: risk.riskId,
      })),
    ),
    ...input.situationContext.payload.opportunities.flatMap((opportunity) =>
      opportunity.evidenceIds.map((evidenceId) => ({
        contribution: "opportunity" as const,
        evidenceId,
        relation: "opportunity" as const,
        sourceId: opportunity.opportunityId,
      })),
    ),
    ...input.situationContext.payload.unresolvedConflicts.flatMap((conflict) =>
      conflict.evidenceIds.map((evidenceId) => ({
        contribution: "priority" as const,
        evidenceId,
        relation: "conflict" as const,
        sourceId: conflict.conflictId,
      })),
    ),
    ...input.executiveSituation.payload.recommendedAttention.evidenceIds.map(
      (evidenceId) => ({
        contribution: "recommendation" as const,
        evidenceId,
        relation: "risk" as const,
        sourceId: "recommendedAttention",
      }),
    ),
    ...input.executiveSituation.payload.narrative.evidenceIds.map((evidenceId) => ({
      contribution: "narrative" as const,
      evidenceId,
      relation: "pattern" as const,
      sourceId: "narrative",
    })),
  ];
}

function cleanTrace(
  trace: EvidenceReference[],
  evidenceIds: Set<string>,
): {
  missingReferences: string[];
  trace: EvidenceReference[];
} {
  const seen = new Set<string>();
  const missingReferences: string[] = [];
  const cleanedTrace: EvidenceReference[] = [];

  for (const reference of trace) {
    if (!evidenceIds.has(reference.evidenceId)) {
      missingReferences.push(reference.evidenceId);
      continue;
    }

    const key = [
      reference.evidenceId,
      reference.relation,
      reference.sourceId,
      reference.contribution ?? "",
    ].join(":");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    cleanedTrace.push(reference);
  }

  return {
    missingReferences: [...new Set(missingReferences)].sort(),
    trace: cleanedTrace.sort(compareEvidenceReferences),
  };
}

function filterEvidenceIds(evidenceIds: string[], validEvidenceIds: Set<string>) {
  return [...new Set(evidenceIds.filter((evidenceId) => validEvidenceIds.has(evidenceId)))];
}

function compareEvidenceReferences(
  first: EvidenceReference,
  second: EvidenceReference,
) {
  return (
    first.evidenceId.localeCompare(second.evidenceId) ||
    first.relation.localeCompare(second.relation) ||
    first.sourceId.localeCompare(second.sourceId) ||
    (first.contribution ?? "").localeCompare(second.contribution ?? "")
  );
}
