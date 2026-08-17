import {
  buildCommercialProposalSavedSnapshotV1,
  type CommercialProposalSavedSnapshotV1,
} from "./snapshot-v1.ts";
import {
  referenceCapitalEngineKey,
  referenceCapitalEngineVersion,
  referenceCapitalProductKey,
  referenceCapitalProductVersion,
  type ReferenceCapitalStrategyResult,
} from "../patrimonial-strategy/reference-capital-2227.ts";

export type ServerDerivedPatrimonialIntent = {
  quotas: Array<{ creditAmountCents: number; contemplationScenarioMonth?: number }>;
};

export function buildServerDerivedPatrimonialSnapshot(input: {
  administratorTechnicalId: string | null;
  customerDisplayName: string;
  customerId: string;
  result: ReferenceCapitalStrategyResult;
  simulationId: string;
}): CommercialProposalSavedSnapshotV1 {
  const phases = (amounts: [number, number, number]) => [
    phase("months-1-12", 1, 12, amounts[0]),
    phase("months-13-24", 13, 24, amounts[1]),
    phase("months-25-216", 25, 216, amounts[2]),
  ];
  return buildCommercialProposalSavedSnapshotV1({
    schemaVersion: "commercial-proposal/v1",
    proposalKind: "patrimonial_strategy",
    provenance: {
      authority: "server_derived",
      simulationId: input.simulationId,
      strategyId: input.simulationId,
      strategyVersion: "STR-003",
      calculationEngineKey: referenceCapitalEngineKey,
      calculationEngineVersion: referenceCapitalEngineVersion,
      financialProductKey: referenceCapitalProductKey,
      financialProductVersion: referenceCapitalProductVersion,
      sourceSuggestionId: null,
    },
    parties: { customerId: input.customerId, customerDisplayName: input.customerDisplayName, consultantDisplayName: null },
    product: {
      productKey: referenceCapitalProductKey,
      productVersion: referenceCapitalProductVersion,
      displayName: "Grupo Exclusivo Contempla+",
      administratorTechnicalId: input.administratorTechnicalId,
      administratorReferenceKey: "rodobens",
      administratorDisplayName: "Rodobens",
      groupCode: "2227",
      modelCode: "IMV115-PCRED",
      termMonths: input.result.consolidated.termMonths,
    },
    strategy: {
      quotaCount: input.result.consolidated.quotaCount,
      totalCredit: money(input.result.consolidated.totalCreditCents),
      consolidatedInstallmentPhases: phases([
        input.result.consolidated.installmentMonths1To12Cents,
        input.result.consolidated.installmentMonths13To24Cents,
        input.result.consolidated.installmentMonths25To216Cents,
      ]),
    },
    composition: input.result.quotas.map((quota) => ({
      itemKey: `reference-capital-2227/item-${String(quota.position).padStart(3, "0")}`,
      position: quota.position,
      displayLabel: `Cota comercial ${quota.position}`,
      commercialCatalogCode: quota.catalogCode,
      credit: money(quota.creditCents),
      termMonths: quota.termMonths,
      installmentPhases: phases([quota.installmentMonths1To12Cents, quota.installmentMonths13To24Cents, quota.installmentMonths25To216Cents]),
      insurance: { included: quota.insuranceIncluded, description: "Seguro prestamista incluso" },
      adjustment: { index: quota.inccRule.index, periodicity: quota.inccRule.periodicity, firstAdjustmentInstallment: quota.inccRule.firstAdjustmentInstallment, projectionApplied: quota.inccRule.projectionApplied },
      contemplation: { scenarioInstallment: quota.contemplationScenarioMonth, isGuarantee: false, rules: quota.contemplationRules },
    })),
    commercialTerms: { conditions: ["Atualizacao anual pelo INCC, com primeiro reajuste na 14a parcela."] },
    disclosures: [{ disclosureKey: "contemplation-planning-not-guaranteed", category: "material_term", text: "O cenario de contemplacao e exclusivamente de planejamento e nao constitui garantia." }],
    presentationReference: null,
  });
}

const money = (amountCents: number) => ({ amountCents, currency: "BRL" as const });
const phase = (phaseKey: string, startInstallment: number, endInstallment: number, amountCents: number) => ({ phaseKey, startInstallment, endInstallment, installmentAmount: money(amountCents) });
