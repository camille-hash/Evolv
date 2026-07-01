import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  listDecisionOutputs,
  mapDecisionOutputIndexRowToItem,
  normalizeDecisionOutputIndexParams,
  type DecisionOutputIndexRow,
} from "./decision-output-index.ts";

describe("Decision Output Index", () => {
  it("normalizes filter params without executing models", () => {
    const normalized = normalizeDecisionOutputIndexParams({
      page: "0",
      pageSize: "999",
      period: "all",
      scoreMin: "10.5",
      sortBy: "score",
      sortDirection: "asc",
    });

    assert.equal(normalized.page, 1);
    assert.equal(normalized.pageSize, 100);
    assert.equal(normalized.period, "all");
    assert.equal(normalized.scoreMin, 10.5);
    assert.equal(normalized.sortBy, "score");
    assert.equal(normalized.sortDirection, "asc");
  });

  it("applies read-only filters, ordering and pagination", async () => {
    const { state, supabase } = createIndexSupabaseDouble([buildRow()]);

    const response = await listDecisionOutputs(supabase, {
      dateFrom: "2026-06-29T00:00:00.000Z",
      dateTo: "2026-06-30T00:00:00.000Z",
      leadQuery: "11111111-1111-4111-8111-111111111111",
      modelId: "DM-001",
      modelVersion: "0.1.0-i1",
      page: "2",
      pageSize: "10",
      period: "custom",
      scoreMin: "1",
      scoreMax: "10",
      sortBy: "score",
      sortDirection: "asc",
    });

    assert.equal(response.items.length, 1);
    assert.equal(state.table, "decision_model_outputs");
    assert.equal(state.writeAttempted, false);
    assert.deepEqual(state.filters, [
      { column: "model_id", operator: "eq", value: "DM-001" },
      { column: "model_version", operator: "eq", value: "0.1.0-i1" },
      {
        column: "lead_id",
        operator: "eq",
        value: "11111111-1111-4111-8111-111111111111",
      },
      {
        column: "created_at",
        operator: "gte",
        value: "2026-06-29T00:00:00.000Z",
      },
      {
        column: "created_at",
        operator: "lte",
        value: "2026-06-30T00:00:00.000Z",
      },
      { column: "attention_score", operator: "gte", value: 1 },
      { column: "attention_score", operator: "lte", value: 10 },
    ]);
    assert.deepEqual(state.orderBy, {
      ascending: true,
      column: "attention_score",
    });
    assert.deepEqual(state.range, { from: 10, to: 19 });
  });

  it("maps persisted rows to index items without recalculation", () => {
    const item = mapDecisionOutputIndexRowToItem({
      ...buildRow(),
      confidence: "HIGH",
      metadata: {
        recalculation: {
          reason: "note_created",
        },
        runtimeVersion: "0.1.0-i5",
        status: "persisted",
      },
    });

    assert.equal(item.confidence, 100);
    assert.equal(item.modelId, "DM-001");
    assert.equal(item.runtimeVersion, "0.1.0-i5");
    assert.equal(item.status, "persisted");
    assert.equal(item.trigger, "note_created");
    assert.equal(item.rationalePreview, "Sinais comerciais positivos.");
  });

  it("does not import execution, recalculation or context assembly modules", () => {
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

type IndexSupabaseDoubleState = {
  filters: Array<{ column: string; operator: string; value: number | string }>;
  orderBy: { ascending: boolean; column: string } | null;
  range: { from: number; to: number } | null;
  table: string | null;
  writeAttempted: boolean;
};

function createIndexSupabaseDouble(rows: DecisionOutputIndexRow[]) {
  const state: IndexSupabaseDoubleState = {
    filters: [],
    orderBy: null,
    range: null,
    table: null,
    writeAttempted: false,
  };

  const query = {
    eq: (column: string, value: string) => {
      state.filters.push({ column, operator: "eq", value });

      return query;
    },
    gte: (column: string, value: number | string) => {
      state.filters.push({ column, operator: "gte", value });

      return query;
    },
    lte: (column: string, value: number | string) => {
      state.filters.push({ column, operator: "lte", value });

      return query;
    },
    order: (column: string, options: { ascending: boolean }) => {
      state.orderBy = { ascending: options.ascending, column };

      return query;
    },
    range: async (from: number, to: number) => {
      state.range = { from, to };

      return {
        count: rows.length,
        data: rows,
        error: null,
      };
    },
  };

  return {
    state,
    supabase: {
      from: (table: "decision_model_outputs") => {
        state.table = table;

        return {
          select: () => query,
        };
      },
    } as Parameters<typeof listDecisionOutputs>[0],
  };
}

function buildRow(): DecisionOutputIndexRow {
  return {
    attention_score: 6,
    confidence: "MEDIUM",
    created_at: "2026-06-29T12:01:00.000Z",
    decision: "ACT_NOW",
    generated_at: "2026-06-29T12:00:00.000Z",
    id: "decision-output-1",
    lead_id: "11111111-1111-4111-8111-111111111111",
    metadata: null,
    model_id: "DM-001",
    model_version: "0.1.0-i1",
    organization_id: "org-1",
    rationale: {
      decisionReason: "Sinais comerciais positivos.",
    },
    recommended_action: "Atuar agora",
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
