export const EVOLV_LOCAL_BACKUP_KEYS = [
  "evolv.crm.v1",
  "evolv.crm.pipelines.v1",
  "evolv.crm.goal.v1",
  "evolv.crm.notes.v1",
  "evolv.crm.activities.v1",
  "evolv.crm.stage-changes.v1",
  "evolv.crm.backup.before-piperun-import.v1",
  "evolv.users.v1",
  "evolv.client-context.v1",
  "evolv.portfolio.v1",
  "evolv.simulations.v1",
  "evolv.operations.v1",
  "evolv.strategies.v1",
  "evolv.followup.v1",
  "evolv.wealth.evolution.v1",
  "evolv.administrators.v1",
  "evolv.multi-cotas.v1",
] as const;

export type EvolvLocalBackupKey = (typeof EVOLV_LOCAL_BACKUP_KEYS)[number];

export type EvolvLocalBackupEntry = {
  key: EvolvLocalBackupKey;
  exists: boolean;
  rawValue: string | null;
  parsedValue: unknown;
  parseStatus: "valid-json" | "empty" | "invalid-json";
  recordCount: number | null;
};

export type EvolvLocalBackupPayload = {
  app: "EVOLV";
  type: "local-storage-backup";
  version: 1;
  generatedAt: string;
  keys: EvolvLocalBackupKey[];
  summary: {
    totalKeys: number;
    existingKeys: number;
    missingKeys: number;
    totalArrayRecords: number;
  };
  entries: EvolvLocalBackupEntry[];
};

export function createEvolvLocalBackupPayload(): EvolvLocalBackupPayload {
  const generatedAt = new Date().toISOString();
  const entries = EVOLV_LOCAL_BACKUP_KEYS.map(readLocalBackupEntry);
  const totalArrayRecords = entries.reduce(
    (total, entry) => total + (entry.recordCount ?? 0),
    0,
  );

  return {
    app: "EVOLV",
    type: "local-storage-backup",
    version: 1,
    generatedAt,
    keys: [...EVOLV_LOCAL_BACKUP_KEYS],
    summary: {
      totalKeys: entries.length,
      existingKeys: entries.filter((entry) => entry.exists).length,
      missingKeys: entries.filter((entry) => !entry.exists).length,
      totalArrayRecords,
    },
    entries,
  };
}

export function downloadEvolvLocalBackup(): EvolvLocalBackupPayload {
  const payload = createEvolvLocalBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = buildBackupFileName(payload.generatedAt);
  anchor.click();
  URL.revokeObjectURL(url);

  return payload;
}

function readLocalBackupEntry(
  key: EvolvLocalBackupKey,
): EvolvLocalBackupEntry {
  if (typeof window === "undefined") {
    return {
      key,
      exists: false,
      rawValue: null,
      parsedValue: null,
      parseStatus: "empty",
      recordCount: null,
    };
  }

  const rawValue = window.localStorage.getItem(key);

  if (rawValue === null) {
    return {
      key,
      exists: false,
      rawValue,
      parsedValue: null,
      parseStatus: "empty",
      recordCount: null,
    };
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    return {
      key,
      exists: true,
      rawValue,
      parsedValue,
      parseStatus: "valid-json",
      recordCount: Array.isArray(parsedValue) ? parsedValue.length : null,
    };
  } catch {
    return {
      key,
      exists: true,
      rawValue,
      parsedValue: null,
      parseStatus: "invalid-json",
      recordCount: null,
    };
  }
}

function buildBackupFileName(generatedAt: string) {
  const date = new Date(generatedAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `evolv-local-backup-${year}-${month}-${day}-${hour}-${minute}.json`;
}
