import type { PortfolioSummaryResponse } from "@/modules/portfolio/types";
import { listOperationsAdministrators } from "./administrators-server";
import { listOperationsClients } from "./clients-server";
import { listOperationsContracts } from "./contracts-server";
import { buildOperationsHealthScore } from "./health-score";
import { buildOperationalIntelligence } from "./intelligence";
import { getOperationsPortfolio } from "./portfolio-server";
import { listOperationsRevenue } from "./revenue-server";
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
  const [
    administratorsResult,
    clientsResult,
    contractsResult,
    portfolioResult,
    revenueResult,
  ] = await Promise.all([
    listOperationsAdministrators(accessToken),
    listOperationsClients(accessToken),
    listOperationsContracts(accessToken),
    getOperationsPortfolio(accessToken),
    listOperationsRevenue(accessToken),
  ]);

  if (!administratorsResult.ok) {
    return administratorsResult;
  }

  if (!clientsResult.ok) {
    return clientsResult;
  }

  if (!contractsResult.ok) {
    return contractsResult;
  }

  if (!portfolioResult.ok) {
    return portfolioResult;
  }

  if (!revenueResult.ok) {
    return revenueResult;
  }

  const portfolioSummary = buildPortfolioSummaryResponse({
    administrators: administratorsResult.administrators,
    clients: clientsResult.clients,
    contracts: contractsResult.contracts,
    portfolio: portfolioResult,
    revenue: revenueResult,
  });
  const attentionItems = buildAttentionItems({
    administrators: administratorsResult,
    clients: clientsResult,
    contracts: contractsResult,
    portfolio: portfolioResult,
    portfolioSummary,
    revenue: revenueResult,
  });
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

