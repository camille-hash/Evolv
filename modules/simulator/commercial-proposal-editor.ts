import {
  adjustSimulatorInputCreditForTargetInstallment,
} from "@/modules/simulator/anchoring";
import {
  calculateSimulatorScenarios,
  type SimulatorInput,
  type SimulatorScenarioKey,
} from "@/modules/simulator/engine";
import {
  buildSimulatorCommercialPresentation,
  type BidType,
  type InsuranceOption,
  type SimulatorCommercialPresentation,
} from "@/modules/simulator/presentation";

export type CommercialProposalEditorCalculationInput = {
  baseInput: SimulatorInput;
  bidType: BidType;
  contemplationMonth: number;
  credit?: number | null;
  insuranceOption: InsuranceOption;
  scenarioKey: SimulatorScenarioKey;
  targetInstallment?: number | null;
  termMonths?: number | null;
};

export type CommercialProposalEditorCalculationResult = {
  input: SimulatorInput;
  presentation: SimulatorCommercialPresentation;
  scenarioKey: SimulatorScenarioKey;
};

export function calculateCommercialProposalEditorPreview({
  baseInput,
  bidType,
  contemplationMonth,
  credit,
  insuranceOption,
  scenarioKey,
  targetInstallment,
  termMonths,
}: CommercialProposalEditorCalculationInput): CommercialProposalEditorCalculationResult {
  const baseTermMonths =
    typeof termMonths === "number" && Number.isFinite(termMonths) && termMonths > 0
      ? Math.trunc(termMonths)
      : baseInput.termMonths;
  let nextInput: SimulatorInput = {
    ...baseInput,
    credit:
      typeof credit === "number" && Number.isFinite(credit) && credit > 0
        ? credit
        : baseInput.credit,
    termMonths: Math.max(1, baseTermMonths),
  };

  if (
    typeof targetInstallment === "number" &&
    Number.isFinite(targetInstallment) &&
    targetInstallment > 0
  ) {
    const baseCalculation = calculateSimulatorScenarios(nextInput);
    const basePresentation = buildSimulatorCommercialPresentation({
      bidType,
      calculation: baseCalculation,
      contemplationMonth,
      input: nextInput,
      insuranceOption,
      selectedScenarioKey: scenarioKey,
    });

    nextInput = adjustSimulatorInputCreditForTargetInstallment({
      baseInstallment: basePresentation.installmentBeforeContemplation,
      input: nextInput,
      targetInstallment,
    });
  }

  const calculation = calculateSimulatorScenarios(nextInput);
  const presentation = buildSimulatorCommercialPresentation({
    bidType,
    calculation,
    contemplationMonth,
    input: nextInput,
    insuranceOption,
    selectedScenarioKey: scenarioKey,
  });

  return {
    input: nextInput,
    presentation,
    scenarioKey,
  };
}
