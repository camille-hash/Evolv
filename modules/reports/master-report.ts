import { jsPDF } from "jspdf";
import {
  emptyClientContext,
  loadClientContext,
  type ClientContext,
} from "@/modules/client-context";
import {
  consolidatePortfolio,
  loadPortfolioSnapshot,
} from "@/modules/portfolio";
import {
  buildPortfolioIntelligence,
  portfolioConcentrationLabels,
  portfolioExpansionPotentialLabels,
} from "@/modules/portfolio-intelligence";
import {
  loadOperations,
  type Operation,
} from "@/modules/operations";
import {
  buildConsultativeRecommendations,
  buildRecommendationWealthInput,
} from "@/modules/recommendations";
import {
  buildStrategicRoadmap,
  type StrategicRoadmap,
} from "@/modules/roadmap";
import { loadSavedSimulations } from "@/modules/simulator";
import {
  listStrategies,
  strategyTypeLabels,
  type Strategy,
} from "@/modules/strategies";
import {
  buildWealthEvolution,
  buildWealthJourney,
  loadWealthEvolutionInput,
  type WealthJourney,
} from "@/modules/wealth";

type MasterReportData = {
  activeStrategy: Strategy | null;
  clientContext: ClientContext;
  operations: Operation[];
  recommendations: ReturnType<typeof buildConsultativeRecommendations>;
  roadmap: StrategicRoadmap;
  portfolioConsolidation: ReturnType<typeof consolidatePortfolio>;
  portfolioIntelligence: ReturnType<typeof buildPortfolioIntelligence>;
  wealthJourney: WealthJourney;
};

type PdfMetric = {
  label: string;
  value: string;
};

const page = {
  height: 297,
  margin: 18,
  width: 210,
};

const colors = {
  deep: "#0d2421",
  gold: "#b99a55",
  ink: "#151a18",
  line: "#d9d0c2",
  muted: "#6f766f",
  panel: "#f4f1ea",
  white: "#ffffff",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "percent",
});

export function generateEvolvMasterReport(clientContext?: ClientContext) {
  const data = buildMasterReportData(clientContext);
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const reportDate = formatDate(new Date().toISOString());

  drawCover(doc, data, reportDate);
  doc.addPage();
  drawReportContent(doc, data);
  drawFooter(doc);
  doc.save(buildFileName(data.clientContext));
}

function buildMasterReportData(
  clientContext = loadClientContext(),
): MasterReportData {
  const safeClientContext = clientContext ?? emptyClientContext;
  const portfolioSnapshot = loadPortfolioSnapshot();
  const portfolioConsolidation = consolidatePortfolio(portfolioSnapshot);
  const operations = loadOperations();
  const strategies = listStrategies();
  const activeStrategy = strategies[0] ?? null;
  const savedSimulations = loadSavedSimulations();
  const baseWealthInput = loadWealthEvolutionInput();
  const wealthInput = buildRecommendationWealthInput({
    clientContext: safeClientContext,
    wealthInput: baseWealthInput,
  });
  const wealthEvolution = buildWealthEvolution(wealthInput);
  const wealthJourney = buildWealthJourney({
    evolution: wealthEvolution,
    input: wealthInput,
  });
  const portfolioIntelligence = buildPortfolioIntelligence({
    snapshot: portfolioSnapshot,
    wealthCompletionRate: wealthEvolution.wealth.completionRate,
  });
  const roadmap = buildStrategicRoadmap({
    clientContext: safeClientContext,
    operations,
    activeStrategy,
    wealthInput,
  });
  const recommendations = buildConsultativeRecommendations({
    clientContext: safeClientContext,
    activeStrategy,
    latestSimulation: savedSimulations[0] ?? null,
    wealthJourney,
    wealthProgress: wealthEvolution.wealth,
    passiveIncomeProgress: wealthEvolution.passiveIncome,
    journeySpeed:
      wealthEvolution.wealth.termMonths > 0
        ? wealthJourney.missingWealth / wealthEvolution.wealth.termMonths
        : 0,
  });

  return {
    activeStrategy,
    clientContext: safeClientContext,
    operations,
    recommendations,
    roadmap,
    portfolioConsolidation,
    portfolioIntelligence,
    wealthJourney,
  };
}

