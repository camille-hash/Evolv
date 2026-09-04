import assert from "node:assert/strict";
import test from "node:test";
import { parseContractActivationInput } from "./contract-activation-command.ts";

test("accepts every canonical operation and explicit authority", () => {
  for (const operation of ["activate", "deactivate", "reactivate"] as const) {
    assert.deepEqual(parseContractActivationInput({
      idempotencyKey: `c9a-key-${operation}`,
      operation,
      selectedFinancialAuthority: "not_applicable",
    }), {
      idempotencyKey: `c9a-key-${operation}`,
      operation,
      selectedFinancialAuthority: "not_applicable",
    });
  }
});

test("normalizes an omitted authority without inferring not_applicable", () => {
  assert.deepEqual(parseContractActivationInput({
    idempotencyKey: "c9a-key-unresolved",
    operation: "activate",
  }), {
    idempotencyKey: "c9a-key-unresolved",
    operation: "activate",
    selectedFinancialAuthority: null,
  });
});

test("rejects malformed, short, unknown, and implicit payloads", () => {
  assert.equal(parseContractActivationInput(null), null);
  assert.equal(parseContractActivationInput({ operation: "activate", idempotencyKey: "short" }), null);
  assert.equal(parseContractActivationInput({ operation: "cancel", idempotencyKey: "c9a-key-invalid" }), null);
  assert.equal(parseContractActivationInput({ operation: "activate", idempotencyKey: "c9a-key-invalid", selectedFinancialAuthority: "none" }), null);
});
