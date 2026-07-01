import { compareDecisionOutputs } from "./decision-comparison-engine.ts";
import type { DecisionComparableOutput } from "./decision-comparison-engine.types.ts";
import type {
  DecisionReplayError,
  ReplayOriginalOutput,
  ReplayOutput,
  ReplayReport,
  ReplayRuntimeAdapter,
} from "./decision-replay.types.ts";

export async function replayDecisionOutput({
  now = () => new Date().toISOString(),
  originalOutput,
  runtimeAdapter,
}: {
  now?: () => string;
  originalOutput: ReplayOriginalOutput;
  runtimeAdapter: ReplayRuntimeAdapter;
}): Promise<ReplayReport> {
  const startedAt = now();
  const replayInput = extractOriginalDecisionContext(originalOutput);
  const sessionBase = {
    currentOutputId: originalOutput.id,
    modelId: originalOutput.modelId,
    modelVersion: originalOutput.modelVersion,
    sessionId: `replay:${originalOutput.id}:${startedAt}`,
    startedAt,
  };

  if (!replayInput) {
    return buildFailedReport({
      completedAt: now(),
      error: {
        code: "ORIGINAL_CONTEXT_MISSING",
        message: "Contexto original indisponivel no Decision Output persistido.",
      },
      originalOutput,
      sessionBase,
    });
  }

  const replayResult = await runtimeAdapter.executeReplay({
    input: replayInput,
    modelId: originalOutput.modelId,
    modelVersion: originalOutput.modelVersion,
    originalOutputId: originalOutput.id,
  });

  if (!replayResult.ok) {
    return buildFailedReport({
      completedAt: now(),
      error: replayResult.error,
      originalOutput,
      sessionBase,
    });
  }

  const comparison = compareDecisionOutputs(
    toComparableOutput(originalOutput),
    toComparableOutput(replayResult.output),
  );
  const status = comparison.summary.hasChanges ? "DIVERGENCE" : "MATCH";

  return {
    comparison,
    errors: [],
    executiveSummary:
      status === "MATCH"
        ? "Replay reproduziu o Decision Output original."
        : "Replay executou, mas encontrou divergencias estruturais.",
    originalOutput,
    replayOutput: replayResult.output,
    session: {
      ...sessionBase,
      completedAt: now(),
      replayedOutputId: replayResult.output.id,
    },
    status,
  };
}

function buildFailedReport({
  completedAt,
  error,
  originalOutput,
  sessionBase,
}: {
  completedAt: string;
  error: DecisionReplayError;
  originalOutput: ReplayOriginalOutput;
  sessionBase: {
    currentOutputId: string;
    modelId: string;
    modelVersion: string | null;
    sessionId: string;
    startedAt: string;
  };
}): ReplayReport {
  return {
    comparison: null,
    errors: [error],
    executiveSummary: error.message,
    originalOutput,
    replayOutput: null,
    session: {
      ...sessionBase,
      completedAt,
    },
    status: "FAILED",
  };
}

function extractOriginalDecisionContext(
  originalOutput: ReplayOriginalOutput,
): Record<string, unknown> | null {
  const candidates = [
    originalOutput.output?.replayInput,
    originalOutput.output?.decisionInput,
    originalOutput.output?.input,
    originalOutput.metadata?.replayInput,
    originalOutput.metadata?.decisionInput,
    originalOutput.metadata?.input,
  ];

  for (const candidate of candidates) {
    if (isReplayInput(candidate)) {
      return candidate;
    }
  }

  return null;
}

function isReplayInput(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value && typeof value === "object" && !Array.isArray(value)) &&
    typeof (value as Record<string, unknown>).leadId === "string" &&
    typeof (value as Record<string, unknown>).organizationId === "string" &&
    Boolean((value as Record<string, unknown>).decisionContext)
  );
}

function toComparableOutput(
  output: ReplayOriginalOutput | ReplayOutput,
): DecisionComparableOutput {
  return {
    confidence: output.confidence,
    decision: output.decision,
    evidenceTrace: output.evidenceTrace,
    id: output.id,
    metadata: output.metadata,
    modelId: output.modelId,
    modelVersion: output.modelVersion,
    output: output.output,
    rationale: output.rationale,
    recommendedAction: output.recommendedAction,
    score: output.score,
    scoreContributors: output.scoreContributors,
  };
}
