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

export type PdfCommercialProposalContext = {
  kind?: string;
  proposalId?: string;
  rationale?: string;
  recommendation?: string;
  title?: string;
  variant?: string;
};

export type PdfCommercialConsultingConditions = {
  installmentAmount: number;
  installments: number;
  totalAmount: number;
};

type ResolvedCommercialProposalContext = {
  clientLabel: string;
  hasCustomNarrative: boolean;
  rationale: string;
  recommendation: string;
  source: "commercial_notes" | "commercial_proposal" | "fallback";
  title: string;
};

type SimulatorCommercialPdfInput = {
  presentation: SimulatorCommercialPresentation;
  simulationName?: string;
  commercialData?: SimulatorCommercialData;
  commercialConsultingConditions?: PdfCommercialConsultingConditions | null;
  commercialProposal?: PdfCommercialProposalContext;
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
  commercialConsultingConditions,
  commercialProposal,
  intelligenceSummary,
  wealthJourney,
  simulationDate,
}: SimulatorCommercialPdfInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const reportDate = formatPdfDate(simulationDate ?? new Date().toISOString());
  const proposalContext = resolveCommercialProposalContext({
    commercialData,
    commercialProposal,
    simulationName,
  });

  drawCover(doc, presentation, {
    commercialData,
    proposalContext,
    reportDate,
  });
  doc.addPage();
  drawReportPage(doc, presentation, {
    commercialData,
    intelligenceSummary,
    proposalContext,
    reportDate,
    wealthJourney,
    commercialConsultingConditions:
      normalizeCommercialConsultingConditions(commercialConsultingConditions),
  });
  doc.save(buildFileName(presentation, commercialData, simulationName));
}

