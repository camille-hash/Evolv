import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  inspectDecisionOutputById,
  mapDecisionOutputRowToInspection,
  type DecisionOutputRow,
} from "./decision-output-inspector.ts";

describe("Decision Output Inspector", () => {
  it("maps a persisted output row into an inspection view", () => {
    const inspection = mapDecisionOutputRowToInspection(buildRow());

    assert.equal(inspection.id, "decision-output-1");
    assert.equal(inspection.modelId, "DM-001");
    assert.equal(inspection.modelVersion, "0.1.0-i1");
    assert.equal(inspection.attentionScore, 6);
    assert.equal(inspection.confidence, "HIGH");
    assert.deepEqual(inspection.evidenceTrace, ["ev-1", "ev-2"]);
    assert.equal(inspection.decisionContextSummary?.totalSignals, 2);
    assert.equal(inspection.decisionContextSummary?.categories.engagement, 1);
    assert.equal(inspection.decisionContextSummary?.signalTypes.positive, 2);
  });

  it("reads a Decision Output by ID without writing", async () => {
    const supabase = createReadOnlySupabaseDouble(buildRow());
    const result = await inspectDecisionOutputById(
      supabase,
      "decision-output-1",
    );

    assert.equal(result.ok, true);
    assert.equal(supabase.selectedColumns?.includes("output"), true);
    assert.deepEqual(supabase.filters, [{ column: "id", value: "decision-output-1" }]);
    assert.equal(supabase.writeAttempted, false);
  });

  it("returns not found when RLS or ID lookup hides the row", async () => {
    const supabase = createReadOnlySupabaseDouble(null);
    const result = await inspectDecisionOutputById(
      supabase,
      "decision-output-1",
    );

    assert.equal(result.ok, false);
    assert.equal(result.status, 404);
    assert.equal(supabase.writeAttempted, false);
  });

  it("does not import or call Decision Model execution modules", () => {
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
    }
  });
});

function createReadOnlySupabaseDouble(row: DecisionOutputRow | null) {
  return {
    filters: [] as Array<{ column: string; value: string }>,
    selectedColumns: null as string | null,
    writeAttempted: false,
    from(table: "decision_model_outputs") {
      assert.equal(table, "decision_model_outputs");

      return {
        select: (columns: string) => {
          this.selectedColumns = columns;
          const filterBuilder = {
            eq: (column: string, value: string) => {
              this.filters.push({ column, value });

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
  };
}

function buildRow(): DecisionOutputRow {
  return {
    attention_score: "6",
    calibration_status: "INITIAL_DEFAULTS",
    confidence: "HIGH",
    created_at: "2026-06-29T12:01:00.000Z",
    decision: "ACT_NOW",
    evidence_trace: ["ev-1", "ev-2"],
    generated_at: "2026-06-29T12:00:00.000Z",
    id: "decision-output-1",
    lead_id: "lead-1",
    metadata: {
      signalCount: 2,
    },
    model_id: "DM-001",
    model_name: "Commercial Attention Allocation",
    model_version: "0.1.0-i1",
    organization_id: "org-1",
    output: {
      decision: "ACT_NOW",
    },
    rationale: {
      decisionReason: "Sinais comerciais positivos.",
    },
    recommended_action: "Atuar agora",
    score_contributors: [{ evidenceId: "ev-1", value: 3 }],
    signals: [
      {
        category: "engagement",
        evidence: {
          evidenceId: "ev-1",
        },
        signalType: "positive",
      },
      {
        category: "timing",
        evidence: {
          evidenceId: "ev-2",
        },
        signalType: "positive",
      },
    ],
    updated_at: "2026-06-29T12:01:00.000Z",
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
