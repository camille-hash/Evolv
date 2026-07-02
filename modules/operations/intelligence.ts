import type { PortfolioSummaryResponse } from "@/modules/portfolio/types";
import type { OperationAttentionItem } from "./types";
import type {
  OperationalInsight,
  OperationalInsightSeverity,
  OperationalPriorityBanner,
} from "./intelligence-types";

type BuildOperationalIntelligenceInput = {
  attentionItems: OperationAttentionItem[];
  portfolio: PortfolioSummaryResponse;
};

export function buildOperationalIntelligence({
  attentionItems,
  portfolio,
}: BuildOperationalIntelligenceInput) {
  const insights = sortInsights([
    ...buildAttentionVolumeInsights(attentionItems),
    ...buildContractsInsights(attentionItems, portfolio),
    ...buildRevenueInsights(portfolio),
    ...buildPortfolioInsights(portfolio),
    ...buildHealthyOperationInsights(attentionItems),
  ]);

  return {
    insights,
    priorityBanner: buildPriorityBanner(insights),
  };
}

function buildAttentionVolumeInsights(
  attentionItems: OperationAttentionItem[],
): OperationalInsight[] {
  if (attentionItems.length > 10) {
    return [
      {
        category: "operation",
        description:
          "Mais de dez pontos operacionais exigem acompanhamento imediato.",
        href: "/operations/attention",
        id: "attention-volume-critical",
        priority: 95,
        severity: "critical",
        title: "Volume crítico de pendências",
      },
    ];
  }

  if (attentionItems.length > 5) {
    return [
      {
        category: "operation",
        description:
          "Mais de cinco pontos operacionais pedem priorização da equipe.",
        href: "/operations/attention",
        id: "attention-volume-elevated",
        priority: 70,
        severity: "attention",
        title: "Volume elevado de pendências",
      },
    ];
  }

  return [];
}

function buildContractsInsights(
  attentionItems: OperationAttentionItem[],
  portfolio: PortfolioSummaryResponse,
): OperationalInsight[] {
  const insights: OperationalInsight[] = [];
  const contractAttentionItems = attentionItems.filter(
    (item) => item.area === "contracts",
  );

  if (contractAttentionItems.length > 0) {
    insights.push({
      category: "contracts",
      description:
        "Existem contratos com pontos de atenção operacional na carteira.",
      href: "/operations/contracts",
      id: "contracts-with-attention",
      priority: 65,
      severity: "attention",
      title: "Contratos exigem acompanhamento",
    });
  }

  if (portfolio.summary.activeContractsCount === 0) {
    insights.push({
      category: "contracts",
      description: "A carteira ainda não possui contratos ativos.",
      href: "/operations/contracts",
      id: "no-active-contracts",
      priority: 35,
      severity: "info",
      title: "Sem contratos ativos",
    });
  }

  return insights;
}

function buildRevenueInsights(
  portfolio: PortfolioSummaryResponse,
): OperationalInsight[] {
  if (
    portfolio.summary.paidRevenueAmount >
    portfolio.summary.expectedRevenueAmount
  ) {
    return [
      {
        category: "revenue",
        description:
          "A receita reconhecida supera a receita estimada nos read models atuais.",
        href: "/operations/revenue",
        id: "recognized-revenue-above-estimated",
        priority: 100,
        severity: "critical",
        title: "Receita reconhecida acima da estimada",
      },
    ];
  }

  return [];
}

function buildPortfolioInsights(
  portfolio: PortfolioSummaryResponse,
): OperationalInsight[] {
  if (portfolio.summary.totalCreditAmount === 0) {
    return [
      {
        category: "portfolio",
        description: "O valor consolidado em carteira está zerado.",
        href: "/operations/portfolio",
        id: "portfolio-value-zero",
        priority: 30,
        severity: "info",
        title: "Carteira sem valor consolidado",
      },
    ];
  }

  return [];
}

function buildHealthyOperationInsights(
  attentionItems: OperationAttentionItem[],
): OperationalInsight[] {
  if (attentionItems.length > 0) {
    return [];
  }

  return [
    {
      category: "operation",
      description:
        "Nenhum ponto operacional foi identificado pelas regras atuais de leitura.",
      href: "/operations/attention",
      id: "healthy-operation",
      priority: 10,
      severity: "info",
      title: "Operação sem pendências relevantes",
    },
  ];
}

function buildPriorityBanner(
  insights: OperationalInsight[],
): OperationalPriorityBanner | undefined {
  const priorityInsight = insights[0];

  if (!priorityInsight) {
    return undefined;
  }

  return {
    description: priorityInsight.description,
    severity: priorityInsight.severity,
    title: priorityInsight.title,
  };
}

function sortInsights(insights: OperationalInsight[]) {
  return [...insights].sort((left, right) => {
    const severityDelta =
      getSeverityRank(right.severity) - getSeverityRank(left.severity);

    if (severityDelta !== 0) {
      return severityDelta;
    }

    return right.priority - left.priority;
  });
}

function getSeverityRank(severity: OperationalInsightSeverity) {
  if (severity === "critical") {
    return 3;
  }

  if (severity === "attention") {
    return 2;
  }

  return 1;
}
