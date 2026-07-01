import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { triggerDm001RecalculationAfterCrmEvent } from "../../decision-models/dm-001/event-hooks";
import {
  isCrmTaskStatus,
  isCrmTaskType,
  type CancelCrmTaskInput,
  type CompleteCrmTaskInput,
  type CreateCrmTaskInput,
  type CrmTask,
  type CrmTaskStatus,
  type CrmTaskType,
} from "../crm-tasks";

type CrmTasksProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type CrmTasksLeadRow = {
  id: string;
  organization_id: string | null;
};

type CrmTasksSourceNoteRow = {
  deleted_at: string | null;
  id: string;
  lead_id: string;
  organization_id: string | null;
};

type CrmTaskRow = {
  assigned_user_id: string | null;
  canceled_at: string | null;
  canceled_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string | null;
  created_by: string | null;
  due_date: string;
  due_time: string | null;
  id: string;
  lead_id: string;
  notes: string | null;
  organization_id: string;
  source_note_id: string | null;
  status: string | null;
  task_type: string | null;
  title: string | null;
  updated_at: string | null;
};

const crmTaskColumns = [
  "id",
  "organization_id",
  "lead_id",
  "assigned_user_id",
  "created_by",
  "task_type",
  "title",
  "notes",
  "due_date",
  "due_time",
  "status",
  "completed_at",
  "completed_by",
  "canceled_at",
  "canceled_by",
  "source_note_id",
  "created_at",
  "updated_at",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

type RequestContext = {
  profile: CrmTasksProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "sdr";
  };
  supabase: ReturnType<typeof createServerTasksSupabaseClient>;
  user: SupabaseUser;
};

export type ListCrmTasksResult =
  | { ok: true; tasks: CrmTask[] }
  | { error: string; ok: false; status: number };

export type MutateCrmTaskResult =
  | { ok: true; task: CrmTask }
  | { error: string; ok: false; status: number };

