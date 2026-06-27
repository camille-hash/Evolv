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
  evidenceId: string;
  metadata?: Record<string, unknown>;
  observedAt?: string;
  source: CognitiveSource;
};

export type EvidenceSet = CognitiveArtifact<{
  evidence: Evidence[];
}>;

export type SituationContext = CognitiveArtifact<{
  evidenceSet: EvidenceSet;
  normalizedContext: NormalizedContext;
  signals: Record<string, unknown>[];
}>;

export type ExecutiveSituation = CognitiveArtifact<{
  gaps: string[];
  highlights: string[];
  risks: string[];
  summaryLines: string[];
}>;
