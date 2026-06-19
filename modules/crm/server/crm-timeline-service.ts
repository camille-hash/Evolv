import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  CrmTaskStatus,
  CrmTaskType,
} from "../crm-tasks";
import type {
  CrmOperationalTimelineEvent,
  CrmOperationalTimelineEventSource,
  CrmOperationalTimelineEventType,
  CrmTimelineReadModel,
} from "../crm-timeline";

type CrmTimelineProfile = {
  email: string | null;
  id: string;
  is_active: boolean | null;
  name: string | null;
  organization_id: string | null;
  role: string | null;
};

type CrmTimelineLeadRow = {
  id: string;
  organization_id: string | null;
};

type CrmTimelineNoteRow = {
  author_profile_id: string | null;
  content: string | null;
  created_at: string | null;
  deleted_at: string | null;
  id: string;
  lead_id: string;
  organization_id: string;
};

type CrmTimelineTaskRow = {
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
  organization_id: string;
  status: string | null;
  task_type: string | null;
  title: string | null;
};

type CrmTimelineSimulationRow = {
  created_at: string | null;
  created_by: string | null;
  id: string;
  lead_id: string;
  organization_id: string;
  simulation_type: string | null;
  title: string | null;
};

type RequestContext = {
  profile: CrmTimelineProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "sdr";
  };
  supabase: ReturnType<typeof createServerTimelineSupabaseClient>;
  user: SupabaseUser;
};

export type GetLeadTimelineResult =
  | { ok: true; timeline: CrmTimelineReadModel }
  | { error: string; ok: false; status: number };

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

const unknownAuthorName = "Autor nao identificado";

const crmTimelineNoteColumns = [
  "id",
  "organization_id",
  "lead_id",
  "author_profile_id",
  "content",
  "created_at",
  "deleted_at",
].join(",");

const crmTimelineTaskColumns = [
  "id",
  "organization_id",
  "lead_id",
  "created_by",
  "task_type",
  "title",
  "due_date",
  "due_time",
  "status",
  "completed_at",
  "completed_by",
  "canceled_at",
  "canceled_by",
  "created_at",
].join(",");

const crmTimelineSimulationColumns = [
  "id",
  "organization_id",
  "lead_id",
  "created_by",
  "simulation_type",
  "title",
  "created_at",
].join(",");

const taskTypeLabels: Record<CrmTaskType, string> = {
  call: "Ligar",
  follow_up: "Follow-up",
  other: "Outro",
  request_documents: "Solicitar documentacao",
  schedule_meeting: "Agendar reuniao",
  send_proposal: "Enviar proposta",
  send_simulation: "Enviar simulacao",
  whatsapp: "WhatsApp",
};

const timelineTypePriority: Record<CrmOperationalTimelineEventType, number> = {
  commercial_simulation_created: 0,
  multi_cotas_created: 1,
  task_completed: 2,
  task_cancelled: 3,
  note_created: 4,
  task_created: 5,
};

export async function getLeadTimeline(
  accessToken: string | null,
  leadId: string,
): Promise<GetLeadTimelineResult> {
  if (!leadId.trim()) {
    return {
      error: "Informe o lead para consultar a timeline.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveTimelineRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const [notesResult, tasksResult, simulationsResult] = await Promise.all([
    listTimelineNotes(context, leadId),
    listTimelineTasks(context, leadId),
    listTimelineSimulations(context, leadId),
  ]);

  if (!notesResult.ok) {
    return notesResult;
  }

  if (!tasksResult.ok) {
    return tasksResult;
  }

  if (!simulationsResult.ok) {
    return simulationsResult;
  }

  const events = [
    ...notesResult.notes.map(mapNoteEvent),
    ...tasksResult.tasks.flatMap(mapTaskEvents),
    ...simulationsResult.simulations.flatMap(mapSimulationEvents),
  ];
  const authors = await resolveAuthorNames(context, events);
  const enrichedEvents = sortTimelineEvents(
    events.map((event) => ({
      ...event,
      authorName: resolveAuthorName(authors, event.authorProfileId),
    })),
  );

  return {
    ok: true,
    timeline: {
      events: enrichedEvents,
      pageInfo: {
        hasMore: false,
        nextCursor: null,
      },
    },
  };
}

function createServerTimelineSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase CRM timeline server environment is not configured.");
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

