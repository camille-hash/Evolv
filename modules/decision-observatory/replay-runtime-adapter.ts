import { registerCommercialAttentionAllocation } from "../decision-models/dm-001/runtime-adapter.ts";
import { createDecisionModelRegistry } from "../decision-models/registry.ts";

import type {
  ReplayOutput,
  ReplayRuntimeAdapter,
  ReplayRuntimeInput,
  ReplayRuntimeResult,
} from "./decision-replay.types";

export function createReplayRuntimeAdapter(): ReplayRuntimeAdapter {
  const registry = createDecisionModelRegistry();
  registerCommercialAttentionAllocation(registry);

  return {
    async executeReplay(input: ReplayRuntimeInput): Promise<ReplayRuntimeResult> {
      const model = registry.get<Record<string, unknown>, Record<string, unknown>>(
        input.modelId,
      );

      if (!model) {
        return {
          error: {
            code: "MODEL_UNAVAILABLE",
            message: "Modelo indisponivel para replay.",
          },
          ok: false,
        };
      }

      if (model.modelVersion !== input.modelVersion) {
        return {
          error: {
            code: "MODEL_VERSION_UNAVAILABLE",
            message: "Versao do modelo indisponivel para replay.",
          },
          ok: false,
        };
      }

      try {
        return {
          ok: true,
          output: mapRuntimeOutputToReplayOutput(
            model.execute(input.input),
            input.originalOutputId,
          ),
        };
      } catch {
        return {
          error: {
            code: "REPLAY_EXECUTION_FAILED",
            message: "Execucao controlada de replay falhou.",
          },
          ok: false,
        };
      }
    },
  };
}

function mapRuntimeOutputToReplayOutput(
  output: Record<string, unknown>,
  originalOutputId: string,
): ReplayOutput {
  return {
    confidence: readPrimitive(output.confidence),
    decision: readString(output.decision),
    evidenceTrace: output.evidenceTrace,
    generatedAt: readString(output.generatedAt),
    id: `replay:${originalOutputId}`,
    metadata: readRecord(output.metadata),
    modelId: readString(output.modelId) ?? "unknown",
    modelVersion: readString(output.modelVersion),
    output,
    rationale: readRecord(output.rationale),
    recommendedAction: readString(output.recommendedAction),
    score: readPrimitive(output.attentionScore),
    scoreContributors: output.scoreContributors,
  };
}

function readPrimitive(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
