import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  comparePersistedDecisionOutputs,
  mapDecisionDiffRowToComparableOutput,
  type DecisionDiffRow,
} from "./decision-diff-service.ts";

describe("Decision Diff Service", () => {
  it("reads two persisted outputs and compares them without writing", async () => {
    const { state, supabase } = createDiffSupabaseDouble({
      current: buildRow("current-output", 7, "ACT_NOW"),
      previous: buildRow("previous-output", 4, "WAIT"),
    });

    const result = await comparePersistedDecisionOutputs(supabase, {
      currentOutputId: "current-output",
      previousOutputId: "previous-output",
    });

    assert.equal(result.ok, true);
    assert.equal(state.writeAttempted, false);
    assert.deepEqual(state.filters, [
      { column: "id", value: "previous-output" },
      { column: "id", value: "current-output" },
    ]);

    if (result.ok) {
      assert.equal(result.response.comparison.summary.scoreDelta, 3);
      assert.equal(result.response.comparison.summary.decisionChanged, true);
    }
  });

  it("returns not found when RLS or ID lookup hides one output", async () => {
    const { state, supabase } = createDiffSupabaseDouble({
      current: null,
      previous: buildRow("previous-output", 4, "WAIT"),
    });

    const result = await comparePersistedDecisionOutputs(supabase, {
      currentOutputId: "current-output",
      previousOutputId: "previous-output",
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 404);
    assert.equal(state.writeAttempted, false);
  });

  it("maps persisted rows into comparable outputs", () => {
    const output = mapDecisionDiffRowToComparableOutput(
      buildRow("output-1", "6", "ACT_NOW"),
    );

    assert.equal(output.id, "output-1");
    assert.equal(output.modelId, "DM-001");
    assert.equal(output.score, "6");
    assert.deepEqual(output.evidenceTrace, ["ev-1"]);
  });

  it("keeps Decision Observatory free from execution and recalculation imports", () => {
    const files = listTypescriptFiles(
      path.resolve("modules", "decision-observatory"),
    ).filter((file) => !file.endsWith(".test.ts"));

    for (const file of files) {
      const content = readFileSync(file, "utf8");

      assert.equal(
        content.includes("executeCommercialAttentionAllocation"),
        false,
        `${file} must not execute DM-001.`,
      );
      assert.equal(
        content.includes("recalculateDm001"),
        false,
        `${file} must not import recalculation.`,
      );
      assert.equal(
        content.includes("decision-context-assembler"),
        false,
        `${file} must not assemble Decision Context.`,
      );
      assert.equal(
        content.includes("server-execution-service"),
        false,
        `${file} must not call runtime execution.`,
      );
    }
  });
});

function createDiffSupabaseDouble(rows: {
  current: DecisionDiffRow | null;
  previous: DecisionDiffRow | null;
}) {
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
                data:
                  state.filters.at(-1)?.value === "previous-output"
                    ? rows.previous
                    : rows.current,
                error: null,
              }),
            };

            return filterBuilder;
          },
        };
      },
    } as Parameters<typeof comparePersistedDecisionOutputs>[0],
  };
}

function buildRow(
  id: string,
  score: number | string,
  decision: string,
): DecisionDiffRow {
  return {
    attention_score: score,
    confidence: "MEDIUM",
    created_at: "2026-06-29T12:00:00.000Z",
    decision,
    evidence_trace: ["ev-1"],
    generated_at: "2026-06-29T12:00:00.000Z",
    id,
    metadata: { trigger: "manual_recalculation" },
    model_id: "DM-001",
    model_version: "0.1.0-i1",
    output: { decision },
    rationale: { decisionReason: "Sinais comerciais persistidos." },
    recommended_action: "Atuar",
    score_contributors: [{ evidenceId: "ev-1" }],
  };
}

function listTypescriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);

    if (statSync(fullPath).isDirectory()) {
      return listTypescriptFiles(fullPath);
    }

    return fullPath.endsWith(".ts") ? [fullPath] : [];
  });
}
