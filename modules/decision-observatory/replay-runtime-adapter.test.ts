import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createReplayRuntimeAdapter } from "./replay-runtime-adapter.ts";

describe("Replay Runtime Adapter", () => {
  it("executes a registered model in replay mode without persistence", async () => {
    const adapter = createReplayRuntimeAdapter();
    const result = await adapter.executeReplay({
      input: buildDm001Input(),
      modelId: "DM-001",
      modelVersion: "0.1.0-i1",
      originalOutputId: "output-1",
    });

    assert.equal(result.ok, true);

    if (result.ok) {
      assert.equal(result.output.id, "replay:output-1");
      assert.equal(result.output.modelId, "DM-001");
      assert.equal(result.output.modelVersion, "0.1.0-i1");
    }
  });

  it("fails when the model is unavailable", async () => {
    const adapter = createReplayRuntimeAdapter();
    const result = await adapter.executeReplay({
      input: buildDm001Input(),
      modelId: "DM-404",
      modelVersion: "0.1.0-i1",
      originalOutputId: "output-1",
    });

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.error.code, "MODEL_UNAVAILABLE");
    }
  });

  it("fails when the requested model version is unavailable", async () => {
    const adapter = createReplayRuntimeAdapter();
    const result = await adapter.executeReplay({
      input: buildDm001Input(),
      modelId: "DM-001",
      modelVersion: "missing-version",
      originalOutputId: "output-1",
    });

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.error.code, "MODEL_VERSION_UNAVAILABLE");
    }
  });
});

function buildDm001Input() {
  const emptyGroup = {};

  return {
    generatedAt: "2026-06-29T12:00:00.000Z",
    leadId: "lead-1",
    organizationId: "org-1",
    decisionContext: {
      confidence: emptyGroup,
      continuity: emptyGroup,
      engagement: {
        positive: [
          {
            evidenceId: "ev-1",
            source: "test",
            summary: "Sinal de teste.",
          },
        ],
      },
      operationalReadiness: emptyGroup,
      productFit: emptyGroup,
      timing: emptyGroup,
    },
  };
}
