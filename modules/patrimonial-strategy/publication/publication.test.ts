import assert from "node:assert/strict";
import test from "node:test";
import {
  attachPublicationToStrategySnapshot,
  buildPatrimonialPublication,
  calculateReferenceCapitalExclusiveStrategy,
  createPublicationPreview,
  getReferenceCapitalExecutiveMaterialChapters,
  readPublicationsFromStrategySnapshot,
  referenceCapitalContemplationDisclaimer,
  type ReferenceCapitalStrategySnapshot,
  buildReferenceCapitalStrategySnapshot,
} from "../index.ts";

function createSnapshot(input?: {
  commercialProposal?: ReferenceCapitalStrategySnapshot["commercialProposal"];
  includeScenarios?: boolean;
}) {
  const result = calculateReferenceCapitalExclusiveStrategy({
    includeContemplationScenariosInMaterial: input?.includeScenarios ?? false,
    quotas: [
      {
        creditAmount: 150000,
        contemplationScenarioMonth: 12,
        id: "quota-1",
      },
      {
        creditAmount: 200000,
        contemplationScenarioMonth: 36,
        id: "quota-2",
      },
    ],
  });

  return buildReferenceCapitalStrategySnapshot({
    commercialProposal: input?.commercialProposal ?? null,
    leadContext: {
      commercialContext: {
        objetivo: "Composicao patrimonial.",
      },
      leadId: "lead-1",
      leadName: "Cliente Teste",
      responsibleName: "Consultor Teste",
    },
    result,
  });
}

function buildPublication(input?: {
  commercialProposal?: ReferenceCapitalStrategySnapshot["commercialProposal"];
  includeScenarios?: boolean;
  selectedOptionalChapterKeys?: Parameters<
    typeof buildPatrimonialPublication
  >[0]["selectedOptionalChapterKeys"];
}) {
  return buildPatrimonialPublication({
    createdAt: "2026-08-02T12:00:00.000Z",
    createdBy: "profile-1",
    selectedOptionalChapterKeys: input?.selectedOptionalChapterKeys,
    strategyId: "strategy-1",
    strategySnapshot: createSnapshot({
      commercialProposal: input?.commercialProposal,
      includeScenarios: input?.includeScenarios,
    }),
    strategyTitle: "Estrategia Patrimonial Patrion Asset",
    strategyVersion: 1,
  });
}

test("catalog declares mandatory and optional executive material chapters", () => {
  const chapters = getReferenceCapitalExecutiveMaterialChapters();

  assert.deepEqual(
    chapters
      .filter((chapter) => chapter.requirement === "mandatory")
      .map((chapter) => chapter.chapterKey),
    [
      "cover",
      "strategy_synthesis",
      "used_product",
      "quota_structure",
      "installment_evolution",
      "conditions_disclaimers",
    ],
  );
  assert.deepEqual(
    chapters
      .filter((chapter) => chapter.requirement === "optional")
      .map((chapter) => chapter.chapterKey),
    [
      "client_objectives",
      "patrimonial_consulting",
      "contemplation_scenarios",
      "calculation_memory",
    ],
  );
});

test("creates a minimal ready publication with mandatory chapters", () => {
  const publication = buildPublication();

  assert.equal(publication.status, "ready");
  assert.equal(publication.publicationType, "executive_material");
  assert.equal(publication.audience, "client");
  assert.equal(publication.strategyVersion, 1);
  assert.deepEqual(
    publication.selectedChapters.map((chapter) => chapter.chapterKey),
    [
      "cover",
      "strategy_synthesis",
      "used_product",
      "quota_structure",
      "installment_evolution",
      "conditions_disclaimers",
    ],
  );
});

test("keeps contemplation scenarios unselected when editorial preference is off", () => {
  const publication = buildPublication({ includeScenarios: false });
  const optionalChapter = publication.optionalChapters.find(
    (chapter) => chapter.chapterKey === "contemplation_scenarios",
  );

  assert.equal(optionalChapter?.selected, false);
  assert.equal(optionalChapter?.availability.available, false);
  assert.equal(
    publication.contentSnapshot.sourceSnapshot.input.quotas[0]
      ?.contemplationScenarioMonth,
    12,
  );
});

test("includes contemplation scenarios and disclaimer when preference is on", () => {
  const publication = buildPublication({ includeScenarios: true });
  const scenarioChapter = publication.contentSnapshot.resolvedChapters.find(
    (chapter) => chapter.chapterKey === "contemplation_scenarios",
  );

  assert.equal(Boolean(scenarioChapter), true);
  assert.equal(scenarioChapter?.content.disclaimer, referenceCapitalContemplationDisclaimer);
  assert.deepEqual(
    (scenarioChapter?.content.scenarios as Array<{ contemplationScenarioMonth: number }>).map(
      (scenario) => scenario.contemplationScenarioMonth,
    ),
    [12, 36],
  );
});

