import assert from "node:assert/strict";
import test from "node:test";
import {
  assertEngineSupportsProduct,
  buildReferenceCapitalStrategySnapshot,
  calculateReferenceCapitalExclusiveStrategy,
  isReferenceCapitalStrategySnapshot,
  referenceCapitalCreditCatalog,
  referenceCapitalEngineKey,
  referenceCapitalExclusiveEngine,
  referenceCapitalExclusiveProductDefinition,
  referenceCapitalProductKey,
  referenceCapitalProductVersion,
} from "./index.ts";

test("registers the Reference Capital exclusive product and compatible engine", () => {
  assert.equal(referenceCapitalExclusiveProductDefinition.version, referenceCapitalProductVersion);
  assert.equal(referenceCapitalExclusiveProductDefinition.metadata?.groupCode, "2227");
  assert.equal(referenceCapitalExclusiveProductDefinition.supportedEngineIds[0], referenceCapitalEngineKey);
  assert.doesNotThrow(() =>
    assertEngineSupportsProduct({
      engine: referenceCapitalExclusiveEngine,
      product: referenceCapitalExclusiveProductDefinition,
    }),
  );
});

test("exposes the immutable official credit catalog", () => {
  assert.deepEqual(
    referenceCapitalCreditCatalog.map((item) => ({
      code: item.catalogCode,
      credit: item.creditAmount,
      phase1: item.installmentMonths1To12Cents,
      phase2: item.installmentMonths13To24Cents,
      phase3: item.installmentMonths25To216Cents,
    })),
    [
      { code: "29.09.5522", credit: 150000, phase1: 68724, phase2: 82119, phase3: 98094 },
      { code: "29.09.15116", credit: 175000, phase1: 80178, phase2: 95806, phase3: 114443 },
      { code: "29.09.5526", credit: 200000, phase1: 91633, phase2: 109493, phase3: 130793 },
    ],
  );
});

test("calculates two repeated quotas of R$ 150.000", () => {
  const result = calculateReferenceCapitalExclusiveStrategy({
    quotas: [{ creditAmount: 150000 }, { creditAmount: 150000 }],
  });

  assert.equal(result.consolidated.totalCreditCents, 30000000);
  assert.equal(result.consolidated.installmentMonths1To12Cents, 137448);
  assert.equal(result.consolidated.installmentMonths13To24Cents, 164238);
  assert.equal(result.consolidated.installmentMonths25To216Cents, 196188);
});

test("calculates mixed quotas of R$ 150.000 and R$ 175.000", () => {
  const result = calculateReferenceCapitalExclusiveStrategy({
    quotas: [{ creditAmount: 150000 }, { creditAmount: 175000 }],
  });

  assert.equal(result.consolidated.totalCreditCents, 32500000);
  assert.equal(result.consolidated.installmentMonths1To12Cents, 148902);
  assert.equal(result.consolidated.installmentMonths13To24Cents, 177925);
  assert.equal(result.consolidated.installmentMonths25To216Cents, 212537);
});

test("calculates mixed quotas of R$ 175.000 and R$ 200.000", () => {
  const result = calculateReferenceCapitalExclusiveStrategy({
    quotas: [{ creditAmount: 175000 }, { creditAmount: 200000 }],
  });

  assert.equal(result.consolidated.totalCreditCents, 37500000);
  assert.equal(result.consolidated.installmentMonths1To12Cents, 171811);
  assert.equal(result.consolidated.installmentMonths13To24Cents, 205299);
  assert.equal(result.consolidated.installmentMonths25To216Cents, 245236);
});

test("calculates three different quotas", () => {
  const result = calculateReferenceCapitalExclusiveStrategy({
    quotas: [
      { creditAmount: 150000 },
      { creditAmount: 175000 },
      { creditAmount: 200000 },
    ],
  });

  assert.equal(result.consolidated.totalCreditCents, 52500000);
  assert.equal(result.consolidated.installmentMonths1To12Cents, 240535);
  assert.equal(result.consolidated.installmentMonths13To24Cents, 287418);
  assert.equal(result.consolidated.installmentMonths25To216Cents, 343330);
});

test("rejects invalid quota compositions and incompatible product versions", () => {
  assert.throws(
    () => calculateReferenceCapitalExclusiveStrategy({ quotas: [{ creditAmount: 150000 }] }),
    /Adicione pelo menos duas cotas/,
  );
  assert.throws(
    () =>
      calculateReferenceCapitalExclusiveStrategy({
        quotas: [{ creditAmount: 150000 }, { creditAmount: 300000 }],
      }),
    /Selecione um dos creditos disponiveis/,
  );
  assert.throws(
    () =>
      calculateReferenceCapitalExclusiveStrategy({
        productKey: "unknown",
        quotas: [{ creditAmount: 150000 }, { creditAmount: 200000 }],
      }),
    /Produto financeiro desconhecido/,
  );
});