async function resolveTimelineRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerTimelineSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: genericAccessError,
        ok: false as const,
        status: 401,
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, organization_id, name, email, role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle<CrmTimelineProfile>();

    if (profileError || !isValidProfile(profile)) {
      return {
        error: genericAccessError,
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
    .maybeSingle<CrmTimelineLeadRow>();

  if (error || !data?.organization_id) {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 404,
    };
  }

  return {
    ok: true as const,
  };
}

async function listTimelineNotes(context: RequestContext, leadId: string) {
  const { data, error } = await context.supabase
    .from("crm_lead_notes")
    .select(crmTimelineNoteColumns)
    .eq("lead_id", leadId)
    .is("deleted_at", null);

  if (error) {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 500,
    };
  }

  return {
    notes: (data ?? []) as unknown as CrmTimelineNoteRow[],
    ok: true as const,
  };
}

async function listTimelineTasks(context: RequestContext, leadId: string) {
  const { data, error } = await context.supabase
    .from("crm_tasks")
    .select(crmTimelineTaskColumns)
    .eq("lead_id", leadId);

  if (error) {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 500,
    };
  }

  return {
    ok: true as const,
    tasks: (data ?? []) as unknown as CrmTimelineTaskRow[],
  };
}

async function listTimelineSimulations(
  context: RequestContext,
  leadId: string,
) {
  const { data, error } = await context.supabase
    .from("crm_lead_simulations")
    .select(crmTimelineSimulationColumns)
    .eq("lead_id", leadId);

  if (error) {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 500,
    };
  }

  return {
    ok: true as const,
    simulations: (data ?? []) as unknown as CrmTimelineSimulationRow[],
  };
}

