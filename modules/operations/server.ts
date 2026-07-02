import { getPortfolioSummary } from "@/modules/portfolio/server";
import type { PortfolioSummaryResponse } from "@/modules/portfolio/types";
import { buildOperationsHealthScore } from "./health-score";
import { buildOperationalIntelligence } from "./intelligence";
import type {
  OperationAttentionItem,
  OperationDrilldownCard,
  OperationMovementItem,
  OperationalHealthStatus,
  OperationsSnapshotMetric,
  OperationsSummary,
} from "./types";

export type OperationsSummaryResult =
  | { ok: true; summary: OperationsSummary }
  | { error: string; ok: false; status: number };

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

export async function getOperationsSummary(
  accessToken: string | null,
): Promise<OperationsSummaryResult> {
  const portfolio = await getPortfolioSummary(accessToken);

  if (!portfolio.ok) {
    return portfolio;
  }

  const portfolioSummary: PortfolioSummaryResponse = {
    byAdministrator: portfolio.byAdministrator,
    byStatus: portfolio.byStatus,
    summary: portfolio.summary,
    topClients: portfolio.topClients,
  };
  const attentionItems = buildAttentionItems(portfolioSummary);
  const healthStatus = resolveHealthStatus(attentionItems);
  const intelligence = buildOperationalIntelligence({
    attentionItems,
    portfolio: portfolioSummary,
  });
  const healthScore = buildOperationsHealthScore({
    attentionItems,
    insights: intelligence.insights,
    portfolio: portfolioSummary,
  });

  return {
    ok: true,
    summary: {
      attentionItems,
      drilldowns: buildDrilldowns(portfolioSummary),
      generatedAt: new Date().toISOString(),
      healthScore,
      healthStatus,
      insights: intelligence.insights,
      movementFeed: buildMovementFeed(portfolioSummary),
      priorityBanner: intelligence.priorityBanner,
      snapshot: buildSnapshot(portfolioSummary, healthStatus),
    },
  };
}

function buildSnapshot(
  portfolio: PortfolioSummaryResponse,
  healthStatus: OperationalHealthStatus,
): OperationsSnapshotMetric[] {
  return [
    {
      id: "health",
      label: "Saude operacional",
      tone: healthStatus,
      value: formatHealthStatus(healthStatus),
    },
    {
      id: "contracts",
      label: "Contratos",
      tone: portfolio.summary.contractsCount > 0 ? "healthy" : "neutral",
      value: String(portfolio.summary.contractsCount),
    },
    {
      id: "active-credit",
      label: "Credito ativo",
      tone: portfolio.summary.activeCreditAmount > 0 ? "healthy" : "neutral",
      value: currencyFormatter.format(portfolio.summary.activeCreditAmount),
    },
    {
      id: "expected-revenue",
      label: "Receita prevista",
      tone:
        portfolio.summary.expectedRevenueAmount > 0 ? "healthy" : "neutral",
      value: currencyFormatter.format(portfolio.summary.expectedRevenueAmount),
    },
  ];
}

function buildAttentionItems(
  portfolio: PortfolioSummaryResponse,
): OperationAttentionItem[] {
  const attentionItems: OperationAttentionItem[] = [];

  if (portfolio.summary.cancelledContractsCount > 0) {
    attentionItems.push({
      area: "contracts",
      description: "Existem contratos cancelados na carteira.",
      href: "/operations/contracts",
      id: "cancelled-contracts",
      severity: "high",
      title: "Contratos cancelados",
      value: String(portfolio.summary.cancelledContractsCount),
    });
  }

  if (portfolio.summary.overdueRevenueAmount > 0) {
    attentionItems.push({
      area: "revenue",
      description: "Receitas vencidas precisam de acompanhamento operacional.",
      href: "/operations/revenue",
      id: "overdue-revenue",
      severity: "critical",
      title: "Receita vencida",
      value: currencyFormatter.format(portfolio.summary.overdueRevenueAmount),
    });
  }

  if (portfolio.summary.pendingRevenueAmount > 0) {
    attentionItems.push({
      area: "revenue",
      description: "Receitas pendentes aguardam evolucao operacional.",
      href: "/operations/revenue",
      id: "pending-revenue",
      severity: "medium",
      title: "Receita pendente",
      value: currencyFormatter.format(portfolio.summary.pendingRevenueAmount),
    });
  }

  if (portfolio.summary.contractsCount === 0) {
    attentionItems.push({
      area: "contracts",
      description: "Ainda nao existem contratos para consolidar operacao.",
      href: "/operations/contracts",
      id: "empty-contracts",
      severity: "low",
      title: "Carteira sem contratos",
      value: "0",
    });
  }

  return attentionItems;
}