function drawCover(doc: jsPDF, data: MasterReportData, reportDate: string) {
  doc.setFillColor(colors.deep);
  doc.rect(0, 0, page.width, page.height, "F");
  doc.setFillColor(colors.gold);
  doc.rect(0, 0, 8, page.height, "F");

  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("EVOLV Intelligence", page.margin + 4, 38);
  doc.setFontSize(15);
  doc.setFont("helvetica", "normal");
  doc.text("Dossie Patrimonial", page.margin + 4, 49);

  doc.setFontSize(30);
  doc.setFont("helvetica", "bold");
  doc.text(
    normalizePdfText(data.clientContext.nome) || "Cliente nao informado",
    page.margin + 4,
    96,
    { maxWidth: 150 },
  );

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#d9d0c2");
  doc.text(`Data: ${reportDate}`, page.margin + 4, 116);
  doc.text("Planejamento Patrimonial e Estrategico", page.margin + 4, 124);
}

function drawReportContent(doc: jsPDF, data: MasterReportData) {
  let y = page.margin;

  y = drawSection(doc, "1. Resumo Executivo", y, [
    { label: "Cliente", value: data.clientContext.nome || "Nao informado" },
    { label: "Perfil", value: data.clientContext.perfil || "Nao informado" },
    {
      label: "Patrimonio Atual",
      value: currencyFormatter.format(data.wealthJourney.currentWealth),
    },
    {
      label: "Meta Patrimonial",
      value: currencyFormatter.format(data.wealthJourney.targetWealth),
    },
    {
      label: "Meta de Renda",
      value: currencyFormatter.format(data.wealthJourney.targetPassiveIncome),
    },
    {
      label: "Estrategia Ativa",
      value: data.activeStrategy
        ? `${data.activeStrategy.name} | ${
            strategyTypeLabels[data.activeStrategy.type]
          }`
        : "Nao definida",
    },
  ]);

  y = drawSection(doc, "2. Carteira Consolidada", y, [
    {
      label: "Total em imoveis",
      value: String(data.portfolioConsolidation.totalImoveis),
    },
    {
      label: "Total em cartas",
      value: String(data.portfolioConsolidation.totalCartas),
    },
    {
      label: "Patrimonio consolidado",
      value: currencyFormatter.format(
        data.portfolioConsolidation.patrimonioConsolidado,
      ),
    },
    {
      label: "Renda passiva consolidada",
      value: currencyFormatter.format(
        data.portfolioConsolidation.rendaPassivaConsolidada,
      ),
    },
  ]);

  y = drawSection(doc, "3. Diagnostico Patrimonial", y, [
    {
      label: "EVOLV Score",
      value: `${data.portfolioIntelligence.evolvScore}/100`,
    },
    {
      label: "Concentracao",
      value:
        portfolioConcentrationLabels[data.portfolioIntelligence.concentracao],
    },
    {
      label: "Eficiencia Patrimonial",
      value: percentFormatter.format(
        data.portfolioIntelligence.eficienciaPatrimonial,
      ),
    },
    {
      label: "Potencial de Expansao",
      value:
        portfolioExpansionPotentialLabels[
          data.portfolioIntelligence.potencialExpansao
        ],
    },
  ]);

  y = drawRoadmapSection(doc, data.roadmap, y);
  y = drawOperationsSection(doc, data.operations, y);
  y = drawRecommendationsSection(doc, data.recommendations.slice(0, 5), y);
  drawNextStepsSection(doc, data, y);
}

function drawSection(
  doc: jsPDF,
  title: string,
  startY: number,
  metrics: PdfMetric[],
) {
  let y = ensureSpace(doc, startY, 54);

  drawSectionTitle(doc, title, y);
  y += 9;

  metrics.forEach((metric) => {
    y = drawMetricRow(doc, metric, y);
  });

  return y + 6;
}

function drawRoadmapSection(doc: jsPDF, roadmap: StrategicRoadmap, startY: number) {
  let y = ensureSpace(doc, startY, 52);

  drawSectionTitle(doc, "4. Roadmap Estrategico", y);
  y += 9;

  roadmap.steps.forEach((step) => {
    y = drawMetricRow(doc, {
      label: step.nome,
      value:
        step.kind === "operation"
          ? `${currencyFormatter.format(step.credito)} | ${
              step.administradora || "Administradora nao definida"
            } | ${step.objetivo}`
          : step.objetivo,
    }, y);
  });

  y = drawMetricRow(doc, {
    label: "Objetivo final",
    value: currencyFormatter.format(roadmap.finalGoal.metaPatrimonial),
  }, y);

  return y + 6;
}

