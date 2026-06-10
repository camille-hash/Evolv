const CRM_STORAGE_KEY = "evolv.crm.v1";
const CRM_BACKUP_STORAGE_KEY = "evolv.crm.backup.before-piperun-import.v1";

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

