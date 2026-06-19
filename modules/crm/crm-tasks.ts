export const crmTaskTypes = [
  "call",
  "whatsapp",
  "send_simulation",
  "send_proposal",
  "schedule_meeting",
  "request_documents",
  "follow_up",
  "other",
] as const;

export type CrmTaskType = (typeof crmTaskTypes)[number];

export const crmTaskStatuses = [
  "pending",
  "completed",
  "canceled",
] as const;

export type CrmTaskStatus = (typeof crmTaskStatuses)[number];

export type CrmTaskTemporalStatus = "overdue" | "today" | "future";

export type CrmTask = {
  assignedUserId: string | null;
  canceledAt: string | null;
  canceledBy: string | null;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
  createdBy: string | null;
  dueDate: string;
  dueTime: string | null;
  id: string;
  leadId: string;
  notes: string | null;
  organizationId: string;
  sourceNoteId: string | null;
  status: CrmTaskStatus;
  taskType: CrmTaskType;
  title: string;
  updatedAt: string;
};

export type CreateCrmTaskInput = {
  assignedUserId?: string | null;
  dueDate: string;
  dueTime?: string | null;
  leadId: string;
  notes?: string | null;
  sourceNoteId?: string | null;
  taskType: CrmTaskType;
  title: string;
};

export type CompleteCrmTaskInput = {
  result?: string | null;
};

export type CancelCrmTaskInput = {
  reason?: string | null;
};

export function isCrmTaskType(value: unknown): value is CrmTaskType {
  return (
    typeof value === "string" &&
    crmTaskTypes.includes(value as CrmTaskType)
  );
}

export function isCrmTaskStatus(value: unknown): value is CrmTaskStatus {
  return (
    typeof value === "string" &&
    crmTaskStatuses.includes(value as CrmTaskStatus)
  );
}

export function resolveNextPendingCrmTask(tasks: CrmTask[]) {
  return (
    tasks
      .filter((task) => task.status === "pending")
      .sort(compareCrmTasksByDueDate)[0] ?? null
  );
}

export function resolveCrmTaskTemporalStatus(
  task: Pick<CrmTask, "dueDate" | "dueTime">,
  now = new Date(),
): CrmTaskTemporalStatus {
  const dueAt = parseCrmTaskDueAt(task);

  if (dueAt.getTime() < now.getTime()) {
    return "overdue";
  }

  if (
    dueAt.getFullYear() === now.getFullYear() &&
    dueAt.getMonth() === now.getMonth() &&
    dueAt.getDate() === now.getDate()
  ) {
    return "today";
  }

  return "future";
}

function parseCrmTaskDueAt(
  task: Pick<CrmTask, "dueDate" | "dueTime">,
) {
  const [year, month, day] = task.dueDate.split("-").map(Number);
  const [hour, minute, second] = (task.dueTime ?? "23:59:59")
    .split(":")
    .map(Number);

  return new Date(
    year,
    (month ?? 1) - 1,
    day ?? 1,
    hour ?? 23,
    minute ?? 59,
    second ?? 59,
    task.dueTime ? 0 : 999,
  );
}

function compareCrmTasksByDueDate(first: CrmTask, second: CrmTask) {
  const firstDate = `${first.dueDate}T${first.dueTime ?? "23:59:59"}`;
  const secondDate = `${second.dueDate}T${second.dueTime ?? "23:59:59"}`;

  if (firstDate !== secondDate) {
    return firstDate.localeCompare(secondDate);
  }

  return first.createdAt.localeCompare(second.createdAt);
}
