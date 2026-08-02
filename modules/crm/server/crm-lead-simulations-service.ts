import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { triggerDm001RecalculationAfterCrmEvent } from "../../decision-models/dm-001/event-hooks";
import {
  attachPublicationToStrategySnapshot,
  assertValidPublicationSnapshot,
  isReferenceCapitalStrategySnapshot,
  type PatrimonialPublication,
} from "../../patrimonial-strategy";
import {
  isCrmLeadSimulationSource,
  isCrmLeadSimulationStatus,
  isCrmLeadSimulationType,
  type CreateCrmLeadSimulationInput,
  type CrmLeadSimulation,
  type CrmLeadSimulationPersistentStatus,
  type CrmLeadSimulationSnapshot,
  type CrmLeadSimulationSource,
  type CrmLeadSimulationSummary,
  type CrmLeadSimulationType,
  type LeadSimulationCommercialEvent,
} from "../crm-lead-simulations";

type CrmLeadSimulationsProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type CrmLeadSimulationsLeadRow = {
  id: string;
  organization_id: string | null;
};

type CrmLeadSimulationRow = {
  archived_at: string | null;
  archived_by: string | null;
  calculation_snapshot: Record<string, unknown> | null;
  commercial_credit: number | string | null;
  contemplation_month: number | null;
  created_at: string | null;
  created_by: string | null;
  estimated_gain: number | string | null;
  estimated_roi: number | string | null;
  estimated_sale_value: number | string | null;
  id: string;
  incc_rate: number | string | null;
  lead_id: string;
  monthly_payment: number | string | null;
  organization_id: string;
  pdf_generated_at: string | null;
  pdf_generated_by: string | null;
  pdf_sent_at: string | null;
  pdf_sent_by: string | null;
  post_contemplation_payment: number | string | null;
  presentation_snapshot: Record<string, unknown> | null;
  presented_at: string | null;
  presented_by: string | null;
  proposal_generated_at: string | null;
  proposal_generated_by: string | null;
  quota_count: number | null;
  simulation_type: string | null;
  source: string | null;
  status: string | null;
  summary: Record<string, unknown> | null;
  technical_input: Record<string, unknown> | null;
  title: string | null;
  total_credit: number | string | null;
  updated_at: string | null;
  updated_credit: number | string | null;
};

type RequestContext = {
  profile: CrmLeadSimulationsProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "sdr";
  };
  supabase: ReturnType<typeof createServerLeadSimulationsSupabaseClient>;
  user: SupabaseUser;
};

type SimulationSummaryColumns = {
  commercial_credit: number | null;
  contemplation_month: number | null;
  estimated_gain: number | null;
  estimated_roi: number | null;
  estimated_sale_value: number | null;
  incc_rate: number | null;
  monthly_payment: number | null;
  post_contemplation_payment: number | null;
  quota_count: number | null;
  total_credit: number | null;
  updated_credit: number | null;
};

export type ListLeadSimulationsResult =
  | { ok: true; simulations: CrmLeadSimulation[] }
  | { error: string; ok: false; status: number };

export type GetLeadSimulationResult =
  | { ok: true; simulation: CrmLeadSimulation }
  | { error: string; ok: false; status: number };

export type MutateLeadSimulationResult =
  | { ok: true; simulation: CrmLeadSimulation }
  | { error: string; ok: false; status: number };

