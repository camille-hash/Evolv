import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

import type {
  Dm001DecisionContext,
  Dm001EvidenceGroup,
  Dm001EvidenceReference,
  Dm001Input,
  Dm001RecalculationMetadata,
} from "./contracts.ts";
import type {
  Dm001ServerRequestContext,
  ExecuteCommercialAttentionAllocationServerResult,
} from "./server-execution-service.ts";
import type {
  CommercialAttentionSupabaseClient,
} from "./supabase-persistence-adapter.ts";
import {
  executeCommercialAttentionAllocationWithServerContext,
} from "./server-execution-service.ts";
import { SupabaseCommercialAttentionDecisionStorage } from "./supabase-persistence-adapter.ts";

const crmLeadDecisionColumns = [
  "id",
  "organization_id",
  "nome",
  "telefone",
  "email",
  "produto_interesse",
  "temperatura",
  "status",
  "pipeline",
  "etapa",
  "created_at",
  "updated_at",
].join(",");

const crmTaskDecisionColumns = [
  "id",
  "organization_id",
  "lead_id",
  "task_type",
  "title",
  "due_date",
  "due_time",
  "status",
  "created_at",
  "updated_at",
].join(",");

const crmLeadNoteDecisionColumns = [
  "id",
  "organization_id",
  "lead_id",
  "content",
  "note_type",
  "is_internal",
  "created_at",
  "updated_at",
  "deleted_at",
].join(",");

const crmLeadSimulationDecisionColumns = [
  "id",
  "organization_id",
  "lead_id",
  "simulation_type",
  "title",
  "status",
  "created_at",
  "updated_at",
  "archived_at",
].join(",");

const leadKnowledgeDecisionColumns = [
  "id",
  "organization_id",
  "lead_id",
  "title",
  "summary",
  "knowledge_type",
  "confidence",
  "status",
  "created_at",
  "updated_at",
].join(",");

type Dm001AssemblerProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type CrmLeadDecisionRow = {
  created_at: string | null;
  email: string | null;
  etapa: string | null;
  id: string;
  nome: string | null;
  organization_id: string | null;
  pipeline: string | null;
  produto_interesse: string | null;
  status: string | null;
  telefone: string | null;
  temperatura: string | null;
  updated_at: string | null;
};

type CrmTaskDecisionRow = {
  created_at: string | null;
  due_date: string | null;
  due_time: string | null;
  id: string;
  lead_id: string;
  organization_id: string;
  status: string | null;
  task_type: string | null;
  title: string | null;
  updated_at: string | null;
};

type CrmLeadNoteDecisionRow = {
  content: string | null;
  created_at: string | null;
  deleted_at: string | null;
  id: string;
  is_internal: boolean | null;
  lead_id: string;
  note_type: string | null;
  organization_id: string;
  updated_at: string | null;
};

type CrmLeadSimulationDecisionRow = {
  archived_at: string | null;
  created_at: string | null;
  id: string;
  lead_id: string;
  organization_id: string;
  simulation_type: string | null;
  status: string | null;
  title: string | null;
  updated_at: string | null;
};

type LeadKnowledgeDecisionRow = {
  confidence: string | null;
  created_at: string | null;
  id: string;
  knowledge_type: string | null;
  lead_id: string;
  organization_id: string;
  status: string | null;
  summary: string | null;
  title: string | null;
  updated_at: string | null;
};

type Dm001AssemblerQueryError = {
  message?: string;
};

type Dm001AssemblerSingleQuery<T> = {
  maybeSingle(): Promise<{
    data: T | null;
    error: Dm001AssemblerQueryError | null;
  }>;
};

type Dm001AssemblerListQuery<T> = PromiseLike<{
  data: T[] | null;
  error: Dm001AssemblerQueryError | null;
}> & {
  eq(column: string, value: string): Dm001AssemblerListQuery<T>;
  limit(count: number): Dm001AssemblerListQuery<T>;
  order(
    column: string,
    options: { ascending: boolean; nullsFirst?: boolean },
  ): Dm001AssemblerListQuery<T>;
};

