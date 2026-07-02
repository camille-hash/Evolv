import type { PortfolioSummaryResponse } from "@/modules/portfolio/types";
import type { OperationalInsight } from "./intelligence-types";
import type { OperationsHealthScore } from "./health-score-types";
import type { OperationAttentionItem } from "./types";

type BuildOperationsHealthScoreInput = {
  attentionItems: OperationAttentionItem[];
  insights: OperationalInsight[];
  portfolio: PortfolioSummaryResponse;
};

export function buildOperationsHealthScore({
  attentionItems,
  insights,
  portfolio,
}: BuildOperationsHealthScoreInput): OperationsHealthScore {
  const deductions = [
    Math.min(attentionItems.length * 6, 30),
    portfolio.summary.activeContractsCount === 0 ? 15 : 0,
    portfolio.summary.totalCreditAmount === 0 ? 10 : 0,
    portfolio.summary.paidRevenueAmount >
      portfolio.summary.expectedRevenueAmount &&
    portfolio.summary.expectedRevenueAmount > 0
      ? 15
      : 0,
    portfolio.summary.expectedRevenueAmount === 0 &&
    portfolio.summary.activeContractsCount > 0
      ? 10
      : 0,
    insights.some((insight) => insight.severity === "critical") ? 10 : 0,
    insights.some((insight) => insight.severity === "attention") ? 5 : 0,
  ];
  const score = clampScore(
    100 - deductions.reduce((total, deduction) => total + deduction, 0),
  );
  const status = resolveHealthScoreStatus(score);

  return {
    description: buildHealthScoreDescription(status),
    factors: [
      {
        description: attentionItems.length
          ? `${attentionItems.length} ponto(s) operacional(is) reduzem a saude consolidada.`
          : "Nenhum ponto operacional reduz a saude consolidada.",
        id: "attention-items",
        impact: attentionItems.length ? "negative" : "positive",
        label: "Pendencias operacionais",
      },
      {
        description:
          portfolio.summary.activeContractsCount > 0
            ? `${portfolio.summary.activeContractsCount} contrato(s) ativo(s) sustentam a operacao.`
            : "Nenhum contrato ativo foi identificado.",
        id: "active-contracts",
        impact:
          portfolio.summary.activeContractsCount > 0 ? "positive" : "negative",
        label: "Contratos ativos",
      },
      {
        description:
          portfolio.summary.totalCreditAmount > 0
            ? "A carteira possui valor operacional consolidado."
            : "A carteira operacional esta zerada.",
        id: "portfolio-value",
        impact: portfolio.summary.totalCreditAmount > 0 ? "positive" : "negative",
        label: "Valor em carteira",
      },
      {
        description:
          portfolio.summary.expectedRevenueAmount > 0
            ? "Existe receita estimada associada a carteira."
            : "Nao ha receita estimada consolidada.",
        id: "estimated-revenue",
        impact:
          portfolio.summary.expectedRevenueAmount > 0 ? "positive" : "neutral",
        label: "Receita estimada",
      },
      {
        description: insights.length
          ? "Insights operacionais influenciam a leitura executiva da operacao."
          : "Nenhum insight operacional critico foi gerado.",
        id: "operational-insights",
        impact: insights.some((insight) => insight.severity === "critical")
          ? "negative"
          : insights.some((insight) => insight.severity === "attention")
            ? "neutral"
            : "positive",
        label: "Inteligencia operacional",
      },
    ],
    score,
    status,
    title: buildHealthScoreTitle(status),
  };
}

function resolveHealthScoreStatus(score: number) {
  if (score >= 85) {
    return "healthy";
  }

  if (score >= 70) {
    return "stable";
  }

  if (score >= 45) {
    return "attention";
  }

  return "critical";
}

function buildHealthScoreTitle(status: OperationsHealthScore["status"]) {
  if (status === "healthy") {
    return "Operacao saudavel";
  }

  if (status === "stable") {
    return "Operacao estavel";
  }

  if (status === "attention") {
    return "Operacao requer atencao";
  }

  return "Operacao critica";
}

function buildHealthScoreDescription(status: OperationsHealthScore["status"]) {
  if (status === "healthy") {
    return "A leitura operacional apresenta boa sustentacao e poucos pontos de atencao.";
  }

  if (status === "stable") {
    return "A operacao esta funcional, com alguns fatores que merecem acompanhamento.";
  }

  if (status === "attention") {
    return "Existem sinais operacionais relevantes que pedem priorizacao.";
  }

  return "A operacao concentra riscos que exigem acompanhamento imediato.";
}

function clampScore(score: number) {
  return Math.min(Math.max(score, 0), 100);
}
