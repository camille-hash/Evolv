import assert from "node:assert/strict";
import test from "node:test";
import {
  executeContractFinancialAdapterSafely,
  executeContractFinancialEffect,
} from "./contract-activation-failure.ts";

test("CE throw becomes a safe typed failure without invoking legacy", async () => {
  let ceCalls = 0;
  const legacyCalls = 0;
  let finishCalls = 0;
  let persistedResult: unknown;
  const { execution: result } = await executeContractFinancialEffect(
    async () => {
      ceCalls += 1;
      throw new Error("secret CE adapter detail");
    },
    async (execution) => {
      finishCalls += 1;
      persistedResult = execution;
      return { error: null };
    },
  );

  assert.deepEqual(result, {
    message: "O processamento financeiro encontrou uma falha inesperada.",
    ok: false,
  });
  assert.equal(ceCalls, 1);
  assert.equal(legacyCalls, 0);
  assert.equal(finishCalls, 1);
  assert.deepEqual(persistedResult, result);
  assert.doesNotMatch(result.message, /secret|adapter detail/i);
});

test("legacy throw becomes a safe typed failure without invoking CE", async () => {
  let legacyCalls = 0;
  const ceCalls = 0;
  let finishCalls = 0;
  let persistedResult: unknown;
  const { execution: result } = await executeContractFinancialEffect(
    async () => {
      legacyCalls += 1;
      throw new Error("secret legacy adapter detail");
    },
    async (execution) => {
      finishCalls += 1;
      persistedResult = execution;
      return { error: null };
    },
  );

  assert.equal(result.ok, false);
  assert.equal(legacyCalls, 1);
  assert.equal(ceCalls, 0);
  assert.equal(finishCalls, 1);
  assert.deepEqual(persistedResult, result);
  assert.doesNotMatch(result.message, /secret|adapter detail/i);
});

test("typed adapter failure keeps its existing safe message", async () => {
  assert.deepEqual(
    await executeContractFinancialAdapterSafely(async () => ({
      message: "Falha financeira segura.",
      ok: false as const,
    })),
    { message: "Falha financeira segura.", ok: false },
  );
});
