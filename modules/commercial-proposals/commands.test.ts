import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseCommercialProposalCommand,
  readCommercialProposalErrorCode,
  mapCommercialProposalCommandError,
} from "./commands.ts";

test("parses the minimal revision command", () => {
  assert.deepEqual(parseCommercialProposalCommand({
    action: "revise",
    basedOnVersionId: "version-1",
    revisionReason: "new commercial terms",
    rootProposalId: "root-1",
    savedSnapshot: { credit: 300000 },
  }), {
    action: "revise",
    basedOnVersionId: "version-1",
    revisionReason: "new commercial terms",
    rootProposalId: "root-1",
    savedSnapshot: { credit: 300000 },
  });
});

test("rejects client-controlled lineage and lifecycle fields", () => {
  for (const forbidden of [
    "organizationId", "actorId", "proposalNumber", "version", "previousVersionId",
    "status", "approvedBy", "leadId", "simulationId", "sourceSuggestion",
  ]) {
    assert.equal(parseCommercialProposalCommand({
      action: "revise",
      basedOnVersionId: "version-1",
      rootProposalId: "root-1",
      savedSnapshot: {},
      [forbidden]: "forbidden",
    }), null);
  }
});

test("parses approval revocation and requires a nonblank reason", () => {
  assert.deepEqual(parseCommercialProposalCommand({
    action: "revokeApproval",
    proposalVersionId: "version-1",
    reason: "Commercial correction",
  }), {
    action: "revokeApproval",
    proposalVersionId: "version-1",
    reason: "Commercial correction",
  });
  assert.equal(parseCommercialProposalCommand({
    action: "revokeApproval",
    proposalVersionId: "version-1",
    reason: "   ",
  }), null);
});

test("maps stable database error codes without leaking tenant existence", () => {
  assert.equal(readCommercialProposalErrorCode("P0001: CP_REVISION_BASE_STALE"), "CP_REVISION_BASE_STALE");
  assert.equal(readCommercialProposalErrorCode("P0001: CP_CURRENT_VERSION_NOT_FOUND"), "CP_CURRENT_VERSION_NOT_FOUND");
  assert.equal(readCommercialProposalErrorCode("unexpected database error"), "CP_LINEAGE_INTEGRITY_ERROR");
  assert.equal(mapCommercialProposalCommandError("CP_INVALID_PAYLOAD").status, 400);
  assert.equal(mapCommercialProposalCommandError("CP_ACTOR_FORBIDDEN").status, 403);
  assert.equal(mapCommercialProposalCommandError("CP_CURRENT_VERSION_NOT_FOUND").status, 404);
  assert.equal(mapCommercialProposalCommandError("CP_REVISION_BASE_STALE").status, 409);
  assert.equal(mapCommercialProposalCommandError("CP_SNAPSHOT_INVALID").status, 422);
});

test("server commands delegate each lifecycle mutation to exactly one RPC", () => {
  const source = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
  for (const [start, end, rpc] of [
    ["export async function reviseCommercialProposal", "export async function markCommercialProposalAsPresented", "revise_commercial_proposal_transaction"],
    ["export async function approveCommercialProposal", "export async function revokeCommercialProposalApproval", "approve_commercial_proposal_transaction"],
    ["export async function revokeCommercialProposalApproval", "export async function rejectCommercialProposal", "revoke_commercial_proposal_approval_transaction"],
  ]) {
    const command = source.slice(source.indexOf(start), source.indexOf(end));
    assert.match(command, new RegExp(rpc));
    assert.equal(command.match(/\.rpc\(/g)?.length, 1);
    assert.doesNotMatch(command, /\.insert\(|resolveNextCommercialProposalVersion/);
  }
});
