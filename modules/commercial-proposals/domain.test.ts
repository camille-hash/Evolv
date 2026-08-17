import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCommercialProposalApprovalEligibility,
  assertNoApprovedCommercialProposalVersion,
  assertCommercialProposalSnapshotIsMutable,
  assertCommercialProposalTransition,
  buildCommercialProposalStatusUpdatePayload,
  buildCanonicalCommercialProposalRoot,
  calculateNextCommercialProposalVersion,
  calculateNextAssemblyDate,
  normalizeCommercialProposalAssembly,
  requireCanonicalCommercialProposalRoot,
  shouldRequireCommercialProposalSimulationId,
} from "./domain.ts";
import {
  crmLeadCommercialProposalSources,
  isCrmLeadCommercialProposalStatus,
  type CreateCrmLeadCommercialProposalInput,
} from "../crm/crm-lead-commercial-proposals.ts";
import type { ContractInput } from "../contracts/types.ts";

test("allows formal proposal lifecycle transitions", () => {
  assert.doesNotThrow(() =>
    assertCommercialProposalTransition("generated", "presented"),
  );
  assert.doesNotThrow(() =>
    assertCommercialProposalTransition("presented", "approved"),
  );
  assert.doesNotThrow(() =>
    assertCommercialProposalTransition("approved", "superseded"),
  );
});

test("rejects invalid lifecycle transitions", () => {
  assert.throws(
    () => assertCommercialProposalTransition("approved", "rejected"),
    /Transicao de proposta invalida/,
  );
  assert.throws(
    () => assertCommercialProposalTransition("expired", "approved"),
    /Transicao de proposta invalida/,
  );
});

test("prevents mutation of historical snapshots", () => {
  assert.doesNotThrow(() =>
    assertCommercialProposalSnapshotIsMutable("generated"),
  );
  assert.throws(
    () => assertCommercialProposalSnapshotIsMutable("approved"),
    /Snapshots de propostas historicas/,
  );
});

test("calculates the next monthly assembly date with month-end clamping", () => {
  assert.equal(
    calculateNextAssemblyDate({
      dayOfMonth: 20,
      referenceDate: new Date("2026-08-01T12:00:00.000Z"),
    }),
    "2026-08-20",
  );
  assert.equal(
    calculateNextAssemblyDate({
      dayOfMonth: 31,
      referenceDate: new Date("2026-02-15T12:00:00.000Z"),
    }),
    "2026-02-28",
  );
  assert.equal(
    calculateNextAssemblyDate({
      dayOfMonth: 1,
      referenceDate: new Date("2026-08-20T12:00:00.000Z"),
    }),
    "2026-09-01",
  );
});

test("normalizes calculated and manual assembly dates", () => {
  assert.deepEqual(
    normalizeCommercialProposalAssembly(
      { dayOfMonth: 10 },
      new Date("2026-08-01T12:00:00.000Z"),
    ),
    {
      dayOfMonth: 10,
      effectiveNextAssemblyDate: "2026-08-10",
      source: "calculated",
      suggestedNextAssemblyDate: "2026-08-10",
    },
  );

  assert.deepEqual(
    normalizeCommercialProposalAssembly({
      dayOfMonth: 10,
      effectiveNextAssemblyDate: "2026-09-15",
      source: "manual",
      suggestedNextAssemblyDate: "2026-09-10",
    }),
    {
      dayOfMonth: 10,
      effectiveNextAssemblyDate: "2026-09-15",
      source: "manual",
      suggestedNextAssemblyDate: "2026-09-10",
    },
  );
});

test("keeps legacy proposals without simulation id compatible", () => {
  assert.equal(
    shouldRequireCommercialProposalSimulationId({
      metadata: { savedFrom: "legacy_import" },
      status: "saved",
    }),
    false,
  );
  assert.equal(isCrmLeadCommercialProposalStatus("saved"), true);
});

test("requires simulation id for proposals originated by the simulator", () => {
  assert.equal(
    shouldRequireCommercialProposalSimulationId({
      metadata: { savedFrom: "simulator_anchored_proposal" },
      status: "generated",
    }),
    true,
  );
  assert.equal(
    shouldRequireCommercialProposalSimulationId({
      metadata: { savedFrom: "commercial_proposal_editor" },
      status: "generated",
    }),
    true,
  );
});

test("requires simulation id for proposals originated by Multi-Cotas", () => {
  assert.equal(
    shouldRequireCommercialProposalSimulationId({
      metadata: { savedFrom: "multi_cotas" },
      status: "generated",
    }),
    true,
  );
});

test("validates the lead simulation organization relationship as a server concern", () => {
  const input: CreateCrmLeadCommercialProposalInput = {
    leadId: "lead-1",
    metadata: { savedFrom: "simulator_anchored_proposal" },
    originalSnapshot: { leadId: "lead-1" },
    savedSnapshot: { leadId: "lead-1" },
    simulationId: "simulation-1",
    sourceSuggestion: "recommended",
    summary: {},
    title: "Proposta Recomendada",
  };

  assert.equal(input.leadId, "lead-1");
  assert.equal(input.simulationId, "simulation-1");
});

test("calculates next proposal version from existing lineage versions", () => {
  assert.equal(calculateNextCommercialProposalVersion([]), 1);
  assert.equal(calculateNextCommercialProposalVersion([1, 2, 4]), 5);
  assert.equal(calculateNextCommercialProposalVersion([1, 0, -1, 3.5]), 2);
});

