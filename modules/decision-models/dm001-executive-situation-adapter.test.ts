import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import type { OperationalContext } from "../cognitive/contracts";
import { EvidenceBuilderOperator } from "../cognitive/operators/semantic/evidence-builder-operator.ts";
import { CollectOperator } from "../cognitive/operators/structural/collect-operator.ts";
import { NormalizeOperator } from "../cognitive/operators/structural/normalize-operator.ts";
import { withCommercialAttentionDecisionOutput } from "./dm001-executive-situation-adapter.ts";
import type { PersistedCommercialAttentionDecision } from "./dm-001/persistence.ts";

describe("DM-001 Executive Situation adapter", () => {
  it("converts a persisted CommercialAttentionDecision into generic cognitive context", () => {
    const context = withCommercialAttentionDecisionOutput(
      buildOperationalContext(),
      buildPersistedDecision(),
    );
    const decisionOutput = context.data?.decision_outputs;

    assert.ok(Array.isArray(decisionOutput));
    assert.equal(decisionOutput.length, 1);
    assert.equal(decisionOutput[0]?.modelId, "DM-001");
    assert.equal(decisionOutput[0]?.modelVersion, "0.1.0-i1");
    assert.equal(decisionOutput[0]?.decision, "ACT_NOW");
    assert.equal(decisionOutput[0]?.score, 6);
    assert.equal(decisionOutput[0]?.confidence, "HIGH");
    assert.deepEqual(decisionOutput[0]?.evidenceTrace, ["ev-1", "ev-2"]);
    assert.equal(
      context.sources?.find((source) => source.sourceType === "decision_outputs")
        ?.availability,
      "available",
    );
  });

  it("represents absence of persisted output as an empty source without evidence records", () => {
    const context = withCommercialAttentionDecisionOutput(
      buildOperationalContext(),
      null,
    );

    assert.deepEqual(context.data?.decision_outputs, []);
    assert.equal(
      context.sources?.find((source) => source.sourceType === "decision_outputs")
        ?.availability,
      "empty",
    );
  });

  it("turns the adapted output into generic evidence through the Cognitive Core", async () => {
    const context = withCommercialAttentionDecisionOutput(
      buildOperationalContext(),
      buildPersistedDecision(),
    );
    const collectedContext = await CollectOperator.execute(context);
    const normalizedContext = await NormalizeOperator.execute(collectedContext);
    const evidenceSet = await EvidenceBuilderOperator.execute(normalizedContext);
    const evidence = evidenceSet.payload.evidence.find(
      (item) => item.source === "decision_outputs",
    );

    assert.ok(evidence);
    assert.equal(evidence.evidenceType, "decision_output");
    assert.equal(evidence.sourceId, "decision-output-1");
    assert.equal(evidence.content.modelId, "DM-001");
    assert.equal(evidence.content.modelVersion, "0.1.0-i1");
    assert.equal(evidence.content.decision, "ACT_NOW");
    assert.equal(evidence.content.score, 6);
    assert.equal(evidence.content.confidence, "HIGH");
    assert.deepEqual(evidence.content.evidenceTrace, ["ev-1", "ev-2"]);
  });

  it("keeps modules/cognitive independent from DM-001 and decision-models imports", () => {
    const cognitiveFiles = listTypescriptFiles(
      path.resolve("modules", "cognitive"),
    );

    for (const file of cognitiveFiles) {
      const content = readFileSync(file, "utf8");

      assert.equal(
        content.includes("dm-001"),
        false,
        `${file} must not import or reference DM-001.`,
      );
      assert.equal(
        content.includes("decision-models"),
        false,
        `${file} must not import decision-models.`,
      );
    }
  });
});

function buildOperationalContext(): OperationalContext {
  return {
    data: {
      lead: {
        id: "lead-1",
        name: "Lead Teste",
      },
    },
    generatedAt: "2026-06-29T12:00:00.000Z",
    leadId: "lead-1",
    organizationId: "org-1",
    pipelineVersion: "test",
  };
}

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
          conflictCount: 0,
          deferredTimingSignalCount: 0,
          insufficientKnowledgeCount: 0,
          missingSignalCount: 0,
          negativeSignalCount: 0,
          positiveSignalCount: 2,
          signalCount: 2,
          calibrationStatus: "INITIAL_DEFAULTS",
        },
        modelId: "DM-001",
        modelName: "Commercial Attention Allocation",
        modelVersion: "0.1.0-i1",
        rationale: buildRationale(),
        recommendedAction: "Atuar agora",
        scoreContributors: [],
        signals: [],
      },
      rationale: buildRationale(),
      recommendedAction: "Atuar agora",
      scoreContributors: [],
      signals: [],
    },
  };
}

function buildRationale() {
  return {
    blockingConditions: [],
    confidenceBoosters: ["Sinais positivos suficientes."],
    confidenceReducers: [],
    decisionReason: "Sinais comerciais positivos.",
    evidenceUsed: ["ev-1", "ev-2"],
    nonBlockingConditions: [],
    unresolvedQuestions: [],
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
