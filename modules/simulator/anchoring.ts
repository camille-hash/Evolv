import {
  calculateSimulatorScenarios,
  type SimulatorCalculationResult,
  type SimulatorInput,
  type SimulatorScenarioKey,
} from "@/modules/simulator/engine";
import {
  buildSimulatorCommercialPresentation,
  type BidType,
  type InsuranceOption,
  type SimulatorCommercialPresentation,
} from "@/modules/simulator/presentation";

export type AnchoredProposalKind =
  | "conservative"
  | "recommended"
  | "patrimonial";

export type AnchoredProposal = {
  kind: AnchoredProposalKind;
  label: string;
  objective: string;
  referenceInstallment: number;
  targetInstallment: number;
  distanceFromReference: number;
  scenarioKey: SimulatorScenarioKey;
  input: SimulatorInput;
  presentation: SimulatorCommercialPresentation;
};

export type AnchoredProposalInput = {
  referenceInstallment: number;
  calculation: SimulatorCalculationResult;
  input: SimulatorInput;
  insuranceOption: InsuranceOption;
  bidType: BidType;
  contemplationMonth: number;
  selectedScenarioKey: SimulatorScenarioKey;
};

export type AnchoredProposalCreditAdjustmentInput = {
  baseInstallment: number;
  input: SimulatorInput;
  targetInstallment: number;
};

const proposalDefinitions: Array<{
  kind: AnchoredProposalKind;
  label: string;
  objective: string;
  targetMultiplier: number;
}> = [
  {
    kind: "conservative",
    label: "Conservadora",
    objective: "Proxima da parcela confortavel informada pelo cliente.",
    targetMultiplier: 1,
  },
  {
    kind: "recommended",
    label: "Recomendada",
    objective: "Pouco acima da referencia para equilibrar conforto e potencial.",
    targetMultiplier: 1.15,
  },
  {
    kind: "patrimonial",
    label: "Patrimonial",
    objective: "Acima da referencia para ampliar potencial patrimonial.",
    targetMultiplier: 1.3,
  },
];

export function buildAnchoredProposals({
  referenceInstallment,
  calculation,
  input,
  insuranceOption,
  bidType,
  contemplationMonth,
  selectedScenarioKey,
}: AnchoredProposalInput): AnchoredProposal[] {
  const safeReferenceInstallment = Math.max(0, referenceInstallment);

  if (safeReferenceInstallment <= 0) {
    return [];
  }

  const basePresentation = buildSimulatorCommercialPresentation({
    calculation,
    input,
    selectedScenarioKey,
    insuranceOption,
    bidType,
    contemplationMonth,
  });
  const baseInstallment =
    basePresentation.installmentBeforeContemplation > 0
      ? basePresentation.installmentBeforeContemplation
      : 0;

  return proposalDefinitions.map((definition) => {
    const targetInstallment =
      safeReferenceInstallment * definition.targetMultiplier;
    const proposalInput = buildAnchoredProposalInput({
      baseInstallment,
      input,
      targetInstallment,
    });
    const proposalCalculation = calculateSimulatorScenarios(proposalInput);
    const presentation = buildSimulatorCommercialPresentation({
      calculation: proposalCalculation,
      input: proposalInput,
      selectedScenarioKey,
      insuranceOption,
      bidType,
      contemplationMonth,
    });

    return {
      ...definition,
      referenceInstallment: safeReferenceInstallment,
      targetInstallment,
      distanceFromReference:
        presentation.installmentBeforeContemplation - safeReferenceInstallment,
      scenarioKey: selectedScenarioKey,
      input: proposalInput,
      presentation,
    };
  });
}

function buildAnchoredProposalInput({
  baseInstallment,
  input,
  targetInstallment,
}: AnchoredProposalCreditAdjustmentInput): SimulatorInput {
  return adjustSimulatorInputCreditForTargetInstallment({
    baseInstallment,
    input,
    targetInstallment,
  });
}

export function adjustSimulatorInputCreditForTargetInstallment({
  baseInstallment,
  input,
  targetInstallment,
}: AnchoredProposalCreditAdjustmentInput): SimulatorInput {
  if (baseInstallment <= 0 || targetInstallment <= 0) {
    return input;
  }

  return {
    ...input,
    credit: roundCurrencyValue(
      input.credit * (targetInstallment / baseInstallment),
    ),
  };
}

function roundCurrencyValue(value: number) {
  return Math.max(0.01, Math.round(value * 100) / 100);
}
