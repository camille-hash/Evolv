import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

type BackupEntry = {
  key?: unknown;
  parsedValue?: unknown;
};

type LocalCrmLead = {
  externalId?: unknown;
  closedAt?: unknown;
  tituloOportunidade?: unknown;
  nome?: unknown;
  telefone?: unknown;
  email?: unknown;
  pais?: unknown;
  origem?: unknown;
  consultor?: unknown;
  valorPretendido?: unknown;
  observacoes?: unknown;
  pipeline?: unknown;
  etapa?: unknown;
  tags?: unknown;
  produtoInteresse?: unknown;
  temperatura?: unknown;
  status?: unknown;
  proximaAcao?: unknown;
  dataProximaAcao?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type CrmLeadInsert = {
  external_id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  pais: string | null;
  origem: string | null;
  consultor: string | null;
  valor_pretendido: number | null;
  observacoes: string | null;
  pipeline: string | null;
  etapa: string | null;
  tags: string[] | null;
  produto_interesse: string | null;
  temperatura: string | null;
  status: string | null;
  proxima_acao: string | null;
  data_proxima_acao: string | null;
  closed_at: string | null;
  titulo_oportunidade: string | null;
  created_at: string;
  updated_at: string;
};

type ImportReport = {
  batches: number;
  failed: number;
  imported: number;
  skippedMissingExternalId: number;
  sourceFile: string;
  totalRows: number;
};

const CRM_STORAGE_KEY = "evolv.crm.v1";
const DEFAULT_BATCH_SIZE = 100;

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.filePath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Configure SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de importar.",
    );
  }

  const sourceFile = resolve(options.filePath);
  const leads = await readCrmLeadsFromBackup(sourceFile);
  const mappedRows = leads.map(mapLocalLeadToSupabaseRow);
  const importableRows = mappedRows.filter(
    (row): row is CrmLeadInsert => row !== null,
  );
  const skippedMissingExternalId = mappedRows.length - importableRows.length;

  console.log(`Arquivo: ${sourceFile}`);
  console.log(`Registros encontrados em ${CRM_STORAGE_KEY}: ${leads.length}`);
  console.log(`Registros importaveis: ${importableRows.length}`);
  console.log(`Ignorados sem external_id: ${skippedMissingExternalId}`);
  console.log(`Batch size: ${options.batchSize}`);

  if (!importableRows.length) {
    console.log("Nenhum registro importavel encontrado.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
  const report: ImportReport = {
    batches: 0,
    failed: 0,
    imported: 0,
    skippedMissingExternalId,
    sourceFile,
    totalRows: leads.length,
  };

  for (let index = 0; index < importableRows.length; index += options.batchSize) {
    const batch = importableRows.slice(index, index + options.batchSize);
    const batchNumber = Math.floor(index / options.batchSize) + 1;
    const totalBatches = Math.ceil(importableRows.length / options.batchSize);

    console.log(
      `Importando batch ${batchNumber}/${totalBatches} (${batch.length} registros)...`,
    );

    const { error } = await supabase
      .from("crm_leads")
      .upsert(batch, { onConflict: "external_id" });

    report.batches += 1;

    if (error) {
      report.failed += batch.length;
      console.error(`Falha no batch ${batchNumber}: ${error.message}`);
      throw error;
    }

    report.imported += batch.length;
    console.log(`Batch ${batchNumber} concluido.`);
  }

  console.log("Importacao concluida.");
  console.log(JSON.stringify(report, null, 2));
}

async function readCrmLeadsFromBackup(filePath: string): Promise<LocalCrmLead[]> {
  const rawContent = await readFile(filePath, "utf8");
  const parsedBackup = JSON.parse(rawContent) as { entries?: unknown };

  if (!Array.isArray(parsedBackup.entries)) {
    throw new Error("Backup invalido: campo entries nao encontrado.");
  }

  const crmEntry = parsedBackup.entries
    .filter(isBackupEntry)
    .find((entry) => entry.key === CRM_STORAGE_KEY);

  if (!crmEntry) {
    throw new Error(`Backup invalido: chave ${CRM_STORAGE_KEY} nao encontrada.`);
  }

  if (!Array.isArray(crmEntry.parsedValue)) {
    throw new Error(`Backup invalido: ${CRM_STORAGE_KEY} nao contem um array.`);
  }

  return crmEntry.parsedValue.filter(isRecord) as LocalCrmLead[];
}

function mapLocalLeadToSupabaseRow(lead: LocalCrmLead): CrmLeadInsert | null {
  const externalId = toStringOrNull(lead.externalId);

  if (!externalId) {
    return null;
  }

  return {
    external_id: externalId,
    nome: toStringOrNull(lead.nome),
    telefone: toStringOrNull(lead.telefone),
    email: toStringOrNull(lead.email),
    pais: toStringOrNull(lead.pais),
    origem: toStringOrNull(lead.origem),
    consultor: toStringOrNull(lead.consultor),
    valor_pretendido: toNumberOrNull(lead.valorPretendido),
    observacoes: toStringOrNull(lead.observacoes),
    pipeline: toStringOrNull(lead.pipeline),
    etapa: toStringOrNull(lead.etapa),
    tags: toStringArrayOrNull(lead.tags),
    produto_interesse: toStringOrNull(lead.produtoInteresse),
    temperatura: toStringOrNull(lead.temperatura),
    status: toStringOrNull(lead.status),
    proxima_acao: toStringOrNull(lead.proximaAcao),
    data_proxima_acao: toDateStringOrNull(lead.dataProximaAcao),
    closed_at: toIsoDateTimeOrNull(lead.closedAt),
    titulo_oportunidade: toStringOrNull(lead.tituloOportunidade),
    created_at: toIsoDateTimeOrNull(lead.createdAt) ?? new Date().toISOString(),
    updated_at: toIsoDateTimeOrNull(lead.updatedAt) ?? new Date().toISOString(),
  };
}

function parseArgs(args: string[]) {
  const batchSizeArg = args.find((arg) => arg.startsWith("--batch-size="));
  const batchSize = batchSizeArg
    ? Number(batchSizeArg.replace("--batch-size=", ""))
    : DEFAULT_BATCH_SIZE;
  const filePath = args.find((arg) => !arg.startsWith("--"));

  return {
    batchSize:
      Number.isFinite(batchSize) && batchSize > 0
        ? Math.floor(batchSize)
        : DEFAULT_BATCH_SIZE,
    filePath,
  };
}

function printUsage() {
  console.log(
    [
      "Uso:",
      "  npx tsx scripts/import-crm-to-supabase.ts <backup.json> --batch-size=100",
      "",
      "Variaveis obrigatorias:",
      "  SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL",
      "  SUPABASE_SERVICE_ROLE_KEY",
    ].join("\n"),
  );
}

function isBackupEntry(value: unknown): value is BackupEntry {
  return isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue || null;
}

function toNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value.replace(/\./g, "").replace(",", "."));

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function toStringArrayOrNull(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const values = value
    .map(toStringOrNull)
    .filter((item): item is string => Boolean(item));

  return values.length ? values : null;
}

function toDateStringOrNull(value: unknown) {
  const stringValue = toStringOrNull(value);

  if (!stringValue) {
    return null;
  }

  const date = new Date(`${stringValue}T00:00:00`);

  if (!Number.isNaN(date.getTime())) {
    return stringValue.slice(0, 10);
  }

  return null;
}

function toIsoDateTimeOrNull(value: unknown) {
  const stringValue = toStringOrNull(value);

  if (!stringValue) {
    return null;
  }

  const date = new Date(stringValue);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`Erro na importacao: ${message}`);
  process.exitCode = 1;
});
