import { jsPDF } from "jspdf";

type SnapshotRecord = Record<string, unknown>;

type MultiCotasCommercialPdfInput = {
  consultantName?: string;
  leadName?: string;
  simulationCreatedAt?: string;
  simulationTitle?: string;
  snapshot: SnapshotRecord;
};

type PdfMetric = {
  label: string;
  value: string;
};

type MultiCotasConsultingConditions = {
  enabled: boolean;
  exemptionDays: number;
  exemptionEnabled: boolean;
  installmentAmount: number;
  installmentCount: number;
  totalAmount: number;
};

const page = {
  height: 297,
  margin: 18,
  width: 210,
};

const colors = {
  deep: "#10201f",
  ink: "#111827",
  line: "#d8dee7",
  muted: "#64748b",
  panel: "#f8fafc",
  panelStrong: "#eef5f4",
  primary: "#0f766e",
  soft: "#94a3b8",
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
});

const percentagePointsFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const finalDisclaimer =
  "Esta simulacao representa um cenario estimativo elaborado em tempo real, considerando os parametros selecionados durante a reuniao consultiva. Os resultados apresentados possuem carater exclusivamente ilustrativo e educacional, nao constituindo promessa de contemplacao, garantia de rentabilidade, oferta vinculante ou compromisso de desempenho futuro. A efetiva contemplacao esta sujeita as regras da administradora, disponibilidade dos grupos, criterios aplicaveis e condicoes vigentes na data da contratacao.";

export function generateMultiCotasCommercialPdf({
  consultantName = "",
  leadName = "",
  simulationCreatedAt,
  simulationTitle = "Estrategia Patrimonial Multi-Cotas",
  snapshot,
}: MultiCotasCommercialPdfInput) {
  const input = readRecord(snapshot.input);
  const leadContext = readRecord(snapshot.leadContext);
  const metadata = readRecord(snapshot.metadata);
  const result = readRecord(snapshot.result);
  const summary = readRecord(result.summary);
  const consultingConditions = normalizeConsultingConditions(
    readRecord(metadata.consultingConditions),
  );
  const cards = Array.isArray(result.cards)
    ? result.cards.map(readRecord).filter((card) => Object.keys(card).length > 0)
    : [];

  if (!Object.keys(summary).length || !cards.length) {
    throw new Error("O snapshot salvo nao possui dados suficientes para gerar o PDF.");
  }

  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const reportDate = formatDate(simulationCreatedAt ?? new Date().toISOString());

  drawCover(doc, {
    consultantName:
      consultantName ||
      readString(leadContext.responsibleName) ||
      readString(metadata.responsibleName) ||
      "Consultoria Patrion",
    leadName: leadName || readString(leadContext.leadName),
    reportDate,
    simulationTitle,
    summary,
  });

  doc.addPage();
  drawReportHeader(doc, "Resumo executivo");
  drawExecutiveSummary(doc, summary, input, metadata);

  doc.addPage();
  drawReportHeader(doc, "Narrativa consultiva");
  drawNarrative(doc, summary, input);

  if (consultingConditions) {
    doc.addPage();
    drawReportHeader(doc, "Consultoria Patrimonial");
    drawConsultingConditions(doc, consultingConditions);
  }

  doc.addPage();
  drawReportHeader(doc, "Linha do tempo");
  drawTimeline(doc, cards);

  doc.addPage();
  drawReportHeader(doc, "Detalhamento das cartas");
  drawCardDetails(doc, cards, input);

  doc.addPage();
  drawReportHeader(doc, "Memoria Operacional da Estrategia");
  drawOperationalMemory(doc, cards);

  drawFooter(doc);
  doc.save(buildFileName(simulationTitle, leadName));
}

