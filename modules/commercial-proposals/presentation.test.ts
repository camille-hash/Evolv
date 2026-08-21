import assert from "node:assert/strict";
import test from "node:test";
import type { CommercialProposal } from "./types";
import {
  getCommercialProposalStatusLabel,
  groupCommercialProposalLineages,
  readCommercialProposalProduct,
  readCommercialProposalQuotaCount,
  readCommercialProposalTotalCredit,
  projectCommercialProposalV1,
} from "./presentation.ts";

function proposal(input: Partial<CommercialProposal> & Pick<CommercialProposal, "id">): CommercialProposal {
  const timestamp = input.updatedAt ?? "2026-08-21T12:00:00.000Z";
  return {
    approvedAt: null, approvedBy: null, approvalRevocationReason: null,
    approvalRevokedAt: null, approvalRevokedBy: null,
    assembly: { dayOfMonth: null, effectiveNextAssemblyDate: null, source: null, suggestedNextAssemblyDate: null },
    commercialTermsHash: null, createdAt: timestamp, createdBy: null,
    expiredAt: null, leadId: "lead", metadata: {}, organizationId: "org",
    originalSnapshot: {}, previousVersionId: null, proposalNumber: `PROP-${input.id}`,
    rejectedAt: null, rejectedBy: null, rootProposalId: input.rootProposalId ?? input.id,
    savedSnapshot: {}, simulationId: null, snapshotAuthority: "legacy",
    snapshotSchemaVersion: "legacy", sourceSuggestion: "recommended", status: "generated",
    summary: {}, supersededAt: null, supersededBy: null, title: "Proposta",
    updatedAt: timestamp, version: 1, ...input,
  };
}

test("agrupa versões por linhagem e escolhe a versão corrente", () => {
  const lineages = groupCommercialProposalLineages([
    proposal({ id: "root-v1", rootProposalId: "root", version: 1 }),
    proposal({ id: "other", rootProposalId: "other", updatedAt: "2026-08-20T12:00:00Z" }),
    proposal({ id: "root-v2", rootProposalId: "root", version: 2 }),
  ]);
  assert.equal(lineages.length, 2);
  assert.equal(lineages[0].current.id, "root-v2");
  assert.deepEqual(lineages[0].versions.map((item) => item.id), ["root-v2", "root-v1"]);
});

test("lê apresentação C7 persistida e traduz status", () => {
  const item = proposal({
    id: "c7", status: "approved",
    savedSnapshot: { product: { displayName: "Grupo Exclusivo C7" }, strategy: { quotaCount: 3, totalCredit: { amountCents: 60000000 } } },
  });
  assert.equal(getCommercialProposalStatusLabel(item.status), "Aprovada");
  assert.equal(readCommercialProposalProduct(item), "Grupo Exclusivo C7");
  assert.equal(readCommercialProposalTotalCredit(item), 600000);
  assert.equal(readCommercialProposalQuotaCount(item), 3);
});

test("array vazio representa somente resposta persistente vazia", () => {
  assert.deepEqual(groupCommercialProposalLineages([]), []);
});

test("projeta composição e termos comerciais reais do V1", () => {
  const item = proposal({
    id: "v1",
    savedSnapshot: {
      schemaVersion: "commercial-proposal/v1",
      product: { displayName: "Grupo Exclusivo Contempla+", administratorDisplayName: "Rodobens", groupCode: "2227", modelCode: "IMV115-PCRED", termMonths: 216 },
      strategy: { totalCredit: { amountCents: 60000000 }, consolidatedInstallmentPhases: [
        { startInstallment: 1, endInstallment: 12, installmentAmount: { amountCents: 274899 } },
        { startInstallment: 13, endInstallment: 24, installmentAmount: { amountCents: 328479 } },
        { startInstallment: 25, endInstallment: 216, installmentAmount: { amountCents: 392379 } },
      ] },
      composition: Array.from({ length: 3 }, (_, index) => ({
        displayLabel: `Cota comercial ${index + 1}`, commercialCatalogCode: "29.09.5526",
        credit: { amountCents: 20000000 }, insurance: { included: true },
        adjustment: { index: "INCC", firstAdjustmentInstallment: 14 },
        contemplation: { isGuarantee: false }, installmentPhases: [
          { startInstallment: 1, endInstallment: 12, installmentAmount: { amountCents: 91633 } },
          { startInstallment: 13, endInstallment: 24, installmentAmount: { amountCents: 109493 } },
          { startInstallment: 25, endInstallment: 216, installmentAmount: { amountCents: 130793 } },
        ],
      })),
      commercialTerms: { conditions: ["Condição material"] },
    },
  });
  const view = projectCommercialProposalV1(item);
  assert.equal(view?.items.length, 3);
  assert.deepEqual(view?.items[0].phaseAmounts, [916.33, 1094.93, 1307.93]);
  assert.deepEqual(view?.totalPhaseAmounts, [2748.99, 3284.79, 3923.79]);
  assert.equal(view?.totalCredit, 600000);
  assert.equal(view?.firstAdjustmentInstallment, 14);
  assert.equal(view?.modelCode, "IMV115-PCRED");
});

test("proposta legada não entra na projeção V1", () => {
  assert.equal(projectCommercialProposalV1(proposal({ id: "legacy" })), null);
});
