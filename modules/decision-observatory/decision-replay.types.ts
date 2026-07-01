import type { DecisionComparisonResult } from "./decision-comparison-engine.types";

export type DecisionReplayStatus = "MATCH" | "DIVERGENCE" | "FAILED";

export type DecisionReplayErrorCode =
  | "ORIGINAL_CONTEXT_MISSING"
  | "MODEL_UNAVAILABLE"
  | "MODEL_VERSION_UNAVAILABLE"
  | "REPLAY_EXECUTION_FAILED";

export type DecisionReplayError = {
  code: DecisionReplayErrorCode;
  message: string;
};

export type ReplaySession = {
  completedAt: string;
  currentOutputId: string;
  modelId: string;
  modelVersion: string | null;
  replayedOutputId?: string;
  sessionId: string;
  startedAt: string;
};

export type ReplayRuntimeInput = {
  input: Record<string, unknown>;
  modelId: string;
  modelVersion: string | null;
  originalOutputId: string;
};

export type ReplayOutput = {
  confidence: number | string | null;
  decision: string | null;
  evidenceTrace: unknown;
  generatedAt: string | null;
  id: string;
  metadata: Record<string, unknown> | null;
  modelId: string;
  modelVersion: string | null;
  output: Record<string, unknown> | null;
  rationale: Record<string, unknown> | null;
  recommendedAction: string | null;
  score: number | string | null;
  scoreContributors: unknown;
};

export type ReplayRuntimeResult =
  | {
      ok: true;
      output: ReplayOutput;
    }
  | {
      error: DecisionReplayError;
      ok: false;
    };

export type ReplayRuntimeAdapter = {
  executeReplay(input: ReplayRuntimeInput): Promise<ReplayRuntimeResult>;
};

export type ReplayOriginalOutput = ReplayOutput & {
  createdAt: string;
};

export type ReplayReport = {
  comparison: DecisionComparisonResult | null;
  errors: DecisionReplayError[];
  executiveSummary: string;
  originalOutput: ReplayOriginalOutput;
  replayOutput: ReplayOutput | null;
  session: ReplaySession;
  status: DecisionReplayStatus;
};