export async function listTasksForLead(
  accessToken: string | null,
  leadId: string,
): Promise<ListCrmTasksResult> {
  if (!leadId.trim()) {
    return {
      error: "Informe o lead da tarefa.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveTaskRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const { data, error } = await context.supabase
    .from("crm_tasks")
    .select(crmTaskColumns)
    .eq("lead_id", leadId)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    tasks: ((data ?? []) as unknown as CrmTaskRow[]).map(mapCrmTaskRow),
  };
}

export async function listMyTasksForDateWindow(
  accessToken: string | null,
  input: { fromDate: string; toDate: string },
): Promise<ListCrmTasksResult> {
  if (!isIsoDate(input.fromDate) || !isIsoDate(input.toDate)) {
    return {
      error: "Periodo invalido.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveTaskRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const { data, error } = await context.supabase
    .from("crm_tasks")
    .select(crmTaskColumns)
    .eq("assigned_user_id", context.profile.id)
    .eq("status", "pending")
    .gte("due_date", input.fromDate)
    .lte("due_date", input.toDate)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    tasks: ((data ?? []) as unknown as CrmTaskRow[]).map(mapCrmTaskRow),
  };
}

export async function createCommercialTask(
  accessToken: string | null,
  input: CreateCrmTaskInput,
): Promise<MutateCrmTaskResult> {
  const title = input.title.trim();
  const notes = normalizeOptionalText(input.notes);
  const dueTime = normalizeOptionalText(input.dueTime);
  const assignedUserId = normalizeOptionalText(input.assignedUserId);
  const sourceNoteId = normalizeOptionalText(input.sourceNoteId);

  if (!input.leadId.trim()) {
    return {
      error: "Informe o lead da tarefa.",
      ok: false,
      status: 400,
    };
  }

  if (!title) {
    return {
      error: "Informe o titulo da tarefa.",
      ok: false,
      status: 400,
    };
  }

  if (!isIsoDate(input.dueDate)) {
    return {
      error: "Data da acao e obrigatoria.",
      ok: false,
      status: 400,
    };
  }

  if (dueTime && !isTimeValue(dueTime)) {
    return {
      error: "Horario da acao invalido.",
      ok: false,
      status: 400,
    };
  }

  if (!isCrmTaskType(input.taskType)) {
    return {
      error: "Tipo de acao invalido.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveTaskRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, input.leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  if (assignedUserId) {
    const assignmentValidation = await validateAssignedProfile(
      context,
      assignedUserId,
    );

    if (!assignmentValidation.ok) {
      return assignmentValidation;
    }
  }

  if (sourceNoteId) {
    const noteValidation = await validateSourceNote(
      context,
      sourceNoteId,
      input.leadId,
    );

    if (!noteValidation.ok) {
      return noteValidation;
    }
  }

  const payload = {
    assigned_user_id: assignedUserId ?? context.profile.id,
    created_by: context.profile.id,
    due_date: input.dueDate,
    due_time: dueTime,
    lead_id: input.leadId,
    notes,
    organization_id: context.profile.organization_id,
    source_note_id: sourceNoteId,
    status: "pending",
    task_type: input.taskType,
    title,
  };

  const { data, error } = await context.supabase
    .from("crm_tasks")
    .insert(payload)
    .select(crmTaskColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel criar a tarefa.",
      ok: false,
      status: 500,
    };
  }

  const task = mapCrmTaskRow(data as unknown as CrmTaskRow);
  await triggerDm001RecalculationAfterCrmEvent({
    accessToken,
    leadId: task.leadId,
    reason: "task_created",
  });

  return {
    ok: true,
    task,
  };
}

export async function completeCommercialTask(
  accessToken: string | null,
  taskId: string,
  _input: CompleteCrmTaskInput = {},
): Promise<MutateCrmTaskResult> {
  void _input;

  if (!taskId.trim()) {
    return {
      error: "Informe a tarefa.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveTaskRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const taskValidation = await validateTaskOrganization(context, taskId);

  if (!taskValidation.ok) {
    return taskValidation;
  }

  if (taskValidation.task.status !== "pending") {
    return {
      error: "Tarefa nao encontrada.",
      ok: false,
      status: 409,
    };
  }

  const { data, error } = await context.supabase
    .from("crm_tasks")
    .update({
      completed_at: new Date().toISOString(),
      completed_by: context.profile.id,
      status: "completed",
    })
    .eq("id", taskId)
    .eq("organization_id", context.profile.organization_id)
    .eq("status", "pending")
    .select(crmTaskColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel concluir a tarefa.",
      ok: false,
      status: 500,
    };
  }

  const task = mapCrmTaskRow(data as unknown as CrmTaskRow);
  await triggerDm001RecalculationAfterCrmEvent({
    accessToken,
    leadId: task.leadId,
    reason: "task_completed",
  });

  return {
    ok: true,
    task,
  };
}

export async function cancelCommercialTask(
  accessToken: string | null,
  taskId: string,
  _input: CancelCrmTaskInput = {},
): Promise<MutateCrmTaskResult> {
  void _input;

  if (!taskId.trim()) {
    return {
      error: "Informe a tarefa.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveTaskRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const taskValidation = await validateTaskOrganization(context, taskId);

  if (!taskValidation.ok) {
    return taskValidation;
  }

  if (taskValidation.task.status !== "pending") {
    return {
      error: "Tarefa nao encontrada.",
      ok: false,
      status: 409,
    };
  }

  const { data, error } = await context.supabase
    .from("crm_tasks")
    .update({
      canceled_at: new Date().toISOString(),
      canceled_by: context.profile.id,
      status: "canceled",
    })
    .eq("id", taskId)
    .eq("organization_id", context.profile.organization_id)
    .eq("status", "pending")
    .select(crmTaskColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel cancelar a tarefa.",
      ok: false,
      status: 500,
    };
  }

  const task = mapCrmTaskRow(data as unknown as CrmTaskRow);
  await triggerDm001RecalculationAfterCrmEvent({
    accessToken,
    leadId: task.leadId,
    reason: "task_updated",
  });

  return {
    ok: true,
    task,
  };
}

function createServerTasksSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase CRM tasks server environment is not configured.");
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function resolveTaskRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerTasksSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Sessao invalida.",
        ok: false as const,
        status: 401,
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, organization_id, role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle<CrmTasksProfile>();

    if (profileError || !isValidProfile(profile)) {
      return {
        error: "Perfil nao encontrado.",
        ok: false as const,
        status: 403,
      };
    }

    return {
      ok: true as const,
      profile,
      supabase,
      user: userData.user,
    };
  } catch {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 500,
    };
  }
}

async function validateLeadOrganization(
  context: RequestContext,
  leadId: string,
) {
  const { data, error } = await context.supabase
    .from("crm_leads")
    .select("id, organization_id")
    .eq("id", leadId)
    .maybeSingle<CrmTasksLeadRow>();

  if (error || !data?.organization_id) {
    return {
      error: "Lead nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Lead nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  return {
    lead: data,
    ok: true as const,
  };
}

async function validateTaskOrganization(
  context: RequestContext,
  taskId: string,
) {
  const { data, error } = await context.supabase
    .from("crm_tasks")
    .select(crmTaskColumns)
    .eq("id", taskId)
    .maybeSingle<CrmTaskRow>();

  if (error || !data?.organization_id) {
    return {
      error: "Tarefa nao encontrada.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Tarefa nao encontrada.",
      ok: false as const,
      status: 404,
    };
  }

  return {
    ok: true as const,
    task: mapCrmTaskRow(data),
  };
}

async function validateAssignedProfile(
  context: RequestContext,
  assignedUserId: string,
) {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("id, organization_id, role, is_active")
    .eq("id", assignedUserId)
    .maybeSingle<CrmTasksProfile>();

  if (error || !isValidProfile(data)) {
    return {
      error: "Responsavel invalido.",
      ok: false as const,
      status: 400,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Responsavel invalido.",
      ok: false as const,
      status: 400,
    };
  }

  return {
    ok: true as const,
  };
}

async function validateSourceNote(
  context: RequestContext,
  sourceNoteId: string,
  leadId: string,
) {
  const { data, error } = await context.supabase
    .from("crm_lead_notes")
    .select("id, organization_id, lead_id, deleted_at")
    .eq("id", sourceNoteId)
    .maybeSingle<CrmTasksSourceNoteRow>();

  if (
    error ||
    !data ||
    data.deleted_at ||
    data.lead_id !== leadId ||
    data.organization_id !== context.profile.organization_id
  ) {
    return {
      error: "Nota de origem invalida.",
      ok: false as const,
      status: 400,
    };
  }

  return {
    ok: true as const,
  };
}

function isValidProfile(
  profile: CrmTasksProfile | null,
): profile is CrmTasksProfile & {
  is_active: true;
  organization_id: string;
  role: "admin" | "sdr";
} {
  return Boolean(
    profile?.id &&
      profile.organization_id &&
      profile.is_active === true &&
      (profile.role === "admin" || profile.role === "sdr"),
  );
}

function mapCrmTaskRow(row: CrmTaskRow): CrmTask {
  const now = new Date().toISOString();

  return {
    assignedUserId: row.assigned_user_id,
    canceledAt: row.canceled_at,
    canceledBy: row.canceled_by,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    createdAt: row.created_at ?? now,
    createdBy: row.created_by,
    dueDate: row.due_date,
    dueTime: row.due_time,
    id: row.id,
    leadId: row.lead_id,
    notes: row.notes,
    organizationId: row.organization_id,
    sourceNoteId: row.source_note_id,
    status: normalizeTaskStatus(row.status),
    taskType: normalizeTaskType(row.task_type),
    title: row.title ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? now,
  };
}

function normalizeTaskType(taskType: string | null): CrmTaskType {
  return isCrmTaskType(taskType) ? taskType : "other";
}

function normalizeTaskStatus(status: string | null): CrmTaskStatus {
  return isCrmTaskStatus(status) ? status : "pending";
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeValue(value: string) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value);
}
