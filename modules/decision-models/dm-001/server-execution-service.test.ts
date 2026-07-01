import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { User as SupabaseUser } from "@supabase/supabase-js";

import type { Dm001DecisionContext, Dm001Input } from "./contracts.ts";
import type {
  CommercialAttentionDecisionOutputRecord,
  CommercialAttentionDecisionStorage,
  PersistedCommercialAttentionDecision,
} from "./persistence.ts";
import type {
  Dm001ServerRequestContext,
  Dm001ServerSupabaseClient,
} from "./server-execution-service.ts";
import { executeCommercialAttentionAllocationWithServerContext } from "./server-execution-service.ts";

type LeadValidationRow = {
  id: string;
  organization_id: string | null;
};

class Dm001LeadValidationSupabaseDouble {
  lead: LeadValidationRow | null = {
    id: "lead-1",
    organization_id: "org-1",
  };
  leadError: { message: string } | null = null;

  from(table: string) {
    assert.equal(table, "crm_leads");

    return {
      select: (columns: string) => {
        assert.equal(columns, "id, organization_id");

        return {
          eq: (column: string, value: string) => {
            assert.equal(column, "id");
            assert.equal(value, "lead-1");

            return {
              maybeSingle: <T>() =>
                Promise.resolve({
                  data: this.lead as T | null,
                  error: this.leadError,
                }),
            };
          },
        };
      },
    };
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

function buildInput(overrides: Partial<Dm001Input> = {}): Dm001Input {
  const decisionContext = emptyContext();
  decisionContext.engagement.positive = [
    {
      evidenceId: "ev-engagement",
      source: "test",
      summary: "Client replied.",
    },
  ];

  return {
    decisionContext,
    generatedAt: "2026-06-29T12:00:00.000Z",
    leadId: "lead-1",
    organizationId: "org-1",
    ...overrides,
  };
}

function createContext(
  supabase: Dm001LeadValidationSupabaseDouble,
): Dm001ServerRequestContext {
  return {
    profile: {
      id: "user-1",
      is_active: true,
      organization_id: "org-1",
      role: "admin",
    },
    supabase: supabase as unknown as Dm001ServerSupabaseClient,
    user: { id: "user-1" } as SupabaseUser,
  };
}

function createStorage(): {
  insertedRecords: CommercialAttentionDecisionOutputRecord[];
  storage: CommercialAttentionDecisionStorage;
} {
  const insertedRecords: CommercialAttentionDecisionOutputRecord[] = [];

  return {
    insertedRecords,
    storage: {
      async getLatestByLeadModelVersion() {
        return null;
      },
      async insert(record) {
        insertedRecords.push(record);

        const persisted: PersistedCommercialAttentionDecision = {
          createdAt: "2026-06-29T12:01:00.000Z",
          id: "persisted-service-1",
          leadId: record.lead_id,
          organizationId: record.organization_id,
          snapshot: {
            attentionScore: record.attention_score,
            calibrationStatus: record.calibration_status,
            confidence: record.confidence,
            decision: record.decision,
            evidenceTrace: record.evidence_trace,
            generatedAt: record.generated_at,
            metadata: record.metadata,
            modelId: record.model_id,
            modelName: record.model_name,
            modelVersion: record.model_version,
            output: record.output,
            rationale: record.rationale,
            recommendedAction: record.recommended_action,
            scoreContributors: record.score_contributors,
            signals: record.signals,
          },
        };

        return persisted;
      },
    },
  };
}

describe("DM-001 server execution service", () => {
  it("executes the registered model and persists through the injected storage", async () => {
    const supabase = new Dm001LeadValidationSupabaseDouble();
    const { insertedRecords, storage } = createStorage();

    const result = await executeCommercialAttentionAllocationWithServerContext(
      createContext(supabase),
      buildInput(),
      {
        persistedAt: "2026-06-29T12:02:00.000Z",
        storage,
      },
    );

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.equal(result.decision.modelId, "DM-001");
    assert.equal(result.persistedDecision.id, "persisted-service-1");
    assert.equal(insertedRecords.length, 1);
    assert.equal(insertedRecords[0]?.organization_id, "org-1");
    assert.equal(insertedRecords[0]?.lead_id, "lead-1");
    assert.equal(insertedRecords[0]?.decision, result.decision.decision);
  });

  it("rejects execution when the input organization differs from the active profile", async () => {
    const supabase = new Dm001LeadValidationSupabaseDouble();
    const { insertedRecords, storage } = createStorage();

    const result = await executeCommercialAttentionAllocationWithServerContext(
      createContext(supabase),
      buildInput({ organizationId: "other-org" }),
      { storage },
    );

    assert.equal(result.ok, false);

    if (result.ok) {
      return;
    }

    assert.equal(result.status, 403);
    assert.equal(insertedRecords.length, 0);
  });

  it("rejects execution when the lead does not belong to the active organization", async () => {
    const supabase = new Dm001LeadValidationSupabaseDouble();
    supabase.lead = {
      id: "lead-1",
      organization_id: "other-org",
    };
    const { insertedRecords, storage } = createStorage();

    const result = await executeCommercialAttentionAllocationWithServerContext(
      createContext(supabase),
      buildInput(),
      { storage },
    );

    assert.equal(result.ok, false);

    if (result.ok) {
      return;
    }

    assert.equal(result.status, 404);
    assert.equal(result.error, "Lead nao encontrado.");
    assert.equal(insertedRecords.length, 0);
  });
});
