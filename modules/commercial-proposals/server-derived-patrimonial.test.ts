import assert from "node:assert/strict";
import test from "node:test";
import { calculateCommercialTermsHash, validateCommercialProposalSavedSnapshotV1 } from "./snapshot-v1.ts";
import { buildServerDerivedPatrimonialSnapshot } from "./server-derived-patrimonial.ts";
import { calculateReferenceCapitalExclusiveStrategy } from "../patrimonial-strategy/reference-capital-2227.ts";

function example() {
  const result = calculateReferenceCapitalExclusiveStrategy({ quotas: [1,2,3].map((_, index) => ({ creditAmount: 200000, contemplationScenarioMonth: 36 + index })) });
  return buildServerDerivedPatrimonialSnapshot({ administratorTechnicalId: "admin-rodobens", customerDisplayName: "Cliente", customerId: "lead-1", result, simulationId: "simulation-1" });
}
test("derives the complete Rodobens 2227 proposal from official engine results", () => {
  const snapshot=example(); assert.deepEqual(validateCommercialProposalSavedSnapshotV1(snapshot),{valid:true}); assert.equal(snapshot.provenance.authority,"server_derived"); assert.equal(snapshot.product.displayName,"Grupo Exclusivo Contempla+"); assert.equal(snapshot.strategy.totalCredit.amountCents,60000000); assert.equal(snapshot.composition[0].commercialCatalogCode,"29.09.5526"); assert.deepEqual(snapshot.composition[0].installmentPhases.map(p=>p.installmentAmount.amountCents),[91633,109493,130793]); assert.deepEqual(snapshot.strategy.consolidatedInstallmentPhases.map(p=>p.installmentAmount.amountCents),[274899,328479,392379]); assert.deepEqual(snapshot.composition.map(i=>i.itemKey),["reference-capital-2227/item-001","reference-capital-2227/item-002","reference-capital-2227/item-003"]);
});
test("is deterministic for the same official result",()=>assert.equal(calculateCommercialTermsHash(example()),calculateCommercialTermsHash(example())));
