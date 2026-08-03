import assert from "node:assert/strict";
import test from "node:test";
import { resolveCommercialProposalProjection } from "./commercial-proposal-projection.ts";

type TestProposal = {
  credit: number;
  kind: "conservative" | "recommended" | "patrimonial";
  monthlyPayment: number;
};

const recommendedSuggestion: TestProposal = {
  credit: 334231.3,
  kind: "recommended",
  monthlyPayment: 2300,
};

const recommendedCustomized: TestProposal = {
  credit: 340000,
  kind: "recommended",
  monthlyPayment: 2339.7,
};

const conservativeSuggestion: TestProposal = {
  credit: 300000,
  kind: "conservative",
  monthlyPayment: 2000,
};

const patrimonialSuggestion: TestProposal = {
  credit: 380000,
  kind: "patrimonial",
  monthlyPayment: 2600,
};

test("card without customized persisted proposal uses the original suggestion", () => {
  const projection = resolveCommercialProposalProjection(
    recommendedSuggestion,
    undefined,
  );

  assert.equal(projection.proposal, recommendedSuggestion);
  assert.equal(projection.sourceProposal, recommendedSuggestion);
  assert.equal(projection.isCustomized, false);
});

test("card with customized persisted proposal uses the persisted proposal", () => {
  const projection = resolveCommercialProposalProjection(recommendedSuggestion, {
    proposal: recommendedCustomized,
    proposalId: "proposal-1",
    savedAt: "2026-08-03T10:00:00.000Z",
    status: "success",
    variant: "customized",
  });

  assert.equal(projection.proposal, recommendedCustomized);
  assert.equal(projection.sourceProposal, recommendedSuggestion);
  assert.equal(projection.isCustomized, true);
  assert.equal(projection.proposal.credit, 340000);
  assert.equal(projection.proposal.monthlyPayment, 2339.7);
});

test("save updates only the corresponding proposal kind", () => {
  const records = {
    recommended: {
      proposal: recommendedCustomized,
      proposalId: "proposal-1",
      savedAt: "2026-08-03T10:00:00.000Z",
      status: "success",
      variant: "customized",
    },
  };

  const conservativeProjection = resolveCommercialProposalProjection(
    conservativeSuggestion,
    records.recommended,
  );
  const recommendedProjection = resolveCommercialProposalProjection(
    recommendedSuggestion,
    records.recommended,
  );
  const patrimonialProjection = resolveCommercialProposalProjection(
    patrimonialSuggestion,
    records.recommended,
  );

  assert.equal(conservativeProjection.proposal, conservativeSuggestion);
  assert.equal(recommendedProjection.proposal, recommendedCustomized);
  assert.equal(patrimonialProjection.proposal, patrimonialSuggestion);
});

test("new customized save replaces the projection with the latest version", () => {
  const latestCustomized: TestProposal = {
    credit: 345000,
    kind: "recommended",
    monthlyPayment: 2370.2,
  };

  const projection = resolveCommercialProposalProjection(recommendedSuggestion, {
    proposal: latestCustomized,
    proposalId: "proposal-2",
    savedAt: "2026-08-03T11:00:00.000Z",
    status: "success",
    variant: "customized",
  });

  assert.equal(projection.proposal, latestCustomized);
  assert.equal(projection.proposalId, "proposal-2");
  assert.equal(projection.savedAt, "2026-08-03T11:00:00.000Z");
});

test("missing optional returned fields do not break the projection", () => {
  const projection = resolveCommercialProposalProjection(recommendedSuggestion, {
    proposal: recommendedCustomized,
    status: "success",
    variant: "customized",
  });

  assert.equal(projection.proposal, recommendedCustomized);
  assert.equal(projection.proposalId, null);
  assert.equal(projection.savedAt, null);
});

test("proposal kinds remain independent and preserve monetary scale", () => {
  const projection = resolveCommercialProposalProjection(recommendedSuggestion, {
    proposal: recommendedCustomized,
    status: "success",
    variant: "customized",
  });

  assert.equal(projection.sourceProposal.credit, 334231.3);
  assert.equal(projection.sourceProposal.monthlyPayment, 2300);
  assert.equal(projection.proposal.credit, 340000);
  assert.equal(projection.proposal.monthlyPayment, 2339.7);
});
