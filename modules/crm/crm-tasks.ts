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
