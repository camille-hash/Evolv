import type {
  ConflictSeverity,
  EvidencePolarity,
  EvidenceRelevance,
  EvidenceSource,
  EvidenceType,
  OpportunityType,
  RiskSeverity,
  AttentionLevel,
  SituationMomentum,
  SituationPriority,
  SituationState,
} from "../types";

export type CognitiveArtifactType =
  | "collected_context"
  | "normalized_context"
  | "evidence_set"
  | "situation_context"
  | "executive_situation"
  | (string & {});

export type CognitiveConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type SourceAvailability =
  | "available"
  | "empty"
  | "unavailable";

export type CognitiveSource = {
  availability: SourceAvailability;
  label: string;
  metadata?: Record<string, unknown>;
  sourceId: string;
  sourceType: string;
};

export type CognitiveArtifact<TPayload = Record<string, unknown>> = {
  artifactType: CognitiveArtifactType;
  confidence: CognitiveConfidence;
  generatedAt: string;
  id: string;
  leadId: string;
  metadata?: Record<string, unknown>;
  organizationId: string;
  payload: TPayload;
  pipelineVersion: string;
  sourceOperators: string[];
};

export type OperationalContext = {
  actorId?: string | null;
  data?: Record<string, unknown>;
  generatedAt: string;
  leadId: string;
  metadata?: Record<string, unknown>;
  organizationId: string;
  pipelineVersion: string;
  requestId?: string;
  sources?: CognitiveSource[];
};

export type CognitiveOperator<I, O> = {
  description?: string;
  execute: (input: I, context?: OperationalContext) => O | Promise<O>;
  id: string;
  version: string;
};

export type CollectedContext = CognitiveArtifact<{
  rawContext: OperationalContext;
  records: Record<string, unknown>[];
  sources: CognitiveSource[];
  stats: {
    availableSources: number;
    emptySources: number;
    evidenceCandidates: number;
    totalSources: number;
    unavailableSources: number;
  };
}>;

export type NormalizedContext = CognitiveArtifact<{
  records: NormalizedRecord[];
  sourceMap: Record<string, string[]>;
  sources: CognitiveSource[];
  stats: {
    inputRecords: number;
    normalizedRecords: number;
    sources: number;
  };
}>;

export type NormalizedRecord = {
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
  occurredAt?: string;
  source: string;
  sourceId?: string;
};

export type Evidence = {
  confidence: CognitiveConfidence;
  content: Record<string, unknown>;
  description?: string;
  evidenceId: string;
  evidenceType: EvidenceType;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
  polarity: EvidencePolarity;
  relevance: EvidenceRelevance;
  source: EvidenceSource;
  sourceId?: string;
  tags: string[];
  title: string;
};

export type EvidenceSet = CognitiveArtifact<{
  evidence: Evidence[];
  groups: {
    byPolarity: Record<string, number>;
    byRelevance: Record<string, number>;
    bySource: Record<string, number>;
    byType: Record<string, number>;
  };
  statistics: {
    attentionRequired: number;
    missing: number;
    negative: number;
    neutral: number;
    positive: number;
    total: number;
  };
}>;

export type SituationContext = CognitiveArtifact<{
  evidenceSet: EvidenceSet;
  evidenceCoverage: EvidenceCoverage;
  momentum: SituationMomentum;
  opportunities: SituationOpportunity[];
  patterns: SituationPattern[];
  risks: SituationRisk[];
  state: SituationState;
  unresolvedConflicts: SituationConflict[];
}>;

export type SituationPattern = {
  description: string;
  evidenceIds: string[];
  patternId: string;
  state: SituationState;
};

export type SituationRisk = {
  description: string;
  evidenceIds: string[];
  riskId: string;
  severity: RiskSeverity;
};

export type SituationOpportunity = {
  description: string;
  evidenceIds: string[];
  opportunityId: string;
  opportunityType: OpportunityType;
};

export type SituationConflict = {
  conflictId: string;
  description: string;
  evidenceIds: string[];
  severity: ConflictSeverity;
};

export type EvidenceCoverage = {
  available: number;
  consumed: string[];
  ignored: string[];
};

export type ExecutiveSituation = CognitiveArtifact<{
  currentState: SituationState;
  evidenceTrace: EvidenceReference[];
  momentum: SituationMomentum;
  narrative: SituationNarrative;
  opportunities: SituationOpportunity[];
  priority: SituationPriority;
  recommendedAttention: RecommendedAttention;
  risks: SituationRisk[];
}>;

export type RecommendedAttention = {
  evidenceIds: string[];
  level: AttentionLevel;
  reason: string;
};

export type SituationNarrative = {
  evidenceIds: string[];
  summary: string;
};

export type EvidenceReference = {
  contribution?:
    | "state"
    | "priority"
    | "momentum"
    | "risk"
    | "opportunity"
    | "recommendation"
    | "narrative";
  evidenceId: string;
  relation:
    | "pattern"
    | "risk"
    | "opportunity"
    | "conflict";
  sourceId: string;
};

export type TraceAssemblyInput = {
  evidenceSet: EvidenceSet;
  executiveSituation: ExecutiveSituation;
  situationContext: SituationContext;
};
