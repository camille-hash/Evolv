import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import type {
  CommercialAttentionDecisionStorage,
  PersistedCommercialAttentionDecision,
} from "./dm-001/persistence.ts";
import {
  buildExecutiveSituationFromLatestCommercialAttention,
  buildExecutiveSituationFromLatestCommercialAttentionWithServerContext,
  type Dm001ExecutiveSituationServerContext,
} from "./dm001-executive-situation-service.ts";

describe("DM-001 Executive Situation server consumption", () => {
  it("feeds the latest persisted DM-001 output into Executive Situation", async () => {
    const storage = createStorageDouble(buildPersistedDecision());

    const result = await buildExecutiveSituationFromLatestCommercialAttention(
      {
        generatedAt: "2026-06-29T12:02:00.000Z",
        leadId: "lead-1",
        pipelineVersion: "test",
      },
      {
        organizationId: "org-1",
        storage,
      },
    );

    assert.equal(result.ok, true);
    assert.equal(result.latestDecision?.id, "decision-output-1");
    assert.equal(result.executiveSituation.artifactType, "executive_situation");
    assert.equal(result.executiveSituation.leadId, "lead-1");
    assert.equal(result.executiveSituation.organizationId, "org-1");
    assert.equal(storage.latestReadCount, 1);
    assert.equal(storage.insertCount, 0);
    assert.ok(
      result.executiveSituation.payload.evidenceTrace.some(
        (reference) =>
          reference.evidenceId ===
          "evidence:decision_outputs:decision-output-1",
      ),
    );
  });

  it("keeps missing latest output as absence of evidence without failing", async () => {
    const storage = createStorageDouble(null);

    const result = await buildExecutiveSituationFromLatestCommercialAttention(
      {
        generatedAt: "2026-06-29T12:02:00.000Z",
        leadId: "lead-1",
        pipelineVersion: "test",
      },
      {
        organizationId: "org-1",
        storage,
      },
    );

    assert.equal(result.ok, true);
    assert.equal(result.latestDecision, null);
    assert.equal(result.executiveSituation.artifactType, "executive_situation");
    assert.equal(
      result.executiveSituation.payload.evidenceTrace.some((reference) =>
        reference.evidenceId.startsWith("evidence:decision_outputs:"),
      ),
      false,
    );
    assert.equal(storage.latestReadCount, 1);
    assert.equal(storage.insertCount, 0);
  });

  it("uses server context validation before reading latest output", async () => {
    const storage = createStorageDouble(buildPersistedDecision());
    const result =
      await buildExecutiveSituationFromLatestCommercialAttentionWithServerContext(
        createServerContextDouble("org-1"),
        {
          generatedAt: "2026-06-29T12:02:00.000Z",
          leadId: "lead-1",
          pipelineVersion: "test",
        },
        {
          storage,
        },
      );

    assert.equal(result.ok, true);
    assert.equal(storage.latestReadCount, 1);
    assert.equal(storage.insertCount, 0);
  });

  it("does not execute or persist DM-001 while consuming latest output", async () => {
    const storage = createStorageDouble(buildPersistedDecision());

    await buildExecutiveSituationFromLatestCommercialAttention(
      {
        generatedAt: "2026-06-29T12:02:00.000Z",
        leadId: "lead-1",
        pipelineVersion: "test",
      },
      {
        organizationId: "org-1",
        storage,
      },
    );

    assert.equal(storage.latestReadCount, 1);
    assert.equal(storage.insertCount, 0);
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

type StorageDouble = CommercialAttentionDecisionStorage & {
  insertCount: number;
  latestReadCount: number;
};

function createStorageDouble(
  latest: PersistedCommercialAttentionDecision | null,
): StorageDouble {
  return {
    insertCount: 0,
    latestReadCount: 0,
    async getLatestByLeadModelVersion(params) {
      this.latestReadCount += 1;
      assert.equal(params.leadId, "lead-1");
      assert.equal(params.organizationId, "org-1");
      assert.equal(params.modelId, "DM-001");

      return latest;
    },
    async insert(): Promise<PersistedCommercialAttentionDecision> {
      this.insertCount += 1;
      throw new Error("DM-001 must not be persisted by I10 consumption.");
    },
  };
}

function createServerContextDouble(
  organizationId: string,
): Dm001ExecutiveSituationServerContext {
  return {
    profile: {
      id: "profile-1",
      is_active: true,
      organization_id: organizationId,
      role: "consultant",
    },
    supabase: {
      auth: {
        async getUser() {
          return {
            data: { user: { id: "user-1" } as never },
            error: null,
          };
        },
      },
      from(table: "crm_leads" | "profiles") {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle<T>() {
                    const data =
                      table === "crm_leads"
                        ? {
                            id: "lead-1",
                            organization_id: organizationId,
                          }
                        : {
                            id: "profile-1",
                            is_active: true,
                            organization_id: organizationId,
                            role: "consultant",
                          };

                    return {
                      data: data as T,
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      },
    },
    user: { id: "user-1" } as never,
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