function drawCover(
  doc: jsPDF,
  metadata: {
    leadName: string;
    consultantName: string;
    reportDate: string;
    simulationTitle: string;
    summary: SnapshotRecord;
  },
) {
  doc.setFillColor(colors.deep);
  doc.rect(0, 0, page.width, page.height, "F");
  doc.setFillColor(colors.primary);
  doc.rect(0, 0, 8, page.height, "F");

  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("EVOLV", page.margin + 4, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(colors.soft);
  doc.text("Patrion Asset | Inteligencia patrimonial", page.margin + 4, 45);

  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Estrategia Patrimonial Multi-Cotas", page.margin + 4, 88, {
    maxWidth: 150,
  });

  let cursorY = 110;
  if (metadata.leadName.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(colors.soft);
    doc.text("Preparado exclusivamente para", page.margin + 4, cursorY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(colors.white);
    doc.text(metadata.leadName.trim(), page.margin + 4, cursorY + 11, {
      maxWidth: 145,
    });
    cursorY += 29;
  }

  drawCoverMetric(doc, cursorY, {
    label: "Credito contratado",
    value: formatCurrency(readNumber(metadata.summary.totalOriginalContracted)) ?? "-",
  });

  drawCoverTags(doc, cursorY + 26, [
    {
      label: "Cartas",
      value: formatInteger(readNumber(metadata.summary.cardCount)) ?? "-",
    },
    {
      label: "Data",
      value: metadata.reportDate,
    },
    {
      label: "Consultor",
      value: metadata.consultantName,
    },
    {
      label: "Documento",
      value: metadata.simulationTitle || "Multi-Cotas",
    },
  ]);

  drawCoverFooter(doc);
}

function drawExecutiveSummary(
  doc: jsPDF,
  summary: SnapshotRecord,
  input: SnapshotRecord,
  metadata: SnapshotRecord,
) {
  drawLeadParagraph(
    doc,
    43,
    "Este relatorio consolida a estrategia patrimonial Multi-Cotas a partir dos mesmos calculos utilizados na interface do simulador. A leitura abaixo resume o volume contratado, a atualizacao pelo INCC e o potencial estimado de valorizacao ate os meses de saque definidos.",
  );

  drawHighlight(doc, 78, [
    {
      label: "Total contratado",
      value: formatCurrency(readNumber(summary.totalOriginalContracted)) ?? "-",
    },
    {
      label: "Total atualizado pelo INCC",
      value: formatCurrency(readNumber(summary.totalUpdatedCredit)) ?? "-",
    },
    {
      label: "Valor futuro estimado",
      value: formatCurrency(readNumber(summary.totalFutureValue)) ?? "-",
    },
  ]);

  drawMetricGrid(doc, 121, buildSummaryMetrics(summary, input, metadata));
}

