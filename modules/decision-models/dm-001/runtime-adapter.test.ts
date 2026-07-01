import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDecisionModelRegistry } from "../registry.ts";
import type { Dm001DecisionContext, Dm001Input } from "./contracts.ts";
import type {
  CommercialAttentionDecisionOutputRecord,
  CommercialAttentionDecisionStorage,
  PersistedCommercialAttentionDecision,
} from "./persistence.ts";
import {
  executeRegisteredCommercialAttentionAllocation,
  getLatestRegisteredCommercialAttentionAllocation,
  registerCommercialAttentionAllocation,
} from "./runtime-adapter.ts";

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

function buildInput(): Dm001Input {
  const decisionContext = emptyContext();
  decisionContext.engagement.positive = [
    {
      evidenceId: "ev-reply",
      source: "test",
      summary: "Client replied quickly.",
    },
  ];
  decisionContext.continuity.positive = [
    {
      evidenceId: "ev-continuity",
      source: "test",
      summary: "Conversation continuity exists.",
    },
  ];

  return {
    leadId: "lead-1",
    organizationId: "org-1",
    generatedAt: "2026-06-29T12:00:00.000Z",
    decisionContext,
  };
}

function createStorage(): {
  insertedRecords: CommercialAttentionDecisionOutputRecord[];
  storage: CommercialAttentionDecisionStorage;
} {
  const insertedRecords: CommercialAttentionDecisionOutputRecord[] = [];
  let latest: PersistedCommercialAttentionDecision | null = null;

  return {
    insertedRecords,
    storage: {
      async getLatestByLeadModelVersion(params) {
        if (
          latest?.leadId === params.leadId &&
          latest.organizationId === params.organizationId &&
          latest.snapshot.modelId === params.modelId &&
          latest.snapshot.modelVersion === params.modelVersion
        ) {
          return latest;
        }

        return null;
      },
      async insert(record) {
        insertedRecords.push(record);
        latest = {
          id: "persisted-runtime-1",
          leadId: record.lead_id,
          organizationId: record.organization_id,
          snapshot: {
            modelId: record.model_id,
            modelName: record.model_name,
            modelVersion: record.model_version,
            decision: record.decision,
            recommendedAction: record.recommended_action,
            attentionScore: record.attention_score,
            confidence: record.confidence,
            calibrationStatus: record.calibration_status,
            rationale: record.rationale,
            signals: record.signals,
            evidenceTrace: record.evidence_trace,
            scoreContributors: record.score_contributors,
            metadata: record.metadata,
            output: record.output,
            generatedAt: record.generated_at,
          },
          createdAt: "2026-06-29T12:01:00.000Z",
        };

        return latest;
      },
    },
  };
}

describe("DM-001 runtime adapter", () => {
  it("registers DM-001 in the decision model registry", () => {
    const registry = createDecisionModelRegistry();

    registerCommercialAttentionAllocation(registry);

    const model = registry.get<Dm001Input, unknown>("DM-001");
    assert.equal(model?.modelId, "DM-001");
    assert.equal(model?.modelVersion, "0.1.0-i1");
    assert.equal(registry.list().length, 1);
  });

  it("executes DM-001 and persists the produced decision through the storage port", async () => {
    const { insertedRecords, storage } = createStorage();
    const result = await executeRegisteredCommercialAttentionAllocation(
      buildInput(),
      {
        persistedAt: "2026-06-29T12:02:00.000Z",
        storage,
      },
    );

    assert.equal(result.decision.modelId, "DM-001");
    assert.equal(result.persistedDecision.id, "persisted-runtime-1");
    assert.equal(insertedRecords.length, 1);
    assert.equal(insertedRecords[0]?.decision, result.decision.decision);
    assert.equal(insertedRecords[0]?.model_version, result.decision.modelVersion);
  });

  it("reads the latest persisted DM-001 output through the runtime adapter", async () => {
    const { storage } = createStorage();

    await executeRegisteredCommercialAttentionAllocation(buildInput(), {
      storage,
    });

    const latest = await getLatestRegisteredCommercialAttentionAllocation(
      storage,
      {
        leadId: "lead-1",
        organizationId: "org-1",
      },
    );

    assert.equal(latest?.snapshot.modelId, "DM-001");
    assert.equal(latest?.snapshot.modelVersion, "0.1.0-i1");
  });
});