type Dm001AssemblerTable<T> = {
  select(columns: string): {
    eq(column: string, value: string): Dm001AssemblerSingleQuery<T>;
  };
};

type Dm001AssemblerListTable<T> = {
  select(columns: string): Dm001AssemblerListQuery<T>;
};

export interface Dm001DecisionContextAssemblerSupabaseClient
{
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: SupabaseUser | null };
      error: Dm001AssemblerQueryError | null;
    }>;
  };
  from(table: "crm_leads"): Dm001AssemblerTable<CrmLeadDecisionRow>;
  from(table: "crm_tasks"): Dm001AssemblerListTable<CrmTaskDecisionRow>;
  from(table: "crm_lead_notes"): Dm001AssemblerListTable<CrmLeadNoteDecisionRow>;
  from(
    table: "crm_lead_simulations",
  ): Dm001AssemblerListTable<CrmLeadSimulationDecisionRow>;
  from(
    table: "lead_knowledge_items",
  ): Dm001AssemblerListTable<LeadKnowledgeDecisionRow>;
  from(table: "profiles"): Dm001AssemblerTable<Dm001AssemblerProfile>;
}

export type Dm001AssemblerRequestContext = {
  profile: Dm001AssemblerProfile & {
    is_active: true;
    organization_id: string;
  };
  supabase: Dm001DecisionContextAssemblerSupabaseClient;
  user: SupabaseUser;
};

