import type {
  BidType,
  SimulatorCommercialPresentation,
  SimulatorScenarioKey,
} from "@/modules/simulator";

export type IntelligenceInsightInput = {
  presentation: SimulatorCommercialPresentation;
  selectedScenarioKey: SimulatorScenarioKey;
  administratorInsuranceRequired: boolean;
  bidRate: number;
};

export type IntelligenceInsightGroups = {
  insights: string[];
  attentionPoints: string[];
  opportunities: string[];
};

export function buildIntelligenceInsightGroups({
  administratorInsuranceRequired,
  bidRate,
  presentation,
  selectedScenarioKey,
}: IntelligenceInsightInput): IntelligenceInsightGroups {
  return {
    insights: buildInsights(presentation),
    attentionPoints: buildAttentionPoints({
      administratorInsuranceRequired,
      bidRate,
      presentation,
    }),
    opportunities: buildOpportunities({
      presentation,
      selectedScenarioKey,
    }),
  };
}

function buildInsights(presentation: SimulatorCommercialPresentation) {
  const insights: string[] = [];

  if (presentation.estimatedCardSaleGainRate > 1) {
    insights.push(
      "Este cenario apresenta potencial de ganho superior ao capital investido.",
    );
  }

  if (presentation.contemplationMonth <= 12) {
    insights.push("Contemplacao estimada em curto prazo.");
  }

  if (presentation.contemplationMonth >= 36) {
    insights.push(
      "Prazo de contemplacao mais longo, exigindo planejamento de caixa.",
    );
  }

  if (presentation.leverageMultiple > 2) {
    insights.push("Alavancagem patrimonial significativa.");
  }

  if (insights.length === 0) {
    insights.push("Cenario equilibrado para avaliacao consultiva.");
  }

  return insights;
}

function buildAttentionPoints({
  administratorInsuranceRequired,
  bidRate,
  presentation,
}: {
  administratorInsuranceRequired: boolean;
  bidRate: number;
  presentation: SimulatorCommercialPresentation;
}) {
  const attentionPoints: string[] = [];

  if (
    presentation.installmentAfterContemplation >
    presentation.installmentBeforeContemplation
  ) {
    attentionPoints.push("Ha aumento da parcela apos contemplacao.");
  }

  if (administratorInsuranceRequired) {
    attentionPoints.push("Administradora exige seguro obrigatorio.");
  }

  if (bidRate > 0.3) {
    attentionPoints.push("Percentual de lance elevado.");
  }

  if (attentionPoints.length === 0) {
    attentionPoints.push("Nao ha pontos criticos destacados neste cenario.");
  }

  return attentionPoints;
}

function buildOpportunities({
  presentation,
  selectedScenarioKey,
}: {
  presentation: SimulatorCommercialPresentation;
  selectedScenarioKey: SimulatorScenarioKey;
}) {
  const opportunities: string[] = [];

  if (selectedScenarioKey === "seventy") {
    opportunities.push(
      "Reducao temporaria de desembolso durante a fase inicial.",
    );
  }

  if (selectedScenarioKey === "half") {
    opportunities.push("Maior alivio de caixa durante a fase inicial.");
  }

  if (presentation.estimatedCardSaleProfit > 0) {
    opportunities.push(
      "Operacao apresenta potencial de ganho na venda da carta.",
    );
  }

  if (opportunities.length === 0) {
    opportunities.push(
      "Cenario pode ser usado como base comparativa para novas estrategias.",
    );
  }

  return opportunities;
}

export function getBidRateForIntelligence({
  bidType,
  cashBidRate,
  embeddedBidRate,
}: {
  bidType: BidType;
  cashBidRate: number;
  embeddedBidRate: number;
}) {
  if (bidType === "embedded") {
    return embeddedBidRate;
  }

  if (bidType === "cash") {
    return cashBidRate;
  }

  return 0;
}