function drawCover(
  doc: jsPDF,
  presentation: SimulatorCommercialPresentation,
  metadata: {
    commercialData: SimulatorCommercialData;
    proposalContext: ResolvedCommercialProposalContext;
    reportDate: string;
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
  doc.text("Proposta Patrimonial", page.margin + 4, 88, {
    maxWidth: 150,
  });

  let coverY = 103;

  if (metadata.proposalContext.clientLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(colors.soft);
    doc.text("Preparada para", page.margin + 4, coverY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(colors.white);
    doc.text(
      metadata.proposalContext.clientLabel,
      page.margin + 4,
      coverY + 11,
      {
        maxWidth: 150,
      },
    );
    coverY += 21;
  }

  if (metadata.proposalContext.title) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(colors.soft);
    doc.text(metadata.proposalContext.title, page.margin + 4, coverY, {
      maxWidth: 150,
    });
    coverY += 12;
  }

  const coverPeople = [
    metadata.commercialData.consultantName
      ? `Consultor: ${metadata.commercialData.consultantName}`
      : "",
    `Data: ${metadata.reportDate}`,
  ].filter(Boolean);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(colors.soft);
  coverPeople.forEach((line, index) => {
    doc.text(line, page.margin + 4, coverY + index * 7);
  });

  drawCoverMetric(doc, 164, {
    label: "Credito contratado",
    value: currencyFormatter.format(presentation.contractedCredit),
  });

  drawCoverTags(doc, 205, [
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
      label: "Contemplacao simulada",
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
    commercialConsultingConditions: PdfCommercialConsultingConditions | null;
    intelligenceSummary?: IntelligenceSummary;
    proposalContext: ResolvedCommercialProposalContext;
    reportDate: string;
    wealthJourney?: WealthJourney;
  },
) {
  drawHeader(doc, "Proposta patrimonial");

  let y = 42;
  y = metadata.proposalContext.hasCustomNarrative
    ? drawProposalNarrativeSection(doc, y, metadata.proposalContext)
    : drawConsultativeOpening(doc, y, metadata.commercialData);

  y = drawSectionWithPageBreak(doc, y, "Resumo executivo", [
    {
      label: "Credito",
      value: currencyFormatter.format(presentation.commercialCredit),
    },
    {
      label: "Credito atualizado pelo INCC",
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

  y = drawOperationTimeline(doc, y, presentation);

  y = drawSectionWithPageBreak(
    doc,
    y,
    "Dados da proposta",
    buildCommercialMetrics(metadata.commercialData, metadata.reportDate),
  );

  y = drawSectionWithPageBreak(doc, y, "Credito e contemplacao", [
    {
      label: "Mes de contemplacao",
      value: String(presentation.contemplationMonth),
    },
    {
      label: "Credito disponivel ao cliente",
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
      "Leitura consultiva EVOLV",
      metadata.intelligenceSummary,
    );
  }

  if (metadata.wealthJourney && hasWealthJourneyContent(metadata.wealthJourney)) {
    y = drawWealthJourneySection(
      doc,
      y,
      "Jornada Patrimonial",
      metadata.wealthJourney,
    );
  } else {
    y = drawInstitutionalSection(doc, y);
  }

  if (
    metadata.commercialData.commercialNotes.trim() &&
    !isTextAlreadyRenderedAsProposalNarrative(
      metadata.commercialData.commercialNotes,
      metadata.proposalContext,
    )
  ) {
    y = drawNotesSection(
      doc,
      y,
      "Observacoes comerciais",
      metadata.commercialData.commercialNotes,
    );
  }

  if (metadata.commercialConsultingConditions) {
    y = drawCommercialConsultingConditionsSection(
      doc,
      y,
      metadata.commercialConsultingConditions,
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

function resolveCommercialProposalContext({
  commercialData,
  commercialProposal,
  simulationName,
}: {
  commercialData: SimulatorCommercialData;
  commercialProposal?: PdfCommercialProposalContext;
  simulationName?: string;
}): ResolvedCommercialProposalContext {
  const clientName = normalizePdfText(commercialData.clientName);
  const proposalTitle =
    normalizePdfText(commercialProposal?.title) ||
    normalizePdfText(simulationName);
  const proposalRecommendation = normalizePdfText(
    commercialProposal?.recommendation,
  );
  const proposalRationale = normalizePdfText(commercialProposal?.rationale);

  if (commercialProposal && (proposalRecommendation || proposalRationale)) {
    return {
      clientLabel: clientName,
      hasCustomNarrative: true,
      rationale: proposalRationale,
      recommendation: proposalRecommendation || proposalRationale,
      source: "commercial_proposal",
      title: proposalTitle,
    };
  }

  return {
    clientLabel: clientName,
    hasCustomNarrative: false,
    rationale: "",
    recommendation: "",
    source: "fallback",
    title: proposalTitle,
  };
}

function drawProposalNarrativeSection(
  doc: jsPDF,
  y: number,
  proposalContext: ResolvedCommercialProposalContext,
) {
  const paragraphs = [
    proposalContext.recommendation,
    proposalContext.rationale
      ? `Justificativa do consultor: ${proposalContext.rationale}`
      : "",
  ].filter(Boolean);
  const text = paragraphs.join("\n\n");
  const lines = doc.splitTextToSize(text, page.width - page.margin * 2 - 10);
  const textOffset = proposalContext.title ? 24 : 15;
  const panelHeight = textOffset + 8 + lines.length * 4.8;
  const panelY = ensureSpace(doc, y, panelHeight + 8);

  doc.setFillColor(colors.panel);
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(colors.primary);
  doc.text("Nossa recomendacao", page.margin + 5, panelY + 7);

  if (proposalContext.title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(colors.ink);
    doc.text(proposalContext.title, page.margin + 5, panelY + 15, {
      maxWidth: page.width - page.margin * 2 - 10,
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  doc.setTextColor(colors.ink);
  doc.text(lines, page.margin + 5, panelY + textOffset);

  return panelY + panelHeight + 11;
}

function drawConsultativeOpening(
  doc: jsPDF,
  y: number,
  commercialData: SimulatorCommercialData,
) {
  const clientName = normalizePdfText(commercialData.clientName);
  const addressee = clientName ? `para ${clientName}` : "para este cliente";
  const paragraph =
    `Esta proposta organiza uma estrategia patrimonial ${addressee}, ` +
    "com foco em acesso planejado ao credito, previsibilidade de parcelas " +
    "e leitura clara do potencial economico da operacao. Os indicadores a " +
    "seguir traduzem o cenario simulado em uma decisao comercial objetiva.";
  const lines = doc.splitTextToSize(paragraph, page.width - page.margin * 2 - 10);
  const panelHeight = 20 + lines.length * 4.6;
  const panelY = ensureSpace(doc, y, panelHeight + 8);

  doc.setFillColor(colors.panel);
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(colors.primary);
  doc.text("Contexto da recomendacao", page.margin + 5, panelY + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  doc.setTextColor(colors.ink);
  doc.text(lines, page.margin + 5, panelY + 15);

  return panelY + panelHeight + 11;
}

function drawOperationTimeline(
  doc: jsPDF,
  y: number,
  presentation: SimulatorCommercialPresentation,
) {
  const timelineY = ensureSpace(doc, y, 42);
  const items = [
    { label: "Hoje", note: "definicao da estrategia" },
    { label: "Pagamento inicial", note: presentation.bidLabel },
    {
      label: "Contemplacao",
      note: `mes ${presentation.contemplationMonth}`,
    },
    { label: "Uso do credito", note: "liquidez planejada" },
    { label: "Continuidade", note: "gestao patrimonial" },
  ];
  const usableWidth = page.width - page.margin * 2;
  const stepGap = usableWidth / (items.length - 1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(colors.ink);
  doc.text("Jornada da operacao", page.margin, timelineY);

  const lineY = timelineY + 18;
  doc.setDrawColor(colors.line);
  doc.line(page.margin + 4, lineY, page.width - page.margin - 4, lineY);

  items.forEach((item, index) => {
    const x = page.margin + index * stepGap;
    doc.setFillColor(index === 0 ? colors.primary : colors.white);
    doc.setDrawColor(colors.primary);
    doc.circle(x, lineY, 2.4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(colors.ink);
    doc.text(item.label, x, lineY + 9, {
      align: "center",
      maxWidth: 32,
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.6);
    doc.setTextColor(colors.muted);
    doc.text(item.note, x, lineY + 16, {
      align: "center",
      maxWidth: 32,
    });
  });

  return timelineY + 44;
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
  drawHeader(doc, "Proposta patrimonial");

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

function hasWealthJourneyContent(journey: WealthJourney) {
  return (
    journey.currentWealth > 0 ||
    journey.targetWealth > 0 ||
    journey.missingWealth > 0 ||
    journey.requiredProperties > 0 ||
    journey.requiredLetters > 0
  );
}

function isTextAlreadyRenderedAsProposalNarrative(
  text: string,
  proposalContext: ResolvedCommercialProposalContext,
) {
  const normalizedText = normalizeComparableText(text);

  if (!normalizedText || !proposalContext.hasCustomNarrative) {
    return false;
  }

  return (
    normalizedText === normalizeComparableText(proposalContext.recommendation) ||
    normalizedText === normalizeComparableText(proposalContext.rationale)
  );
}

function normalizeCommercialConsultingConditions(
  conditions: PdfCommercialConsultingConditions | null | undefined,
): PdfCommercialConsultingConditions | null {
  if (
    !conditions ||
    !Number.isFinite(conditions.installments) ||
    !Number.isFinite(conditions.installmentAmount) ||
    !Number.isFinite(conditions.totalAmount) ||
    conditions.installments <= 0 ||
    conditions.installmentAmount <= 0 ||
    conditions.totalAmount <= 0
  ) {
    return null;
  }

  return {
    installmentAmount: conditions.installmentAmount,
    installments: Math.trunc(conditions.installments),
    totalAmount: conditions.totalAmount,
  };
}

function drawInstitutionalSection(doc: jsPDF, y: number) {
  const text =
    "A Patrion conduz esta leitura com foco em clareza, disciplina de " +
    "execucao e alinhamento entre capacidade financeira, credito planejado " +
    "e objetivos patrimoniais. Esta proposta deve orientar a conversa " +
    "comercial e apoiar a tomada de decisao do cliente.";

  return drawTextPanel(doc, y, "Orientacao consultiva", text);
}

function drawCommercialConsultingConditionsSection(
  doc: jsPDF,
  y: number,
  conditions: PdfCommercialConsultingConditions,
) {
  const sectionY = ensureSpace(doc, y, 62);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(colors.ink);
  doc.text("Condicoes Comerciais", page.margin, sectionY);

  const panelY = sectionY + 7;
  doc.setFillColor(colors.white);
  doc.setDrawColor(colors.line);
  doc.roundedRect(
    page.margin,
    panelY,
    page.width - page.margin * 2,
    47,
    2,
    2,
    "FD",
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(colors.primary);
  doc.text(
    "Investimento em Consultoria Patrimonial",
    page.margin + 5,
    panelY + 8,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(colors.muted);
  doc.text("Parcelamento", page.margin + 5, panelY + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(colors.ink);
  doc.text(
    `${conditions.installments} x ${currencyFormatter.format(
      conditions.installmentAmount,
    )}`,
    page.margin + 5,
    panelY + 26,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(colors.muted);
  doc.text("Total", page.width - page.margin - 5, panelY + 18, {
    align: "right",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(colors.primary);
  doc.text(
    currencyFormatter.format(conditions.totalAmount),
    page.width - page.margin - 5,
    panelY + 27,
    { align: "right" },
  );

  doc.setFillColor(colors.panelStrong);
  doc.setDrawColor(colors.primary);
  doc.roundedRect(
    page.margin + 5,
    panelY + 33,
    page.width - page.margin * 2 - 10,
    10,
    2,
    2,
    "FD",
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(colors.primary);
  doc.text("Condicao Especial Patrion", page.margin + 9, panelY + 39);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(colors.ink);
  doc.text(
    "Fechando esta proposta em ate 7 dias corridos, o investimento referente a consultoria patrimonial sera integralmente isentado.",
    page.margin + 50,
    panelY + 39,
    { maxWidth: page.width - page.margin * 2 - 60 },
  );

  return sectionY + 62;
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
    "Beneficios",
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

function normalizeComparableText(value: string | undefined) {
  return normalizePdfText(value).replace(/\s+/g, " ").toLowerCase();
}
