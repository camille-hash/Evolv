import type {
  BidType,
  SimulatorCommercialPresentation,
  SimulatorScenarioKey,
} from "@/modules/simulator";
import {
  buildIntelligenceInsightGroups,
  getBidRateForIntelligence,
  type IntelligenceInsightGroups,
} from "@/modules/intelligence/insights";

export type IntelligenceSummaryInput = {
  presentation: SimulatorCommercialPresentation;
  selectedScenarioKey: SimulatorScenarioKey;
  administratorInsuranceRequired: boolean;
  bidType: BidType;
  embeddedBidRate: number;
  cashBidRate: number;
};

export type IntelligenceSummary = IntelligenceInsightGroups & {
  executiveSummary: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function buildIntelligenceSummary({
  administratorInsuranceRequired,
  bidType,
  cashBidRate,
  embeddedBidRate,
  presentation,
  selectedScenarioKey,
}: IntelligenceSummaryInput): IntelligenceSummary {
  const bidRate = getBidRateForIntelligence({
    bidType,
    cashBidRate,
    embeddedBidRate,
  });
  const groups = buildIntelligenceInsightGroups({
    administratorInsuranceRequired,
    bidRate,
    presentation,
    selectedScenarioKey,
  });

  return {
    executiveSummary: buildExecutiveSummary(presentation),
    ...groups,
  };
}

function buildExecutiveSummary(presentation: SimulatorCommercialPresentation) {
  return `Neste cenario, o cliente investe aproximadamente ${currencyFormatter.format(
    presentation.realInvestment,
  )} ate a contemplacao, obtem credito liquido de ${currencyFormatter.format(
    presentation.liquidCredit,
  )} e apresenta potencial de ganho estimado de ${percentFormatter.format(
    presentation.estimatedCardSaleGainRate,
  )}.`;
}