async function resolveAuthorNames(
  context: RequestContext,
  events: CrmOperationalTimelineEvent[],
) {
  const authorIds = Array.from(
    new Set(
      events
        .map((event) => event.authorProfileId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (!authorIds.length) {
    return new Map<string, string>();
  }

  const { data, error } = await context.supabase
    .from("profiles")
    .select("id, name, email, organization_id, role, is_active")
    .in("id", authorIds);

  if (error) {
    return new Map<string, string>();
  }

  return new Map(
    ((data ?? []) as unknown as CrmTimelineProfile[])
      .filter((profile) => profile.organization_id === context.profile.organization_id)
      .map((profile) => [profile.id, formatProfileName(profile)]),
  );
}

function mapNoteEvent(note: CrmTimelineNoteRow): CrmOperationalTimelineEvent {
  const occurredAt = note.created_at ?? new Date().toISOString();

  return {
    authorName: unknownAuthorName,
    authorProfileId: note.author_profile_id,
    description: note.content ?? "",
    id: createTimelineEventId("note_created", "crm_lead_notes", note.id),
    leadId: note.lead_id,
    metadata: {},
    occurredAt,
    source: "crm_lead_notes",
    sourceId: note.id,
    title: "Registrou nota",
    type: "note_created",
  };
}

function mapTaskEvents(task: CrmTimelineTaskRow): CrmOperationalTimelineEvent[] {
  const events: CrmOperationalTimelineEvent[] = [];

  if (task.created_at) {
    events.push({
      authorName: unknownAuthorName,
      authorProfileId: task.created_by,
      description: formatTaskDescription(task, true),
      id: createTimelineEventId("task_created", "crm_tasks", task.id),
      leadId: task.lead_id,
      metadata: createTaskMetadata(task),
      occurredAt: task.created_at,
      source: "crm_tasks",
      sourceId: task.id,
      title: "Criou tarefa",
      type: "task_created",
    });
  }

  if (task.status === "completed" && task.completed_at) {
    events.push({
      authorName: unknownAuthorName,
      authorProfileId: task.completed_by,
      description: formatTaskDescription(task, false),
      id: createTimelineEventId("task_completed", "crm_tasks", task.id),
      leadId: task.lead_id,
      metadata: createTaskMetadata(task),
      occurredAt: task.completed_at,
      source: "crm_tasks",
      sourceId: task.id,
      title: "Concluiu tarefa",
      type: "task_completed",
    });
  }

  if (task.status === "canceled" && task.canceled_at) {
    events.push({
      authorName: unknownAuthorName,
      authorProfileId: task.canceled_by,
      description: formatTaskDescription(task, false),
      id: createTimelineEventId("task_cancelled", "crm_tasks", task.id),
      leadId: task.lead_id,
      metadata: createTaskMetadata(task),
      occurredAt: task.canceled_at,
      source: "crm_tasks",
      sourceId: task.id,
      title: "Cancelou tarefa",
      type: "task_cancelled",
    });
  }

  return events;
}

function mapSimulationEvents(
  simulation: CrmTimelineSimulationRow,
): CrmOperationalTimelineEvent[] {
  if (!simulation.created_at) {
    return [];
  }

  if (simulation.simulation_type === "commercial") {
    return [
      {
        authorName: unknownAuthorName,
        authorProfileId: simulation.created_by,
        description: normalizeText(simulation.title),
        id: createTimelineEventId(
          "commercial_simulation_created",
          "crm_lead_simulations",
          simulation.id,
        ),
        leadId: simulation.lead_id,
        metadata: {
          simulationType: "commercial",
        },
        occurredAt: simulation.created_at,
        source: "crm_lead_simulations",
        sourceId: simulation.id,
        title: "Simulacao Comercial criada",
        type: "commercial_simulation_created",
      },
    ];
  }

  if (simulation.simulation_type === "multi_cotas") {
    return [
      {
        authorName: unknownAuthorName,
        authorProfileId: simulation.created_by,
        description: normalizeText(simulation.title),
        id: createTimelineEventId(
          "multi_cotas_created",
          "crm_lead_simulations",
          simulation.id,
        ),
        leadId: simulation.lead_id,
        metadata: {
          simulationType: "multi_cotas",
        },
        occurredAt: simulation.created_at,
        source: "crm_lead_simulations",
        sourceId: simulation.id,
        title: "Estudo Multi-Cotas criado",
        type: "multi_cotas_created",
      },
    ];
  }

  return [];
}

function sortTimelineEvents(events: CrmOperationalTimelineEvent[]) {
  return [...events].sort((left, right) => {
    const occurredDifference =
      new Date(right.occurredAt).getTime() -
      new Date(left.occurredAt).getTime();

    if (occurredDifference !== 0) {
      return occurredDifference;
    }

    const priorityDifference =
      timelineTypePriority[left.type] - timelineTypePriority[right.type];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return right.sourceId.localeCompare(left.sourceId);
  });
}

function resolveAuthorName(authors: Map<string, string>, profileId: string | null) {
  if (!profileId) {
    return unknownAuthorName;
  }

  return authors.get(profileId) ?? unknownAuthorName;
}

function formatProfileName(profile: CrmTimelineProfile) {
  return normalizeText(profile.name) ?? normalizeText(profile.email) ?? unknownAuthorName;
}

function formatTaskDescription(task: CrmTimelineTaskRow, includeDueDate: boolean) {
  const taskLabel = getTaskTypeLabel(task.task_type);
  const taskTitle = normalizeText(task.title) ?? "Tarefa sem titulo";

  if (!includeDueDate) {
    return `${taskLabel}: ${taskTitle}`;
  }

  return `${taskLabel}: ${taskTitle} - ${formatTaskDueDate(task)}`;
}

function formatTaskDueDate(task: CrmTimelineTaskRow) {
  return task.due_time
    ? `${task.due_date} ${task.due_time.slice(0, 5)}`
    : task.due_date;
}

function getTaskTypeLabel(taskType: string | null) {
  return taskType && isKnownTaskType(taskType)
    ? taskTypeLabels[taskType]
    : taskTypeLabels.other;
}

function createTaskMetadata(task: CrmTimelineTaskRow) {
  return {
    dueDate: task.due_date,
    dueTime: task.due_time,
    status: normalizeTaskStatus(task.status),
    taskType: isKnownTaskType(task.task_type) ? task.task_type : "other",
  };
}

function createTimelineEventId(
  type: CrmOperationalTimelineEventType,
  source: CrmOperationalTimelineEventSource,
  sourceId: string,
) {
  return `${type}:${source}:${sourceId}`;
}

function isValidProfile(
  profile: CrmTimelineProfile | null,
): profile is CrmTimelineProfile & {
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

function isKnownTaskType(taskType: string | null): taskType is CrmTaskType {
  return Boolean(taskType && taskType in taskTypeLabels);
}

function normalizeTaskStatus(status: string | null): CrmTaskStatus {
  return status === "completed" || status === "canceled" ? status : "pending";
}

function normalizeText(value: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}
