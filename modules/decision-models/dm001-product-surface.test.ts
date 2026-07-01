import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import type { PersistedCommercialAttentionDecision } from "./dm-001/persistence.ts";
import { mapCommercialAttentionDecisionToProductSurface } from "./dm001-product-surface.ts";

describe("DM-001 product surface mapper", () => {
  it("maps an existing decision to display-only fields", () => {
    const surface = mapCommercialAttentionDecisionToProductSurface(
      buildPersistedDecision(),
    );

    assert.deepEqual(surface, {
      attentionScore: 6,
      confidence: "HIGH",
      decision: "ACT_NOW",
      generatedAt: "2026-06-29T12:00:00.000Z",
      modelVersion: "0.1.0-i1",
      rationaleSummary: "Sinais comerciais positivos.",
      recommendedAction: "Atuar agora",
    });
  });

  it("keeps missing decision as an empty product state", () => {
    assert.equal(mapCommercialAttentionDecisionToProductSurface(null), null);
  });

  it("keeps DM-001 decision logic out of the CRM Lead Detail React surface", () => {
    const leadDetail = readFileSync(
      path.resolve("components", "crm", "crm-lead-detail.tsx"),
      "utf8",
    );

    assert.equal(leadDetail.includes("executeCommercialAttentionAllocation"), false);
    assert.equal(leadDetail.includes("recalculateCommercialAttention"), false);
    assert.equal(leadDetail.includes("scoreContributors"), false);
    assert.equal(leadDetail.includes("decisionContext"), false);
  });
});

function buildPersistedDecision(): PersistedCommercialAttentionDecision {
  return {
    createdAt: "2026-06-29T12:01:00.000Z",
    id: "decision-output-1",
    leadId: "lead-1",
    organizationId: "org-1",
    snapshot: {
      attentionScore: 6,
      calibrationStatus: "INITIAL_DEFAULTS",
      confidence: "HIGH",
      decision: "ACT_NOW",
      evidenceTrace: ["ev-1", "ev-2"],
      generatedAt: "2026-06-29T12:00:00.000Z",
      metadata: {
        blockingConditionCount: 0,
        conflictCount: 0,
        deferredTimingSignalCount: 0,
        insufficientKnowledgeCount: 0,
        missingSignalCount: 0,
        negativeSignalCount: 0,
        persistedModelId: "DM-001",
        persistedModelName: "Commercial Attention Allocation",
        persistedModelVersion: "0.1.0-i1",
        positiveSignalCount: 2,
        serializedAt: "2026-06-29T12:01:00.000Z",
        signalCount: 2,
      },
      modelId: "DM-001",
      modelName: "Commercial Attention Allocation",
      modelVersion: "0.1.0-i1",
      output: {
        attentionScore: 6,
        calibrationStatus: "INITIAL_DEFAULTS",
        confidence: "HIGH",
        decision: "ACT_NOW",
        evidenceTrace: ["ev-1", "ev-2"],
        generatedAt: "2026-06-29T12:00:00.000Z",
        metadata: {
          blockingConditionCount: 0,
          calibrationStatus: "INITIAL_DEFAULTS",
          conflictCount: 0,
          deferredTimingSignalCount: 0,
          insufficientKnowledgeCount: 0,
          missingSignalCount: 0,
          negativeSignalCount: 0,
          positiveSignalCount: 2,
          signalCount: 2,
        },
        modelId: "DM-001",
        modelName: "Commercial Attention Allocation",
        modelVersion: "0.1.0-i1",
        rationale: {
          blockingConditions: [],
          confidenceBoosters: ["Sinais positivos suficientes."],
          confidenceReducers: [],
          decisionReason: "Sinais comerciais positivos.",
          evidenceUsed: ["ev-1", "ev-2"],
          nonBlockingConditions: [],
          unresolvedQuestions: [],
        },
        recommendedAction: "Atuar agora",
        scoreContributors: [],
        signals: [],
      },
      rationale: {
        blockingConditions: [],
        confidenceBoosters: ["Sinais positivos suficientes."],
        confidenceReducers: [],
        decisionReason: "Sinais comerciais positivos.",
        evidenceUsed: ["ev-1", "ev-2"],
        nonBlockingConditions: [],
        unresolvedQuestions: [],
      },
      recommendedAction: "Atuar agora",
      scoreContributors: [],
      signals: [],
    },
  };
}
