export type DecisionComparableOutput = {
  confidence: string | number | null;
  createdAt?: string | null;
  decision: string | null;
  evidenceTrace?: unknown;
  generatedAt?: string | null;
  id: string;
  metadata?: Record<string, unknown> | null;
  modelId: string;
  modelVersion: string | null;
  output?: Record<string, unknown> | null;
  rationale?: Record<string, unknown> | null;
  recommendedAction?: string | null;
  score: string | number | null;
  scoreContributors?: unknown;
};

export type DecisionComparisonChange = {
  changed: boolean;
  current: unknown;
  field: string;
  previous: unknown;
};

export type DecisionComparisonCollectionDiff = {
  added: string[];
  currentCount: number;
  previousCount: number;
  removed: string[];
  unchanged: string[];
};

export type DecisionComparisonResult = {
  contributors: DecisionComparisonCollectionDiff;
  core: DecisionComparisonChange[];
  currentOutputId: string;
  evidence: DecisionComparisonCollectionDiff;
  metadata: DecisionComparisonChange[];
  previousOutputId: string;
  rationale: DecisionComparisonChange[];
  summary: {
    confidenceChanged: boolean;
    decisionChanged: boolean;
    hasChanges: boolean;
    modelChanged: boolean;
    scoreChanged: boolean;
    scoreDelta: number | null;
  };
};