function drawOperationsSection(doc: jsPDF, operations: Operation[], startY: number) {
  let y = ensureSpace(doc, startY, 45);

  drawSectionTitle(doc, "5. Operacoes Ativas", y);
  y += 9;

  if (operations.length === 0) {
    return drawMetricRow(doc, {
      label: "Operacoes",
      value: "Nenhuma operacao registrada",
    }, y) + 6;
  }

  operations.forEach((operation) => {
    y = drawMetricRow(doc, {
      label: operation.nome,
      value: `${operation.administradora} | ${currencyFormatter.format(
        operation.credito,
      )} | ${operation.status}`,
    }, y);
  });

  return y + 6;
}

function drawRecommendationsSection(
  doc: jsPDF,
  recommendations: MasterReportData["recommendations"],
  startY: number,
) {
  let y = ensureSpace(doc, startY, 44);

  drawSectionTitle(doc, "6. Recomendacoes Consultivas", y);
  y += 9;

  if (recommendations.length === 0) {
    return drawMetricRow(doc, {
      label: "Recomendacoes",
      value: "Nenhuma recomendacao prioritaria identificada",
    }, y) + 6;
  }

  recommendations.forEach((recommendation) => {
    y = drawMetricRow(doc, {
      label: recommendation.priority.toUpperCase(),
      value: recommendation.text,
    }, y);
  });

  return y + 6;
}

function drawNextStepsSection(doc: jsPDF, data: MasterReportData, startY: number) {
  const nextMilestone = data.wealthJourney.nextWealthMilestone;
  const nextStep = data.roadmap.nextStep;

  drawSection(doc, "7. Proximos Passos", startY, [
    {
      label: "Proxima etapa",
      value: nextStep?.nome ?? "Meta Patrimonial",
    },
    {
      label: "Proximo marco",
      value: nextMilestone
        ? currencyFormatter.format(nextMilestone.value)
        : "Meta atingida",
    },
    {
      label: "Estrategia atual",
      value: data.activeStrategy?.name ?? "Nao definida",
    },
  ]);
}

function drawSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(colors.deep);
  doc.text(normalizePdfText(title), page.margin, y);
  doc.setDrawColor(colors.gold);
  doc.line(page.margin, y + 2, page.width - page.margin, y + 2);
}

function drawMetricRow(doc: jsPDF, metric: PdfMetric, y: number) {
  const nextY = ensureSpace(doc, y, 12);

  doc.setFillColor(colors.panel);
  doc.roundedRect(page.margin, nextY - 4, page.width - page.margin * 2, 10, 1.8, 1.8, "F");
  doc.setTextColor(colors.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(normalizePdfText(metric.label), page.margin + 3, nextY + 2);
  doc.setTextColor(colors.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(normalizePdfText(metric.value), page.margin + 52, nextY + 2, {
    maxWidth: page.width - page.margin * 2 - 55,
  });

  return nextY + 11;
}

function ensureSpace(doc: jsPDF, y: number, neededHeight: number) {
  if (y + neededHeight <= page.height - page.margin - 12) {
    return y;
  }

  drawFooter(doc);
  doc.addPage();

  return page.margin;
}

function drawFooter(doc: jsPDF) {
  doc.setDrawColor(colors.line);
  doc.line(page.margin, page.height - 18, page.width - page.margin, page.height - 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colors.muted);
  doc.text("Documento gerado por EVOLV Intelligence", page.margin, page.height - 12);
  doc.text(
    "Planejamento Patrimonial e Estrategico",
    page.width - page.margin,
    page.height - 12,
    { align: "right" },
  );
}

function buildFileName(clientContext: ClientContext) {
  const clientName = normalizePdfText(clientContext.nome)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `evolv-dossie-patrimonial-${clientName || "cliente"}.pdf`;
}

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoDate));
}

function normalizePdfText(value: string | number) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

