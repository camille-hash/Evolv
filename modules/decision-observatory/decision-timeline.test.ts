import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  listDecisionTimeline,
  mapDecisionTimelineRowToEvent,
  normalizeDecisionTimelineParams,
  type DecisionTimelineRow,
} from "./decision-timeline.ts";

describe("Decision Timeline", () => {
  it("requires leadId and normalizes optional filters", () => {
    assert.throws(
      () => normalizeDecisionTimelineParams({ leadId: "" }),
      /leadId e obrigatorio/,
    );

    const normalized = normalizeDecisionTimelineParams({
      dateFrom: "2026-06-29T09:30",
      dateTo: "2026-06-30T10:00",
      leadId: "lead-1",
      limit: "999",
      modelId: "DM-001",
      modelVersion: "0.1.0-i1",
    });

    assert.equal(normalized.leadId, "lead-1");
    assert.equal(normalized.limit, 200);
    assert.equal(normalized.modelId, "DM-001");
    assert.equal(normalized.modelVersion, "0.1.0-i1");
    assert.match(normalized.dateFrom ?? "", /^2026-06-29T/);
    assert.match(normalized.dateTo ?? "", /^2026-06-30T/);
  });

  it("lists persisted outputs chronologically with read-only filters", async () => {
    const { state, supabase } = createTimelineSupabaseDouble([
      buildRow("output-1", "2026-06-29T12:00:00.000Z"),
      buildRow("output-2", "2026-06-30T12:00:00.000Z"),
    ]);

    const response = await listDecisionTimeline(supabase, {
      dateFrom: "2026-06-29T00:00:00.000Z",
      dateTo: "2026-06-30T23:59:59.000Z",
      leadId: "lead-1",
      limit: "25",
      modelId: "DM-001",
      modelVersion: "0.1.0-i1",
    });

    assert.equal(response.events.length, 2);
    assert.deepEqual(
      response.events.map((event) => event.id),
      ["output-1", "output-2"],
    );
    assert.equal(state.table, "decision_model_outputs");
    assert.equal(state.writeAttempted, false);
    assert.deepEqual(state.filters, [
      { column: "lead_id", operator: "eq", value: "lead-1" },
      { column: "model_id", operator: "eq", value: "DM-001" },
      { column: "model_version", operator: "eq", value: "0.1.0-i1" },
      {
        column: "created_at",
        operator: "gte",
        value: "2026-06-29T00:00:00.000Z",
      },
      {
        column: "created_at",
        operator: "lte",
        value: "2026-06-30T23:59:59.000Z",
      },
    ]);
    assert.deepEqual(state.orderBy, {
      ascending: true,
      column: "created_at",
    });
    assert.equal(state.limit, 25);
  });

  it("maps rows to stable timeline events without recalculation", () => {
    const event = mapDecisionTimelineRowToEvent({
      ...buildRow("output-1", "2026-06-29T12:00:00.000Z"),
      attention_score: "7",
      confidence: "HIGH",
      rationale: {
        decisionReason: "A decisao foi gerada por sinais persistidos.",
      },
    });

    assert.equal(event.id, "output-1");
    assert.equal(event.score, "7");
    assert.equal(event.confidence, "HIGH");
    assert.equal(
      event.rationaleSummary,
      "A decisao foi gerada por sinais persistidos.",
    );
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

type TimelineSupabaseDoubleState = {
  filters: Array<{ column: string; operator: string; value: string }>;
  limit: number | null;
  orderBy: { ascending: boolean; column: string } | null;
  table: string | null;
  writeAttempted: boolean;
};

function createTimelineSupabaseDouble(rows: DecisionTimelineRow[]) {
  const state: TimelineSupabaseDoubleState = {
    filters: [],
    limit: null,
    orderBy: null,
    table: null,
    writeAttempted: false,
  };

  const query = {
    eq: (column: string, value: string) => {
      state.filters.push({ column, operator: "eq", value });

      return query;
    },
    gte: (column: string, value: string) => {
      state.filters.push({ column, operator: "gte", value });

      return query;
    },
    limit: async (count: number) => {
      state.limit = count;

      return {
        data: rows,
        error: null,
      };
    },
    lte: (column: string, value: string) => {
      state.filters.push({ column, operator: "lte", value });

      return query;
    },
    order: (column: string, options: { ascending: boolean }) => {
      state.orderBy = { ascending: options.ascending, column };

      return query;
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
    } as Parameters<typeof listDecisionTimeline>[0],
  };
}

function buildRow(id: string, createdAt: string): DecisionTimelineRow {
  return {
    attention_score: 6,
    confidence: "MEDIUM",
    created_at: createdAt,
    decision: "ACT_NOW",
    id,
    lead_id: "lead-1",
    model_id: "DM-001",
    model_version: "0.1.0-i1",
    rationale: {
      decisionReason: "Sinais comerciais positivos.",
    },
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
