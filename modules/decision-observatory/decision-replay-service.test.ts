import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mapDecisionReplayRowToOriginalOutput,
  runDecisionReplay,
  type DecisionReplayRow,
} from "./decision-replay-service.ts";
import type { ReplayRuntimeAdapter } from "./decision-replay.types.ts";

describe("Decision Replay Service", () => {
  it("loads a persisted output and returns a replay report without writing", async () => {
    const { state, supabase } = createReplaySupabaseDouble(buildRow());
    const result = await runDecisionReplay(supabase, {
      now: createClock(),
      outputId: "output-1",
      runtimeAdapter: createRuntimeAdapter(),
    });

    assert.equal(result.ok, true);
    assert.equal(state.writeAttempted, false);
    assert.deepEqual(state.filters, [{ column: "id", value: "output-1" }]);

    if (result.ok) {
      assert.equal(result.report.status, "MATCH");
    }
  });

  it("returns not found when the persisted output is unavailable", async () => {
    const { state, supabase } = createReplaySupabaseDouble(null);
    const result = await runDecisionReplay(supabase, {
      outputId: "output-1",
      runtimeAdapter: createRuntimeAdapter(),
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 404);
    assert.equal(state.writeAttempted, false);
  });

  it("maps persisted row to replay original output", () => {
    const original = mapDecisionReplayRowToOriginalOutput(buildRow());

    assert.equal(original.id, "output-1");
    assert.equal(original.modelId, "DM-001");
    assert.equal(original.metadata?.signalCount, 1);
    assert.deepEqual(original.evidenceTrace, ["ev-1"]);
  });
});

function createReplaySupabaseDouble(row: DecisionReplayRow | null) {
  const state = {
    filters: [] as Array<{ column: string; value: string }>,
    writeAttempted: false,
  };

  return {
    state,
    supabase: {
      from: (table: "decision_model_outputs") => {
        assert.equal(table, "decision_model_outputs");

        return {
          select: () => {
            const filterBuilder = {
              eq: (column: string, value: string) => {
                state.filters.push({ column, value });

                return filterBuilder;
              },
              maybeSingle: async () => ({
                data: row,
                error: null,
              }),
            };

            return filterBuilder;
          },
        };
      },
    } as Parameters<typeof runDecisionReplay>[0],
  };
}

function createRuntimeAdapter(): ReplayRuntimeAdapter {
  return {
    async executeReplay() {
      return {
        ok: true,
        output: {
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
        },
      };
    },
  };
}

function buildRow(): DecisionReplayRow {
  return {
    attention_score: 7,
    confidence: "HIGH",
    created_at: "2026-06-29T12:00:00.000Z",
    decision: "ACT_NOW",
    evidence_trace: ["ev-1"],
    generated_at: "2026-06-29T12:00:00.000Z",
    id: "output-1",
    metadata: { signalCount: 1 },
    model_id: "DM-001",
    model_version: "0.1.0-i1",
    output: {
      replayInput: {
        decisionContext: {},
        leadId: "lead-1",
        organizationId: "org-1",
      },
    },
    rationale: { decisionReason: "Atuar agora." },
    recommended_action: "Atuar",
    score_contributors: ["ev-1"],
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
