import assert from "node:assert/strict";
import test from "node:test";

import {
  monthlyInvestmentCapacityOptions,
  projectMonthlyInvestmentCapacity,
} from "./monthly-investment-capacity.ts";

test("accepts every explicitly supported monthly investment range", () => {
  for (const option of monthlyInvestmentCapacityOptions) {
    assert.equal(projectMonthlyInvestmentCapacity(option), option);
  }
});

test("returns null for absent, empty, unknown, or malformed values", () => {
  for (const value of [
    null,
    undefined,
    "",
    "R$ 5.000",
    "R$ 1.000 a R$ 3.000/mês",
    { value: monthlyInvestmentCapacityOptions[0] },
    [monthlyInvestmentCapacityOptions[0]],
  ]) {
    assert.equal(projectMonthlyInvestmentCapacity(value), null);
  }
});
