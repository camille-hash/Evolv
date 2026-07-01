import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Dm001DecisionContext, Dm001Input } from "./contracts.ts";
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

function buildInput(decisionContext: Dm001DecisionContext): Dm001Input {
  return {
    leadId: "lead-1",
    organizationId: "org-1",
    generatedAt: "2026-06-29T12:00:00.000Z",
    decisionContext,
  };
}

describe("executeCommercialAttentionAllocation", () => {
  it("returns INVESTIGATE when a blocking condition exists", () => {
    const context = emptyContext();
    context.engagement.positive = [
      {
        evidenceId: "ev-engagement",
        source: "test",
        summary: "Client replied quickly.",
      },
    ];
    context.operationalReadiness.blocking = [
      {
        evidenceId: "ev-cpf",
        source: "test",
        summary: "CPF ausente.",
      },
    ];

    const decision = executeCommercialAttentionAllocation(buildInput(context));

    assert.equal(decision.decision, "INVESTIGATE");
    assert.equal(decision.recommendedAction, "Identificar e trabalhar objecoes");
    assert.deepEqual(decision.evidenceTrace, ["ev-engagement", "ev-cpf"]);
  });

  it("returns WAIT when timing evidence is deferred", () => {
    const context = emptyContext();
    context.engagement.positive = [
      {
        evidenceId: "ev-interest",
        source: "test",
        summary: "Client demonstrated interest.",
      },
    ];
    context.timing.deferred = [
      {
        evidenceId: "ev-return",
        source: "test",
        summary: "Client requested return in three months.",
      },
    ];

    const decision = executeCommercialAttentionAllocation(buildInput(context));

    assert.equal(decision.decision, "WAIT");
    assert.equal(decision.recommendedAction, "Programar retorno na data adequada");
  });

  it("returns ACT_NOW for strong positive evidence without blockers", () => {
    const context = emptyContext();
    context.engagement.positive = [
      {
        evidenceId: "ev-reply",
        source: "test",
        summary: "Client responds messages.",
      },
      {
        evidenceId: "ev-meeting",
        source: "test",
        summary: "First meeting scheduled.",
      },
    ];
    context.continuity.positive = [
      {
        evidenceId: "ev-continuity",
        source: "test",
        summary: "Conversation continuity exists.",
      },
    ];
    context.productFit.positive = [
      {
        evidenceId: "ev-fit",
        source: "test",
        summary: "Product expectation is aligned.",
      },
    ];
    context.timing.positive = [
      {
        evidenceId: "ev-timing",
        source: "test",
        summary: "Lead is recent.",
      },
    ];

    const decision = executeCommercialAttentionAllocation(buildInput(context));

    assert.equal(decision.decision, "ACT_NOW");
    assert.equal(decision.attentionScore, 6);
    assert.equal(decision.calibrationStatus, "INITIAL_DEFAULTS");
  });

  it("does not treat non-blocking conditions as negative score", () => {
    const context = emptyContext();
    context.engagement.positive = [
      {
        evidenceId: "ev-interest",
        source: "test",
        summary: "Client demonstrated interest.",
      },
    ];
    context.productFit.nonBlocking = [
      {
        evidenceId: "ev-low-payment",
        source: "test",
        summary: "Parcela baixa.",
      },
    ];

    const decision = executeCommercialAttentionAllocation(buildInput(context));
    const nonBlockingContributor = decision.scoreContributors.find(
      (contributor) => contributor.evidenceId === "ev-low-payment",
    );

    assert.equal(nonBlockingContributor?.value, 0);
    assert.equal(decision.metadata.negativeSignalCount, 0);
  });
});
