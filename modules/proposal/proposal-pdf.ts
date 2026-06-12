import { jsPDF } from "jspdf";

export type CommercialProposalPdfInput = {
  clientName: string;
  commercialCredit: number;
  estimatedProfit: number;
  estimatedSaleValue: number;
  postContemplationPayment: number;
  preContemplationPayment: number;
  realInvestment: number;
  recommendedScenario: string;
  roiPercent: number;
  updatedCreditAtContemplation: number;
};

export type ProposalPdfResult =
  | {
      fileName: string;
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

export const proposalPdfAvailability = {
  available: true,
  reason: "",
} as const;

export function generateCommercialProposalPdf(
  input: CommercialProposalPdfInput,
): ProposalPdfResult {
  try {
    const pdf = new jsPDF({
      format: "a4",
      orientation: "portrait",
      unit: "mm",
    });
    const now = new Date();
    const fileSafeClientName = sanitizeClientNameForFile(input.clientName);
    const fileName = `proposta-evolv-${fileSafeClientName}.pdf`;

    renderHeader(pdf);
    renderProposalSummary(pdf, input, now);
    renderDisclaimer(pdf);

    pdf.save(fileName);

    return {
      fileName,
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar o PDF da proposta.",
    };
  }
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "percent",
});

function renderHeader(pdf: jsPDF) {
  pdf.setFillColor(24, 32, 38);
  pdf.rect(0, 0, 210, 42, "F");

  pdf.setTextColor(245, 241, 232);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("EVOLV Intelligence", 18, 19);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Patrion Asset | Proposta comercial patrimonial", 18, 28);
}

function renderProposalSummary(
  pdf: jsPDF,
  input: CommercialProposalPdfInput,
  generatedAt: Date,
) {
  const overviewRows = [
    ["Cliente", safeDisplayValue(input.clientName, "Cliente nao informado")],
    ["Estrategia indicada", input.recommendedScenario],
    ["Data da proposta", generatedAt.toLocaleDateString("pt-BR")],
  ];
  const financialRows = [
    ["Credito da proposta", currencyFormatter.format(input.commercialCredit)],
    [
      "Credito projetado na contemplacao",
      currencyFormatter.format(input.updatedCreditAtContemplation),
    ],
    [
      "Parcela estimada antes da contemplacao",
      currencyFormatter.format(input.preContemplationPayment),
    ],
    [
      "Parcela estimada apos contemplacao",
      currencyFormatter.format(input.postContemplationPayment),
    ],
    [
      "Investimento estimado ate a operacao",
      currencyFormatter.format(input.realInvestment),
    ],
    [
      "Valor estimado na venda da carta",
      currencyFormatter.format(input.estimatedSaleValue),
    ],
    ["Lucro estimado", currencyFormatter.format(input.estimatedProfit)],
    ["Potencial de ganho", percentFormatter.format(input.roiPercent)],
  ];

  pdf.setTextColor(24, 32, 38);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Proposta comercial", 18, 58);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(92, 99, 105);
  pdf.text(
    "Apresentacao patrimonial preparada para tomada de decisao comercial.",
    18,
    65,
  );

  pdf.setFillColor(247, 245, 239);
  pdf.roundedRect(18, 75, 174, 47, 2, 2, "F");

  renderRows(pdf, overviewRows, 86, {
    labelX: 26,
    lineStartX: 26,
    lineEndX: 184,
    valueX: 184,
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(24, 32, 38);
  pdf.text("Numeros principais", 18, 140);

  renderRows(pdf, financialRows, 154, {
    labelX: 18,
    lineStartX: 18,
    lineEndX: 192,
    valueX: 192,
  });
}

function renderDisclaimer(pdf: jsPDF) {
  const disclaimer =
    "Observacao final: esta proposta apresenta valores estimados, sujeitos as condicoes comerciais da administradora, disponibilidade de grupo, criterios de contemplacao e regras vigentes na data da proposta.";

  pdf.setDrawColor(222, 217, 207);
  pdf.line(18, 262, 192, 262);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(92, 99, 105);
  pdf.text(disclaimer, 18, 270, {
    maxWidth: 174,
  });

  pdf.setFont("helvetica", "bold");
  pdf.text("Documento gerado por EVOLV Intelligence | Patrion Asset", 18, 287);
}

function sanitizeClientNameForFile(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "cliente-nao-informado"
  );
}

function renderRows(
  pdf: jsPDF,
  rows: string[][],
  startY: number,
  options: {
    labelX: number;
    lineEndX: number;
    lineStartX: number;
    valueX: number;
  },
) {
  let y = startY;

  rows.forEach(([label, value]) => {
    pdf.setDrawColor(222, 217, 207);
    pdf.line(options.lineStartX, y - 6, options.lineEndX, y - 6);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(92, 99, 105);
    pdf.text(label, options.labelX, y);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(24, 32, 38);
    pdf.text(value, options.valueX, y, { align: "right" });

    y += 12;
  });
}

function safeDisplayValue(value: string, fallback: string) {
  return value.trim() || fallback;
}
