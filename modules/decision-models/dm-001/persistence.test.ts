import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CommercialAttentionDecisionOutputRecord,
  CommercialAttentionDecisionStorage,
  PersistedCommercialAttentionDecision,
} from "./persistence.ts";
import type { Dm001DecisionContext, Dm001Input } from "./contracts.ts";
import {
  createCommercialAttentionDecisionOutputRecord,
  getLatestCommercialAttentionDecision,
  persistCommercialAttentionDecision,
  serializeCommercialAttentionDecision,
} from "./persistence.ts";
import { executeCommercialAttentionAllocation } from "./executor.ts";

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

function buildDecision() {
  const context = emptyContext();
  context.engagement.positive = [
    {
      evidenceId: "ev-reply",
      source: "test",
      summary: "Client replied quickly.",
    },
  ];
  context.continuity.positive = [
    {
      evidenceId: "ev-continuity",
      source: "test",
      summary: "Conversation continuity exists.",
    },
  ];

  const input: Dm001Input = {
    leadId: "lead-1",
    organizationId: "org-1",
    generatedAt: "2026-06-29T12:00:00.000Z",
    decisionContext: context,
  };

  return executeCommercialAttentionAllocation(input);
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
      async getLatestByLeadModelVersion() {
        return latest;
      },
      async insert(record) {
        insertedRecords.push(record);
        latest = {
          id: "persisted-1",
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

describe("DM-001 persistence", () => {
  it("serializes a CommercialAttentionDecision without recalculating it", () => {
    const decision = buildDecision();
    const snapshot = serializeCommercialAttentionDecision({
      decision,
      leadId: "lead-1",
      organizationId: "org-1",
      persistedAt: "2026-06-29T12:02:00.000Z",
    });

    assert.equal(snapshot.modelId, "DM-001");
    assert.equal(snapshot.modelVersion, decision.modelVersion);
    assert.equal(snapshot.decision, decision.decision);
    assert.equal(snapshot.attentionScore, decision.attentionScore);
    assert.deepEqual(snapshot.signals, decision.signals);
    assert.deepEqual(snapshot.evidenceTrace, decision.evidenceTrace);
    assert.equal(snapshot.metadata.serializedAt, "2026-06-29T12:02:00.000Z");
  });

  it("creates the table payload with version, score, confidence, rationale and signals", () => {
    const decision = buildDecision();
    const record = createCommercialAttentionDecisionOutputRecord({
      decision,
      leadId: "lead-1",
      organizationId: "org-1",
    });

    assert.equal(record.organization_id, "org-1");
    assert.equal(record.lead_id, "lead-1");
    assert.equal(record.model_id, "DM-001");
    assert.equal(record.model_version, decision.modelVersion);
    assert.equal(record.decision, decision.decision);
    assert.equal(record.attention_score, decision.attentionScore);
    assert.equal(record.confidence, decision.confidence);
    assert.deepEqual(record.rationale, decision.rationale);
    assert.deepEqual(record.signals, decision.signals);
  });

  it("persists through the storage port and can read the latest output", async () => {
    const decision = buildDecision();
    const { insertedRecords, storage } = createStorage();

    const persisted = await persistCommercialAttentionDecision(storage, {
      decision,
      leadId: "lead-1",
      organizationId: "org-1",
    });
    const latest = await getLatestCommercialAttentionDecision(storage, {
      leadId: "lead-1",
      organizationId: "org-1",
    });

    assert.equal(insertedRecords.length, 1);
    assert.equal(persisted.id, "persisted-1");
    assert.equal(latest?.snapshot.modelId, "DM-001");
    assert.equal(latest?.snapshot.modelVersion, decision.modelVersion);
  });

  it("rejects incompatible model outputs", () => {
    const decision = {
      ...buildDecision(),
      modelVersion: "unexpected-version",
    };

    assert.throws(
      () =>
        serializeCommercialAttentionDecision({
          decision,
          leadId: "lead-1",
          organizationId: "org-1",
        }),
      /incompatible modelVersion/,
    );
  });
});
