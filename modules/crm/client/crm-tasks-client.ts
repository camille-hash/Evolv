import type { CreateCrmTaskInput, CrmTask } from "../crm-tasks";

export async function fetchCrmTasksForLead(
  accessToken: string,
  leadId: string,
) {
  const response = await fetch(`/api/crm/tasks?leadId=${leadId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    tasks?: CrmTask[];
  } | null;

  if (!response.ok || !Array.isArray(payload?.tasks)) {
    throw new Error(payload?.error ?? "Nao foi possivel carregar as tarefas.");
  }

  return payload.tasks;
}

export async function createCrmTaskForLead(
  accessToken: string,
  input: CreateCrmTaskInput,
) {
  const response = await fetch("/api/crm/tasks", {
    body: JSON.stringify({
      dueDate: input.dueDate,
      dueTime: input.dueTime,
      leadId: input.leadId,
      notes: input.notes,
      taskType: input.taskType,
      title: input.title,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    task?: CrmTask;
  } | null;

  if (!response.ok || !payload?.task) {
    throw new Error(payload?.error ?? "Nao foi possivel criar a acao.");
  }

  return payload.task;
}

export async function completeCrmTask(accessToken: string, taskId: string) {
  const response = await fetch(`/api/crm/tasks/${taskId}/complete`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "PATCH",
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    task?: CrmTask;
  } | null;

  if (!response.ok || !payload?.task) {
    throw new Error(payload?.error ?? "Nao foi possivel concluir a acao.");
  }

  return payload.task;
}
