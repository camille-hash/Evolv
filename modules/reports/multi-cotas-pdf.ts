import { jsPDF } from "jspdf";

type SnapshotRecord = Record<string, unknown>;

type MultiCotasCommercialPdfInput = {
  leadName: string;
  simulationCreatedAt: string;
  simulationTitle: string;
  snapshot: SnapshotRecord;
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
  ink: "#10201f",
  line: "#d8dee7",
  muted: "#64748b",
  panel: "#f8fafc",
  primary: "#0f766e",
  white: "#ffffff",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "percent",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

export function generateMultiCotasCommercialPdf({
  leadName,
  simulationCreatedAt,
  simulationTitle,
  snapshot,
}: MultiCotasCommercialPdfInput) {
  const input = readRecord(snapshot.input);
  const result = readRecord(snapshot.result);
  const summary = readRecord(result.summary);
  const cards = Array.isArray(result.cards)
    ? result.cards.map(readRecord).filter((card) => Object.keys(card).length > 0)
    : [];

  if (!Object.keys(summary).length || !cards.length) {
    throw new Error("O snapshot salvo nao possui dados suficientes para gerar o PDF.");
  }

  const doc = new jsPDF({ format: "a4", unit: "mm" });
  let cursorY = drawHeader(doc, {
    leadName,
    simulationCreatedAt,
    simulationTitle,
  });

  cursorY = drawSection(doc, "Resumo executivo", cursorY);
  cursorY = drawMetrics(doc, buildSummaryMetrics(summary), cursorY);

  cursorY = ensureSpace(doc, cursorY, 26);
  cursorY = drawSection(doc, "Cartas", cursorY);
  cards.forEach((card, index) => {
    const cardMetrics = buildCardMetrics(card, input);
    cursorY = ensureSpace(doc, cursorY, 42 + cardMetrics.length * 6);
    cursorY = drawCard(doc, `Carta ${readNumber(card.position) ?? index + 1}`, cardMetrics, cursorY);
  });

  const consolidatedMetrics = buildConsolidatedMetrics(summary);
  if (consolidatedMetrics.length) {
    cursorY = ensureSpace(doc, cursorY, 26);
    cursorY = drawSection(doc, "Resultado consolidado", cursorY);
    cursorY = drawMetrics(doc, consolidatedMetrics, cursorY);
  }

  drawFooter(doc);
  doc.save(buildFileName(simulationTitle, leadName));
}

function drawHeader(
  doc: jsPDF,
  metadata: Omit<MultiCotasCommercialPdfInput, "snapshot">,
) {
  doc.setFillColor(colors.ink);
  doc.rect(0, 0, page.width, 52, "F");
  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("EVOLV", page.margin, 22);
  doc.setFontSize(12);
  doc.text("Estudo Estrategico Multi-Cotas", page.margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(metadata.leadName || "Lead nao identificado", page.margin, 41);
  doc.text(`Estudo salvo em ${formatDate(metadata.simulationCreatedAt)}`, page.margin, 47);

  doc.setTextColor(colors.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(metadata.simulationTitle || "Estudo Multi-Cotas", page.margin, 65);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(colors.muted);
  doc.text(`PDF gerado em ${formatDate(new Date().toISOString())}`, page.margin, 72);

  return 84;
}

function drawSection(doc: jsPDF, title: string, cursorY: number) {
  doc.setTextColor(colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, page.margin, cursorY);
  doc.setDrawColor(colors.line);
  doc.line(page.margin, cursorY + 4, page.width - page.margin, cursorY + 4);
  return cursorY + 12;
}

function drawMetrics(doc: jsPDF, metrics: PdfMetric[], cursorY: number) {
  if (!metrics.length) {
    return cursorY;
  }

  metrics.forEach((metric, index) => {
    if (index > 0 && index % 2 === 0) {
      cursorY += 15;
    }
    const column = index % 2;
    const x = page.margin + column * 87;
    doc.setFillColor(colors.panel);
    doc.roundedRect(x, cursorY - 5, 80, 12, 2, 2, "F");
    doc.setTextColor(colors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(metric.label, x + 4, cursorY);
    doc.setTextColor(colors.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(metric.value, x + 4, cursorY + 5);
  });

  return cursorY + Math.ceil(metrics.length / 2) * 15;
}

function drawCard(
  doc: jsPDF,
  title: string,
  metrics: PdfMetric[],
  cursorY: number,
) {
  const height = Math.max(26, 14 + Math.ceil(metrics.length / 2) * 12);
  doc.setDrawColor(colors.line);
  doc.roundedRect(page.margin, cursorY, page.width - page.margin * 2, height, 2, 2, "S");
  doc.setTextColor(colors.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, page.margin + 5, cursorY + 8);

  const metricY = cursorY + 14;
  metrics.forEach((metric, index) => {
    const row = Math.floor(index / 2);
    const column = index % 2;
    const x = page.margin + 5 + column * 84;
    const y = metricY + row * 9;
    doc.setTextColor(colors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(metric.label, x, y);
    doc.setTextColor(colors.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(metric.value, x, y + 4);
  });

  return cursorY + height + 6;
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let index = 1; index <= pageCount; index += 1) {
    doc.setPage(index);
    doc.setDrawColor(colors.line);
    doc.line(page.margin, page.height - 18, page.width - page.margin, page.height - 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(colors.muted);
    const footer = "Este documento representa um estudo estrategico baseado nos parametros informados na data da simulacao.";
    doc.text(doc.splitTextToSize(footer, page.width - page.margin * 2), page.margin, page.height - 13);
    doc.text(`Pagina ${index} de ${pageCount}`, page.width - page.margin, page.height - 7, { align: "right" });
  }
}

function ensureSpace(doc: jsPDF, cursorY: number, height: number) {
  if (cursorY + height <= page.height - 28) {
    return cursorY;
  }

  doc.addPage();
  return page.margin;
}

function buildSummaryMetrics(summary: SnapshotRecord) {
  return compactMetrics([
    metric("Cartas", formatInteger(readNumber(summary.cardCount))),
    metric("Credito contratado", formatCurrency(readNumber(summary.totalOriginalContracted))),
    metric("Credito atualizado", formatCurrency(readNumber(summary.totalUpdatedCredit))),
    metric("Valor futuro", formatCurrency(readNumber(summary.totalFutureValue))),
  ]);
}

function buildConsolidatedMetrics(summary: SnapshotRecord) {
  const inccGain = readNumber(summary.totalInccGain);
  const appreciationGain = readNumber(summary.totalIdleAppreciationGain);
  const estimatedGain =
    inccGain !== null && appreciationGain !== null ? inccGain + appreciationGain : null;

  return compactMetrics([
    metric("Credito atualizado", formatCurrency(readNumber(summary.totalUpdatedCredit))),
    metric("Valor futuro", formatCurrency(readNumber(summary.totalFutureValue))),
    metric("Ganho estimado", formatCurrency(estimatedGain)),
  ]);
}

function buildCardMetrics(card: SnapshotRecord, input: SnapshotRecord) {
  return compactMetrics([
    metric("Credito", formatCurrency(readNumber(card.updatedCredit) ?? readNumber(card.originalValue))),
    metric(
      "Parcela",
      formatCurrency(readNumber(card.monthlyContribution) ?? readNumber(card.monthlyPayment)),
    ),
    metric("Prazo", formatMonths(readNumber(input.termMonths))),
    metric(
      "Investimento",
      formatCurrency(readNumber(card.investment) ?? readNumber(card.realInvestment)),
    ),
    metric("Mes de contemplacao", formatMonth(readNumber(card.contemplationMonth))),
    metric("Mes de saque", formatMonth(readNumber(card.withdrawalMonth))),
    metric("Valor futuro", formatCurrency(readNumber(card.futureValue))),
    metric("Resultado", formatCurrency(readNumber(card.estimatedGain))),
    metric("ROI estimado", formatPercent(readNumber(card.estimatedGainRate))),
  ]);
}

function compactMetrics(metrics: Array<PdfMetric | null>) {
  return metrics.filter((metric): metric is PdfMetric => metric !== null);
}

function metric(label: string, value: string | null): PdfMetric | null {
  return value === null ? null : { label, value };
}

function formatCurrency(value: number | null) {
  return value === null ? null : currencyFormatter.format(value);
}

function formatInteger(value: number | null) {
  return value === null ? null : String(Math.trunc(value));
}

function formatMonth(value: number | null) {
  return value === null ? null : `Mes ${Math.trunc(value)}`;
}

function formatMonths(value: number | null) {
  return value === null ? null : `${Math.trunc(value)} meses`;
}

function formatPercent(value: number | null) {
  return value === null ? null : percentFormatter.format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data nao informada" : dateFormatter.format(date);
}

function buildFileName(simulationTitle: string, leadName: string) {
  const safeName = `${leadName}-${simulationTitle}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `evolv-estudo-multi-cotas-${safeName || "lead"}.pdf`;
}

function readRecord(value: unknown): SnapshotRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as SnapshotRecord
    : {};
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
