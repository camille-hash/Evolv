import assert from "node:assert/strict";
import test from "node:test";
import {
  attachExecutiveMaterialPdfArtifactMetadata,
  attachPublicationToStrategySnapshot,
  buildPatrimonialPublication,
  buildReferenceCapitalStrategySnapshot,
  calculateReferenceCapitalExclusiveStrategy,
  readPublicationsFromStrategySnapshot,
  renderExecutiveMaterialPdf,
  type ReferenceCapitalStrategySnapshot,
} from "../index.ts";

function createStrategySnapshot(): ReferenceCapitalStrategySnapshot {
  const result = calculateReferenceCapitalExclusiveStrategy({
    includeContemplationScenariosInMaterial: true,
    quotas: [
      {
        creditAmount: 150000,
        contemplationScenarioMonth: 12,
        id: "quota-1",
      },
      {
        creditAmount: 200000,
        contemplationScenarioMonth: 24,
        id: "quota-2",
      },
    ],
  });

  return buildReferenceCapitalStrategySnapshot({
    leadContext: {
      commercialContext: {
        objetivo: "Organizar composicao patrimonial.",
      },
      leadId: "lead-1",
      leadName: "Cliente Workflow",
      responsibleName: "Consultor Workflow",
    },
    result,
  });
}

test("runs the executive material workflow without duplicating publications", () => {
  const strategySnapshot = createStrategySnapshot();

  assert.deepEqual(readPublicationsFromStrategySnapshot(strategySnapshot), []);

  const draftPublication = buildPatrimonialPublication({
    createdAt: "2026-08-02T12:00:00.000Z",
    createdBy: "profile-1",
    selectedOptionalChapterKeys: ["contemplation_scenarios"],
    status: "draft",
    strategyId: "strategy-1",
    strategySnapshot,
    strategyTitle: "Estrategia Patrimonial Patrion Asset",
    strategyVersion: 1,
  });
  const snapshotWithDraft = attachPublicationToStrategySnapshot({
    publication: draftPublication,
    strategySnapshot,
  });
  const reopenedDraft = readPublicationsFromStrategySnapshot(snapshotWithDraft);

  assert.equal(reopenedDraft.length, 1);
  assert.equal(reopenedDraft[0]?.id, draftPublication.id);
  assert.equal(reopenedDraft[0]?.status, "draft");

  const readyPublication = buildPatrimonialPublication({
    createdAt: "2026-08-02T12:05:00.000Z",
    createdBy: "profile-1",
    publicationId: draftPublication.id,
    publicationVersion: draftPublication.publicationVersion,
    selectedOptionalChapterKeys: ["contemplation_scenarios"],
    status: "ready",
    strategyId: "strategy-1",
    strategySnapshot,
    strategyTitle: "Estrategia Patrimonial Patrion Asset",
    strategyVersion: 1,
  });
  const snapshotWithReady = attachPublicationToStrategySnapshot({
    publication: readyPublication,
    strategySnapshot: snapshotWithDraft,
  });
  const reopenedReady = readPublicationsFromStrategySnapshot(snapshotWithReady);

  assert.equal(reopenedReady.length, 1);
  assert.equal(reopenedReady[0]?.id, draftPublication.id);
  assert.equal(reopenedReady[0]?.status, "ready");

  const artifact = renderExecutiveMaterialPdf(readyPublication);
  const renderedPublication = attachExecutiveMaterialPdfArtifactMetadata({
    artifact,
    publication: readyPublication,
  });
  const snapshotWithRendered = attachPublicationToStrategySnapshot({
    publication: renderedPublication,
    strategySnapshot: snapshotWithReady,
  });
  const reopenedRendered =
    readPublicationsFromStrategySnapshot(snapshotWithRendered);

  assert.equal(reopenedRendered.length, 1);
  assert.equal(reopenedRendered[0]?.id, draftPublication.id);
  assert.equal(reopenedRendered[0]?.status, "rendered");
  assert.equal(
    reopenedRendered[0]?.renderedArtifacts?.at(-1)?.fileName,
    artifact.fileName,
  );
  assert.ok(artifact.byteLength > 1000);
});