export type AssembleDm001DecisionContextResult =
  | {
      input: Dm001Input;
      ok: true;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export type ExecuteDm001ForLeadServerSideResult =
  ExecuteCommercialAttentionAllocationServerResult;

export type Dm001DecisionContextAssemblyOptions = {
  generatedAt?: string;
  persistedAt?: string;
  recalculation?: Dm001RecalculationMetadata;
};

type Dm001DecisionContextEvidenceRows = {
  knowledgeItems: LeadKnowledgeDecisionRow[];
  lead: CrmLeadDecisionRow;
  notes: CrmLeadNoteDecisionRow[];
  simulations: CrmLeadSimulationDecisionRow[];
  tasks: CrmTaskDecisionRow[];
};

export async function assembleDm001InputForLeadServerSide(
  accessToken: string | null,
  leadId: string,
  options: Dm001DecisionContextAssemblyOptions = {},
): Promise<AssembleDm001DecisionContextResult> {
  const context = await resolveDm001AssemblerRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  return assembleDm001InputForLeadWithServerContext(context, leadId, options);
}

export async function executeDm001ForLeadServerSide(
  accessToken: string | null,
  leadId: string,
  options: Dm001DecisionContextAssemblyOptions = {},
): Promise<ExecuteDm001ForLeadServerSideResult> {
  const context = await resolveDm001AssemblerRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const assembly = await assembleDm001InputForLeadWithServerContext(
    context,
    leadId,
    options,
  );

  if (!assembly.ok) {
    return assembly;
  }

  return executeCommercialAttentionAllocationWithServerContext(
    context as unknown as Dm001ServerRequestContext,
    assembly.input,
    {
      persistedAt: options.persistedAt,
      storage: new SupabaseCommercialAttentionDecisionStorage(
        context.supabase as unknown as CommercialAttentionSupabaseClient,
      ),
    },
  );
}

export async function executeDm001ForLeadWithServerContext(
  context: Dm001AssemblerRequestContext,
  leadId: string,
  options: Dm001DecisionContextAssemblyOptions & {
    storage: Parameters<
      typeof executeCommercialAttentionAllocationWithServerContext
    >[2]["storage"];
  },
): Promise<ExecuteDm001ForLeadServerSideResult> {
  const assembly = await assembleDm001InputForLeadWithServerContext(
    context,
    leadId,
    options,
  );

  if (!assembly.ok) {
    return assembly;
  }

  return executeCommercialAttentionAllocationWithServerContext(
    context as unknown as Dm001ServerRequestContext,
    assembly.input,
    {
      persistedAt: options.persistedAt,
      storage: options.storage,
    },
  );
}

export async function assembleDm001InputForLeadWithServerContext(
  context: Dm001AssemblerRequestContext,
  leadId: string,
  options: Dm001DecisionContextAssemblyOptions = {},
): Promise<AssembleDm001DecisionContextResult> {
  if (!leadId.trim()) {
    return {
      error: "Lead nao encontrado.",
      ok: false,
      status: 404,
    };
  }

  const rows = await readDecisionContextEvidenceRows(
    context.supabase as unknown as Dm001DecisionContextAssemblerSupabaseClient,
    leadId,
    context.profile.organization_id,
  );

  if (!rows.ok) {
    return rows;
  }

  const decisionContext = buildDecisionContext(rows.rows);

  return {
    input: {
      decisionContext,
      generatedAt: options.generatedAt,
      leadId: rows.rows.lead.id,
      metadata: {
        assembler: "DM-001 Decision Context Assembly Adapter",
        recalculation: options.recalculation,
        sourceTables: [
          "crm_leads",
          "crm_tasks",
          "crm_lead_notes",
          "crm_lead_simulations",
          "lead_knowledge_items",
        ],
      },
      organizationId: context.profile.organization_id,
    },
    ok: true,
  };
}

function createEmptyDecisionContext(): Dm001DecisionContext {
  return {
    confidence: {},
    continuity: {},
    engagement: {},
    operationalReadiness: {},
    productFit: {},
    timing: {},
  };
}

async function readDecisionContextEvidenceRows(
  supabase: Dm001DecisionContextAssemblerSupabaseClient,
  leadId: string,
  organizationId: string,
): Promise<
  | { ok: true; rows: Dm001DecisionContextEvidenceRows }
  | { error: string; ok: false; status: number }
> {
  const { data: lead, error: leadError } = await supabase
    .from("crm_leads")
    .select(crmLeadDecisionColumns)
    .eq("id", leadId)
    .maybeSingle();

  if (leadError || !lead?.organization_id) {
    return {
      error: "Lead nao encontrado.",
      ok: false,
      status: 404,
    };
  }

  if (lead.organization_id !== organizationId) {
    return {
      error: "Lead nao encontrado.",
      ok: false,
      status: 404,
    };
  }

  const [tasks, notes, simulations, knowledgeItems] = await Promise.all([
    readList(
      supabase
        .from("crm_tasks")
        .select(crmTaskDecisionColumns)
        .eq("lead_id", leadId)
        .eq("organization_id", organizationId)
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true, nullsFirst: false })
        .limit(20),
      "Nao foi possivel montar o contexto de decisao.",
    ),
    readList(
      supabase
        .from("crm_lead_notes")
        .select(crmLeadNoteDecisionColumns)
        .eq("lead_id", leadId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(20),
      "Nao foi possivel montar o contexto de decisao.",
    ),
    readList(
      supabase
        .from("crm_lead_simulations")
        .select(crmLeadSimulationDecisionColumns)
        .eq("lead_id", leadId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(20),
      "Nao foi possivel montar o contexto de decisao.",
    ),
    readList(
      supabase
        .from("lead_knowledge_items")
        .select(leadKnowledgeDecisionColumns)
        .eq("lead_id", leadId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(20),
      "Nao foi possivel montar o contexto de decisao.",
    ),
  ]);

  if (!tasks.ok) {
    return tasks;
  }

  if (!notes.ok) {
    return notes;
  }

  if (!simulations.ok) {
    return simulations;
  }

  if (!knowledgeItems.ok) {
    return knowledgeItems;
  }

  return {
    ok: true,
    rows: {
      knowledgeItems: knowledgeItems.rows.filter(
        (item) => item.status !== "ARCHIVED",
      ),
      lead,
      notes: notes.rows.filter((note) => !note.deleted_at),
      simulations: simulations.rows.filter(
        (simulation) => !simulation.archived_at,
      ),
      tasks: tasks.rows.filter((task) => task.status !== "canceled"),
    },
  };
}

async function readList<T>(
  query: Dm001AssemblerListQuery<T>,
  errorMessage: string,
): Promise<{ ok: true; rows: T[] } | { error: string; ok: false; status: number }> {
  const { data, error } = await query;

  if (error) {
    return {
      error: errorMessage,
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    rows: data ?? [],
  };
}

function buildDecisionContext(
  rows: Dm001DecisionContextEvidenceRows,
): Dm001DecisionContext {
  const context = createEmptyDecisionContext();
  addLeadEvidence(context, rows.lead);
  addTaskEvidence(context, rows.tasks);
  addNoteEvidence(context, rows.notes);
  addSimulationEvidence(context, rows.simulations);
  addKnowledgeEvidence(context, rows.knowledgeItems);
  addAbsenceEvidence(context, rows);
  return context;
}

function addLeadEvidence(
  context: Dm001DecisionContext,
  lead: CrmLeadDecisionRow,
): void {
  addEvidence(context.engagement, "positive", {
    evidenceId: `crm-lead:${lead.id}:created`,
    occurredAt: lead.created_at ?? undefined,
    source: "crm_leads",
    sourceId: lead.id,
    summary: "Cadastro realizado.",
    metadata: pickMetadata({
      etapa: lead.etapa,
      pipeline: lead.pipeline,
      status: lead.status,
      temperatura: lead.temperatura,
    }),
  });

  if (lead.telefone || lead.email) {
    addEvidence(context.operationalReadiness, "positive", {
      evidenceId: `crm-lead:${lead.id}:contact`,
      occurredAt: lead.updated_at ?? lead.created_at ?? undefined,
      source: "crm_leads",
      sourceId: lead.id,
      summary: "Contato disponivel no cadastro.",
    });
  } else {
    addEvidence(context.operationalReadiness, "blocking", {
      evidenceId: `crm-lead:${lead.id}:missing-contact`,
      occurredAt: lead.updated_at ?? lead.created_at ?? undefined,
      source: "crm_leads",
      sourceId: lead.id,
      summary: "Contato ausente no cadastro.",
    });
  }

  if (lead.produto_interesse) {
    addEvidence(context.productFit, "positive", {
      evidenceId: `crm-lead:${lead.id}:product-interest`,
      occurredAt: lead.updated_at ?? lead.created_at ?? undefined,
      source: "crm_leads",
      sourceId: lead.id,
      summary: "Produto de interesse registrado.",
      metadata: {
        produtoInteresse: lead.produto_interesse,
      },
    });
  }
}

function addTaskEvidence(
  context: Dm001DecisionContext,
  tasks: CrmTaskDecisionRow[],
): void {
  const pendingTasks = tasks.filter((task) => task.status === "pending");

  for (const task of pendingTasks) {
    addEvidence(context.continuity, "positive", {
      evidenceId: `crm-task:${task.id}`,
      occurredAt: task.created_at ?? task.updated_at ?? undefined,
      source: "crm_tasks",
      sourceId: task.id,
      summary: "Proxima acao comercial registrada.",
      metadata: pickMetadata({
        dueDate: task.due_date,
        dueTime: task.due_time,
        taskType: task.task_type,
        title: task.title,
      }),
    });

    addEvidence(context.timing, "positive", {
      evidenceId: `crm-task:${task.id}:timing`,
      occurredAt: task.due_date ?? task.created_at ?? undefined,
      source: "crm_tasks",
      sourceId: task.id,
      summary: "Existe acao planejada para o relacionamento.",
      metadata: pickMetadata({
        dueDate: task.due_date,
        dueTime: task.due_time,
      }),
    });
  }
}

function addNoteEvidence(
  context: Dm001DecisionContext,
  notes: CrmLeadNoteDecisionRow[],
): void {
  for (const note of notes) {
    addEvidence(context.engagement, "positive", {
      evidenceId: `crm-note:${note.id}`,
      occurredAt: note.created_at ?? note.updated_at ?? undefined,
      source: "crm_lead_notes",
      sourceId: note.id,
      summary: "Interacao registrada em nota.",
      metadata: pickMetadata({
        isInternal: note.is_internal,
        noteType: note.note_type,
      }),
    });
  }
}

function addSimulationEvidence(
  context: Dm001DecisionContext,
  simulations: CrmLeadSimulationDecisionRow[],
): void {
  for (const simulation of simulations) {
    addEvidence(context.productFit, "positive", {
      evidenceId: `crm-lead-simulation:${simulation.id}`,
      occurredAt: simulation.created_at ?? simulation.updated_at ?? undefined,
      source: "crm_lead_simulations",
      sourceId: simulation.id,
      summary:
        simulation.simulation_type === "multi_cotas"
          ? "Estudo Multi-Cotas registrado."
          : "Simulacao comercial registrada.",
      metadata: pickMetadata({
        simulationType: simulation.simulation_type,
        status: simulation.status,
        title: simulation.title,
      }),
    });
  }
}

function addKnowledgeEvidence(
  context: Dm001DecisionContext,
  knowledgeItems: LeadKnowledgeDecisionRow[],
): void {
  for (const item of knowledgeItems) {
    addEvidence(context.confidence, "positive", {
      evidenceId: `lead-knowledge-item:${item.id}`,
      occurredAt: item.created_at ?? item.updated_at ?? undefined,
      source: "lead_knowledge_items",
      sourceId: item.id,
      summary: "Conhecimento registrado sobre o lead.",
      metadata: pickMetadata({
        confidence: item.confidence,
        knowledgeType: item.knowledge_type,
        summary: item.summary,
        title: item.title,
      }),
    });
  }
}

function addAbsenceEvidence(
  context: Dm001DecisionContext,
  rows: Dm001DecisionContextEvidenceRows,
): void {
  if (!rows.tasks.some((task) => task.status === "pending")) {
    addEvidence(context.continuity, "missing", {
      evidenceId: `crm-lead:${rows.lead.id}:missing-next-action`,
      source: "crm_tasks",
      summary: "Nao ha proxima acao pendente registrada.",
    });
  }

  if (!rows.notes.length) {
    addEvidence(context.engagement, "missing", {
      evidenceId: `crm-lead:${rows.lead.id}:missing-notes`,
      source: "crm_lead_notes",
      summary: "Nao ha interacao registrada em notas.",
    });
  }

  if (!rows.simulations.length) {
    addEvidence(context.productFit, "missing", {
      evidenceId: `crm-lead:${rows.lead.id}:missing-simulation`,
      source: "crm_lead_simulations",
      summary: "Nao ha simulacao registrada para o lead.",
    });
  }

  if (!rows.knowledgeItems.length) {
    addEvidence(context.confidence, "insufficientKnowledge", {
      evidenceId: `crm-lead:${rows.lead.id}:missing-knowledge`,
      source: "lead_knowledge_items",
      summary: "Conhecimento insuficiente registrado sobre o lead.",
    });
  }
}

function addEvidence(
  group: Dm001EvidenceGroup,
  field: keyof Dm001EvidenceGroup,
  evidence: Dm001EvidenceReference,
): void {
  const current = group[field] ?? [];
  group[field] = [...current, evidence];
}

function pickMetadata(
  metadata: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean> | undefined {
  const entries = Object.entries(metadata).filter(
    (entry): entry is [string, string | number | boolean] =>
      entry[1] !== null && entry[1] !== undefined && entry[1] !== "",
  );

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function createServerDm001AssemblerSupabaseClient(
  accessToken: string,
): Dm001DecisionContextAssemblerSupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase DM-001 assembler environment is not configured.");
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
  }) as unknown as Dm001DecisionContextAssemblerSupabaseClient;
}

async function resolveDm001AssemblerRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Nao foi possivel montar o contexto de decisao.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerDm001AssemblerSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Nao foi possivel montar o contexto de decisao.",
        ok: false as const,
        status: 401,
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, organization_id, role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !isValidAssemblerProfile(profile)) {
      return {
        error: "Nao foi possivel montar o contexto de decisao.",
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
      error: "Nao foi possivel montar o contexto de decisao.",
      ok: false as const,
      status: 500,
    };
  }
}

function isValidAssemblerProfile(
  profile: Dm001AssemblerProfile | null,
): profile is Dm001AssemblerProfile & {
  is_active: true;
  organization_id: string;
} {
  return (
    Boolean(profile?.id) &&
    profile?.is_active === true &&
    typeof profile.organization_id === "string" &&
    Boolean(profile.organization_id.trim())
  );
}
