import { listOperationsAdministrators } from "./administrators-server";
import { listOperationsClients } from "./clients-server";
import { listOperationsContracts } from "./contracts-server";
import { getOperationsPortfolio } from "./portfolio-server";
import { listOperationsRevenue } from "./revenue-server";
import { getOperationsSummary } from "./server";
import type {
  OperationsTimelineItem,
  OperationsTimelineResponse,
  OperationsTimelineSeverity,
} from "./timeline-types";
import type { OperationAttentionSeverity } from "./types";

export type OperationsTimelineResult =
  | ({ ok: true } & OperationsTimelineResponse)
  | { error: string; ok: false; status: number };

const timelineLimit = 30;

export async function listOperationsTimeline(
  accessToken: string | null,
): Promise<OperationsTimelineResult> {
  const [
    contractsResult,
    clientsResult,
    revenueResult,
    portfolioResult,
    administratorsResult,
    summaryResult,
  ] = await Promise.all([
    listOperationsContracts(accessToken),
    listOperationsClients(accessToken),
    listOperationsRevenue(accessToken),
    getOperationsPortfolio(accessToken),
    listOperationsAdministrators(accessToken),
    getOperationsSummary(accessToken),
  ]);

  if (!contractsResult.ok) {
    return contractsResult;
  }

  if (!clientsResult.ok) {
    return clientsResult;
  }

  if (!revenueResult.ok) {
    return revenueResult;
  }

  if (!portfolioResult.ok) {
    return portfolioResult;
  }

  if (!administratorsResult.ok) {
    return administratorsResult;
  }

  if (!summaryResult.ok) {
    return summaryResult;
  }

  const now = new Date().toISOString();
  const items: OperationsTimelineItem[] = [
    ...contractsResult.contracts.flatMap((contract) =>
      buildContractTimelineItems(contract),
    ),
    ...clientsResult.clients.map((client) => ({
      area: "clients" as const,
      description: `${client.contractsCount} contrato(s), ${formatCurrency(client.totalCreditValue)} em credito.`,
      href: "/operations/clients",
      id: `client-created-${client.id}`,
      occurredAt: client.createdAt ?? client.updatedAt ?? now,
      severity: (client.attentionItems.length
        ? "attention"
        : "info") as OperationsTimelineSeverity,
      title: "Cliente criado ou convertido",
    })),
    ...revenueResult.entries.map((entry) => ({
      area: "revenue" as const,
      description: buildRevenueDescription(entry),
      href: "/operations/revenue",
      id: `revenue-${entry.id}`,
      occurredAt: entry.paidAt ?? entry.dueDate ?? now,
      severity: entry.attentionItems.length
        ? "attention"
        : resolveRevenueSeverity(entry.status),
      title: buildRevenueTitle(entry.status),
    })),
    ...administratorsResult.administrators
      .filter((administrator) => administrator.contractsCount > 0)
      .map((administrator) => ({
        area: "administrators" as const,
        description: `${administrator.contractsCount} contrato(s), ${administrator.clientsCount} cliente(s), ${administrator.exposurePercentage.toLocaleString("pt-BR")}% da carteira.`,
        href: "/operations/administrators",
        id: `administrator-linked-${administrator.id}`,
        occurredAt: administrator.updatedAt ?? administrator.createdAt ?? now,
        severity: (administrator.attentionItems.length
          ? "attention"
          : "info") as OperationsTimelineSeverity,
        title: "Administradora vinculada a contratos",
      })),
    ...portfolioResult.clientExposures
      .filter((exposure) => exposure.status === "concentrated")
      .map((exposure) => ({
        area: "portfolio" as const,
        description: `${exposure.label} concentra ${exposure.exposurePercentage.toLocaleString("pt-BR")}% da carteira.`,
        href: "/operations/portfolio",
        id: `portfolio-client-concentration-${exposure.id}`,
        occurredAt: now,
        severity: "attention" as const,
        title: "Concentracao de carteira por cliente",
      })),
    ...portfolioResult.administratorExposures
      .filter((exposure) => exposure.status === "concentrated")
      .map((exposure) => ({
        area: "portfolio" as const,
        description: `${exposure.label} concentra ${exposure.exposurePercentage.toLocaleString("pt-BR")}% da carteira.`,
        href: "/operations/portfolio",
        id: `portfolio-administrator-concentration-${exposure.id}`,
        occurredAt: now,
        severity: "attention" as const,
        title: "Concentracao de carteira por administradora",
      })),
    ...summaryResult.summary.attentionItems.map((item) => ({
      area: "attention" as const,
      description: item.description,
      href: item.href ?? "/operations/attention",
      id: `attention-${item.id}`,
      occurredAt: summaryResult.summary.generatedAt,
      severity: mapAttentionSeverity(item.severity),
      title: "Pendencia operacional identificada",
    })),
  ];

  return {
    items: items
      .filter((item) => isValidDate(item.occurredAt))
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      )
      .slice(0, timelineLimit),
    ok: true,
  };
}

function buildContractTimelineItems(contract: {
  attentionItems: string[];
  clientName: string;
  contractNumber?: string;
  createdAt?: string;
  creditValue: number;
  id: string;
  status: string;
  updatedAt?: string;
}) {
  const createdAt = contract.createdAt ?? contract.updatedAt;
  const updatedAt = contract.updatedAt;
  const baseDescription = `${contract.clientName}, ${formatCurrency(contract.creditValue)} em credito.`;
  const severity: OperationsTimelineSeverity = contract.attentionItems.length
    ? "attention"
    : "info";
  const items: OperationsTimelineItem[] = [];

  if (createdAt) {
    items.push({
      area: "contracts",
      description: baseDescription,
      href: "/operations/contracts",
      id: `contract-created-${contract.id}`,
      occurredAt: createdAt,
      severity,
      title: "Contrato criado",
    });
  }

  if (updatedAt && updatedAt !== createdAt) {
    items.push({
      area: "contracts",
      description: `${baseDescription} Status operacional: ${contract.status}.`,
      href: "/operations/contracts",
      id: `contract-updated-${contract.id}`,
      occurredAt: updatedAt,
      severity,
      title: "Contrato atualizado",
    });
  }

  return items;
}

function buildRevenueTitle(status: string) {
  if (status === "recognized") {
    return "Receita reconhecida";
  }

  if (status === "pending") {
    return "Receita pendente";
  }

  return "Receita registrada";
}

function buildRevenueDescription(entry: {
  clientName: string;
  expectedAmount: number;
  recognizedAmount: number;
}) {
  return `${entry.clientName}, ${formatCurrency(entry.expectedAmount)} previsto, ${formatCurrency(entry.recognizedAmount)} reconhecido.`;
}

function resolveRevenueSeverity(status: string): OperationsTimelineSeverity {
  return status === "pending" ? "attention" : "info";
}

function mapAttentionSeverity(
  severity: OperationAttentionSeverity,
): OperationsTimelineSeverity {
  if (severity === "critical") {
    return "critical";
  }

  if (severity === "high" || severity === "medium") {
    return "attention";
  }

  return "info";
}

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
