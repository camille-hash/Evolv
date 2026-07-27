import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBidSnapshot,
  isValidBidComposition,
} from "./contract-timeline-calculations.ts";

test("calcula o snapshot financeiro sem depender de mudanças futuras", () => {
  assert.deepEqual(
    calculateBidSnapshot({
      cashAmount: 10000,
      creditBaseAmount: 100000,
      embeddedAmount: 5000,
    }),
    {
      cashPercentage: 10,
      embeddedPercentage: 5,
      totalAmount: 15000,
      totalPercentage: 15,
    },
  );
});

test("mantém percentuais nulos quando a base de crédito é zero", () => {
  assert.deepEqual(
    calculateBidSnapshot({
      cashAmount: 1000,
      creditBaseAmount: 0,
      embeddedAmount: 0,
    }),
    {
      cashPercentage: null,
      embeddedPercentage: null,
      totalAmount: 1000,
      totalPercentage: null,
    },
  );
});

test("valida dinheiro, embutido e misto como dimensões de composição", () => {
  assert.equal(
    isValidBidComposition({
      cashAmount: 1000,
      composition: "cash",
      embeddedAmount: 0,
    }),
    true,
  );
  assert.equal(
    isValidBidComposition({
      cashAmount: 0,
      composition: "embedded",
      embeddedAmount: 1000,
    }),
    true,
  );
  assert.equal(
    isValidBidComposition({
      cashAmount: 1000,
      composition: "mixed",
      embeddedAmount: 1000,
    }),
    true,
  );
  assert.equal(
    isValidBidComposition({
      cashAmount: 1000,
      composition: "cash",
      embeddedAmount: 1,
    }),
    false,
  );
});
