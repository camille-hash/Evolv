import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { replayDecisionOutput } from "./decision-replay-engine.ts";
import type {
  ReplayOriginalOutput,
  ReplayOutput,
  ReplayRuntimeAdapter,
} from "./decision-replay.types.ts";

describe("Decision Replay Engine", () => {
  it("returns MATCH when replay output is equivalent to the original", async () => {
    const originalOutput = buildOriginalOutput();
    const report = await replayDecisionOutput({
      now: createClock(),
      originalOutput,
      runtimeAdapter: createRuntimeAdapter({
        ...buildReplayOutput(),
        metadata: originalOutput.metadata,
      }),
    });

    assert.equal(report.status, "MATCH");
    assert.equal(report.comparison?.summary.hasChanges, false);
    assert.equal(report.replayOutput?.id, "replay:output-1");
  });

  it("returns DIVERGENCE when replay output differs from the original", async () => {
    const report = await replayDecisionOutput({
      now: createClock(),
      originalOutput: buildOriginalOutput(),
      runtimeAdapter: createRuntimeAdapter({
        ...buildReplayOutput(),
        decision: "WAIT",
        score: 4,
      }),
    });

    assert.equal(report.status, "DIVERGENCE");
    assert.equal(report.comparison?.summary.decisionChanged, true);
    assert.equal(report.comparison?.summary.scoreDelta, -3);
  });

  it("returns FAILED when original replay context is missing", async () => {
    const report = await replayDecisionOutput({
      now: createClock(),
      originalOutput: {
        ...buildOriginalOutput(),
        output: {},
      },
      runtimeAdapter: createRuntimeAdapter(buildReplayOutput()),
    });

    assert.equal(report.status, "FAILED");
    assert.equal(report.errors[0]?.code, "ORIGINAL_CONTEXT_MISSING");
    assert.equal(report.comparison, null);
    assert.equal(report.replayOutput, null);
  });

  it("returns FAILED when replay runtime adapter fails", async () => {
    const report = await replayDecisionOutput({
      now: createClock(),
      originalOutput: buildOriginalOutput(),
      runtimeAdapter: {
        async executeReplay() {
          return {
            error: {
              code: "MODEL_UNAVAILABLE",
              message: "Modelo indisponivel para replay.",
            },
            ok: false,
          };
        },
      },
    });

    assert.equal(report.status, "FAILED");
    assert.equal(report.errors[0]?.code, "MODEL_UNAVAILABLE");
  });
});

function createRuntimeAdapter(output: ReplayOutput): ReplayRuntimeAdapter {
  return {
    async executeReplay(input) {
      assert.equal(input.modelId, "DM-001");
      assert.equal(input.modelVersion, "0.1.0-i1");
      assert.equal(input.originalOutputId, "output-1");

      return {
        ok: true,
        output,
      };
    },
  };
}

function buildOriginalOutput(): ReplayOriginalOutput {
  return {
    confidence: "HIGH",
    createdAt: "2026-06-29T12:00:00.000Z",
    decision: "ACT_NOW",
    evidenceTrace: ["ev-1"],
    generatedAt: "2026-06-29T12:00:00.000Z",
    id: "output-1",
    metadata: { signalCount: 1 },
    modelId: "DM-001",
    modelVersion: "0.1.0-i1",
    output: {
      replayInput: buildReplayInput(),
    },
    rationale: { decisionReason: "Atuar agora." },
    recommendedAction: "Atuar",
    score: 7,
    scoreContributors: ["ev-1"],
  };
}

function buildReplayOutput(): ReplayOutput {
  return {
    confidence: "HIGH",
    decision: "ACT_NOW",
    evidenceTrace: ["ev-1"],
    generatedAt: "2026-06-29T12:00:00.000Z",
    id: "replay:output-1",
    metadata: { signalCount: 1 },
    modelId: "DM-001",
    modelVersion: "0.1.0-i1",
    output: null,
    rationale: { decisionReason: "Atuar agora." },
    recommendedAction: "Atuar",
    score: 7,
    scoreContributors: ["ev-1"],
  };
}

function buildReplayInput() {
  return {
    decisionContext: {},
    leadId: "lead-1",
    organizationId: "org-1",
  };
}

function createClock() {
  const values = [
    "2026-06-29T12:00:00.000Z",
    "2026-06-29T12:00:01.000Z",
    "2026-06-29T12:00:02.000Z",
  ];

  return () => values.shift() ?? "2026-06-29T12:00:03.000Z";
}