const crmLeadSimulationColumns = [
  "id",
  "organization_id",
  "lead_id",
  "created_by",
  "created_at",
  "updated_at",
  "simulation_type",
  "title",
  "status",
  "source",
  "technical_input",
  "calculation_snapshot",
  "presentation_snapshot",
  "summary",
  "presented_at",
  "presented_by",
  "proposal_generated_at",
  "proposal_generated_by",
  "pdf_generated_at",
  "pdf_generated_by",
  "pdf_sent_at",
  "pdf_sent_by",
  "archived_at",
  "archived_by",
  "total_credit",
  "updated_credit",
  "commercial_credit",
  "monthly_payment",
  "post_contemplation_payment",
  "contemplation_month",
  "quota_count",
  "incc_rate",
  "estimated_roi",
  "estimated_gain",
  "estimated_sale_value",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function listLeadSimulationsByLeadId(
  accessToken: string | null,
  leadId: string,
): Promise<ListLeadSimulationsResult> {
  if (!leadId.trim()) {
    return {
      error: "Informe o lead para consultar simulacoes.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveLeadSimulationRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const { data, error } = await context.supabase
    .from("crm_lead_simulations")
    .select(crmLeadSimulationColumns)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    simulations: ((data ?? []) as unknown as CrmLeadSimulationRow[]).map(
      mapCrmLeadSimulationRow,
    ),
  };
}

export async function getLeadSimulationById(
  accessToken: string | null,
  simulationId: string,
): Promise<GetLeadSimulationResult> {
  if (!simulationId.trim()) {
    return {
      error: "Informe a simulacao.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveLeadSimulationRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const simulationValidation = await validateSimulationOrganization(
    context,
    simulationId,
  );

  if (!simulationValidation.ok) {
    return simulationValidation;
  }

  return {
    ok: true,
    simulation: simulationValidation.simulation,
  };
}

export async function createLeadSimulation(
  accessToken: string | null,
  input: CreateCrmLeadSimulationInput,
): Promise<MutateLeadSimulationResult> {
  const title = input.title.trim();
  const source = input.source ?? "api";

  if (!input.leadId.trim()) {
    return {
      error: "Informe o lead da simulacao.",
      ok: false,
      status: 400,
    };
  }

  if (!title) {
    return {
      error: "Informe o titulo da simulacao.",
      ok: false,
      status: 400,
    };
  }

  if (!isCrmLeadSimulationType(input.simulationType)) {
    return {
      error: "Tipo de simulacao invalido.",
      ok: false,
      status: 400,
    };
  }

  if (!isCrmLeadSimulationSource(source)) {
    return {
      error: "Origem da simulacao invalida.",
      ok: false,
      status: 400,
    };
  }

  if (
    !isNonEmptyPlainObject(input.technicalInput) ||
    !isNonEmptyPlainObject(input.calculationSnapshot) ||
    !isNonEmptyPlainObject(input.presentationSnapshot)
  ) {
    return {
      error: "Snapshots obrigatorios da simulacao invalidos.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveLeadSimulationRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, input.leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const summary = normalizeSummary(input.summary);

  if (!summary.ok) {
    return summary;
  }

  const summaryColumns = deriveSummaryColumns(summary.summary);
  const payload = {
    calculation_snapshot: input.calculationSnapshot,
    created_by: context.profile.id,
    lead_id: input.leadId,
    organization_id: context.profile.organization_id,
    presentation_snapshot: input.presentationSnapshot,
    simulation_type: input.simulationType,
    source,
    status: "draft",
    summary: summary.summary,
    technical_input: input.technicalInput,
    title,
    ...summaryColumns,
  };

  const { data, error } = await context.supabase
    .from("crm_lead_simulations")
    .insert(payload)
    .select(crmLeadSimulationColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel criar a simulacao.",
      ok: false,
      status: 500,
    };
  }

  const simulation = mapCrmLeadSimulationRow(data as unknown as CrmLeadSimulationRow);
  await triggerDm001RecalculationAfterCrmEvent({
    accessToken,
    leadId: simulation.leadId,
    reason: "simulation_created",
  });

  return {
    ok: true,
    simulation,
  };
}

export async function markLeadSimulationCommercialEvent(
  accessToken: string | null,
  simulationId: string,
  event: LeadSimulationCommercialEvent,
): Promise<MutateLeadSimulationResult> {
  if (!simulationId.trim()) {
    return {
      error: "Informe a simulacao.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveLeadSimulationRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const simulationValidation = await validateSimulationOrganization(
    context,
    simulationId,
  );

  if (!simulationValidation.ok) {
    return simulationValidation;
  }

  const payload = createCommercialEventPayload(event, context.profile.id);

  const { data, error } = await context.supabase
    .from("crm_lead_simulations")
    .update(payload)
    .eq("id", simulationId)
    .eq("organization_id", context.profile.organization_id)
    .select(crmLeadSimulationColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel atualizar a simulacao.",
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    simulation: mapCrmLeadSimulationRow(data as unknown as CrmLeadSimulationRow),
  };
}

export async function saveLeadSimulationPatrimonialPublication(
  accessToken: string | null,
  input: {
    publication: PatrimonialPublication;
    simulationId: string;
  },
): Promise<MutateLeadSimulationResult> {
  if (!input.simulationId.trim()) {
    return {
      error: "Informe a estrategia para salvar a publicacao.",
      ok: false,
      status: 400,
    };
  }

  try {
    assertValidPublicationSnapshot(input.publication);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Publicacao invalida para esta estrategia.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveLeadSimulationRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const simulationValidation = await validateSimulationOrganization(
    context,
    input.simulationId,
  );

  if (!simulationValidation.ok) {
    return simulationValidation;
  }

  const simulation = simulationValidation.simulation;

  if (!isReferenceCapitalStrategySnapshot(simulation.calculationSnapshot)) {
    return {
      error: "A simulacao informada nao e uma Estrategia Patrimonial publicavel.",
      ok: false,
      status: 400,
    };
  }

  const presentationSnapshot = attachPublicationToStrategySnapshot({
    publication: input.publication,
    strategySnapshot: simulation.presentationSnapshot,
  });

  const { data, error } = await context.supabase
    .from("crm_lead_simulations")
    .update({
      presentation_snapshot: presentationSnapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.simulationId)
    .eq("organization_id", context.profile.organization_id)
    .select(crmLeadSimulationColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel salvar a publicacao da estrategia.",
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    simulation: mapCrmLeadSimulationRow(data as unknown as CrmLeadSimulationRow),
  };
}

function createServerLeadSimulationsSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase CRM lead simulations server environment is not configured.",
    );
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

async function resolveLeadSimulationRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerLeadSimulationsSupabaseClient(accessToken);
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
      .select("id, organization_id, role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle<CrmLeadSimulationsProfile>();

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
    .maybeSingle<CrmLeadSimulationsLeadRow>();

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

async function validateSimulationOrganization(
  context: RequestContext,
  simulationId: string,
) {
  const { data, error } = await context.supabase
    .from("crm_lead_simulations")
    .select(crmLeadSimulationColumns)
    .eq("id", simulationId)
    .maybeSingle<CrmLeadSimulationRow>();

  if (error || !data?.organization_id) {
    return {
      error: "Simulacao nao encontrada.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Simulacao nao encontrada.",
      ok: false as const,
      status: 404,
    };
  }

  const leadValidation = await validateLeadOrganization(context, data.lead_id);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  return {
    ok: true as const,
    simulation: mapCrmLeadSimulationRow(data),
  };
}

function isValidProfile(
  profile: CrmLeadSimulationsProfile | null,
): profile is CrmLeadSimulationsProfile & {
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

function mapCrmLeadSimulationRow(row: CrmLeadSimulationRow): CrmLeadSimulation {
  const now = new Date().toISOString();
  const summary = normalizeSnapshot(row.summary);

  return {
    archivedAt: row.archived_at,
    archivedBy: row.archived_by,
    calculationSnapshot: normalizeSnapshot(row.calculation_snapshot),
    commercialCredit: normalizeNumber(row.commercial_credit),
    contemplationMonth: row.contemplation_month,
    createdAt: row.created_at ?? now,
    createdBy: row.created_by,
    estimatedGain: normalizeNumber(row.estimated_gain),
    estimatedRoi: normalizeNumber(row.estimated_roi),
    estimatedSaleValue: normalizeNumber(row.estimated_sale_value),
    id: row.id,
    inccRate: normalizeNumber(row.incc_rate),
    leadId: row.lead_id,
    monthlyPayment: normalizeNumber(row.monthly_payment),
    organizationId: row.organization_id,
    pdfGeneratedAt: row.pdf_generated_at,
    pdfGeneratedBy: row.pdf_generated_by,
    pdfSentAt: row.pdf_sent_at,
    pdfSentBy: row.pdf_sent_by,
    postContemplationPayment: normalizeNumber(row.post_contemplation_payment),
    presentationSnapshot: normalizeSnapshot(row.presentation_snapshot),
    presentedAt: row.presented_at,
    presentedBy: row.presented_by,
    proposalGeneratedAt: row.proposal_generated_at,
    proposalGeneratedBy: row.proposal_generated_by,
    quotaCount: row.quota_count,
    simulationType: normalizeSimulationType(row.simulation_type),
    source: normalizeSimulationSource(row.source),
    status: normalizeSimulationStatus(row.status),
    summary,
    technicalInput: normalizeSnapshot(row.technical_input),
    title: row.title ?? "",
    totalCredit: normalizeNumber(row.total_credit),
    updatedAt: row.updated_at ?? row.created_at ?? now,
    updatedCredit: normalizeNumber(row.updated_credit),
  };
}

function normalizeSimulationType(
  value: string | null,
): CrmLeadSimulationType {
  return isCrmLeadSimulationType(value) ? value : "commercial";
}

function normalizeSimulationSource(
  value: string | null,
): CrmLeadSimulationSource {
  return isCrmLeadSimulationSource(value) ? value : "api";
}

function normalizeSimulationStatus(
  value: string | null,
): CrmLeadSimulationPersistentStatus {
  return isCrmLeadSimulationStatus(value) ? value : "draft";
}

function normalizeSnapshot(
  value: Record<string, unknown> | null,
): CrmLeadSimulationSnapshot {
  return isPlainObject(value) ? value : {};
}

function normalizeSummary(value: unknown) {
  if (value === undefined || value === null) {
    return {
      ok: true as const,
      summary: {},
    };
  }

  if (!isPlainObject(value)) {
    return {
      error: "Resumo da simulacao invalido.",
      ok: false as const,
      status: 400,
    };
  }

  return {
    ok: true as const,
    summary: value as CrmLeadSimulationSummary,
  };
}

function deriveSummaryColumns(
  summary: CrmLeadSimulationSummary,
): SimulationSummaryColumns {
  return {
    commercial_credit: normalizeSummaryNumber(summary.commercialCredit),
    contemplation_month: normalizeSummaryInteger(summary.contemplationMonth),
    estimated_gain: normalizeSummaryNumber(summary.estimatedGain),
    estimated_roi: normalizeSummaryNumber(summary.estimatedRoi),
    estimated_sale_value: normalizeSummaryNumber(summary.estimatedSaleValue),
    incc_rate: normalizeSummaryNumber(summary.inccRate),
    monthly_payment: normalizeSummaryNumber(summary.monthlyPayment),
    post_contemplation_payment: normalizeSummaryNumber(
      summary.postContemplationPayment,
    ),
    quota_count: normalizeSummaryInteger(summary.quotaCount),
    total_credit: normalizeSummaryNumber(summary.totalCredit),
    updated_credit: normalizeSummaryNumber(summary.updatedCredit),
  };
}

function normalizeSummaryNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
}

function normalizeSummaryInteger(value: unknown) {
  const normalized = normalizeSummaryNumber(value);

  if (normalized === null) {
    return null;
  }

  return Number.isInteger(normalized) ? normalized : null;
}

function normalizeNumber(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isNonEmptyPlainObject(
  value: unknown,
): value is CrmLeadSimulationSnapshot {
  return isPlainObject(value) && Object.keys(value).length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function createCommercialEventPayload(
  event: LeadSimulationCommercialEvent,
  profileId: string,
) {
  const timestamp = new Date().toISOString();

  if (event === "presented") {
    return {
      presented_at: timestamp,
      presented_by: profileId,
      status: "presented",
    };
  }

  if (event === "proposal_generated") {
    return {
      proposal_generated_at: timestamp,
      proposal_generated_by: profileId,
      status: "proposal_generated",
    };
  }

  if (event === "pdf_generated") {
    return {
      pdf_generated_at: timestamp,
      pdf_generated_by: profileId,
      status: "pdf_generated",
    };
  }

  if (event === "pdf_sent") {
    return {
      pdf_generated_at: timestamp,
      pdf_generated_by: profileId,
      pdf_sent_at: timestamp,
      pdf_sent_by: profileId,
      status: "pdf_sent",
    };
  }

  return {
    archived_at: timestamp,
    archived_by: profileId,
    status: "archived",
  };
}
