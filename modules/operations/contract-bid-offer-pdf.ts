import { jsPDF } from "jspdf";
import type { ContractBidOffer } from "./contract-bid-offer-types";

const money = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});
const percent = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function generateContractBidOfferPdf(
  offer: ContractBidOffer & {
    bidComposition: string;
    bidModality: string;
    consultantName: string;
  },
) {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  cover(doc, offer);
  doc.addPage();
  details(doc, offer);
  return new Uint8Array(doc.output("arraybuffer"));
}

function cover(doc: jsPDF, offer: ContractBidOffer) {
  doc.setFillColor("#10201f");
  doc.rect(0, 0, 210, 297, "F");
  doc.setFillColor("#0f766e");
  doc.rect(0, 0, 8, 297, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  doc.text("Patrion Asset", 22, 35);
  doc.setFontSize(11);
  doc.setTextColor("#94a3b8");
  doc.text("EVOLV Intelligence", 22, 44);
  doc.setTextColor("#ffffff");
  doc.setFontSize(22);
  doc.text("Estrategia de Lance", 22, 82);
  doc.setFontSize(13);
  doc.text(offer.clientName, 22, 101);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(offer.contractName, 22, 112);
  doc.text(`Administradora: ${offer.administratorName}`, 22, 121);
  doc.text(`Assembleia: ${formatDate(offer.assemblyDate)}`, 22, 130);
  doc.text(`Credito: ${money.format(offer.creditBaseAmount)}`, 22, 139);
  doc.setTextColor("#94a3b8");
  doc.text(`Oferta v${offer.version}`, 22, 271);
}

function details(
  doc: jsPDF,
  offer: ContractBidOffer & {
    bidComposition: string;
    bidModality: string;
    consultantName: string;
  },
) {
  header(doc, "Estrategia de Lance");
  let y = 45;
  y = section(doc, "Identificacao", y, [
    ["Cliente", offer.clientName],
    ["Contrato", offer.contractName],
    ["Grupo / Cota", `${offer.groupNumber ?? "-"} / ${offer.quotaNumber ?? "-"}`],
    ["Assembleia", formatDate(offer.assemblyDate)],
  ]);
  y = section(doc, "Composicao da estrategia", y + 7, [
    ["Modalidade", offer.bidModality],
    ["Composicao", offer.bidComposition],
    ["Recurso proprio", money.format(offer.cashAmount)],
    ["Lance embutido", money.format(offer.embeddedAmount)],
    ["Lance total", money.format(offer.totalAmount)],
    ["Percentual total", formatPercent(offer.totalPercentage)],
    ["Base de credito utilizada no calculo", money.format(offer.creditBaseAmount)],
  ]);
  y = section(doc, "Impacto estimado", y + 7, [
    ["Recurso proprio necessario", money.format(offer.cashAmount)],
    [
      "Credito estimado apos lance embutido",
      money.format(offer.estimatedNetCredit ?? offer.creditBaseAmount),
    ],
    ["Observacoes", offer.notes ?? "Nenhuma observacao adicional."],
  ]);
  y = section(doc, "Proximo passo", y + 7, [
    ["Acao", "Confirmar a estrategia antes do envio oficial do lance."],
    ["Consultor", offer.consultantName || "Consultor EVOLV"],
  ]);
  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  const disclaimer =
    "Esta oferta nao garante contemplacao. Os resultados dependem da assembleia, das regras do grupo e da administradora. Os valores devem ser confirmados antes do envio oficial e as condicoes podem sofrer alteracoes. O credito estimado apos lance embutido e apenas uma referencia aritmetica, nao o valor liquido final da operacao.";
  doc.text(doc.splitTextToSize(disclaimer, 174), 18, Math.min(y + 12, 274));
}

function header(doc: jsPDF, title: string) {
  doc.setFillColor("#10201f");
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 18, 18);
}

function section(doc: jsPDF, title: string, startY: number, rows: string[][]) {
  doc.setTextColor("#111827");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, 18, startY);
  let y = startY + 8;
  for (const [label, value] of rows) {
    doc.setDrawColor("#d8dee7");
    doc.line(18, y + 3, 192, y + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor("#64748b");
    doc.text(label, 18, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor("#111827");
    doc.text(doc.splitTextToSize(value, 90), 192, y, { align: "right" });
    y += 10;
  }
  return y;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatPercent(value?: number) {
  return value === undefined ? "Nao calculado" : `${percent.format(value)}%`;
}
