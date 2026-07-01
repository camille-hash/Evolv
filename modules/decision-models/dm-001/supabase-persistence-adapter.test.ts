import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Dm001DecisionContext, Dm001Input } from "./contracts.ts";
import type {
  CommercialAttentionDecisionOutputRecord,
} from "./persistence.ts";
import type {
  CommercialAttentionDecisionOutputRow,
  CommercialAttentionSupabaseClient,
} from "./supabase-persistence-adapter.ts";
import { createCommercialAttentionDecisionOutputRecord } from "./persistence.ts";
import { executeCommercialAttentionAllocation } from "./executor.ts";
import { SupabaseCommercialAttentionDecisionStorage } from "./supabase-persistence-adapter.ts";

type SupabaseDoubleError = {
  message: string;
};

type SupabaseDoubleResponse<T> = Promise<{
  data: T | null;
  error: SupabaseDoubleError | null;
}>;

class SupabaseDecisionModelOutputsDouble
  implements CommercialAttentionSupabaseClient
{
  readonly eqCalls: Array<{ column: string; value: string }> = [];
  readonly insertedRecords: CommercialAttentionDecisionOutputRecord[] = [];
  readonly orderCalls: Array<{
    ascending: boolean;
    column: string;
  }> = [];
  readonly selectedColumns: string[] = [];

  insertError: SupabaseDoubleError | null = null;
  latestError: SupabaseDoubleError | null = null;
  latestRow: CommercialAttentionDecisionOutputRow | null = null;

  from(table: "decision_model_outputs") {
    assert.equal(table, "decision_model_outputs");
    return new SupabaseDecisionModelOutputsTableDouble(this);
  }
}

class SupabaseDecisionModelOutputsTableDouble {
  private readonly client: SupabaseDecisionModelOutputsDouble;

  constructor(client: SupabaseDecisionModelOutputsDouble) {
    this.client = client;
  }

  insert(record: CommercialAttentionDecisionOutputRecord) {
    this.client.insertedRecords.push(record);

    return {
      select: (columns: string) => {
        this.client.selectedColumns.push(columns);

        return {
          single: (): SupabaseDoubleResponse<CommercialAttentionDecisionOutputRow> =>
            Promise.resolve({
              data: this.client.latestRow,
              error: this.client.insertError,
            }),
        };
      },
    };
  }

  select(columns: string) {
    this.client.selectedColumns.push(columns);
    return new SupabaseDecisionModelOutputsFilterDouble(this.client);
  }
}

class SupabaseDecisionModelOutputsFilterDouble {
  private readonly client: SupabaseDecisionModelOutputsDouble;

  constructor(client: SupabaseDecisionModelOutputsDouble) {
    this.client = client;
  }

  eq(column: string, value: string) {
    this.client.eqCalls.push({ column, value });
    return this;
  }

  limit(count: number) {
    assert.equal(count, 1);
    return this;
  }

  maybeSingle(): SupabaseDoubleResponse<CommercialAttentionDecisionOutputRow> {
    return Promise.resolve({
      data: this.client.latestRow,
      error: this.client.latestError,
    });
  }

  order(column: string, options: { ascending: boolean }) {
    this.client.orderCalls.push({
      ascending: options.ascending,
      column,
    });
    return this;
  }
}

function emptyContext(): Dm001DecisionContext {
  return {
    engagement: {},
    continuity: {},
    operationalReadiness: {},
    productFit: {},
    timing: {},
    confidence: {},
  };
}

function buildRecord(): CommercialAttentionDecisionOutputRecord {
  const context = emptyContext();
  context.engagement.positive = [
    {
      evidenceId: "ev-engagement",
      source: "test",
      summary: "Client responded.",
    },
  ];

  const input: Dm001Input = {
    leadId: "lead-1",
    organizationId: "org-1",
    generatedAt: "2026-06-29T12:00:00.000Z",
    decisionContext: context,
  };

  return createCommercialAttentionDecisionOutputRecord({
    decision: executeCommercialAttentionAllocation(input),
    leadId: input.leadId,
    organizationId: input.organizationId,
  });
}

function buildRow(
  record: CommercialAttentionDecisionOutputRecord,
): CommercialAttentionDecisionOutputRow {
  return {
    ...record,
    created_at: "2026-06-29T12:01:00.000Z",
    id: "decision-output-1",
  };
}

describe("SupabaseCommercialAttentionDecisionStorage", () => {
  it("inserts a serialized DM-001 output into decision_model_outputs", async () => {
    const record = buildRecord();
    const supabase = new SupabaseDecisionModelOutputsDouble();
    supabase.latestRow = buildRow(record);
    const storage = new SupabaseCommercialAttentionDecisionStorage(supabase);

    const persisted = await storage.insert(record);

    assert.equal(supabase.insertedRecords.length, 1);
    assert.deepEqual(supabase.insertedRecords[0], record);
    assert.equal(persisted.id, "decision-output-1");
    assert.equal(persisted.leadId, "lead-1");
    assert.equal(persisted.organizationId, "org-1");
    assert.equal(persisted.snapshot.modelId, "DM-001");
    assert.equal(persisted.snapshot.modelVersion, record.model_version);
    assert.equal(persisted.snapshot.decision, record.decision);
    assert.deepEqual(persisted.snapshot.output, record.output);
  });

  it("reads the latest DM-001 output by organization, lead, model and version", async () => {
    const record = buildRecord();
    const supabase = new SupabaseDecisionModelOutputsDouble();
    supabase.latestRow = buildRow(record);
    const storage = new SupabaseCommercialAttentionDecisionStorage(supabase);

    const latest = await storage.getLatestByLeadModelVersion({
      leadId: "lead-1",
      modelId: "DM-001",
      modelVersion: record.model_version,
      organizationId: "org-1",
    });

    assert.equal(latest?.id, "decision-output-1");
    assert.deepEqual(supabase.eqCalls, [
      { column: "organization_id", value: "org-1" },
      { column: "lead_id", value: "lead-1" },
      { column: "model_id", value: "DM-001" },
      { column: "model_version", value: record.model_version },
    ]);
    assert.deepEqual(supabase.orderCalls, [
      { column: "generated_at", ascending: false },
      { column: "created_at", ascending: false },
    ]);
  });

  it("returns null when there is no latest persisted output", async () => {
    const supabase = new SupabaseDecisionModelOutputsDouble();
    const storage = new SupabaseCommercialAttentionDecisionStorage(supabase);

    const latest = await storage.getLatestByLeadModelVersion({
      leadId: "lead-1",
      modelId: "DM-001",
      modelVersion: "0.1.0-i1",
      organizationId: "org-1",
    });

    assert.equal(latest, null);
  });

  it("surfaces Supabase insert and read failures without fallback recalculation", async () => {
    const record = buildRecord();
    const supabase = new SupabaseDecisionModelOutputsDouble();
    const storage = new SupabaseCommercialAttentionDecisionStorage(supabase);

    supabase.insertError = { message: "insert denied by RLS" };
    await assert.rejects(
      () => storage.insert(record),
      /insert failed: insert denied by RLS/,
    );

    supabase.latestError = { message: "read denied by RLS" };
    await assert.rejects(
      () =>
        storage.getLatestByLeadModelVersion({
          leadId: "lead-1",
          modelId: "DM-001",
          modelVersion: "0.1.0-i1",
          organizationId: "org-1",
        }),
      /latest read failed: read denied by RLS/,
    );
  });
});