function drawNarrative(
  doc: jsPDF,
  summary: SnapshotRecord,
  input: SnapshotRecord,
) {
  const cardCount = formatInteger(readNumber(summary.cardCount)) ?? "multiplas";
  const totalContracted =
    formatCurrency(readNumber(summary.totalOriginalContracted)) ?? "o valor contratado";
  const updatedCredit =
    formatCurrency(readNumber(summary.totalUpdatedCredit)) ?? "o credito atualizado";
  const futureValue =
    formatCurrency(readNumber(summary.totalFutureValue)) ?? "o valor futuro estimado";
  const inccLabel = resolveInccLabel(input, {}, summary);

  const paragraphs = [
    `A estrategia distribui ${totalContracted} em ${cardCount} cartas com momentos de contemplacao e saque definidos individualmente. Essa organizacao cria uma jornada patrimonial escalonada, em que cada carta carrega seu proprio periodo de atualizacao e valorizacao ate o uso do credito.`,
    `Ao longo da simulacao, os creditos sao atualizados pelo INCC considerado no estudo (${inccLabel}) e permanecem expostos a valorizacao durante o intervalo entre a contemplacao e o saque. O resultado consolidado mostra ${updatedCredit} em credito atualizado e ${futureValue} como valor futuro estimado.`,
    "A leitura consultiva do Multi-Cotas nao depende de uma unica carta ou de um unico evento. O valor da estrategia esta na composicao: diferentes cartas, diferentes janelas de contemplacao e diferentes periodos de maturacao patrimonial.",
  ];

  let cursorY = 48;
  paragraphs.forEach((paragraph) => {
    const lines = doc.splitTextToSize(paragraph, page.width - page.margin * 2);
    doc.setTextColor(colors.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(lines, page.margin, cursorY);
    cursorY += lines.length * 6 + 9;
  });
}

function drawConsultingConditions(
  doc: jsPDF,
  conditions: MultiCotasConsultingConditions,
) {
  drawLeadParagraph(
    doc,
    43,
    "A Consultoria Patrimonial contempla a estruturacao da estrategia, a analise tecnica da composicao das cartas e o acompanhamento consultivo durante a tomada de decisao.",
  );

  const panelY = 77;
  doc.setFillColor(colors.white);
  doc.setDrawColor(colors.line);
  doc.roundedRect(page.margin, panelY, page.width - page.margin * 2, 74, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(colors.primary);
  doc.text("Consultoria Patrimonial", page.margin + 7, panelY + 11);

  const metrics: PdfMetric[] = [
    {
      label: "Valor",
      value: currencyFormatter.format(conditions.totalAmount),
    },
    {
      label: "Parcelamento",
      value: `${conditions.installmentCount}x de ${currencyFormatter.format(
        conditions.installmentAmount,
      )}`,
    },
  ];
  drawInlineConsultingMetrics(doc, panelY + 24, metrics);

  if (conditions.exemptionEnabled) {
    doc.setFillColor(colors.panelStrong);
    doc.setDrawColor(colors.primary);
    doc.roundedRect(
      page.margin + 7,
      panelY + 50,
      page.width - page.margin * 2 - 14,
      17,
      2,
      2,
      "FD",
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(colors.primary);
    doc.text("Condicao Especial", page.margin + 12, panelY + 58);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(colors.ink);
    doc.text(
      `Fechando esta estrategia patrimonial em ate ${conditions.exemptionDays} dias corridos, o investimento referente a consultoria patrimonial sera integralmente isentado.`,
      page.margin + 54,
      panelY + 58,
      { maxWidth: page.width - page.margin * 2 - 67 },
    );
  }
}

function drawTimeline(doc: jsPDF, cards: SnapshotRecord[]) {
  drawLeadParagraph(
    doc,
    43,
    "A linha do tempo mostra a sequencia operacional de cada carta: valor contratado, contemplacao, saque e valor estimado no momento projetado.",
  );

  let cursorY = 74;
  cards.forEach((card, index) => {
    cursorY = ensureSpace(doc, cursorY, 32, "Linha do tempo");
    const position = formatInteger(readNumber(card.position)) ?? String(index + 1);
    const originalValue = formatCurrency(readNumber(card.originalValue)) ?? "-";
    const futureValue = formatCurrency(readNumber(card.futureValue)) ?? "-";

    doc.setDrawColor(colors.line);
    doc.setFillColor(index % 2 === 0 ? colors.panel : colors.white);
    doc.roundedRect(page.margin, cursorY, page.width - page.margin * 2, 25, 2, 2, "FD");
    doc.setTextColor(colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Carta ${position}`, page.margin + 5, cursorY + 9);

    drawTimelineStep(doc, page.margin + 34, cursorY + 8, "Contrato", originalValue);
    drawTimelineArrow(doc, page.margin + 69, cursorY + 10);
    drawTimelineStep(
      doc,
      page.margin + 74,
      cursorY + 8,
      "Contemplacao",
      formatMonth(readNumber(card.contemplationMonth)) ?? "-",
    );
    drawTimelineArrow(doc, page.margin + 111, cursorY + 10);
    drawTimelineStep(
      doc,
      page.margin + 116,
      cursorY + 8,
      "Saque",
      formatMonth(readNumber(card.withdrawalMonth)) ?? "-",
    );
    drawTimelineArrow(doc, page.margin + 143, cursorY + 10);
    drawTimelineStep(doc, page.margin + 148, cursorY + 8, "Valor estimado", futureValue);
    cursorY += 32;
  });
}

function drawCardDetails(
  doc: jsPDF,
  cards: SnapshotRecord[],
  input: SnapshotRecord,
) {
  let cursorY = 43;
  cards.forEach((card, index) => {
    const metrics = buildCardMetrics(card, input);
    const cardHeight = 72;
    cursorY = ensureSpace(doc, cursorY, cardHeight + 8, "Detalhamento das cartas");
    cursorY = drawCardDetail(
      doc,
      `Carta ${readNumber(card.position) ?? index + 1}`,
      metrics,
      cursorY,
      cardHeight,
    );
  });
}

function drawOperationalMemory(doc: jsPDF, cards: SnapshotRecord[]) {
  const headers = [
    "Carta",
    "Valor original",
    "Mes contemplacao",
    "Mes saque",
    "Reajustes INCC",
    "Credito atualizado",
    "Meses parada",
    "Valor futuro",
  ];
  const widths = [14, 28, 24, 20, 22, 29, 20, 29];
  let cursorY = 43;

  cursorY = drawTableHeader(doc, cursorY, headers, widths);
  cards.forEach((card, index) => {
    cursorY = ensureSpace(doc, cursorY, 14, "Memoria Operacional da Estrategia");
    if (cursorY === 43) {
      cursorY = drawTableHeader(doc, cursorY, headers, widths);
    }

    const row = [
      `Carta ${formatInteger(readNumber(card.position)) ?? String(index + 1)}`,
      formatCurrency(readNumber(card.originalValue)) ?? "-",
      formatMonth(readNumber(card.contemplationMonth)) ?? "-",
      formatMonth(readNumber(card.withdrawalMonth)) ?? "-",
      formatInteger(readNumber(card.inccAdjustmentCount)) ?? "-",
      formatCurrency(readNumber(card.updatedCredit)) ?? "-",
      formatInteger(readNumber(card.idleMonths)) ?? "-",
      formatCurrency(readNumber(card.futureValue)) ?? "-",
    ];
    cursorY = drawTableRow(doc, cursorY, row, widths);
  });
}

function drawReportHeader(doc: jsPDF, title: string) {
  doc.setTextColor(colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Patrion Asset", page.margin, 18);
  doc.setTextColor(colors.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Estrategia patrimonial Multi-Cotas | EVOLV", page.margin, 25);
  doc.setTextColor(colors.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, page.width - page.margin, 22, { align: "right" });
  doc.setDrawColor(colors.line);
  doc.line(page.margin, 32, page.width - page.margin, 32);
}

function drawLeadParagraph(doc: jsPDF, y: number, text: string) {
  const lines = doc.splitTextToSize(text, page.width - page.margin * 2);
  doc.setTextColor(colors.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(lines, page.margin, y);
  return y + lines.length * 5;
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
    doc.text(metric.value, x + 4, y + 17, { maxWidth: cardWidth - 8 });
  });
}

function drawInlineConsultingMetrics(
  doc: jsPDF,
  y: number,
  metrics: PdfMetric[],
) {
  const gap = 6;
  const cardWidth = (page.width - page.margin * 2 - 14 - gap) / 2;

  metrics.forEach((metric, index) => {
    const x = page.margin + 7 + index * (cardWidth + gap);
    doc.setFillColor(colors.panel);
    doc.setDrawColor(colors.line);
    doc.roundedRect(x, y, cardWidth, 18, 2, 2, "FD");
    doc.setTextColor(colors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(metric.label, x + 4, y + 6);
    doc.setTextColor(colors.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(metric.value, x + 4, y + 13.5, { maxWidth: cardWidth - 8 });
  });
}

function drawMetricGrid(doc: jsPDF, y: number, metrics: PdfMetric[]) {
  const gap = 6;
  const columns = 2;
  const cardWidth = (page.width - page.margin * 2 - gap) / columns;
  const cardHeight = 18;

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
    doc.text(metric.label, x + 4, cardY + 6);
    doc.setTextColor(colors.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(metric.value, x + 4, cardY + 13, { maxWidth: cardWidth - 8 });
  });
}

function drawTimelineStep(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
) {
  doc.setTextColor(colors.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text(label, x, y);
  doc.setTextColor(colors.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(value, x, y + 6, { maxWidth: 34 });
}

function drawTimelineArrow(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(colors.line);
  doc.line(x, y, x + 10, y);
  doc.line(x + 10, y, x + 7, y - 2);
  doc.line(x + 10, y, x + 7, y + 2);
}

function drawCardDetail(
  doc: jsPDF,
  title: string,
  metrics: PdfMetric[],
  cursorY: number,
  height: number,
) {
  doc.setFillColor(colors.white);
  doc.setDrawColor(colors.line);
  doc.roundedRect(page.margin, cursorY, page.width - page.margin * 2, height, 3, 3, "FD");
  doc.setFillColor(colors.panelStrong);
  doc.roundedRect(page.margin, cursorY, page.width - page.margin * 2, 15, 3, 3, "F");
  doc.setTextColor(colors.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, page.margin + 6, cursorY + 10);

  const columnWidth = (page.width - page.margin * 2 - 16) / 3;
  metrics.forEach((metric, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = page.margin + 6 + column * columnWidth;
    const y = cursorY + 25 + row * 11.5;
    doc.setTextColor(colors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.text(metric.label, x, y);
    doc.setTextColor(colors.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.7);
    doc.text(metric.value, x, y + 5, { maxWidth: columnWidth - 6 });
  });

  return cursorY + height + 8;
}

function drawTableHeader(
  doc: jsPDF,
  cursorY: number,
  headers: string[],
  widths: number[],
) {
  let x = page.margin;
  doc.setFillColor(colors.panelStrong);
  doc.roundedRect(page.margin, cursorY - 6, page.width - page.margin * 2, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.4);
  doc.setTextColor(colors.primary);
  headers.forEach((header, index) => {
    doc.text(header, x + 1, cursorY);
    x += widths[index] ?? 20;
  });
  return cursorY + 9;
}

function drawTableRow(
  doc: jsPDF,
  cursorY: number,
  row: string[],
  widths: number[],
) {
  let x = page.margin;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(colors.ink);
  row.forEach((cell, index) => {
    doc.text(cell, x + 1, cursorY, { maxWidth: (widths[index] ?? 20) - 2 });
    x += widths[index] ?? 20;
  });
  doc.setDrawColor(colors.line);
  doc.line(page.margin, cursorY + 5, page.width - page.margin, cursorY + 5);
  return cursorY + 10;
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let index = 1; index <= pageCount; index += 1) {
    doc.setPage(index);
    if (index === 1) {
      continue;
    }

    doc.setDrawColor(colors.line);
    doc.line(page.margin, page.height - 18, page.width - page.margin, page.height - 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(colors.ink);
    doc.text("Patrion Asset | EVOLV", page.margin, page.height - 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(colors.muted);
    doc.text(`Pagina ${index} de ${pageCount}`, page.width - page.margin, page.height - 11, {
      align: "right",
    });
  }
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
    doc.text(metric.value, x + 4, cardY + 11.5, { maxWidth: cardWidth - 8 });
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

function ensureSpace(
  doc: jsPDF,
  cursorY: number,
  height: number,
  title: string,
) {
  if (cursorY + height <= page.height - 26) {
    return cursorY;
  }

  doc.addPage();
  drawReportHeader(doc, title);
  return 43;
}

function buildSummaryMetrics(
  summary: SnapshotRecord,
  input: SnapshotRecord,
  metadata: SnapshotRecord,
) {
  const inccGain = readNumber(summary.totalInccGain);
  const appreciationGain = readNumber(summary.totalIdleAppreciationGain);
  const estimatedGain =
    readNumber(summary.totalEstimatedGain) ??
    (inccGain !== null && appreciationGain !== null
      ? inccGain + appreciationGain
      : null);

  return compactMetrics([
    metric("Quantidade de cartas", formatInteger(readNumber(summary.cardCount))),
    metric("Ganho estimado total", formatCurrency(estimatedGain)),
    metric("Ganho por INCC", formatCurrency(inccGain)),
    metric("Ganho por valorizacao", formatCurrency(appreciationGain)),
    {
      label: "INCC utilizado",
      value: resolveInccLabel(input, metadata, summary),
    },
  ]);
}

function normalizeConsultingConditions(
  conditions: SnapshotRecord,
): MultiCotasConsultingConditions | null {
  const enabled = conditions.enabled === true;
  const installmentCount =
    readNumber(conditions.installmentCount) ??
    readNumber(conditions.installments);
  const installmentAmount = readNumber(conditions.installmentAmount);
  const totalAmount = readNumber(conditions.totalAmount);
  const exemptionDays = readNumber(conditions.exemptionDays) ?? 7;
  const exemptionEnabled = conditions.exemptionEnabled !== false;

  if (
    !enabled ||
    installmentCount === null ||
    installmentAmount === null ||
    totalAmount === null ||
    installmentCount <= 0 ||
    installmentAmount <= 0 ||
    totalAmount <= 0
  ) {
    return null;
  }

  return {
    enabled,
    exemptionDays: Math.trunc(exemptionDays),
    exemptionEnabled,
    installmentAmount,
    installmentCount: Math.trunc(installmentCount),
    totalAmount,
  };
}

function buildCardMetrics(card: SnapshotRecord, input: SnapshotRecord) {
  return compactMetrics([
    metric("Valor contratado", formatCurrency(readNumber(card.originalValue))),
    metric("Mes de contemplacao", formatMonth(readNumber(card.contemplationMonth))),
    metric("Mes de saque", formatMonth(readNumber(card.withdrawalMonth))),
    metric("Reajustes INCC", formatInteger(readNumber(card.inccAdjustmentCount))),
    metric("Credito atualizado", formatCurrency(readNumber(card.updatedCredit))),
    metric("Valor futuro", formatCurrency(readNumber(card.futureValue))),
    metric("Ganho por INCC", formatCurrency(readNumber(card.inccGain))),
    metric("Ganho por valorizacao", formatCurrency(readNumber(card.idleAppreciationGain))),
    metric("ROI estimado", formatPercent(readNumber(card.estimatedGainRate))),
    metric("Prazo da estrategia", formatMonths(readNumber(input.termMonths))),
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

function resolveInccLabel(
  input: SnapshotRecord,
  metadata: SnapshotRecord,
  summary: SnapshotRecord,
) {
  const percentagePoints =
    readNumber(input.annualInccPercent) ??
    readNumber(input.inccPercent) ??
    readNumber(metadata.annualInccPercent) ??
    readNumber(metadata.inccPercent) ??
    readNumber(summary.annualInccPercent) ??
    readNumber(summary.inccPercent);

  if (percentagePoints !== null) {
    return `${percentagePointsFormatter.format(percentagePoints)}% ao ano`;
  }

  const rate =
    readNumber(input.inccRate) ??
    readNumber(metadata.inccRate) ??
    readNumber(summary.inccRate);

  return rate === null
    ? "Nao informado no estudo salvo"
    : `${percentFormatter.format(rate)} ao ano`;
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

  return `evolv-estrategia-multi-cotas-${safeName || "lead"}.pdf`;
}

function readRecord(value: unknown): SnapshotRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as SnapshotRecord)
    : {};
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