function buildPortfolioSummaryResponse(input: {
  administrators: {
    activeContractsCount: number;
    contractsCount: number;
    estimatedRevenue: number;
    id: string;
    name: string;
    recognizedRevenue: number;
    totalCreditValue: number;
  }[];
  clients: {
    activeContractsCount: number;
    contractsCount: number;
    createdAt?: string;
    estimatedRevenue: number;
    id: string;
    name: string;
    recognizedRevenue: number;
    totalCreditValue: number;
    updatedAt?: string;
  }[];
  contracts: {
    creditValue: number;
    estimatedRevenue: number;
    recognizedRevenue: number;
    sourceStatus?: string;
    status: string;
  }[];
  portfolio: {
    summary: {
      totalPortfolioValue: number;
    };
  };
  revenue: {
    entries: {
      expectedAmount: number;
      recognizedAmount: number;
      status: string;
    }[];
    summary: {
      expectedRevenue: number;
      pendingRevenue: number;
      recognizedRevenue: number;
    };
  };
}): PortfolioSummaryResponse {
  const byStatus = new Map<
    string,
    { contractsCount: number; expectedRevenueAmount: number; totalCreditAmount: number }
  >();

  for (const contract of input.contracts) {
    const status = normalizeContractSourceStatus(contract.sourceStatus);
    const current =
      byStatus.get(status) ?? {
        contractsCount: 0,
        expectedRevenueAmount: 0,
        totalCreditAmount: 0,
      };

    current.contractsCount += 1;
    current.expectedRevenueAmount = roundCurrency(
      current.expectedRevenueAmount + contract.estimatedRevenue,
    );
    current.totalCreditAmount = roundCurrency(
      current.totalCreditAmount + contract.creditValue,
    );
    byStatus.set(status, current);
  }

  const cancelledRevenueAmount = input.revenue.entries
    .filter((entry) => entry.status === "cancelled")
    .reduce((total, entry) => total + entry.expectedAmount, 0);

  return {
    byAdministrator: input.administrators
      .map((administrator) => ({
        activeContractsCount: administrator.activeContractsCount,
        administratorId: administrator.id,
        administratorName: administrator.name,
        contractsCount: administrator.contractsCount,
        expectedRevenueAmount: administrator.estimatedRevenue,
        paidRevenueAmount: administrator.recognizedRevenue,
        totalCreditAmount: administrator.totalCreditValue,
      }))
      .sort((left, right) => right.totalCreditAmount - left.totalCreditAmount),
    byStatus: Array.from(byStatus.entries())
      .map(([status, summary]) => ({
        contractsCount: summary.contractsCount,
        expectedRevenueAmount: summary.expectedRevenueAmount,
        status,
        totalCreditAmount: summary.totalCreditAmount,
      }))
      .sort((left, right) => left.status.localeCompare(right.status)),
    summary: {
      activeContractsCount: input.contracts.filter(
        (contract) => normalizeContractSourceStatus(contract.sourceStatus) === "active",
      ).length,
      activeCreditAmount: roundCurrency(
        input.contracts
          .filter(
            (contract) => normalizeContractSourceStatus(contract.sourceStatus) === "active",
          )
          .reduce((total, contract) => total + contract.creditValue, 0),
      ),
      cancelledContractsCount: input.contracts.filter(
        (contract) =>
          ["cancelled", "rejected"].includes(
            normalizeContractSourceStatus(contract.sourceStatus),
          ),
      ).length,
      cancelledRevenueAmount: roundCurrency(cancelledRevenueAmount),
      clientsCount: input.clients.length,
      completedContractsCount: input.contracts.filter(
        (contract) =>
          normalizeContractSourceStatus(contract.sourceStatus) === "completed",
      ).length,
      contractsCount: input.contracts.length,
      draftContractsCount: input.contracts.filter(
        (contract) =>
          ["approved", "draft", "pending_documentation", "submitted"].includes(
            normalizeContractSourceStatus(contract.sourceStatus),
          ),
      ).length,
      expectedRevenueAmount: input.revenue.summary.expectedRevenue,
      overdueRevenueAmount: 0,
      paidRevenueAmount: input.revenue.summary.recognizedRevenue,
      pendingRevenueAmount: input.revenue.summary.pendingRevenue,
      totalCreditAmount: input.portfolio.summary.totalPortfolioValue,
    },
    topClients: input.clients
      .map((client) => ({
        activeContractsCount: client.activeContractsCount,
        clientId: client.id,
        clientName: client.name,
        contractsCount: client.contractsCount,
        expectedRevenueAmount: client.estimatedRevenue,
        lastContractAt: client.updatedAt ?? client.createdAt ?? null,
        paidRevenueAmount: client.recognizedRevenue,
        totalCreditAmount: client.totalCreditValue,
      }))
      .sort((left, right) => right.totalCreditAmount - left.totalCreditAmount),
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

function buildAttentionItems(input: {
  administrators: {
    summary: {
      administratorsWithAttention: number;
      administratorsWithoutContracts: number;
    };
  };
  clients: {
    summary: {
      clientsWithAttention: number;
      clientsWithoutContracts: number;
    };
  };
  contracts: {
    summary: {
      attentionContracts: number;
      totalContracts: number;
    };
  };
  portfolio: {
    summary: {
      attentionItems: string[];
    };
  };
  portfolioSummary: PortfolioSummaryResponse;
  revenue: {
    summary: {
      divergentEntries: number;
      pendingRevenue: number;
    };
  };
}): OperationAttentionItem[] {
  const attentionItems: OperationAttentionItem[] = [];
  const { portfolioSummary } = input;

  if (input.contracts.summary.attentionContracts > 0) {
    attentionItems.push({
      area: "contracts",
      description: "Existem contratos com dados incompletos ou divergentes.",
      href: "/operations/contracts",
      id: "contracts-with-attention",
      severity: "high",
      title: "Contratos com atencao",
      value: String(input.contracts.summary.attentionContracts),
    });
  }

  if (portfolioSummary.summary.cancelledContractsCount > 0) {
    attentionItems.push({
      area: "contracts",
      description: "Existem contratos cancelados na carteira.",
      href: "/operations/contracts",
      id: "cancelled-contracts",
      severity: "high",
      title: "Contratos cancelados",
      value: String(portfolioSummary.summary.cancelledContractsCount),
    });
  }

  if (input.revenue.summary.divergentEntries > 0) {
    attentionItems.push({
      area: "revenue",
      description: "Existem receitas com valores reconhecidos acima do previsto.",
      href: "/operations/revenue",
      id: "divergent-revenue",
      severity: "critical",
      title: "Receita divergente",
      value: String(input.revenue.summary.divergentEntries),
    });
  }

  if (input.revenue.summary.pendingRevenue > 0) {
    attentionItems.push({
      area: "revenue",
      description: "Receitas pendentes aguardam evolucao operacional.",
      href: "/operations/revenue",
      id: "pending-revenue",
      severity: "medium",
      title: "Receita pendente",
      value: currencyFormatter.format(input.revenue.summary.pendingRevenue),
    });
  }

  if (input.clients.summary.clientsWithAttention > 0) {
    attentionItems.push({
      area: "clients",
      description: "Clientes possuem pendencias operacionais no read model.",
      href: "/operations/clients",
      id: "clients-with-attention",
      severity: "medium",
      title: "Clientes com atencao",
      value: String(input.clients.summary.clientsWithAttention),
    });
  }

  if (input.administrators.summary.administratorsWithAttention > 0) {
    attentionItems.push({
      area: "administrators",
      description: "Administradoras possuem concentracao ou pendencias vinculadas.",
      href: "/operations/administrators",
      id: "administrators-with-attention",
      severity: "medium",
      title: "Administradoras com atencao",
      value: String(input.administrators.summary.administratorsWithAttention),
    });
  }

  if (input.portfolio.summary.attentionItems.length > 0) {
    attentionItems.push({
      area: "portfolio",
      description: "A carteira possui sinais operacionais de atencao.",
      href: "/operations/portfolio",
      id: "portfolio-with-attention",
      severity: "medium",
      title: "Carteira com atencao",
      value: String(input.portfolio.summary.attentionItems.length),
    });
  }

  if (input.contracts.summary.totalContracts === 0) {
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

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeContractSourceStatus(status: string | undefined) {
  return status?.trim().toLowerCase() || "unknown";
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
