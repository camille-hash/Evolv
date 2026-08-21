import assert from "node:assert/strict";
import test from "node:test";

import { getContractEvidenceValidity } from "./contract-evidence-types.ts";

test("maps every evidence lifecycle status to a read-model validity", () => {
  assert.equal(getContractEvidenceValidity("recorded"), "awaiting_validation");
  assert.equal(getContractEvidenceValidity("validated"), "current");
  assert.equal(getContractEvidenceValidity("invalidated"), "invalidated");
  assert.equal(getContractEvidenceValidity("superseded"), "superseded");
});
