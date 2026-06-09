import type {
  CrmActivity,
  CrmActivityStatus,
  CrmActivityType,
  CrmNote,
  CrmPipeline,
  CrmStage,
  CrmStageChange,
} from "./crm-types";

const CRM_NOTES_STORAGE_KEY = "evolv.crm.notes.v1";
const CRM_ACTIVITIES_STORAGE_KEY = "evolv.crm.activities.v1";
const CRM_STAGE_CHANGES_STORAGE_KEY = "evolv.crm.stage-changes.v1";

export function loadCrmNotes(leadId?: string): CrmNote[] {
  return loadCollection<CrmNote>(CRM_NOTES_STORAGE_KEY, normalizeCrmNote)
    .filter((note) => !leadId || note.leadId === leadId)
    .sort(sortByCreatedAtDesc);
}

export function addCrmNote(leadId: string, content: string): CrmNote[] {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return loadCrmNotes(leadId);
  }

  const notes = loadCrmNotes();
  const nextNote: CrmNote = {
    id: crypto.randomUUID(),
    leadId,
    content: trimmedContent,
    createdAt: new Date().toISOString(),
  };

  saveCollection(CRM_NOTES_STORAGE_KEY, [nextNote, ...notes]);

  return loadCrmNotes(leadId);
}

export function deleteCrmNote(noteId: string, leadId: string): CrmNote[] {
  const nextNotes = loadCrmNotes().filter((note) => note.id !== noteId);

  saveCollection(CRM_NOTES_STORAGE_KEY, nextNotes);

  return loadCrmNotes(leadId);
}

export function loadCrmActivities(leadId?: string): CrmActivity[] {
  return loadCollection<CrmActivity>(
    CRM_ACTIVITIES_STORAGE_KEY,
    normalizeCrmActivity,
  )
    .filter((activity) => !leadId || activity.leadId === leadId)
    .sort(sortByCreatedAtDesc);
}

export function addCrmActivity(input: {
  leadId: string;
  titulo: string;
  tipo: CrmActivityType;
  data: string;
  hora: string;
  status: CrmActivityStatus;
}): CrmActivity[] {
  const activities = loadCrmActivities();
  const nextActivity: CrmActivity = {
    id: crypto.randomUUID(),
    leadId: input.leadId,
    titulo: input.titulo.trim(),
    tipo: input.tipo,
    data: input.data,
    hora: input.hora,
    status: input.status,
    createdAt: new Date().toISOString(),
    completedAt:
      input.status === "completed" ? new Date().toISOString() : undefined,
  };

  if (!nextActivity.titulo) {
    return loadCrmActivities(input.leadId);
  }

  saveCollection(CRM_ACTIVITIES_STORAGE_KEY, [nextActivity, ...activities]);

  return loadCrmActivities(input.leadId);
}

export function completeCrmActivity(
  activityId: string,
  leadId: string,
): CrmActivity[] {
  const nextActivities = loadCrmActivities().map((activity) =>
    activity.id === activityId
      ? {
          ...activity,
          status: "completed" as const,
          completedAt: activity.completedAt ?? new Date().toISOString(),
        }
      : activity,
  );

  saveCollection(CRM_ACTIVITIES_STORAGE_KEY, nextActivities);

  return loadCrmActivities(leadId);
}

export function deleteCrmActivity(
  activityId: string,
  leadId: string,
): CrmActivity[] {
  const nextActivities = loadCrmActivities().filter(
    (activity) => activity.id !== activityId,
  );

  saveCollection(CRM_ACTIVITIES_STORAGE_KEY, nextActivities);

  return loadCrmActivities(leadId);
}

export function loadCrmStageChanges(leadId?: string): CrmStageChange[] {
  return loadCollection<CrmStageChange>(
    CRM_STAGE_CHANGES_STORAGE_KEY,
    normalizeCrmStageChange,
  )
    .filter((change) => !leadId || change.leadId === leadId)
    .sort(sortByCreatedAtDesc);
}

export function recordCrmStageChange(input: {
  leadId: string;
  fromPipeline: CrmPipeline;
  fromStage: CrmStage;
  toPipeline: CrmPipeline;
  toStage: CrmStage;
}): CrmStageChange[] {
  if (
    input.fromPipeline === input.toPipeline &&
    input.fromStage === input.toStage
  ) {
    return loadCrmStageChanges(input.leadId);
  }

  const stageChanges = loadCrmStageChanges();
  const nextChange: CrmStageChange = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  };

  saveCollection(CRM_STAGE_CHANGES_STORAGE_KEY, [
    nextChange,
    ...stageChanges,
  ]);

  return loadCrmStageChanges(input.leadId);
}

function loadCollection<T>(
  storageKey: string,
  normalize: (value: unknown) => T | null,
): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(normalize)
      .filter((item): item is T => Boolean(item));
  } catch {
    return [];
  }
}

function saveCollection<T>(storageKey: string, items: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(items));
}

function normalizeCrmNote(value: unknown): CrmNote | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CrmNote>;

  if (!candidate.leadId || !candidate.content || !candidate.createdAt) {
    return null;
  }

  return {
    id: candidate.id ?? crypto.randomUUID(),
    leadId: candidate.leadId,
    content: candidate.content,
    createdAt: candidate.createdAt,
  };
}

function normalizeCrmActivity(value: unknown): CrmActivity | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CrmActivity>;

  if (!candidate.leadId || !candidate.titulo || !candidate.createdAt) {
    return null;
  }

  return {
    id: candidate.id ?? crypto.randomUUID(),
    leadId: candidate.leadId,
    titulo: candidate.titulo,
    tipo: candidate.tipo ?? "outro",
    data: candidate.data ?? "",
    hora: candidate.hora ?? "",
    status: candidate.status ?? "pending",
    createdAt: candidate.createdAt,
    completedAt: candidate.completedAt,
  };
}

function normalizeCrmStageChange(value: unknown): CrmStageChange | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CrmStageChange>;

  if (
    !candidate.leadId ||
    !candidate.fromPipeline ||
    !candidate.fromStage ||
    !candidate.toPipeline ||
    !candidate.toStage ||
    !candidate.createdAt
  ) {
    return null;
  }

  return {
    id: candidate.id ?? crypto.randomUUID(),
    leadId: candidate.leadId,
    fromPipeline: candidate.fromPipeline,
    fromStage: candidate.fromStage,
    toPipeline: candidate.toPipeline,
    toStage: candidate.toStage,
    createdAt: candidate.createdAt,
  };
}

function sortByCreatedAtDesc(
  left: { createdAt: string },
  right: { createdAt: string },
) {
  return (
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}
