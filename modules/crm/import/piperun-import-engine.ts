import type {
  PiperunImportPreview,
  PiperunImportSummary,
  PiperunImportWarning,
  PiperunMappedLeadPreview,
  PiperunRawRow,
} from "./piperun-import-types";
import {
  piperunImportRows,
  piperunImportSource,
} from "./piperun-import-source";

const importWarnings: PiperunImportWarning[] = [
  "missing-phone",
  "repeated-email",
  "unknown-status",
  "empty-pipeline",
  "empty-stage",
  "empty-value",
  "duplicate-external-id",
];

export function buildPiperunImportPreview({
  existingExternalIds = [],
  previewLimit = 50,
  rows = piperunImportRows,
}: {
  existingExternalIds?: string[];
  previewLimit?: number;
  rows?: PiperunRawRow[];
} = {}): PiperunImportPreview {
  const repeatedEmails = findRepeatedEmails(rows);
  const existingExternalIdSet = new Set(existingExternalIds);
  const mappedRows = rows.map((row) =>
    mapPiperunRow({
      existingExternalIds: existingExternalIdSet,
      repeatedEmails,
      row,
    }),
  );

  return {
    summary: summarizePiperunImport(mappedRows),
    rows: mappedRows,
    previewRows: mappedRows.slice(0, previewLimit),
  };
}

export function mapPiperunRow({
  existingExternalIds,
  repeatedEmails,
  row,
}: {
  existingExternalIds?: Set<string>;
  repeatedEmails?: Set<string>;
  row: PiperunRawRow;
}): PiperunMappedLeadPreview {
  const statusOriginal = row.status || row.situacao;
  const status = normalizePiperunStatus(statusOriginal);
  const email = row.emailPessoa.trim();
  const warnings: PiperunImportWarning[] = [];

  if (!row.telefonePessoa.trim()) {
    warnings.push("missing-phone");
  }

  if (email && repeatedEmails?.has(normalizeEmail(email))) {
    warnings.push("repeated-email");
  }

  if (!isKnownPiperunStatus(statusOriginal)) {
    warnings.push("unknown-status");
  }

  if (!row.funil.trim()) {
    warnings.push("empty-pipeline");
  }

  if (!row.etapa.trim()) {
    warnings.push("empty-stage");
  }

  if (row.valorPs === null) {
    warnings.push("empty-value");
  }

  if (existingExternalIds?.has(row.hash)) {
    warnings.push("duplicate-external-id");
  }

  return {
    externalId: row.hash,
    pipeline: row.funil,
    etapa: row.etapa,
    consultor: row.nomeDonoOportunidade || row.donoOportunidade,
    origem: row.origem,
    createdAt: row.dataCadastro,
    closedAt: row.dataFechamento,
    tituloOportunidade: row.titulo,
    observacoes: mergeObservations(row.descricao, row.observacoes),
    status,
    statusOriginal,
    valorPotencial: row.valorPs ?? 0,
    tags: parseTags(row.tags),
    nome: row.nomePessoa || row.titulo,
    email,
    telefone: row.telefonePessoa.trim(),
    warnings,
    validForImport: isValidForImport(warnings),
  };
}

export function summarizePiperunImport(
  rows: PiperunMappedLeadPreview[],
): PiperunImportSummary {
  return {
    sourceFile: piperunImportSource.file,
    sheetName: piperunImportSource.sheet,
    totalRows: rows.length,
    validRows: rows.filter((row) => row.validForImport).length,
    ignoredMissingPhone: rows.filter((row) =>
      row.warnings.includes("missing-phone"),
    ).length,
    repeatedEmailRows: rows.filter((row) =>
      row.warnings.includes("repeated-email"),
    ).length,
    emptyValueRows: rows.filter((row) => row.warnings.includes("empty-value"))
      .length,
    statusCounts: countBy(rows, (row) => row.statusOriginal || "Sem status"),
    pipelineCounts: countBy(rows, (row) => row.pipeline || "Sem pipeline"),
    stageCounts: countBy(rows, (row) => row.etapa || "Sem etapa"),
    warningCounts: Object.fromEntries(
      importWarnings.map((warning) => [
        warning,
        rows.filter((row) => row.warnings.includes(warning)).length,
      ]),
    ) as Record<PiperunImportWarning, number>,
  };
}

export function normalizePiperunStatus(status: string) {
  const normalizedStatus = normalizeText(status);

  if (
    normalizedStatus === "ganha" ||
    normalizedStatus === "ganho" ||
    normalizedStatus === "won"
  ) {
    return "ganha";
  }

  if (
    normalizedStatus === "perdida" ||
    normalizedStatus === "perdido" ||
    normalizedStatus === "lost"
  ) {
    return "perdida";
  }

  return "ativa";
}

function isKnownPiperunStatus(status: string) {
  const normalizedStatus = normalizeText(status);

  return [
    "aberta",
    "ativo",
    "ativa",
    "em andamento",
    "ganha",
    "ganho",
    "perdida",
    "perdido",
    "won",
    "lost",
  ].includes(normalizedStatus);
}

function isValidForImport(warnings: PiperunImportWarning[]) {
  return (
    !warnings.includes("missing-phone") &&
    !warnings.includes("duplicate-external-id") &&
    !warnings.includes("unknown-status") &&
    !warnings.includes("empty-pipeline") &&
    !warnings.includes("empty-stage")
  );
}

function findRepeatedEmails(rows: PiperunRawRow[]) {
  const emailCounts = rows.reduce<Record<string, number>>((counts, row) => {
    const email = normalizeEmail(row.emailPessoa);

    if (!email) {
      return counts;
    }

    return {
      ...counts,
      [email]: (counts[email] ?? 0) + 1,
    };
  }, {});

  return new Set(
    Object.entries(emailCounts)
      .filter(([, count]) => count > 1)
      .map(([email]) => email),
  );
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function mergeObservations(...values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n\n");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function countBy<T>(values: T[], getKey: (value: T) => string) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = getKey(value);

    return {
      ...counts,
      [key]: (counts[key] ?? 0) + 1,
    };
  }, {});
}

