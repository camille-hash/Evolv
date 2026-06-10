import { toCrmLeadFromPiperunPreview } from "./piperun-import-engine";
import type {
  PiperunImportPreview,
  PiperunMappedLeadPreview,
} from "./piperun-import-types";

const CRM_STORAGE_KEY = "evolv.crm.v1";
const CRM_BACKUP_STORAGE_KEY = "evolv.crm.backup.before-piperun-import.v1";

export type PiperunImportExecutionReport = {
  processed: number;
  imported: number;
  blockedMissingPhone: number;
  ignoredDuplicateExternalId: number;
  gained: number;
  lost: number;
  active: number;
  backupCreated: boolean;
  createdAt: string;
};

export function createCrmBackupBeforePiperunImport() {
  if (typeof window === "undefined") {
    return null;
  }

  const currentCrmValue = window.localStorage.getItem(CRM_STORAGE_KEY) ?? "[]";
  const backup = {
    createdAt: new Date().toISOString(),
    storageKey: CRM_STORAGE_KEY,
    value: currentCrmValue,
  };

  window.localStorage.setItem(CRM_BACKUP_STORAGE_KEY, JSON.stringify(backup));

  return backup;
}

export function loadExistingCrmExternalIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(CRM_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((item) =>
        item && typeof item === "object" && "externalId" in item
          ? (item as { externalId?: unknown }).externalId
          : null,
      )
      .filter((externalId): externalId is string => typeof externalId === "string");
  } catch {
    return [];
  }
}

export function executePiperunImport(
  preview: PiperunImportPreview,
): PiperunImportExecutionReport {
  const backup = createCrmBackupBeforePiperunImport();
  const currentLeads = loadRawCrmLeads();
  const existingExternalIds = new Set(
    currentLeads
      .map((lead) =>
        lead && typeof lead === "object" && "externalId" in lead
          ? (lead as { externalId?: unknown }).externalId
          : null,
      )
      .filter((externalId): externalId is string => typeof externalId === "string"),
  );
  const importableRows = preview.rows.filter(
    (row) => row.validForImport && !existingExternalIds.has(row.externalId),
  );
  const nextLeads = [
    ...importableRows.map((row) => toCrmLeadFromPiperunPreview(row)),
    ...currentLeads,
  ];

  if (typeof window !== "undefined") {
    window.localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(nextLeads));
  }

  return buildExecutionReport({
    backupCreated: Boolean(backup),
    importedRows: importableRows,
    previewRows: preview.rows,
  });
}

function buildExecutionReport({
  backupCreated,
  importedRows,
  previewRows,
}: {
  backupCreated: boolean;
  importedRows: PiperunMappedLeadPreview[];
  previewRows: PiperunMappedLeadPreview[];
}): PiperunImportExecutionReport {
  return {
    processed: previewRows.length,
    imported: importedRows.length,
    blockedMissingPhone: previewRows.filter((row) =>
      row.warnings.includes("missing-phone"),
    ).length,
    ignoredDuplicateExternalId: previewRows.filter((row) =>
      row.warnings.includes("duplicate-external-id"),
    ).length,
    gained: importedRows.filter((row) => row.status === "ganha").length,
    lost: importedRows.filter((row) => row.status === "perdida").length,
    active: importedRows.filter((row) => row.status === "ativa").length,
    backupCreated,
    createdAt: new Date().toISOString(),
  };
}

function loadRawCrmLeads(): unknown[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(CRM_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}
