import { jsPDF } from "jspdf";
import type { PatrimonialPublication } from "../../types.ts";
import {
  formatCurrencyFromCents,
  formatLongDate,
  formatQuotaCount,
} from "./formatting.ts";
import type { ExecutiveMaterialPdfPage } from "./types.ts";

const page = {
  height: 297,
  margin: 18,
  width: 210,
};

const colors = {
  deep: "#0B2F2A",
  gold: "#B98A45",
  ink: "#14201F",
  line: "#D9D2C5",
  muted: "#69736F",
  panel: "#F7F3EC",
  soft: "#ECE5D8",
  white: "#FFFFFF",
};

export function renderExecutiveMaterialPdfLayout(input: {
  pages: ExecutiveMaterialPdfPage[];
  publication: PatrimonialPublication;
}) {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const [, ...pages] = input.pages;

  drawCover(doc, input.publication);
  pages.forEach((materialPage) => {
    doc.addPage();
    drawInternalPage(doc, materialPage);
  });
  drawFooterNumbers(doc);

  return doc;
}

function drawCover(
  doc: jsPDF,
  publication: PatrimonialPublication,
) {
  const snapshot = publication.contentSnapshot.sourceSnapshot;
  const consolidated = publication.contentSnapshot.result.consolidated;

  doc.setFillColor(colors.deep);
  doc.rect(0, 0, page.width, page.height, "F");
  doc.setFillColor(colors.gold);
  doc.rect(0, 0, 5, page.height, "F");

  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("PATRION ASSET", page.margin, 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(colors.soft);
  doc.text("Material Executivo", page.margin, 48);

  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text("Estratégia Patrimonial", page.margin, 88, { maxWidth: 150 });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.soft);
  doc.text(
    "Planejamento patrimonial estruturado utilizando o Grupo Exclusivo Referência Capital como instrumento financeiro.",
    page.margin,
    104,
    { maxWidth: 150 },
  );

  let y = 128;
  y = drawCoverLabel(doc, "Cliente", snapshot.leadContext?.leadName ?? "-", y);
  y = drawCoverLabel(
    doc,
    "Consultor",
    snapshot.leadContext?.responsibleName ?? "-",
    y + 6,
  );

  drawCoverMetric(doc, y + 8, {
    label: "Crédito total contratado",
    value: formatCurrencyFromCents(consolidated.totalCreditCents),
  });
  drawCoverMetric(doc, y + 36, {
    label: "Composição",
    value: formatQuotaCount(consolidated.quotaCount),
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(colors.soft);
  doc.text(
    [
      `Data: ${formatLongDate(publication.createdAt)}`,
      `Publicação v${publication.publicationVersion}`,
    ],
    page.margin,
    272,
  );
}

function drawInternalPage(
  doc: jsPDF,
  materialPage: ExecutiveMaterialPdfPage,
) {
  doc.setFillColor(colors.white);
  doc.rect(0, 0, page.width, page.height, "F");
  doc.setTextColor(colors.deep);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PATRION ASSET", page.margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.muted);
  doc.text("Estratégia Patrimonial", page.width - page.margin, 18, {
    align: "right",
  });
  doc.setDrawColor(colors.line);
  doc.line(page.margin, 24, page.width - page.margin, 24);

  doc.setTextColor(colors.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(materialPage.title, page.margin, 42, { maxWidth: 160 });

  let y = 58;
  materialPage.body.forEach((line) => {
    const lines = doc.splitTextToSize(line, 166) as string[];
    const needed = Math.max(8, lines.length * 5 + 3);

    if (y + needed > 262) {
      doc.addPage();
      drawInternalPageHeaderOnly(doc, materialPage.title);
      y = 52;
    }

    if (line.includes("|")) {
      y = drawTableLikeRow(doc, line, y);
      return;
    }

    doc.setFont("helvetica", isLabelLine(line) ? "bold" : "normal");
    doc.setTextColor(isLabelLine(line) ? colors.ink : colors.muted);
    doc.setFontSize(isLabelLine(line) ? 10.5 : 9.2);
    doc.text(lines, page.margin, y);
    y += needed;
  });
}

function drawInternalPageHeaderOnly(doc: jsPDF, title: string) {
  doc.setFillColor(colors.white);
  doc.rect(0, 0, page.width, page.height, "F");
  doc.setTextColor(colors.deep);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PATRION ASSET", page.margin, 18);
  doc.setDrawColor(colors.line);
  doc.line(page.margin, 24, page.width - page.margin, 24);
  doc.setTextColor(colors.ink);
  doc.setFontSize(15);
  doc.text(title, page.margin, 38, { maxWidth: 160 });
}

function drawCoverLabel(doc: jsPDF, label: string, value: string, y: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(colors.soft);
  doc.text(label, page.margin, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(colors.white);
  doc.text(value, page.margin, y + 9, { maxWidth: 140 });
  return y + 18;
}

function drawCoverMetric(
  doc: jsPDF,
  y: number,
  metric: { label: string; value: string },
) {
  doc.setFillColor("#123D37");
  doc.roundedRect(page.margin, y, 74, 20, 2, 2, "F");
  doc.setTextColor(colors.soft);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(metric.label, page.margin + 4, y + 6);
  doc.setTextColor(colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(metric.value, page.margin + 4, y + 15, { maxWidth: 64 });
}

function drawTableLikeRow(doc: jsPDF, line: string, y: number) {
  const cells = line.split("|").map((cell) => cell.trim());
  const isHeader = cells.some((cell) => cell === "Cota" || cell === "Código");
  const widths = resolveColumnWidths(cells.length);
  let x = page.margin;

  doc.setFillColor(isHeader ? colors.panel : colors.white);
  doc.setDrawColor(colors.line);
  doc.rect(page.margin, y - 5, page.width - page.margin * 2, 9, "F");
  doc.setTextColor(isHeader ? colors.deep : colors.muted);
  doc.setFont("helvetica", isHeader ? "bold" : "normal");
  doc.setFontSize(isHeader ? 7.5 : 7.2);

  cells.forEach((cell, index) => {
    doc.text(cell, x + 1.5, y, { maxWidth: widths[index] - 3 });
    x += widths[index];
  });
  doc.setDrawColor(colors.line);
  doc.rect(page.margin, y - 5, page.width - page.margin * 2, 9);

  return y + 10;
}

function resolveColumnWidths(cellCount: number) {
  if (cellCount === 6) {
    return [18, 24, 31, 32, 32, 34];
  }

  if (cellCount === 3) {
    return [36, 58, 76];
  }

  return Array.from({ length: cellCount }, () => 170 / cellCount);
}

function isLabelLine(line: string) {
  return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9].*:\s/.test(line);
}

function drawFooterNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setTextColor(colors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Material Executivo", page.margin, 288);
    doc.text(`Página ${pageNumber} de ${totalPages}`, page.width / 2, 288, {
      align: "center",
    });
  }
}