function buildDrilldowns(
  portfolio: PortfolioSummaryResponse,
): OperationDrilldownCard[] {
  const topAdministrator = portfolio.byAdministrator[0];
  const topClient = portfolio.topClients[0];

  return [
    {
      description: "Volume consolidado de clientes com dados de carteira.",
      id: "clients",
      label: "Clientes",
      status: portfolio.summary.clientsCount > 0 ? "healthy" : "neutral",
      value: String(portfolio.summary.clientsCount),
    },
    {
      description: "Contratos ativos dentro da carteira operacional.",
      id: "active-contracts",
      label: "Contratos ativos",
      status:
        portfolio.summary.activeContractsCount > 0 ? "healthy" : "attention",
      value: String(portfolio.summary.activeContractsCount),
    },
    {
      description: topAdministrator
        ? topAdministrator.administratorName
        : "Nenhuma administradora com carteira consolidada.",
      id: "top-administrator",
      label: "Principal administradora",
      status: topAdministrator ? "healthy" : "neutral",
      value: topAdministrator
        ? currencyFormatter.format(topAdministrator.totalCreditAmount)
        : "Sem dados",
    },
    {
      description: topClient
        ? topClient.clientName
        : "Nenhum cliente com contrato consolidado.",
      id: "top-client",
      label: "Principal cliente",
      status: topClient ? "healthy" : "neutral",
      value: topClient
        ? currencyFormatter.format(topClient.totalCreditAmount)
        : "Sem dados",
    },
  ];
}

function buildMovementFeed(
  portfolio: PortfolioSummaryResponse,
): OperationMovementItem[] {
  const generatedAt = new Date().toISOString();
  const movements: OperationMovementItem[] = [];

  for (const client of portfolio.topClients.slice(0, 3)) {
    movements.push({
      description: `${client.contractsCount} contrato(s), ${currencyFormatter.format(client.totalCreditAmount)} em credito.`,
      id: `client-${client.clientId}`,
      occurredAt: client.lastContractAt ?? generatedAt,
      title: client.clientName,
      type: "client",
    });
  }

  for (const administrator of portfolio.byAdministrator.slice(0, 2)) {
    movements.push({
      description: `${administrator.contractsCount} contrato(s), ${currencyFormatter.format(administrator.expectedRevenueAmount)} em receita prevista.`,
      id: `administrator-${administrator.administratorId ?? "none"}`,
      occurredAt: generatedAt,
      title: administrator.administratorName,
      type: "administrator",
    });
  }

  return movements
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    )
    .slice(0, 5);
}

function resolveHealthStatus(
  attentionItems: OperationAttentionItem[],
): OperationalHealthStatus {
  if (attentionItems.some((item) => item.severity === "critical")) {
    return "critical";
  }

  if (attentionItems.some((item) => item.severity === "high")) {
    return "attention";
  }

  if (attentionItems.length > 0) {
    return "neutral";
  }

  return "healthy";
}

function formatHealthStatus(status: OperationalHealthStatus) {
  if (status === "critical") {
    return "Critico";
  }

  if (status === "attention") {
    return "Atencao";
  }

  if (status === "neutral") {
    return "Neutro";
  }

  return "Saudavel";
}
