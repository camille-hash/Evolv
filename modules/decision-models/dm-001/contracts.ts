export type Dm001Decision =
  | "ACT_NOW"
  | "NURTURE"
  | "INVESTIGATE"
  | "WAIT"
  | "DISENGAGE";

export type Dm001Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type Dm001CalibrationStatus = "INITIAL_DEFAULTS" | "CALIBRATED";

export type Dm001DecisionContextCategory =
  | "engagement"
  | "continuity"
  | "operationalReadiness"
  | "productFit"
  | "timing"
  | "confidence";

export type Dm001EvidenceReference = {
  evidenceId: string;
  source: string;
  sourceId?: string;
  occurredAt?: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

export type Dm001EvidenceGroup = {
  positive?: Dm001EvidenceReference[];
  negative?: Dm001EvidenceReference[];
  missing?: Dm001EvidenceReference[];
  blocking?: Dm001EvidenceReference[];
  nonBlocking?: Dm001EvidenceReference[];
  conflicts?: Dm001EvidenceReference[];
  deferred?: Dm001EvidenceReference[];
  insufficientKnowledge?: Dm001EvidenceReference[];
};

export type Dm001DecisionContext = Record<
  Dm001DecisionContextCategory,
  Dm001EvidenceGroup
>;

export type Dm001Input = {
  leadId: string;
  organizationId: string;
  generatedAt?: string;
  decisionContext: Dm001DecisionContext;
  metadata?: Record<string, unknown>;
};

export type Dm001NormalizedSignalType =
  | "positive"
  | "negative"
  | "missing"
  | "blocking"
  | "nonBlocking"
  | "conflict"
  | "deferred"
  | "insufficientKnowledge";

export type Dm001NormalizedSignal = {
  category: Dm001DecisionContextCategory;
  signalType: Dm001NormalizedSignalType;
  evidence: Dm001EvidenceReference;
};

export type Dm001ScoreContributor = {
  category: Dm001DecisionContextCategory;
  signalType: Dm001NormalizedSignalType;
  evidenceId: string;
  value: number;
  reason: string;
};

export type Dm001ScoreResult = {
  attentionScore: number;
  contributors: Dm001ScoreContributor[];
};

export type Dm001ConfidenceResult = {
  confidence: Dm001Confidence;
  boosters: string[];
  reducers: string[];
};

export type Dm001Rationale = {
  evidenceUsed: string[];
  confidenceBoosters: string[];
  confidenceReducers: string[];
  blockingConditions: string[];
  nonBlockingConditions: string[];
  decisionReason: string;
  unresolvedQuestions: string[];
};

export type Dm001ExecutionMetadata = {
  calibrationStatus: Dm001CalibrationStatus;
  recalculation?: Dm001RecalculationMetadata;
  signalCount: number;
  positiveSignalCount: number;
  negativeSignalCount: number;
  missingSignalCount: number;
  blockingConditionCount: number;
  conflictCount: number;
  deferredTimingSignalCount: number;
  insufficientKnowledgeCount: number;
};

export type Dm001RecalculationMetadata = {
  reason: string;
  requestedAt: string;
};

export type CommercialAttentionDecision = {
  modelId: "DM-001";
  modelName: "Commercial Attention Allocation";
  modelVersion: string;
  decision: Dm001Decision;
  recommendedAction: string;
  attentionScore: number | null;
  confidence: Dm001Confidence;
  rationale: Dm001Rationale;
  signals: Dm001NormalizedSignal[];
  evidenceTrace: string[];
  scoreContributors: Dm001ScoreContributor[];
  calibrationStatus: Dm001CalibrationStatus;
  generatedAt: string;
  metadata: Dm001ExecutionMetadata;
};
