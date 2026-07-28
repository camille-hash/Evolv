import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContractBidOfferFileName,
  buildContractBidOfferStoragePath,
  calculateContractBidOfferSnapshot,
  isValidContractBidOfferTransition,
} from "./contract-bid-offer-calculations.ts";

test("calcula snapshot financeiro da oferta", () => {
  assert.deepEqual(
    calculateContractBidOfferSnapshot({
      cashAmount: 10_000,
      creditBaseAmount: 100_000,
      embeddedAmount: 20_000,
    }),
    {
      cashPercentage: 10,
      embeddedPercentage: 20,
      estimatedNetCredit: 80_000,
      totalAmount: 30_000,
      totalPercentage: 30,
    },
  );
});

test("mantem percentuais nulos quando a base e zero", () => {
  const snapshot = calculateContractBidOfferSnapshot({
    cashAmount: 10,
    creditBaseAmount: 0,
    embeddedAmount: 0,
  });
  assert.equal(snapshot.cashPercentage, undefined);
  assert.equal(snapshot.totalPercentage, undefined);
});

test("sanitiza e versiona o nome do arquivo", () => {
  assert.equal(
    buildContractBidOfferFileName({
      assemblyLabel: "Assembleia 08/2026",
      clientName: "João da Silva",
      version: 3,
    }),
    "estrategia-lance-joao-da-silva-assembleia-08-2026-v3.pdf",
  );
});

test("constroi caminho privado por tenant e versao", () => {
  assert.equal(
    buildContractBidOfferStoragePath({
      assemblyId: "assembly",
      contractId: "contract",
      fileName: "offer.pdf",
      offerId: "offer",
      organizationId: "org",
      version: 2,
    }),
    "org/contract/assembly/offer/v2/offer.pdf",
  );
});

test("valida o fluxo de status sem pular aprovacao", () => {
  assert.equal(isValidContractBidOfferTransition("generated", "sent"), true);
  assert.equal(isValidContractBidOfferTransition("sent", "approved"), true);
  assert.equal(isValidContractBidOfferTransition("approved", "submitted"), true);
  assert.equal(isValidContractBidOfferTransition("draft", "submitted"), false);
  assert.equal(isValidContractBidOfferTransition("generated", "approved"), false);
});