test("new versions preserve previous records by carrying lineage references", () => {
  const previous = {
    id: "proposal-v1",
    proposalNumber: "PROP-20260801-ABC",
    version: 1,
  };
  const nextVersion = calculateNextCommercialProposalVersion([
    previous.version,
  ]);

  assert.equal(nextVersion, 2);
  assert.equal(previous.version, 1);
});

test("initial creation uses the same generated id as its canonical root", () => {
  assert.deepEqual(buildCanonicalCommercialProposalRoot("proposal-v1"), {
    id: "proposal-v1",
    rootProposalId: "proposal-v1",
  });
});

test("a new version propagates the persisted canonical root", () => {
  assert.equal(
    requireCanonicalCommercialProposalRoot({
      id: "proposal-v2",
      rootProposalId: "proposal-v1",
    }),
    "proposal-v1",
  );
});

test("a version cannot choose or infer a missing root", () => {
  assert.throws(
    () =>
      requireCanonicalCommercialProposalRoot({
        id: "proposal-v1",
        rootProposalId: "",
      }),
    /raiz canonica/,
  );
});

test("allows approval from generated, presented and legacy saved statuses", () => {
  assert.doesNotThrow(() =>
    assertCommercialProposalApprovalEligibility("generated"),
  );
  assert.doesNotThrow(() =>
    assertCommercialProposalApprovalEligibility("presented"),
  );
  assert.doesNotThrow(() =>
    assertCommercialProposalApprovalEligibility("saved"),
  );
});

test("rejects approval from invalid statuses", () => {
  assert.throws(
    () => assertCommercialProposalApprovalEligibility("draft"),
    /nao pode ser aprovada/,
  );
  assert.throws(
    () => assertCommercialProposalApprovalEligibility("approved"),
    /nao pode ser aprovada/,
  );
});

test("blocks edition after approval at domain level", () => {
  assert.throws(
    () => assertCommercialProposalSnapshotIsMutable("approved"),
    /nao podem ser alterados/,
  );
});

test("blocks duplicate approved versions in the same lineage", () => {
  assert.doesNotThrow(() =>
    assertNoApprovedCommercialProposalVersion({ approvedVersionId: null }),
  );
  assert.throws(
    () =>
      assertNoApprovedCommercialProposalVersion({
        approvedVersionId: "proposal-v1",
      }),
    /ja possui uma versao aprovada/,
  );
});

test("keeps organization isolation as a required server relationship", () => {
  const proposalContext = {
    leadOrganizationId: "org-1",
    profileOrganizationId: "org-1",
    simulationOrganizationId: "org-1",
  };

  assert.equal(
    proposalContext.leadOrganizationId,
    proposalContext.profileOrganizationId,
  );
  assert.equal(
    proposalContext.simulationOrganizationId,
    proposalContext.profileOrganizationId,
  );
});

test("preserves suggested and effective assembly dates independently", () => {
  assert.deepEqual(
    normalizeCommercialProposalAssembly({
      dayOfMonth: 15,
      effectiveNextAssemblyDate: "2026-09-20",
      source: "manual",
      suggestedNextAssemblyDate: "2026-09-15",
    }),
    {
      dayOfMonth: 15,
      effectiveNextAssemblyDate: "2026-09-20",
      source: "manual",
      suggestedNextAssemblyDate: "2026-09-15",
    },
  );
});

test("does not invent assembly dates when no assembly source exists", () => {
  assert.deepEqual(normalizeCommercialProposalAssembly(null), {
    dayOfMonth: null,
    effectiveNextAssemblyDate: null,
    source: null,
    suggestedNextAssemblyDate: null,
  });
});

test("status update payload does not send undefined properties", () => {
  const payload = buildCommercialProposalStatusUpdatePayload({
    actorId: "profile-1",
    nextStatus: "presented",
    occurredAt: "2026-08-01T12:00:00.000Z",
  });

  assert.deepEqual(Object.values(payload).includes(undefined), false);
  assert.deepEqual(payload, {
    presented_at: "2026-08-01T12:00:00.000Z",
    status: "presented",
  });
});

test("legacy aliases continue exposing proposal sources", () => {
  assert.deepEqual([...crmLeadCommercialProposalSources], [
    "conservative",
    "recommended",
    "patrimonial",
  ]);
});

test("current proposal save input remains compatible with formal aggregate", () => {
  const input: CreateCrmLeadCommercialProposalInput = {
    leadId: "lead-1",
    metadata: { savedFrom: "manual_proposal" },
    originalSnapshot: { version: "original" },
    savedSnapshot: { version: "saved" },
    sourceSuggestion: "patrimonial",
    summary: { commercialCredit: 260000 },
    title: "Proposta Patrimonial",
  };

  assert.equal(input.sourceSuggestion, "patrimonial");
  assert.equal(input.simulationId, undefined);
});

test("contract proposal fields are optional preparation fields only", () => {
  const input: ContractInput = {
    clientId: "client-1",
    creditAmount: 260000,
    status: "draft",
  };

  assert.equal(input.sourceProposalId, undefined);
  assert.equal(input.sourceProposalVersion, undefined);
  assert.equal(input.proposalSnapshot, undefined);
});