test("preserves independent contemplation scenarios per quota", () => {
  const result = calculateReferenceCapitalExclusiveStrategy({
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

  assert.equal(result.quotas[0]?.contemplationScenarioMonth, 12);
  assert.equal(result.quotas[1]?.contemplationScenarioMonth, 36);
  assert.equal(result.input.quotas[0]?.id, "quota-1");
  assert.equal(result.input.quotas[1]?.id, "quota-2");
  assert.equal(result.input.includeContemplationScenariosInMaterial, false);
});

test("keeps quota scenario association stable by id when an intermediate quota is removed", () => {
  const result = calculateReferenceCapitalExclusiveStrategy({
    quotas: [
      {
        creditAmount: 150000,
        contemplationScenarioMonth: 12,
        id: "quota-a",
      },
      {
        creditAmount: 200000,
        contemplationScenarioMonth: 72,
        id: "quota-c",
      },
    ],
  });

  assert.deepEqual(
    result.input.quotas.map((quota) => ({
      id: quota.id,
      month: quota.contemplationScenarioMonth,
    })),
    [
      { id: "quota-a", month: 12 },
      { id: "quota-c", month: 72 },
    ],
  );
});

test("adds a new quota scenario without changing previous quota months", () => {
  const result = calculateReferenceCapitalExclusiveStrategy({
    quotas: [
      {
        creditAmount: 150000,
        contemplationScenarioMonth: 12,
        id: "quota-1",
      },
      {
        creditAmount: 175000,
        contemplationScenarioMonth: 24,
        id: "quota-2",
      },
      {
        creditAmount: 200000,
        contemplationScenarioMonth: 36,
        id: "quota-3",
      },
    ],
  });

  assert.deepEqual(
    result.input.quotas.map((quota) => quota.contemplationScenarioMonth),
    [12, 24, 36],
  );
  assert.equal(result.consolidated.totalCreditCents, 52500000);
});

test("validates contemplation scenario limits per quota", () => {
  assert.doesNotThrow(() =>
    calculateReferenceCapitalExclusiveStrategy({
      quotas: [
        { creditAmount: 150000, contemplationScenarioMonth: 1 },
        { creditAmount: 200000, contemplationScenarioMonth: 216 },
      ],
    }),
  );
  assert.throws(
    () =>
      calculateReferenceCapitalExclusiveStrategy({
        quotas: [
          { creditAmount: 150000, contemplationScenarioMonth: 0 },
          { creditAmount: 200000, contemplationScenarioMonth: 12 },
        ],
      }),
    /mes de cenario/,
  );
  assert.throws(
    () =>
      calculateReferenceCapitalExclusiveStrategy({
        quotas: [
          { creditAmount: 150000, contemplationScenarioMonth: 217 },
          { creditAmount: 200000, contemplationScenarioMonth: 12 },
        ],
      }),
    /216 meses/,
  );
  assert.throws(
    () =>
      calculateReferenceCapitalExclusiveStrategy({
        quotas: [
          { creditAmount: 150000, contemplationScenarioMonth: 12.5 },
          { creditAmount: 200000, contemplationScenarioMonth: 12 },
        ],
      }),
    /mes de cenario/,
  );
});

test("keeps legacy single scenario compatible by applying it to all quotas in memory", () => {
  const result = calculateReferenceCapitalExclusiveStrategy({
    contemplationScenarioMonth: 18,
    includeContemplationScenarioInMaterial: true,
    quotas: [{ creditAmount: 150000 }, { creditAmount: 200000 }],
  });

  assert.deepEqual(
    result.input.quotas.map((quota) => quota.contemplationScenarioMonth),
    [18, 18],
  );
  assert.equal(result.input.includeContemplationScenariosInMaterial, true);
});

test("builds a reopenable versioned snapshot", () => {
  const result = calculateReferenceCapitalExclusiveStrategy({
    includeContemplationScenariosInMaterial: true,
    quotas: [
      { creditAmount: 150000, contemplationScenarioMonth: 12 },
      { creditAmount: 200000, contemplationScenarioMonth: 36 },
    ],
  });
  const snapshot = buildReferenceCapitalStrategySnapshot({
    leadContext: {
      leadId: "lead-1",
      leadName: "Lead Teste",
      responsibleName: "Consultor",
    },
    result,
  });

  assert.equal(snapshot.strategyType, "patrimonial_strategy");
  assert.equal(snapshot.financialProductKey, referenceCapitalProductKey);
  assert.equal(snapshot.financialProductVersion, referenceCapitalProductVersion);
  assert.equal(snapshot.input.includeContemplationScenariosInMaterial, true);
  assert.equal(snapshot.input.quotas[0]?.contemplationScenarioMonth, 12);
  assert.equal(snapshot.input.quotas[1]?.contemplationScenarioMonth, 36);
  assert.equal(isReferenceCapitalStrategySnapshot(snapshot), true);
  assert.equal(snapshot.result.consolidated.totalCreditCents, 35000000);
});
