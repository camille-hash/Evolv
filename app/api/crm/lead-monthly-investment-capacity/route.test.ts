import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { createLeadMetaDeclarationsGetHandler } from "./route.ts";

const genericAccessError =
  "Nao foi possivel consultar a capacidade de investimento mensal.";

test("returns 400 for an absent or blank lead id", async () => {
  let serviceCalls = 0;
  const handler = createLeadMetaDeclarationsGetHandler(async () => {
    serviceCalls += 1;
    return { error: genericAccessError, ok: false, status: 500 };
  });

  for (const url of [
    "http://localhost/api/crm/lead-monthly-investment-capacity",
    "http://localhost/api/crm/lead-monthly-investment-capacity?leadId=%20",
  ]) {
    const response = await handler(new NextRequest(url));
    assert.equal(response.status, 400);
  }
  assert.equal(serviceCalls, 0);
});

test("forwards the bearer token and returns exactly the additive contract", async () => {
  const calls: unknown[] = [];
  const handler = createLeadMetaDeclarationsGetHandler(
    async (accessToken, leadId) => {
      calls.push({ accessToken, leadId });
      return {
        declaredBrazilianAndCpfStatus: "yes",
        monthlyInvestmentCapacity: "R$ 1.000 a R$ 2.000/mês",
        ok: true,
      };
    },
  );
  const response = await handler(new NextRequest(
    "http://localhost/api/crm/lead-monthly-investment-capacity?leadId=lead-1",
    { headers: { Authorization: "Bearer token-1" } },
  ));

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ accessToken: "token-1", leadId: "lead-1" }]);
  assert.deepEqual(await response.json(), {
    declaredBrazilianAndCpfStatus: "yes",
    monthlyInvestmentCapacity: "R$ 1.000 a R$ 2.000/mês",
  });
});

test("returns 200 when the single-row projection contains two nulls", async () => {
  const handler = createLeadMetaDeclarationsGetHandler(async () => ({
    declaredBrazilianAndCpfStatus: null,
    monthlyInvestmentCapacity: null,
    ok: true,
  }));
  const response = await handler(new NextRequest(
    "http://localhost/api/crm/lead-monthly-investment-capacity?leadId=lead-1",
  ));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    declaredBrazilianAndCpfStatus: null,
    monthlyInvestmentCapacity: null,
  });
});

test("forwards missing tokens and preserves generic service errors", async () => {
  const calls: unknown[] = [];
  const handler = createLeadMetaDeclarationsGetHandler(
    async (accessToken, leadId) => {
      calls.push({ accessToken, leadId });
      return { error: genericAccessError, ok: false, status: 401 };
    },
  );
  const response = await handler(new NextRequest(
    "http://localhost/api/crm/lead-monthly-investment-capacity?leadId=lead-1",
  ));

  assert.equal(response.status, 401);
  assert.deepEqual(calls, [{ accessToken: null, leadId: "lead-1" }]);
  assert.deepEqual(await response.json(), { error: genericAccessError });
});
