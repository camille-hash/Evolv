import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildProposalMaterializationBlockers } from "./materialization-experience.ts";

const eligible = {
  currentVersionId: "proposal-current",
  proposalId: "proposal-current",
  simulationId: "simulation-1",
  snapshotAuthority: "server_derived",
  snapshotSchemaVersion: "commercial-proposal/v1",
  status: "approved",
};

test("keeps an approved current server-derived V1 proposal eligible", () => {
  assert.deepEqual(buildProposalMaterializationBlockers(eligible), []);
});

test("explains lifecycle and lineage blockers without exposing internals", () => {
  assert.deepEqual(buildProposalMaterializationBlockers({ ...eligible, proposalId: "old", status: "generated" }), [
    "Apenas a versao corrente pode ser materializada.",
    "A proposta precisa estar aprovada.",
  ]);
});

test("blocks legacy, client-authored and simulationless proposals", () => {
  const blockers = buildProposalMaterializationBlockers({ ...eligible, simulationId: null, snapshotAuthority: "client_authored", snapshotSchemaVersion: "legacy" });
  assert.equal(blockers.length, 3);
});

test("read model queries the canonical commercial proposal table", () => {
  const server = readFileSync(new URL("./materialization-experience-server.ts", import.meta.url), "utf8");
  assert.match(server, /\.from\("crm_lead_commercial_proposals"\)/);
  assert.doesNotMatch(server, /\.from\("commercial_proposals"\)/);
});
