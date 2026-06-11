import type {
  SimulatorCalculationResult,
  SimulatorInput,
  SimulatorScenarioKey,
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
  distanceFromReference: number;
  scenarioKey: SimulatorScenarioKey;
  presentation: SimulatorCommercialPresentation;
};

export type AnchoredProposalInput = {
  referenceInstallment: number;
  calculation: SimulatorCalculationResult;
  input: SimulatorInput;
  insuranceOption: InsuranceOption;
  bidType: BidType;
  contemplationMonth: number;
};

const proposalDefinitions: Array<{
  kind: AnchoredProposalKind;
  label: string;
  objective: string;
}> = [
  {
    kind: "conservative",
    label: "Conservadora",
    objective: "Abaixo da parcela de referencia informada pelo cliente.",
  },
  {
    kind: "recommended",
    label: "Recomendada",
    objective: "Proxima da parcela de referencia para equilibrar conforto e credito.",
  },
  {
    kind: "patrimonial",
    label: "Patrimonial",
    objective: "Acima da referencia para ampliar potencial patrimonial.",
  },
];

export function buildAnchoredProposals({
  referenceInstallment,
  calculation,
  input,
  insuranceOption,
  bidType,
  contemplationMonth,
}: AnchoredProposalInput): AnchoredProposal[] {
  const safeReferenceInstallment = Math.max(0, referenceInstallment);

  if (safeReferenceInstallment <= 0) {
    return [];
  }

  const candidates = (["half", "seventy", "full"] as SimulatorScenarioKey[])
    .map((scenarioKey) => ({
      scenarioKey,
      presentation: buildSimulatorCommercialPresentation({
        calculation,
        input,
        selectedScenarioKey: scenarioKey,
        insuranceOption,
        bidType,
        contemplationMonth,
      }),
    }))
    .sort(
      (first, second) =>
        first.presentation.installmentBeforeContemplation -
        second.presentation.installmentBeforeContemplation,
    );

  const conservative =
    [...candidates]
      .reverse()
      .find(
        (candidate) =>
          candidate.presentation.installmentBeforeContemplation <=
          safeReferenceInstallment,
      ) ?? candidates[0];
  const recommended = candidates.reduce((closest, candidate) => {
    const closestDistance = Math.abs(
      closest.presentation.installmentBeforeContemplation -
        safeReferenceInstallment,
    );
    const candidateDistance = Math.abs(
      candidate.presentation.installmentBeforeContemplation -
        safeReferenceInstallment,
    );

    return candidateDistance < closestDistance ? candidate : closest;
  }, candidates[0]);
  const patrimonial =
    candidates.find(
      (candidate) =>
        candidate.presentation.installmentBeforeContemplation >=
        safeReferenceInstallment,
    ) ?? candidates[candidates.length - 1];

  const selectedCandidates = {
    conservative,
    recommended,
    patrimonial,
  };

  return proposalDefinitions.map((definition) => {
    const selectedCandidate = selectedCandidates[definition.kind];

    return {
      ...definition,
      referenceInstallment: safeReferenceInstallment,
      distanceFromReference:
        selectedCandidate.presentation.installmentBeforeContemplation -
        safeReferenceInstallment,
      scenarioKey: selectedCandidate.scenarioKey,
      presentation: selectedCandidate.presentation,
    };
  });
}
