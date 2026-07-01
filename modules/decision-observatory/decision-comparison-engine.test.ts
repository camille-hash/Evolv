import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compareDecisionOutputs } from "./decision-comparison-engine.ts";
import type { DecisionComparableOutput } from "./decision-comparison-engine.types.ts";

describe("Decision Comparison Engine", () => {
  it("compares core fields without recalculating decisions", () => {
    const result = compareDecisionOutputs(
      buildOutput({
        confidence: "MEDIUM",
        decision: "WAIT",
        score: 4,
      }),
      buildOutput({
        confidence: "HIGH",
        decision: "ACT_NOW",
        id: "current-output",
        score: 7,
      }),
    );

    assert.equal(result.previousOutputId, "previous-output");
    assert.equal(result.currentOutputId, "current-output");
    assert.equal(result.summary.decisionChanged, true);
    assert.equal(result.summary.confidenceChanged, true);
    assert.equal(result.summary.scoreChanged, true);
    assert.equal(result.summary.scoreDelta, 3);
    assert.equal(result.core.find((change) => change.field === "decision")?.changed, true);
  });

  it("diffs evidence and contributors as stable collections", () => {
    const result = compareDecisionOutputs(
      buildOutput({
        evidenceTrace: ["ev-1", "ev-2"],
        scoreContributors: [{ evidenceId: "ev-1" }],
      }),
      buildOutput({
        evidenceTrace: ["ev-2", "ev-3"],
        id: "current-output",
        scoreContributors: [{ evidenceId: "ev-1" }, { evidenceId: "ev-3" }],
      }),
    );

    assert.deepEqual(result.evidence.added, ["ev-3"]);
    assert.deepEqual(result.evidence.removed, ["ev-1"]);
    assert.deepEqual(result.evidence.unchanged, ["ev-2"]);
    assert.deepEqual(result.contributors.added, ["ev-3"]);
    assert.deepEqual(result.contributors.removed, []);
  });

  it("compares rationale and metadata without side effects", () => {
    const previous = buildOutput({
      metadata: { trigger: "note_created" },
      rationale: { decisionReason: "Motivo anterior." },
    });
    const current = buildOutput({
      id: "current-output",
      metadata: { trigger: "task_updated" },
      rationale: { decisionReason: "Motivo atual." },
    });

    const result = compareDecisionOutputs(previous, current);

    assert.equal(result.rationale[0]?.changed, true);
    assert.equal(result.metadata[0]?.field, "trigger");
    assert.equal(result.metadata[0]?.changed, true);
    assert.equal(previous.decision, "ACT_NOW");
    assert.equal(current.decision, "ACT_NOW");
  });
});

function buildOutput(
  override: Partial<DecisionComparableOutput> = {},
): DecisionComparableOutput {
  return {
    confidence: "MEDIUM",
    decision: "ACT_NOW",
    evidenceTrace: ["ev-1"],
    id: "previous-output",
    metadata: {},
    modelId: "DM-001",
    modelVersion: "0.1.0-i1",
    rationale: {},
    recommendedAction: "Atuar",
    score: 5,
    scoreContributors: [],
    ...override,
  };
}