test("keeps Commercial Proposal chapter unavailable when proposal is absent", () => {
  const publication = buildPublication({
    selectedOptionalChapterKeys: ["patrimonial_consulting"],
  });
  const consultingChapter = publication.optionalChapters.find(
    (chapter) => chapter.chapterKey === "patrimonial_consulting",
  );

  assert.equal(consultingChapter?.availability.available, false);
  assert.equal(
    publication.selectedChapters.some(
      (chapter) => chapter.chapterKey === "patrimonial_consulting",
    ),
    false,
  );
});

test("references Commercial Proposal without duplicating its aggregate", () => {
  const publication = buildPublication({
    commercialProposal: {
      artifactId: "proposal-1",
      status: "approved",
      version: 3,
    },
    selectedOptionalChapterKeys: ["patrimonial_consulting"],
  });
  const consultingChapter = publication.contentSnapshot.resolvedChapters.find(
    (chapter) => chapter.chapterKey === "patrimonial_consulting",
  );

  assert.deepEqual(publication.sourceArtifacts.commercialProposal, {
    artifactId: "proposal-1",
    source: "crm_lead_commercial_proposals",
    status: "approved",
    version: 3,
  });
  assert.deepEqual(consultingChapter?.content.commercialProposal, {
    artifactId: "proposal-1",
    source: "crm_lead_commercial_proposals",
    status: "approved",
    version: 3,
  });
});

test("rejects duplicate optional chapters and mandatory chapters in optional selection", () => {
  assert.throws(
    () =>
      buildPublication({
        selectedOptionalChapterKeys: [
          "calculation_memory",
          "calculation_memory",
        ],
      }),
    /Capitulo duplicado/,
  );
  assert.throws(
    () =>
      buildPublication({
        selectedOptionalChapterKeys: ["cover"],
      }),
    /Capitulo obrigatorio/,
  );
});

test("preserves immutable publication snapshot when source strategy changes later", () => {
  const snapshot = createSnapshot();
  const publication = buildPatrimonialPublication({
    createdAt: "2026-08-02T12:00:00.000Z",
    strategyId: "strategy-1",
    strategySnapshot: snapshot,
    strategyTitle: "Estrategia Patrimonial Patrion Asset",
    strategyVersion: 1,
  });

  snapshot.result.consolidated.totalCreditCents = 1;

  assert.equal(
    publication.contentSnapshot.result.consolidated.totalCreditCents,
    35000000,
  );
  assert.equal(Object.isFrozen(publication.contentSnapshot), true);
});

test("supports multiple publication versions for the same strategy version", () => {
  const snapshot = createSnapshot({ includeScenarios: true });
  const publicationV1 = buildPatrimonialPublication({
    createdAt: "2026-08-02T12:00:00.000Z",
    publicationVersion: 1,
    strategyId: "strategy-1",
    strategySnapshot: snapshot,
    strategyTitle: "Estrategia Patrimonial Patrion Asset",
    strategyVersion: 1,
  });
  const publicationV2 = buildPatrimonialPublication({
    createdAt: "2026-08-02T12:10:00.000Z",
    publicationVersion: 2,
    selectedOptionalChapterKeys: ["calculation_memory"],
    strategyId: "strategy-1",
    strategySnapshot: snapshot,
    strategyTitle: "Estrategia Patrimonial Patrion Asset",
    strategyVersion: 1,
  });

  assert.notEqual(publicationV1.id, publicationV2.id);
  assert.equal(publicationV1.strategyVersion, publicationV2.strategyVersion);
  assert.equal(publicationV2.publicationVersion, 2);
});

test("reopens persisted publication snapshots from compatible strategy JSON", () => {
  const publication = buildPublication({
    selectedOptionalChapterKeys: ["calculation_memory"],
  });
  const snapshotWithPublication = attachPublicationToStrategySnapshot({
    publication,
    strategySnapshot: createSnapshot(),
  });
  const reopened = readPublicationsFromStrategySnapshot(snapshotWithPublication);

  assert.equal(reopened.length, 1);
  assert.equal(reopened[0]?.id, publication.id);
  assert.deepEqual(createPublicationPreview(reopened[0] ?? publication), [
    {
      chapterKey: "cover",
      order: 1,
      requirement: "mandatory",
      title: "Capa",
    },
    {
      chapterKey: "strategy_synthesis",
      order: 2,
      requirement: "mandatory",
      title: "Sintese da Estrategia",
    },
    {
      chapterKey: "used_product",
      order: 3,
      requirement: "mandatory",
      title: "Produto Utilizado",
    },
    {
      chapterKey: "quota_structure",
      order: 4,
      requirement: "mandatory",
      title: "Estrutura das Cotas",
    },
    {
      chapterKey: "installment_evolution",
      order: 5,
      requirement: "mandatory",
      title: "Evolucao das Parcelas",
    },
    {
      chapterKey: "conditions_disclaimers",
      order: 6,
      requirement: "mandatory",
      title: "Condicoes e Disclaimers",
    },
    {
      chapterKey: "calculation_memory",
      order: 7,
      requirement: "optional",
      title: "Memoria de Calculo",
    },
  ]);
});
