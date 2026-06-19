import { createClient } from "@supabase/supabase-js";
import {
  isCrmTaskStatus,
  isCrmTaskType,
  resolveCrmLeadGreenFlags,
  type CrmLeadGreenFlag,
  type CrmMyDayView,
  type CrmOperationalTimelineEvent,
  type CrmTask,
} from "@/modules/crm";

type CrmMyDayProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type CrmMyDayTaskRow = {
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

type CrmMyDayNoteRow = {
  created_at: string | null;
  id: string;
  lead_id: string;
};

type CrmMyDaySimulationRow = {
  created_at: string | null;
  id: string;
  lead_id: string;
  proposal_generated_at: string | null;
  simulation_type: string | null;
  status: string | null;
};

export type GetCrmMyDayResult =
  | { myDay: CrmMyDayView; ok: true }
  | { error: string; ok: false; status: number };

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

const taskColumns = [
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

export async function getCrmMyDay(
  accessToken: string | null,
): Promise<GetCrmMyDayResult> {
  const context = await resolveRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const [tasksResult, notesResult, simulationsResult] = await Promise.all([
    context.supabase
      .from("crm_tasks")
      .select(taskColumns)
      .eq("organization_id", context.profile.organization_id),
    context.supabase
      .from("crm_lead_notes")
      .select("id,lead_id,created_at")
      .eq("organization_id", context.profile.organization_id)
      .is("deleted_at", null),
    context.supabase
      .from("crm_lead_simulations")
      .select("id,lead_id,simulation_type,status,created_at,proposal_generated_at")
      .eq("organization_id", context.profile.organization_id),
  ]);

  if (tasksResult.error || notesResult.error || simulationsResult.error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  const tasks = (tasksResult.data ?? []).map((row) =>
    mapTask(row as unknown as CrmMyDayTaskRow),
  );
  const notes = (notesResult.data ?? []) as unknown as CrmMyDayNoteRow[];
  const simulations =
    (simulationsResult.data ?? []) as unknown as CrmMyDaySimulationRow[];

  return {
    myDay: {
      greenFlagsByLeadId: buildGreenFlagsByLeadId({
        notes,
        simulations,
        tasks,
      }),
      operationalHistoryByLeadId: buildOperationalHistoryByLeadId({
        notes,
        simulations,
        tasks,
      }),
      pendingTasksByLeadId: groupPendingTasksByLeadId(tasks),
      tasks: tasks
        .filter(
          (task) =>
            task.assignedUserId === context.profile.id &&
            task.status === "pending",
        )
        .sort(sortTasksByDueDate),
    },
    ok: true,
  };
}

function groupPendingTasksByLeadId(tasks: CrmTask[]) {
  return tasks
    .filter((task) => task.status === "pending")
    .reduce<Record<string, CrmTask[]>>((tasksByLeadId, task) => {
      const leadTasks = tasksByLeadId[task.leadId] ?? [];

      return {
        ...tasksByLeadId,
        [task.leadId]: [...leadTasks, task],
      };
    }, {});
}

function buildGreenFlagsByLeadId({
  notes,
  simulations,
  tasks,
}: {
  notes: CrmMyDayNoteRow[];
  simulations: CrmMyDaySimulationRow[];
  tasks: CrmTask[];
}) {
  const leadIds = new Set([
    ...notes.map((note) => note.lead_id),
    ...simulations.map((simulation) => simulation.lead_id),
    ...tasks.map((task) => task.leadId),
  ]);
  const flagsByLeadId: Record<string, CrmLeadGreenFlag[]> = {};

  leadIds.forEach((leadId) => {
    const leadTasks = tasks.filter((task) => task.leadId === leadId);
    const leadSimulations = simulations
      .filter((simulation) => simulation.lead_id === leadId)
      .map((simulation) => ({
        createdAt: simulation.created_at ?? "",
        proposalGeneratedAt: simulation.proposal_generated_at,
        simulationType:
          simulation.simulation_type === "multi_cotas"
            ? ("multi_cotas" as const)
            : ("commercial" as const),
        status:
          simulation.status === "proposal_generated"
            ? ("proposal_generated" as const)
            : ("draft" as const),
      }));
    const timelineEvents = createTimelineEvents({
      notes: notes.filter((note) => note.lead_id === leadId),
      simulations: simulations.filter((simulation) => simulation.lead_id === leadId),
      tasks: leadTasks,
    });
    const flags = resolveCrmLeadGreenFlags({
      simulations: leadSimulations,
      tasks: leadTasks,
      timelineEvents,
    });

    if (flags.length) {
      flagsByLeadId[leadId] = flags;
    }
  });

  return flagsByLeadId;
}

function buildOperationalHistoryByLeadId({
  notes,
  simulations,
  tasks,
}: {
  notes: CrmMyDayNoteRow[];
  simulations: CrmMyDaySimulationRow[];
  tasks: CrmTask[];
}) {
  const leadIds = new Set([
    ...notes.map((note) => note.lead_id),
    ...simulations.map((simulation) => simulation.lead_id),
    ...tasks.map((task) => task.leadId),
  ]);

  return Object.fromEntries(
    Array.from(leadIds).map((leadId) => {
      const interactionDates = [
        ...notes
          .filter((note) => note.lead_id === leadId)
          .map((note) => note.created_at),
        ...tasks
          .filter((task) => task.leadId === leadId)
          .map((task) => task.completedAt),
      ];
      const simulationDates = simulations
        .filter((simulation) => simulation.lead_id === leadId)
        .map((simulation) => simulation.created_at);

      return [
        leadId,
        {
          hasMultiCotas: simulations.some(
            (simulation) =>
              simulation.lead_id === leadId &&
              simulation.simulation_type === "multi_cotas",
          ),
          lastInteractionAt: findLatestIsoDate(interactionDates),
          lastSimulationAt: findLatestIsoDate(simulationDates),
        },
      ];
    }),
  );
}

function createTimelineEvents({
  notes,
  simulations,
  tasks,
}: {
  notes: CrmMyDayNoteRow[];
  simulations: CrmMyDaySimulationRow[];
  tasks: CrmTask[];
}) {
  const events: Array<Pick<CrmOperationalTimelineEvent, "leadId" | "occurredAt" | "type">> = [];

  notes.forEach((note) => {
    if (note.created_at) {
      events.push({
        leadId: note.lead_id,
        occurredAt: note.created_at,
        type: "note_created",
      });
    }
  });

  tasks.forEach((task) => {
    if (task.createdAt) {
      events.push({
        leadId: task.leadId,
        occurredAt: task.createdAt,
        type: "task_created",
      });
    }

    if (task.completedAt) {
      events.push({
        leadId: task.leadId,
        occurredAt: task.completedAt,
        type: "task_completed",
      });
    }

    if (task.canceledAt) {
      events.push({
        leadId: task.leadId,
        occurredAt: task.canceledAt,
        type: "task_cancelled",
      });
    }
  });

  simulations.forEach((simulation) => {
    if (simulation.created_at) {
      events.push({
        leadId: simulation.lead_id,
        occurredAt: simulation.created_at,
        type:
          simulation.simulation_type === "multi_cotas"
            ? "multi_cotas_created"
            : "commercial_simulation_created",
      });
    }
  });

  return events;
}

function findLatestIsoDate(values: Array<string | null>) {
  return values.reduce<string | null>((latest, value) => {
    if (!value || Number.isNaN(new Date(value).getTime())) {
      return latest;
    }

    return !latest || new Date(value).getTime() > new Date(latest).getTime()
      ? value
      : latest;
  }, null);
}

function mapTask(row: CrmMyDayTaskRow): CrmTask {
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
    status: isCrmTaskStatus(row.status) ? row.status : "pending",
    taskType: isCrmTaskType(row.task_type) ? row.task_type : "other",
    title: row.title?.trim() || "Tarefa sem titulo",
    updatedAt: row.updated_at ?? row.created_at ?? now,
  };
}

function sortTasksByDueDate(first: CrmTask, second: CrmTask) {
  const firstKey = `${first.dueDate}T${first.dueTime ?? "23:59:59"}`;
  const secondKey = `${second.dueDate}T${second.dueTime ?? "23:59:59"}`;
  return firstKey.localeCompare(secondKey);
}

function createServerMyDaySupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase CRM Meu Dia server environment is not configured.");
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

async function resolveRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerMyDaySupabaseClient(accessToken);
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
      .select("id,organization_id,role,is_active")
      .eq("id", userData.user.id)
      .maybeSingle<CrmMyDayProfile>();

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

function isValidProfile(
  profile: CrmMyDayProfile | null,
): profile is CrmMyDayProfile & {
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
