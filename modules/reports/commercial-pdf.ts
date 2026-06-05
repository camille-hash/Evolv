import { jsPDF } from "jspdf";
import type { SimulatorCommercialPresentation } from "@/modules/simulator";

type PdfMetric = {
  label: string;
  value: string;
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

export function generateSimulatorCommercialPdf(
  presentation: SimulatorCommercialPresentation,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const reportDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(new Date());

  drawCover(doc, presentation, reportDate);
  doc.addPage();
  drawReportPage(doc, presentation);
  doc.save(buildFileName(presentation));
}

function drawCover(
  doc: jsPDF,
  presentation: SimulatorCommercialPresentation,
  reportDate: string,
) {
  doc.setFillColor(colors.deep);
  doc.rect(0, 0, page.width, page.height, "F");
  doc.setFillColor(colors.primary);
  doc.rect(0, 0, 8, page.height, "F");

  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("EVOLV", page.margin + 4, 34);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.panel);
  doc.text("Simulacao patrimonial", page.margin + 4, 44);

  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Estrategia comercial", page.margin + 4, 92);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(colors.soft);
  doc.text(reportDate, page.margin + 4, 103);

  drawCoverMetric(doc, 130, {
    label: "Credito contratado",
    value: currencyFormatter.format(presentation.contractedCredit),
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
) {
  drawHeader(doc, "Relatorio comercial");

  let y = 42;
  y = drawHighlight(doc, y, [
    {
      label: "Lucro estimado",
      value: currencyFormatter.format(presentation.estimatedCardSaleProfit),
    },
    {
      label: "Percentual de ganho",
      value: percentFormatter.format(presentation.estimatedCardSaleGainRate),
    },
    {
      label: "Multiplo de alavancagem",
      value: `${multipleFormatter.format(presentation.leverageMultiple)}x`,
    },
  ]);

  y = drawSection(doc, y, "Resumo executivo", [
    {
      label: "Credito contratado",
      value: currencyFormatter.format(presentation.contractedCredit),
    },
    {
      label: "Credito atualizado pelo INCC",
      value: currencyFormatter.format(presentation.updatedCredit),
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

  y = drawSection(doc, y, "Credito e contemplacao", [
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

  y = drawSection(doc, y, "Parcelas", [
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

  y = drawSection(doc, y, "Lance", [
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

  y = drawSection(doc, y, "Venda da carta", [
    {
      label: "Valor estimado de venda",
      value: currencyFormatter.format(presentation.estimatedCardSaleValue),
    },
    {
      label: "Lucro estimado",
      value: currencyFormatter.format(presentation.estimatedCardSaleProfit),
    },
    {
      label: "Percentual de ganho",
      value: percentFormatter.format(presentation.estimatedCardSaleGainRate),
    },
  ]);

  drawSection(doc, y, "Resultado e alavancagem", [
    {
      label: "Multiplo de alavancagem",
      value: `${multipleFormatter.format(presentation.leverageMultiple)}x`,
    },
  ]);

  drawFooterNote(doc);
}

function drawHeader(doc: jsPDF, title: string) {
  doc.setTextColor(colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("EVOLV", page.margin, 18);
  doc.setTextColor(colors.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Simulacao patrimonial", page.margin, 25);
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

function drawFooterNote(doc: jsPDF) {
  doc.setDrawColor(colors.line);
  doc.line(page.margin, 270, page.width - page.margin, 270);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(colors.ink);
  doc.text("Patrion | EVOLV", page.margin, 279);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(colors.muted);
  doc.text(
    "Simulacao estimativa sujeita as regras da administradora e condicoes vigentes.",
    page.margin,
    286,
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
  doc.setFontSize(9);
  doc.text(
    "Simulacao estimativa sujeita as regras da administradora e condicoes vigentes.",
    page.margin + 4,
    285,
  );
}

function buildFileName(presentation: SimulatorCommercialPresentation) {
  const scenario = presentation.selectedScenarioName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `evolv-simulacao-${scenario || "comercial"}.pdf`;
}
