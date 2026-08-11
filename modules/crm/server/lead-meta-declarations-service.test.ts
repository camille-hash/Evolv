import assert from "node:assert/strict";
import test from "node:test";

import {
  getLeadMetaDeclarations,
  type LeadMetaDeclarationsRpcClient,
} from "./lead-monthly-investment-capacity-service.ts";
import { monthlyInvestmentCapacityOptions } from "../monthly-investment-capacity.ts";

const genericAccessError =
  "Nao foi possivel consultar a capacidade de investimento mensal.";

type ClientOptions = {
  data?: unknown;
  getUserError?: unknown;
  rpcError?: unknown;
  user?: object | null;
};

function createFakeClient(options: ClientOptions = {}) {
  const calls: Array<{ name: string; params: unknown }> = [];
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: options.user === undefined ? { id: "user-1" } : options.user },
        error: options.getUserError ?? null,
      }),
    },
    rpc: async (name: string, params: unknown) => {
      calls.push({ name, params });
      return {
        data: options.data ?? [],
        error: options.rpcError ?? null,
      };
    },
  } as unknown as LeadMetaDeclarationsRpcClient;

  return { calls, client };
}

test("calls only the compound RPC and projects its single row", async () => {
  const monthlyInvestmentCapacity = monthlyInvestmentCapacityOptions[0];
  const { calls, client } = createFakeClient({
    data: [{
      declared_brazilian_and_cpf_status: "yes",
      monthly_investment_capacity: monthlyInvestmentCapacity,
    }],
  });

  const result = await getLeadMetaDeclarations(
    "access-token",
    "lead-1",
    () => client,
  );

  assert.deepEqual(calls, [{
    name: "get_lead_meta_declarations",
    params: { p_lead_id: "lead-1" },
  }]);
  assert.deepEqual(result, {
    declaredBrazilianAndCpfStatus: "yes",
    monthlyInvestmentCapacity,
    ok: true,
  });
});

test("preserves valid partial and empty single-row projections", async () => {
  const monthlyInvestmentCapacity = monthlyInvestmentCapacityOptions[1];
  const cases = [
    {
      expected: {
        declaredBrazilianAndCpfStatus: null,
        monthlyInvestmentCapacity,
        ok: true,
      },
      row: { monthly_investment_capacity: monthlyInvestmentCapacity },
    },
    {
      expected: {
        declaredBrazilianAndCpfStatus: "no",
        monthlyInvestmentCapacity: null,
        ok: true,
      },
      row: { declared_brazilian_and_cpf_status: "no" },
    },
    {
      expected: {
        declaredBrazilianAndCpfStatus: null,
        monthlyInvestmentCapacity: null,
        ok: true,
      },
      row: {
        declared_brazilian_and_cpf_status: null,
        monthly_investment_capacity: null,
      },
    },
  ];

  for (const { expected, row } of cases) {
    const { client } = createFakeClient({ data: [row] });
    assert.deepEqual(
      await getLeadMetaDeclarations("access-token", "lead-1", () => client),
      expected,
    );
  }
});

test("nulls only an invalid field from a valid single row", async () => {
  const monthlyInvestmentCapacity = monthlyInvestmentCapacityOptions[2];
  const cases = [
    {
      data: [{
        declared_brazilian_and_cpf_status: "invalid",
        monthly_investment_capacity: monthlyInvestmentCapacity,
      }],
      expected: {
        declaredBrazilianAndCpfStatus: null,
        monthlyInvestmentCapacity,
        ok: true,
      },
    },
    {
      data: [{
        declared_brazilian_and_cpf_status: "yes",
        monthly_investment_capacity: "invalid",
      }],
      expected: {
        declaredBrazilianAndCpfStatus: "yes",
        monthlyInvestmentCapacity: null,
        ok: true,
      },
    },
  ];

  for (const { data, expected } of cases) {
    const { client } = createFakeClient({ data });
    assert.deepEqual(
      await getLeadMetaDeclarations("access-token", "lead-1", () => client),
      expected,
    );
  }
});

test("fails closed before projection for invalid cardinality or shape", async () => {
  for (const data of [
    [],
    [{ monthly_investment_capacity: null }, { monthly_investment_capacity: null }],
    null,
    { monthly_investment_capacity: null },
  ]) {
    const { client } = createFakeClient({ data });
    assert.deepEqual(
      await getLeadMetaDeclarations("access-token", "lead-1", () => client),
      { error: genericAccessError, ok: false, status: 500 },
    );
  }
});

test("preserves authentication and generic error boundaries", async () => {
  let factoryCalls = 0;
  assert.deepEqual(
    await getLeadMetaDeclarations(null, "lead-1", () => {
      factoryCalls += 1;
      throw new Error("must not create a client");
    }),
    { error: genericAccessError, ok: false, status: 401 },
  );
  assert.equal(factoryCalls, 0);

  for (const options of [
    { getUserError: new Error("invalid token") },
    { user: null },
  ]) {
    const { client } = createFakeClient(options);
    assert.deepEqual(
      await getLeadMetaDeclarations("access-token", "lead-1", () => client),
      { error: genericAccessError, ok: false, status: 401 },
    );
  }

  const { client } = createFakeClient({ rpcError: new Error("rpc failure") });
  assert.deepEqual(
    await getLeadMetaDeclarations("access-token", "lead-1", () => client),
    { error: genericAccessError, ok: false, status: 500 },
  );
  assert.deepEqual(
    await getLeadMetaDeclarations("access-token", "lead-1", () => {
      throw new Error("network or configuration failure");
    }),
    { error: genericAccessError, ok: false, status: 500 },
  );
});
