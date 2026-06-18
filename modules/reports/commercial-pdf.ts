import { jsPDF } from "jspdf";
import type {
  SimulatorCommercialData,
  SimulatorCommercialPresentation,
} from "@/modules/simulator";
import type { IntelligenceSummary } from "@/modules/intelligence";
import type { WealthJourney } from "@/modules/wealth";

type PdfMetric = {
  label: string;
  value: string;
};

type SimulatorCommercialPdfInput = {
  presentation: SimulatorCommercialPresentation;
  simulationName?: string;
  commercialData?: SimulatorCommercialData;
  intelligenceSummary?: IntelligenceSummary;
  wealthJourney?: WealthJourney;
  simulationDate?: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const multipleFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const page = {
  width: 210,
  height: 297,
  margin: 18,
};

const colors = {
  ink: "#111827",
  muted: "#64748b",
  soft: "#94a3b8",
  line: "#d8dee7",
  panel: "#f8fafc",
  panelStrong: "#eef5f4",
  primary: "#0f766e",
  deep: "#10201f",
  white: "#ffffff",
};

const finalDisclaimer =
  "Esta simulacao representa um cenario estimativo elaborado em tempo real, considerando os parametros selecionados durante a reuniao consultiva. Os resultados apresentados possuem carater exclusivamente ilustrativo e educacional, nao constituindo promessa de contemplacao, garantia de rentabilidade, oferta vinculante ou compromisso de desempenho futuro. A efetiva contemplacao esta sujeita as regras da administradora, disponibilidade dos grupos, criterios aplicaveis e condicoes vigentes na data da contratacao.";

export function generateSimulatorCommercialPdf({
  presentation,
  simulationName,
  commercialData = createPdfCommercialData(),
  intelligenceSummary,
  wealthJourney,
  simulationDate,
}: SimulatorCommercialPdfInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const reportDate = formatPdfDate(simulationDate ?? new Date().toISOString());

  drawCover(doc, presentation, {
    commercialData,
    reportDate,
    simulationName,
  });
  doc.addPage();
  drawReportPage(doc, presentation, {
    commercialData,
    intelligenceSummary,
    reportDate,
    simulationName,
    wealthJourney,
  });
  doc.save(buildFileName(presentation, commercialData, simulationName));
}

function drawCover(
  doc: jsPDF,
  presentation: SimulatorCommercialPresentation,
  metadata: {
    commercialData: SimulatorCommercialData;
    reportDate: string;
    simulationName?: string;
  },
) {
  doc.setFillColor(colors.deep);
  doc.rect(0, 0, page.width, page.height, "F");
  doc.setFillColor(colors.primary);
  doc.rect(0, 0, 8, page.height, "F");

  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Patrion Asset", page.margin + 4, 34);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.panel);
  doc.text("Simulacao patrimonial", page.margin + 4, 44);
  doc.setTextColor(colors.soft);
  doc.setFontSize(9);
  doc.text("EVOLV | tecnologia de simulacao", page.margin + 4, 52);

  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(normalizePdfText(metadata.simulationName) || "Estrategia comercial", page.margin + 4, 92, {
    maxWidth: 150,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(colors.soft);
  doc.text(metadata.reportDate, page.margin + 4, 106);

  const coverPeople = [
    metadata.commercialData.clientName
      ? `Cliente: ${metadata.commercialData.clientName}`
      : "",
    metadata.commercialData.consultantName
      ? `Consultor: ${metadata.commercialData.consultantName}`
      : "",
  ].filter(Boolean);

  coverPeople.forEach((line, index) => {
    doc.text(line, page.margin + 4, 116 + index * 7);
  });

  drawCoverMetric(doc, 130, {
    label: "Credito",
    value: currencyFormatter.format(presentation.updatedCredit),
  });
  drawCoverMetric(doc, 158, {
    label: "Parcela antes da contemplacao",
    value: currencyFormatter.format(
      presentation.installmentBeforeContemplation,
    ),
  });
  drawCoverMetric(doc, 186, {
    label: "Parcela pos-contemplacao",
    value: currencyFormatter.format(
      presentation.installmentAfterContemplation,
    ),
  });

  drawCoverTags(doc, 222, [
    {
      label: "Cenario",
      value: presentation.selectedScenarioName,
    },
    {
      label: "Seguro",
      value: presentation.insuranceLabel,
    },
    {
      label: "Lance",
      value: presentation.bidLabel,
    },
    {
      label: "Contemplacao",
      value: `Mes ${presentation.contemplationMonth}`,
    },
  ]);

  drawCoverFooter(doc);
}

function drawReportPage(
  doc: jsPDF,
  presentation: SimulatorCommercialPresentation,
  metadata: {
    commercialData: SimulatorCommercialData;
    intelligenceSummary?: IntelligenceSummary;
    reportDate: string;
    simulationName?: string;
    wealthJourney?: WealthJourney;
  },
) {
  drawHeader(doc, "Relatorio comercial");

  let y = 42;
  y = drawHighlight(doc, y, [
    {
      label: "Potencial patrimonial",
      value: currencyFormatter.format(presentation.estimatedCardSaleProfit),
    },
    {
      label: "Retorno estimado",
      value: percentFormatter.format(presentation.estimatedCardSaleGainRate),
    },
    {
      label: "Multiplo de alavancagem",
      value: `${multipleFormatter.format(presentation.leverageMultiple)}x`,
    },
  ]);

  y = drawSectionWithPageBreak(
    doc,
    y,
    "Dados da proposta",
    buildCommercialMetrics(metadata.commercialData, metadata.reportDate),
  );

  y = drawSectionWithPageBreak(doc, y, "Resumo executivo", [
    {
      label: "Credito",
      value: currencyFormatter.format(presentation.updatedCredit),
    },
    {
      label: "Credito base",
      value: currencyFormatter.format(presentation.contractedCredit),
    },
    {
      label: "INCC utilizado nesta projecao",
      value: `${percentFormatter.format(presentation.inccRate)} ao ano`,
    },
    {
      label: "Cenario selecionado",
      value: presentation.selectedScenarioName,
    },
    {
      label: "Opcao de seguro",
      value: presentation.insuranceLabel,
    },
  ]);

  y = drawSectionWithPageBreak(doc, y, "Credito e contemplacao", [
    {
      label: "Mes de contemplacao",
      value: String(presentation.contemplationMonth),
    },
    {
      label: "Credito liquido disponivel",
      value: currencyFormatter.format(presentation.liquidCredit),
    },
    {
      label: "Total investido ate contemplacao",
      value: currencyFormatter.format(
        presentation.totalInvestedUntilContemplation,
      ),
    },
  ]);

  y = drawSectionWithPageBreak(doc, y, "Parcelas", [
    {
      label: "Parcela antes da contemplacao",
      value: currencyFormatter.format(
        presentation.installmentBeforeContemplation,
      ),
    },
    {
      label: "Parcela pos-contemplacao",
      value: currencyFormatter.format(
        presentation.installmentAfterContemplation,
      ),
    },
  ]);

  y = drawSectionWithPageBreak(doc, y, "Lance", [
    {
      label: "Tipo de lance",
      value: presentation.bidLabel,
    },
    {
      label: "Valor do lance",
      value: currencyFormatter.format(presentation.bidAmount),
    },
    {
      label: "Investimento real",
      value: currencyFormatter.format(presentation.realInvestment),
    },
  ]);

  y = drawSectionWithPageBreak(doc, y, "Venda da carta", [
    {
      label: "Valor estimado de venda",
      value: currencyFormatter.format(presentation.estimatedCardSaleValue),
    },
    {
      label: "Potencial estimado de ganho patrimonial",
      value: currencyFormatter.format(presentation.estimatedCardSaleProfit),
    },
    {
      label: "Retorno estimado sobre o capital investido",
      value: percentFormatter.format(presentation.estimatedCardSaleGainRate),
    },
  ]);

  y = drawSectionWithPageBreak(doc, y, "Resultado e alavancagem", [
    {
      label: "Multiplo de alavancagem",
      value: `${multipleFormatter.format(presentation.leverageMultiple)}x`,
    },
  ]);

  if (metadata.intelligenceSummary) {
    y = drawIntelligenceSummarySection(
      doc,
      y,
      "Analise EVOLV",
      metadata.intelligenceSummary,
    );
  }

  if (metadata.wealthJourney) {
    y = drawWealthJourneySection(
      doc,
      y,
      "Jornada Patrimonial",
      metadata.wealthJourney,
    );
  }

  if (metadata.commercialData.commercialNotes.trim()) {
    drawNotesSection(
      doc,
      y,
      "Observacoes comerciais",
      metadata.commercialData.commercialNotes,
    );
  }

  drawFooterNote(doc);
}

function drawHeader(doc: jsPDF, title: string) {
  doc.setTextColor(colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Patrion Asset", page.margin, 18);
  doc.setTextColor(colors.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Simulacao patrimonial | EVOLV", page.margin, 25);
  doc.setTextColor(colors.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, page.width - page.margin, 22, { align: "right" });
  doc.setDrawColor(colors.line);
  doc.line(page.margin, 32, page.width - page.margin, 32);
}

function drawSection(
  doc: jsPDF,
  y: number,
  title: string,
  metrics: PdfMetric[],
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(colors.ink);
  doc.text(title, page.margin, y);
  drawMetricGrid(doc, y + 7, metrics);

  return y + 7 + Math.ceil(metrics.length / 2) * 22 + 9;
}

function drawSectionWithPageBreak(
  doc: jsPDF,
  y: number,
  title: string,
  metrics: PdfMetric[],
) {
  return drawSection(doc, ensureSpace(doc, y, sectionHeight(metrics)), title, metrics);
}

function buildCommercialMetrics(
  commercialData: SimulatorCommercialData,
  reportDate: string,
): PdfMetric[] {
  const metrics: PdfMetric[] = [];
  const clientName = normalizePdfText(commercialData.clientName);
  const consultantName = normalizePdfText(commercialData.consultantName);
  const clientPhone = normalizePdfText(commercialData.clientPhone);
  const clientEmail = normalizePdfText(commercialData.clientEmail);

  if (clientName) {
    metrics.push({ label: "Cliente", value: clientName });
  }

  if (consultantName) {
    metrics.push({ label: "Consultor", value: consultantName });
  }

  if (clientPhone) {
    metrics.push({ label: "Telefone", value: clientPhone });
  }

  if (clientEmail) {
    metrics.push({ label: "E-mail", value: clientEmail });
  }

  metrics.push(
    {
      label: "Data da simulacao",
      value: reportDate,
    },
    {
      label: "Tecnologia",
      value: "EVOLV",
    },
  );

  return metrics;
}

function sectionHeight(metrics: PdfMetric[]) {
  return 7 + Math.ceil(metrics.length / 2) * 22 + 9;
}

function ensureSpace(doc: jsPDF, y: number, neededHeight: number) {
  if (y + neededHeight <= 258) {
    return y;
  }

  doc.addPage();
  drawHeader(doc, "Relatorio comercial");

  return 42;
}

function drawMetricGrid(doc: jsPDF, y: number, metrics: PdfMetric[]) {
  const gap = 6;
  const columns = 2;
  const cardWidth = (page.width - page.margin * 2 - gap) / columns;
  const cardHeight = 17;

  metrics.forEach((metric, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = page.margin + column * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);

    doc.setFillColor(colors.white);
    doc.setDrawColor(colors.line);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, "FD");
    doc.setTextColor(colors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(metric.label, x + 4, cardY + 5.5);
    doc.setTextColor(colors.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(metric.value, x + 4, cardY + 12.5, {
      maxWidth: cardWidth - 8,
    });
  });
}

function drawNotesSection(
  doc: jsPDF,
  y: number,
  title: string,
  notes: string,
) {
  const cleanNotes = normalizePdfText(notes);
  const lines = doc.splitTextToSize(cleanNotes, page.width - page.margin * 2 - 8);
  const sectionY = ensureSpace(doc, y, 24 + lines.length * 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(colors.ink);
  doc.text(title, page.margin, sectionY);
  doc.setFillColor(colors.white);
  doc.setDrawColor(colors.line);
  doc.roundedRect(
    page.margin,
    sectionY + 7,
    page.width - page.margin * 2,
    16 + lines.length * 5,
    2,
    2,
    "FD",
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(colors.muted);
  doc.text(lines, page.margin + 4, sectionY + 16);

  return sectionY + 29 + lines.length * 5;
}

function drawWealthJourneySection(
  doc: jsPDF,
  y: number,
  title: string,
  journey: WealthJourney,
) {
  return drawSectionWithPageBreak(doc, y, title, [
    {
      label: "Patrimonio atual",
      value: currencyFormatter.format(journey.currentWealth),
    },
    {
      label: "Meta patrimonial",
      value: currencyFormatter.format(journey.targetWealth),
    },
    {
      label: "Patrimonio faltante",
      value: currencyFormatter.format(journey.missingWealth),
    },
    {
      label: "Proximo marco",
      value: journey.nextWealthMilestone
        ? currencyFormatter.format(journey.nextWealthMilestone.value)
        : "Meta atingida",
    },
    {
      label: "Imoveis necessarios",
      value: `${journey.requiredProperties}`,
    },
    {
      label: "Cartas necessarias",
      value: `${journey.requiredLetters}`,
    },
  ]);
}

function drawIntelligenceSummarySection(
  doc: jsPDF,
  y: number,
  title: string,
  summary: IntelligenceSummary,
) {
  let sectionY = ensureSpace(doc, y, 54);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(colors.ink);
  doc.text(title, page.margin, sectionY);

  sectionY += 7;
  sectionY = drawTextPanel(
    doc,
    sectionY,
    "Resumo Executivo",
    summary.executiveSummary,
  );
  sectionY = drawTextListPanel(
    doc,
    sectionY + 4,
    "Principais Insights",
    summary.insights,
  );
  sectionY = drawTextListPanel(
    doc,
    sectionY + 4,
    "Pontos de Atencao",
    summary.attentionPoints,
  );

  return drawTextListPanel(
    doc,
    sectionY + 4,
    "Oportunidades",
    summary.opportunities,
  );
}

function drawTextPanel(
  doc: jsPDF,
  y: number,
  title: string,
  text: string,
) {
  const lines = doc.splitTextToSize(text, page.width - page.margin * 2 - 8);
  const panelHeight = 15 + lines.length * 5;
  const panelY = ensureSpace(doc, y, panelHeight);

  doc.setFillColor(colors.white);
  doc.setDrawColor(colors.line);
  doc.roundedRect(
    page.margin,
    panelY,
    page.width - page.margin * 2,
    panelHeight,
    2,
    2,
    "FD",
  );
  doc.setTextColor(colors.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(title, page.margin + 4, panelY + 6);
  doc.setTextColor(colors.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(lines, page.margin + 4, panelY + 13);

  return panelY + panelHeight;
}

function drawTextListPanel(
  doc: jsPDF,
  y: number,
  title: string,
  items: string[],
) {
  const text = items.map((item) => `- ${item}`).join("\n");

  return drawTextPanel(doc, y, title, text);
}

function drawFooterNote(doc: jsPDF) {
  doc.setDrawColor(colors.line);
  doc.line(page.margin, 270, page.width - page.margin, 270);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(colors.ink);
  doc.text("Patrion Asset | EVOLV", page.margin, 279);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(colors.muted);
  doc.text(
    doc.splitTextToSize(finalDisclaimer, page.width - page.margin * 2),
    page.margin,
    284,
  );
}

function drawHighlight(doc: jsPDF, y: number, metrics: PdfMetric[]) {
  const gap = 5;
  const cardWidth = (page.width - page.margin * 2 - gap * 2) / 3;
  const cardHeight = 25;

  metrics.forEach((metric, index) => {
    const x = page.margin + index * (cardWidth + gap);
    doc.setFillColor(colors.panelStrong);
    doc.setDrawColor(colors.primary);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");
    doc.setTextColor(colors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(metric.label, x + 4, y + 7);
    doc.setTextColor(colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(metric.value, x + 4, y + 17, {
      maxWidth: cardWidth - 8,
    });
  });

  return y + cardHeight + 14;
}

function drawCoverMetric(doc: jsPDF, y: number, metric: PdfMetric) {
  doc.setTextColor(colors.soft);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(metric.label, page.margin + 4, y);
  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(metric.value, page.margin + 4, y + 10);
}

function drawCoverTags(doc: jsPDF, y: number, metrics: PdfMetric[]) {
  const gap = 4;
  const cardWidth = (page.width - page.margin * 2 - 8 - gap) / 2;
  const cardHeight = 16;

  metrics.forEach((metric, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = page.margin + 4 + column * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);

    doc.setFillColor("#1f3432");
    doc.setDrawColor("#31504c");
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, "FD");
    doc.setTextColor(colors.soft);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(metric.label, x + 4, cardY + 5);
    doc.setTextColor(colors.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(metric.value, x + 4, cardY + 11.5, {
      maxWidth: cardWidth - 8,
    });
  });
}

function drawCoverFooter(doc: jsPDF) {
  doc.setDrawColor("#31504c");
  doc.line(page.margin + 4, 276, page.width - page.margin, 276);
  doc.setTextColor(colors.soft);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text(doc.splitTextToSize(finalDisclaimer, 160), page.margin + 4, 281);
}

function buildFileName(
  presentation: SimulatorCommercialPresentation,
  commercialData: SimulatorCommercialData,
  simulationName?: string,
) {
  const label =
    normalizePdfText(commercialData.clientName) ||
    normalizePdfText(simulationName) ||
    presentation.selectedScenarioName;
  const scenario = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `evolv-simulacao-${scenario || "comercial"}.pdf`;
}

function createPdfCommercialData(): SimulatorCommercialData {
  return {
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    consultantName: "",
    commercialNotes: "",
  };
}

function formatPdfDate(isoDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(new Date(isoDate));
}

function normalizePdfText(value: string | undefined) {
  return value?.trim() ?? "";
}
