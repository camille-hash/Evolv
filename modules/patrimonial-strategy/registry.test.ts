import assert from "node:assert/strict";
import test from "node:test";
import {
  assertEngineSupportsProduct,
  commercialProposalArtifactReference,
  createPatrimonialStrategyBlueprint,
  createPublicationRequest,
  createStrategyVersionReference,
  defineCalculationEngine,
  simulationArtifactReference,
  traditionalConsortiumProduct,
} from "./index.ts";

test("creates a lead-bound Patrimonial Strategy blueprint", () => {
  const strategy = createPatrimonialStrategyBlueprint({
    leadId: "lead-1",
    name: "Estrategia Patrimonial",
    objective: "Estruturar patrimonio do lead.",
    organizationId: "org-1",
    products: [
      {
        engineId: "engine:traditional-consortium",
        productFamily: "traditional_consortium",
        productId: traditionalConsortiumProduct.id,
        role: "primary",
      },
    ],
  });

  assert.equal(strategy.leadId, "lead-1");
  assert.equal(strategy.organizationId, "org-1");
  assert.equal(strategy.status, "draft");
  assert.equal(strategy.products[0]?.productFamily, "traditional_consortium");
});

test("keeps engines independent from publications", () => {
  const engine = defineCalculationEngine({
    calculate: (input: { credit: number }) => ({ credit: input.credit }),
    engineId: "engine:traditional-consortium",
    productFamilies: ["traditional_consortium"],
    version: "1.0.0",
  });

  assert.deepEqual(engine.calculate({ credit: 100000 }), { credit: 100000 });
  assert.equal("format" in engine, false);
});

test("validates product and engine compatibility without UI conditionals", () => {
  const engine = defineCalculationEngine({
    calculate: (input: unknown) => input,
    engineId: "engine:traditional-consortium",
    productFamilies: ["traditional_consortium"],
    version: "1.0.0",
  });

  assert.doesNotThrow(() =>
    assertEngineSupportsProduct({
      engine,
      product: traditionalConsortiumProduct,
    }),
  );
});

test("rejects incompatible product and engine registration", () => {
  const engine = defineCalculationEngine({
    calculate: (input: unknown) => input,
    engineId: "engine:multi-quota",
    productFamilies: ["multi_quota"],
    version: "1.0.0",
  });

  assert.throws(
    () =>
      assertEngineSupportsProduct({
        engine,
        product: traditionalConsortiumProduct,
      }),
    /Produto financeiro nao declara suporte/,
  );
});

test("represents existing simulations and proposals as strategy artifacts", () => {
  assert.deepEqual(simulationArtifactReference({ simulationId: "sim-1" }), {
    artifactId: "sim-1",
    artifactType: "simulation",
    source: "crm_lead_simulations",
  });
  assert.deepEqual(
    commercialProposalArtifactReference({
      proposalId: "proposal-1",
      version: 2,
    }),
    {
      artifactId: "proposal-1",
      artifactType: "commercial_proposal",
      source: "crm_lead_commercial_proposals",
      version: 2,
    },
  );
});

test("creates publication requests from strategy artifacts without calculations", () => {
  const strategy = createPatrimonialStrategyBlueprint({
    artifacts: [simulationArtifactReference({ simulationId: "sim-1" })],
    leadId: "lead-1",
    name: "Estrategia",
    objective: "Publicar material executivo.",
    organizationId: "org-1",
  });

  assert.deepEqual(createPublicationRequest({ format: "pdf", strategy }), {
    artifacts: [
      {
        artifactId: "sim-1",
        artifactType: "simulation",
        source: "crm_lead_simulations",
      },
    ],
    format: "pdf",
    strategyId: "strategy:org-1:lead-1:1",
    strategyVersion: 1,
  });
});

test("creates explicit strategy version references", () => {
  const version = createStrategyVersionReference({
    currentVersion: 3,
    reason: "Ajuste de produto financeiro.",
  });

  assert.equal(version.version, 4);
  assert.equal(version.reason, "Ajuste de produto financeiro.");
});
