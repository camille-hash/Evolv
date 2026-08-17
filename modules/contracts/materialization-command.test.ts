import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseMaterializeApprovedCommercialProposalInput } from "./materialization-command.ts";
import { parseContractInput } from "./validation.ts";

const valid = { proposalVersionId: "11111111-1111-4111-8111-111111111111", clientId: "22222222-2222-4222-8222-222222222222" };
test("parses the strict public materialization command", () => assert.deepEqual(parseMaterializeApprovedCommercialProposalInput(valid), valid));
test("accepts a bounded correlation key", () => assert.equal(parseMaterializeApprovedCommercialProposalInput({ ...valid, idempotencyKey: "materialize:123" })?.idempotencyKey, "materialize:123"));
test("rejects client controlled materialization fields", () => {
  for (const field of ["organizationId", "snapshot", "authority", "administratorId", "status", "contractNumber", "commissionPlanId"])
    assert.equal(parseMaterializeApprovedCommercialProposalInput({ ...valid, [field]: "x" }), null);
});
test("rejects malformed ids and keys", () => {
  assert.equal(parseMaterializeApprovedCommercialProposalInput({ ...valid, clientId: "x" }), null);
  assert.equal(parseMaterializeApprovedCommercialProposalInput({ ...valid, idempotencyKey: "short" }), null);
});
test("legacy contract doors reject materialization identity fields", () => {
  for (const field of ["contractMaterializationId", "sourceCompositionItemKey", "commercialCatalogCode"]) {
    assert.equal(parseContractInput({ [field]: "internal" }).ok, false);
  }
  const leadDoor = readFileSync(new URL("./lead-contract-operation.ts", import.meta.url), "utf8");
  for (const field of ["contractMaterializationId", "sourceCompositionItemKey", "commercialCatalogCode"])
    assert.match(leadDoor, new RegExp(`"${field}"`));
});
