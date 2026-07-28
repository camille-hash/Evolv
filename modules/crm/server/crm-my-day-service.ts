import { createClient } from "@supabase/supabase-js";
import {
  isCrmTaskStatus,
  isCrmTaskType,
  buildAssemblyOpportunities,
  resolveCrmLeadGreenFlags,
  type AssemblyOpportunityCandidate,
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

type AssemblyRow = {
  assembly_date: string;
  contract_id: string;
  id: string;
  status: string;
};

type OpportunityContractRow = {
  administrator_id: string | null;
  client_id: string | null;
  contract_group: string | null;
  contract_number: string | null;
  contract_quota: string | null;
  credit_amount: number | string | null;
  id: string;
  status: string;
};

type OpportunityBidRow = {
  assembly_id: string;
  result: string;
};

type OpportunityOfferRow = {
  assembly_id: string;
  id: string;
  status: string;
  version: number;
};

type OpportunityNameRow = {
  id: string;
  name: string | null;
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

  const [tasksResult, notesResult, simulationsResult, opportunitiesResult] =
    await Promise.all([
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
    loadAssemblyOpportunities(context),
  ]);

  if (tasksResult.error) {
    return {
      error: "Nao foi possivel carregar as tarefas do Meu Dia.",
      ok: false,
      status: 500,
    };
  }
  if (notesResult.error || simulationsResult.error) {
    return { error: genericAccessError, ok: false, status: 500 };
  }
  if (!opportunitiesResult.ok) return opportunitiesResult;

  const tasks = (tasksResult.data ?? []).map((row) =>
    mapTask(row as unknown as CrmMyDayTaskRow),
  );
  const notes = (notesResult.data ?? []) as unknown as CrmMyDayNoteRow[];
  const simulations =
    (simulationsResult.data ?? []) as unknown as CrmMyDaySimulationRow[];

  return {
    myDay: {
      assemblyOpportunities: opportunitiesResult.opportunities,
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

async function loadAssemblyOpportunities(
  context: Awaited<ReturnType<typeof resolveRequestContext>> & { ok: true },
) {
  const now = new Date();
  const lowerBound = new Date(now.getTime() - 86_400_000).toISOString();
  const upperBound = new Date(now.getTime() + 12 * 86_400_000).toISOString();

  const [assembliesResult, contractsResult] = await Promise.all([
    context.supabase
      .from("contract_assemblies")
      .select("id,contract_id,assembly_date,status")
      .eq("organization_id", context.profile.organization_id)
      .in("status", ["scheduled", "postponed"])
      .gte("assembly_date", lowerBound)
      .lte("assembly_date", upperBound),
    context.supabase
      .from("contracts")
      .select(
        "id,client_id,administrator_id,contract_number,contract_group,contract_quota,credit_amount,status",
      )
      .eq("organization_id", context.profile.organization_id)
      .eq("status", "active"),
  ]);

  if (assembliesResult.error) {
    logMyDayError("loadAssemblyOpportunities.assemblies", assembliesResult.error);
    return {
      error: "Nao foi possivel ler as assembleias proximas.",
      ok: false as const,
      status: 500,
    };
  }
  if (contractsResult.error) {
    logMyDayError("loadAssemblyOpportunities.contracts", contractsResult.error);
    return {
      error: "Nao foi possivel ler os contratos das assembleias.",
      ok: false as const,
      status: 500,
    };
  }

  const assemblies =
    (assembliesResult.data ?? []) as unknown as AssemblyRow[];
  const contracts =
    (contractsResult.data ?? []) as unknown as OpportunityContractRow[];
  const assemblyIds = assemblies.map((assembly) => assembly.id);
  const clientIds = contracts.flatMap((contract) =>
    contract.client_id ? [contract.client_id] : [],
  );
  const administratorIds = contracts.flatMap((contract) =>
    contract.administrator_id ? [contract.administrator_id] : [],
  );

  const [bidsResult, offersResult, clientsResult, administratorsResult] = await Promise.all([
    assemblyIds.length
      ? context.supabase
          .from("contract_bids")
          .select("assembly_id,result")
          .eq("organization_id", context.profile.organization_id)
          .in("assembly_id", assemblyIds)
      : Promise.resolve({ data: [], error: null }),
    assemblyIds.length
      ? context.supabase
          .from("contract_bid_offers")
          .select("id,assembly_id,status,version")
          .eq("organization_id", context.profile.organization_id)
          .in("assembly_id", assemblyIds)
          .order("version", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    clientIds.length
      ? context.supabase
          .from("clients")
          .select("id,name")
          .eq("organization_id", context.profile.organization_id)
          .in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    administratorIds.length
      ? context.supabase
          .from("administrators")
          .select("id,name")
          .eq("organization_id", context.profile.organization_id)
          .in("id", administratorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const readError =
    bidsResult.error ??
    offersResult.error ??
    clientsResult.error ??
    administratorsResult.error;
  if (readError) {
    logMyDayError("loadAssemblyOpportunities.references", readError);
    return {
      error: "Nao foi possivel completar a leitura das assembleias.",
      ok: false as const,
      status: 500,
    };
  }

  const contractsById = new Map(contracts.map((contract) => [contract.id, contract]));
  const clientsById = new Map(
    ((clientsResult.data ?? []) as unknown as OpportunityNameRow[]).map((item) => [
      item.id,
      item.name?.trim() || "Cliente sem nome",
    ]),
  );
  const administratorsById = new Map(
    (
      (administratorsResult.data ?? []) as unknown as OpportunityNameRow[]
    ).map((item) => [
      item.id,
      item.name?.trim() || "Administradora sem nome",
    ]),
  );
  const bidResultsByAssemblyId = (
    (bidsResult.data ?? []) as unknown as OpportunityBidRow[]
  ).reduce<Map<string, string[]>>((results, bid) => {
    results.set(bid.assembly_id, [
      ...(results.get(bid.assembly_id) ?? []),
      bid.result,
    ]);
    return results;
  }, new Map());
  const currentOfferByAssemblyId = new Map<string, OpportunityOfferRow>();
  for (const offer of (
    (offersResult.data ?? []) as unknown as OpportunityOfferRow[]
  )) {
    if (!currentOfferByAssemblyId.has(offer.assembly_id)) {
      currentOfferByAssemblyId.set(offer.assembly_id, offer);
    }
  }

  const candidates = assemblies.flatMap<AssemblyOpportunityCandidate>(
    (assembly) => {
      const contract = contractsById.get(assembly.contract_id);
      if (!contract) return [];
      const contractNumber = contract.contract_number?.trim();
      const currentOffer = currentOfferByAssemblyId.get(assembly.id);

      return [{
        administratorName: contract.administrator_id
          ? administratorsById.get(contract.administrator_id) ??
            "Administradora nao encontrada"
          : "Administradora nao vinculada",
        assemblyDate: assembly.assembly_date,
        assemblyId: assembly.id,
        assemblyStatus: assembly.status,
        bidResults: bidResultsByAssemblyId.get(assembly.id) ?? [],
        clientId: contract.client_id ?? undefined,
        clientName: contract.client_id
          ? clientsById.get(contract.client_id) ?? "Cliente nao encontrado"
          : "Cliente nao vinculado",
        contractId: contract.id,
        contractName: contractNumber
          ? `Contrato ${contractNumber}`
          : "Contrato sem numero",
        contractStatus: contract.status,
        creditAmount: normalizeOpportunityNumber(contract.credit_amount),
        groupNumber: contract.contract_group?.trim() || undefined,
        offerId: currentOffer?.id,
        offerStatus: currentOffer?.status,
        quotaNumber: contract.contract_quota?.trim() || undefined,
      }];
    },
  );

  return {
    ok: true as const,
    opportunities: buildAssemblyOpportunities(candidates, now),
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

    if (profileError) {
      logMyDayError("resolveRequestContext.profile", profileError);
      return {
        error: "Nao foi possivel consultar o perfil autenticado.",
        ok: false as const,
        status: 500,
      };
    }
    if (!profile) {
      return {
        error: "Perfil nao encontrado.",
        ok: false as const,
        status: 403,
      };
    }
    if (profile.is_active !== true) {
      return { error: "Perfil inativo.", ok: false as const, status: 403 };
    }
    if (!profile.organization_id) {
      return {
        error: "Perfil sem organizacao vinculada.",
        ok: false as const,
        status: 403,
      };
    }
    if (!isValidProfile(profile)) {
      return {
        error: "Papel nao autorizado para acessar o Meu Dia.",
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
  } catch (error) {
    logMyDayError("resolveRequestContext", error);
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
  role: "admin" | "master" | "sdr";
} {
  return Boolean(
    profile?.id &&
      profile.organization_id &&
      profile.is_active === true &&
      ["admin", "master", "sdr"].includes(profile.role ?? ""),
  );
}

function normalizeOpportunityNumber(value: number | string | null) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function logMyDayError(operation: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[OPP-001] ${operation}`, error);
  }
}
