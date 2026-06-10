import type {
  PiperunContactRow,
  PiperunImportPreview,
  PiperunImportSummary,
  PiperunImportWarning,
  PiperunMappedLeadPreview,
  PiperunPhoneMatchSource,
  PiperunRawRow,
} from "./piperun-import-types";
import { piperunContactRows } from "./piperun-contact-source";
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
  contacts = piperunContactRows,
  rows = piperunImportRows,
}: {
  contacts?: PiperunContactRow[];
  existingExternalIds?: string[];
  previewLimit?: number;
  rows?: PiperunRawRow[];
} = {}): PiperunImportPreview {
  const repeatedEmails = findRepeatedEmails(rows);
  const existingExternalIdSet = new Set(existingExternalIds);
  const phoneIndex = buildPhoneIndex(contacts);
  const mappedRows = rows.map((row) =>
    mapPiperunRow({
      existingExternalIds: existingExternalIdSet,
      phoneIndex,
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
  phoneIndex,
  repeatedEmails,
  row,
}: {
  existingExternalIds?: Set<string>;
  phoneIndex?: PiperunPhoneIndex;
  repeatedEmails?: Set<string>;
  row: PiperunRawRow;
}): PiperunMappedLeadPreview {
  const statusOriginal = row.status || row.situacao;
  const status = normalizePiperunStatus(statusOriginal);
  const email = row.emailPessoa.trim();
  const phoneMatch = resolvePhoneMatch(row, phoneIndex);
  const warnings: PiperunImportWarning[] = [];

  if (!phoneMatch.telefone) {
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
    telefone: phoneMatch.telefone,
    phoneMatchSource: phoneMatch.source,
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
    phoneRows: rows.filter((row) => row.telefone).length,
    statusCrmCounts: countBy(rows, (row) => row.status),
    consultantCounts: countBy(rows, (row) => row.consultor || "Sem responsavel"),
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

export function toCrmLeadFromPiperunPreview(
  row: PiperunMappedLeadPreview,
) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    externalId: row.externalId,
    closedAt: row.closedAt || undefined,
    tituloOportunidade: row.tituloOportunidade || undefined,
    nome: row.nome,
    telefone: row.telefone,
    email: row.email,
    origem: row.origem,
    consultor: row.consultor,
    valorPretendido: row.valorPotencial,
    observacoes: row.observacoes,
    pipeline: row.pipeline,
    etapa: row.etapa,
    tags: row.tags,
    produtoInteresse: "",
    temperatura: "morna",
    status: row.status,
    proximaAcao: "",
    dataProximaAcao: "",
    createdAt: row.createdAt || now,
    updatedAt: now,
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

type PiperunPhoneIndex = {
  byHash: Map<string, string>;
  byEmail: Map<string, string>;
  byName: Map<string, string>;
};

function buildPhoneIndex(contacts: PiperunContactRow[]): PiperunPhoneIndex {
  const byHash = new Map<string, string>();
  const byEmail = new Map<string, string>();
  const byName = new Map<string, string>();

  contacts.forEach((contact) => {
    const phone = normalizePhone(contact.telefone);

    if (!phone) {
      return;
    }

    if (contact.hash) {
      setFirst(byHash, contact.hash, phone);
    }

    setFirst(byEmail, normalizeEmail(contact.email), phone);
    setFirst(byName, normalizeName(contact.nomeCompleto), phone);
  });

  return { byEmail, byHash, byName };
}

function resolvePhoneMatch(
  row: PiperunRawRow,
  phoneIndex?: PiperunPhoneIndex,
): { source: PiperunPhoneMatchSource; telefone: string } {
  const ownPhone = normalizePhone(row.telefonePessoa);

  if (ownPhone) {
    return { source: "hash", telefone: ownPhone };
  }

  const hashPhone = phoneIndex?.byHash.get(row.hash);

  if (hashPhone) {
    return { source: "hash", telefone: hashPhone };
  }

  const emailPhone = phoneIndex?.byEmail.get(normalizeEmail(row.emailPessoa));

  if (emailPhone) {
    return { source: "email", telefone: emailPhone };
  }

  const namePhone = phoneIndex?.byName.get(normalizeName(row.nomePessoa));

  if (namePhone) {
    return { source: "name", telefone: namePhone };
  }

  return { source: "none", telefone: "" };
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

function normalizeName(value: string) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function normalizePhone(value: string) {
  return value.replace(/\D+/g, "");
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

function setFirst(map: Map<string, string>, key: string, value: string) {
  if (key && !map.has(key)) {
    map.set(key, value);
  }
}
