import assert from "node:assert/strict";
import test from "node:test";

import {
  projectLeadMetaDeclarations,
  type LeadMetaDeclarations,
} from "./meta-declarations.ts";
import { monthlyInvestmentCapacityOptions } from "./monthly-investment-capacity.ts";

const emptyProjection: LeadMetaDeclarations = {
  monthlyInvestmentCapacity: null,
  declaredBrazilianAndCpfStatus: null,
};

test("projects each authorized monthly investment capacity", () => {
  for (const monthlyInvestmentCapacity of monthlyInvestmentCapacityOptions) {
    assert.deepEqual(
      projectLeadMetaDeclarations({
        monthly_investment_capacity: monthlyInvestmentCapacity,
      }),
      {
        monthlyInvestmentCapacity,
        declaredBrazilianAndCpfStatus: null,
      },
    );
  }
});

test("accepts only the normalized compound declaration values", () => {
  assert.equal(
    projectLeadMetaDeclarations({
      declared_brazilian_and_cpf_status: "yes",
    }).declaredBrazilianAndCpfStatus,
    "yes",
  );
  assert.equal(
    projectLeadMetaDeclarations({
      declared_brazilian_and_cpf_status: "no",
    }).declaredBrazilianAndCpfStatus,
    "no",
  );

  for (const value of [
    "sim",
    "não",
    "nao",
    "true",
    "false",
    "unexpected",
    true,
    1,
    ["yes"],
    { value: "yes" },
  ]) {
    assert.equal(
      projectLeadMetaDeclarations({
        declared_brazilian_and_cpf_status: value,
      }).declaredBrazilianAndCpfStatus,
      null,
    );
  }
});

test("returns the complete empty projection for invalid inputs", () => {
  for (const value of [
    null,
    undefined,
    [],
    "yes",
    1,
    true,
    {},
    { monthly_investment_capacity: "invalid" },
    { declared_brazilian_and_cpf_status: "Sim" },
  ]) {
    assert.deepEqual(projectLeadMetaDeclarations(value), emptyProjection);
  }
});

test("preserves each valid field independently", () => {
  const monthlyInvestmentCapacity = monthlyInvestmentCapacityOptions[0];

  assert.deepEqual(
    projectLeadMetaDeclarations({
      declared_brazilian_and_cpf_status: "invalid",
      monthly_investment_capacity: monthlyInvestmentCapacity,
    }),
    {
      monthlyInvestmentCapacity,
      declaredBrazilianAndCpfStatus: null,
    },
  );
  assert.deepEqual(
    projectLeadMetaDeclarations({
      declared_brazilian_and_cpf_status: "yes",
      monthly_investment_capacity: "invalid",
    }),
    {
      monthlyInvestmentCapacity: null,
      declaredBrazilianAndCpfStatus: "yes",
    },
  );
});

test("returns only the two public properties and ignores registered CPF data", () => {
  const input = Object.freeze({
    cpf: "synthetic-cpf-value",
    declared_brazilian_and_cpf_status: "no",
    extra: "ignored",
    monthly_investment_capacity: monthlyInvestmentCapacityOptions[1],
  });
  const before = structuredClone(input);
  const result = projectLeadMetaDeclarations(input);

  assert.deepEqual(Object.keys(result).sort(), [
    "declaredBrazilianAndCpfStatus",
    "monthlyInvestmentCapacity",
  ]);
  assert.deepEqual(result, {
    monthlyInvestmentCapacity: monthlyInvestmentCapacityOptions[1],
    declaredBrazilianAndCpfStatus: "no",
  });
  assert.deepEqual(input, before);
  assert.equal("cpf" in result, false);
  assert.equal("extra" in result, false);
});
