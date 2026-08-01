import { randomUUID } from "node:crypto";
import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import {
  assertCommercialProposalTransition,
  buildCommercialProposalStatusUpdatePayload,
  calculateNextCommercialProposalVersion,
  normalizeCommercialProposalAssembly,
  shouldRequireCommercialProposalSimulationId,
} from "./domain";
import {
  isCommercialProposalSource,
  isCommercialProposalStatus,
  type CommercialProposal,
  type CommercialProposalAssembly,
  type CommercialProposalAuditEventType,
  type CommercialProposalSnapshot,
  type CommercialProposalSource,
  type CommercialProposalStatus,
  type CommercialProposalSummary,
  type CreateCommercialProposalInput,
  type CreateCommercialProposalVersionInput,
} from "./types";

type CommercialProposalProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type OrganizationRow = {
  id: string;
  organization_id: string | null;
};

type CommercialProposalRow = {
  approved_at: string | null;
  approved_by: string | null;
  assembly_day_of_month: number | null;
  created_at: string | null;
  created_by: string | null;
  effective_next_assembly_date: string | null;
  expired_at: string | null;
  id: string;
  lead_id: string;
  metadata: Record<string, unknown> | null;
  organization_id: string;
  original_snapshot: Record<string, unknown> | null;
  presented_at: string | null;
  previous_version_id: string | null;
  proposal_number: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  root_proposal_id: string | null;
  saved_snapshot: Record<string, unknown> | null;
  simulation_id: string | null;
  source_suggestion: string | null;
  status: string | null;
  suggested_next_assembly_date: string | null;
  superseded_at: string | null;
  superseded_by: string | null;
  summary: Record<string, unknown> | null;
  title: string | null;
  updated_at: string | null;
  version: number | null;
};

type RequestContext = {
  profile: CommercialProposalProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerCommercialProposalsSupabaseClient>;
  user: SupabaseUser;
};

type ProposalMutationResult =
  | { ok: true; proposal: CommercialProposal }
  | { error: string; ok: false; status: number };

export type ListCommercialProposalsResult =
  | { ok: true; proposals: CommercialProposal[] }
  | { error: string; ok: false; status: number };

export type GetCommercialProposalResult = ProposalMutationResult;
export type CreateCommercialProposalResult = ProposalMutationResult;

const commercialProposalColumns = [
  "id",
  "organization_id",
  "lead_id",
  "simulation_id",
  "created_by",
  "title",
  "source_suggestion",
  "status",
  "proposal_number",
  "root_proposal_id",
  "previous_version_id",
  "version",
  "presented_at",
  "approved_at",
  "approved_by",
  "rejected_at",
  "rejected_by",
  "expired_at",
  "superseded_at",
  "superseded_by",
  "assembly_day_of_month",
  "suggested_next_assembly_date",
  "effective_next_assembly_date",
  "original_snapshot",
  "saved_snapshot",
  "summary",
  "metadata",
  "created_at",
  "updated_at",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function listCommercialProposalsByLeadId(
  accessToken: string | null,
  leadId: string,
): Promise<ListCommercialProposalsResult> {
  if (!leadId.trim()) {
    return {
      error: "Informe o lead para consultar propostas.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveCommercialProposalRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const { data, error } = await context.supabase
    .from("crm_lead_commercial_proposals")
    .select(commercialProposalColumns)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: "Nao foi possivel carregar as propostas comerciais.",
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    proposals: ((data ?? []) as unknown as CommercialProposalRow[]).map(
      mapCommercialProposalRow,
    ),
  };
}

export async function getCommercialProposalById(
  accessToken: string | null,
  proposalId: string,
): Promise<GetCommercialProposalResult> {
  if (!proposalId.trim()) {
    return {
      error: "Informe a proposta.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveCommercialProposalRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const proposalValidation = await validateProposalOrganization(
    context,
    proposalId,
  );

  if (!proposalValidation.ok) {
    return proposalValidation;
  }

  return {
    ok: true,
    proposal: proposalValidation.proposal,
  };
}

export async function createCommercialProposal(
  accessToken: string | null,
  input: CreateCommercialProposalInput,
): Promise<CreateCommercialProposalResult> {
  const validation = validateCreateCommercialProposalInput(input);

  if (!validation.ok) {
    return validation;
  }

  const context = await resolveCommercialProposalRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, input.leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  if (input.simulationId) {
    const simulationValidation = await validateSimulationOrganization(
      context,
      input.simulationId,
      input.leadId,
    );

    if (!simulationValidation.ok) {
      return simulationValidation;
    }
  }

  const now = new Date();
  const assembly = normalizeCommercialProposalAssembly(input.assembly, now);
  const proposalNumber = createCommercialProposalNumber(now);
  const payload = {
    ...buildCommercialProposalPayload(input, assembly),
    created_by: context.profile.id,
    lead_id: input.leadId,
    organization_id: context.profile.organization_id,
    proposal_number: proposalNumber,
    root_proposal_id: null,
    simulation_id: input.simulationId?.trim() || null,
    status: input.status ?? "generated",
    version: 1,
  };

  const { data, error } = await context.supabase
    .from("crm_lead_commercial_proposals")
    .insert(payload)
    .select(commercialProposalColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel salvar a proposta comercial.",
      ok: false,
      status: 500,
    };
  }

  const proposal = mapCommercialProposalRow(
    data as unknown as CommercialProposalRow,
  );

  await insertCommercialProposalAuditEvent(context, proposal, "created", {
    status: proposal.status,
  });

  return {
    ok: true,
    proposal,
  };
}

export async function createCommercialProposalVersion(
  accessToken: string | null,
  input: CreateCommercialProposalVersionInput,
): Promise<CreateCommercialProposalResult> {
  const context = await resolveCommercialProposalRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const previousValidation = await validateProposalOrganization(
    context,
    input.previousProposalId,
  );

  if (!previousValidation.ok) {
    return previousValidation;
  }

  const previousProposal = previousValidation.proposal;
  const validation = validateCreateCommercialProposalInput({
    ...input,
    leadId: previousProposal.leadId,
    originalSnapshot: input.originalSnapshot,
    savedSnapshot: input.savedSnapshot,
    sourceSuggestion: previousProposal.sourceSuggestion,
  });

  if (!validation.ok) {
    return validation;
  }

  const version = await resolveNextCommercialProposalVersion(
    context,
    previousProposal.proposalNumber,
  );
  const now = new Date();
  const assembly = normalizeCommercialProposalAssembly(input.assembly, now);
  const payload = {
    ...buildCommercialProposalPayload(
      {
        ...input,
        leadId: previousProposal.leadId,
        sourceSuggestion: previousProposal.sourceSuggestion,
      },
      assembly,
    ),
    created_by: context.profile.id,
    lead_id: previousProposal.leadId,
    organization_id: context.profile.organization_id,
    previous_version_id: previousProposal.id,
    proposal_number: previousProposal.proposalNumber,
    root_proposal_id: previousProposal.rootProposalId ?? previousProposal.id,
    simulation_id: previousProposal.simulationId,
    status: input.status ?? "generated",
    version,
  };

  const { data, error } = await context.supabase
    .from("crm_lead_commercial_proposals")
    .insert(payload)
    .select(commercialProposalColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel criar uma nova versao da proposta.",
      ok: false,
      status: 500,
    };
  }

  const proposal = mapCommercialProposalRow(
    data as unknown as CommercialProposalRow,
  );

  await insertCommercialProposalAuditEvent(context, proposal, "version_created", {
    previousProposalId: previousProposal.id,
    previousVersion: previousProposal.version,
  });

  return {
    ok: true,
    proposal,
  };
}

export async function markCommercialProposalAsPresented(
  accessToken: string | null,
  proposalId: string,
): Promise<ProposalMutationResult> {
  return updateCommercialProposalStatus(accessToken, proposalId, "presented");
}

export async function approveCommercialProposal(
  accessToken: string | null,
  proposalId: string,
): Promise<ProposalMutationResult> {
  const context = await resolveCommercialProposalRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const { data, error } = await context.supabase.rpc(
    "approve_commercial_proposal_transaction",
    {
      p_approved_by: context.profile.id,
      p_organization_id: context.profile.organization_id,
      p_proposal_id: proposalId,
    },
  );

  if (error) {
    return {
      error: "Nao foi possivel aprovar a proposta comercial.",
      ok: false,
      status: 409,
    };
  }

  return {
    ok: true,
    proposal: mapCommercialProposalRow(data as unknown as CommercialProposalRow),
  };
}

export async function rejectCommercialProposal(
  accessToken: string | null,
  proposalId: string,
): Promise<ProposalMutationResult> {
  return updateCommercialProposalStatus(accessToken, proposalId, "rejected");
}

export async function expireCommercialProposal(
  accessToken: string | null,
  proposalId: string,
): Promise<ProposalMutationResult> {
  return updateCommercialProposalStatus(accessToken, proposalId, "expired");
}

export async function supersedeCommercialProposal(
  accessToken: string | null,
  proposalId: string,
): Promise<ProposalMutationResult> {
  return updateCommercialProposalStatus(accessToken, proposalId, "superseded");
}

async function updateCommercialProposalStatus(
  accessToken: string | null,
  proposalId: string,
  nextStatus: CommercialProposalStatus,
): Promise<ProposalMutationResult> {
  const context = await resolveCommercialProposalRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const proposalValidation = await validateProposalOrganization(
    context,
    proposalId,
  );

  if (!proposalValidation.ok) {
    return proposalValidation;
  }

  try {
    assertCommercialProposalTransition(
      proposalValidation.proposal.status,
      nextStatus,
    );
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Transicao de proposta invalida.",
      ok: false,
      status: 409,
    };
  }

  const updatePayload = buildCommercialProposalStatusUpdatePayload({
    actorId: context.profile.id,
    nextStatus,
    occurredAt: new Date().toISOString(),
  });

  const { data, error } = await context.supabase
    .from("crm_lead_commercial_proposals")
    .update(updatePayload)
    .eq("id", proposalId)
    .eq("organization_id", context.profile.organization_id)
    .select(commercialProposalColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel atualizar a proposta comercial.",
      ok: false,
      status: 500,
    };
  }

  const proposal = mapCommercialProposalRow(
    data as unknown as CommercialProposalRow,
  );

  await insertCommercialProposalAuditEvent(
    context,
    proposal,
    nextStatus as CommercialProposalAuditEventType,
    {
      previousStatus: proposalValidation.proposal.status,
      status: proposal.status,
    },
  );

  return {
    ok: true,
    proposal,
  };
}

function createServerCommercialProposalsSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase commercial proposals server environment is not configured.",
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

async function resolveCommercialProposalRequestContext(
  accessToken: string | null,
) {
  if (!accessToken) {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerCommercialProposalsSupabaseClient(accessToken);
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
      .maybeSingle<CommercialProposalProfile>();

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
    .maybeSingle<OrganizationRow>();

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
  leadId: string,
) {
  const { data, error } = await context.supabase
    .from("crm_lead_simulations")
    .select("id, organization_id, lead_id")
    .eq("id", simulationId)
    .maybeSingle<OrganizationRow & { lead_id: string | null }>();

  if (
    error ||
    !data?.organization_id ||
    data.organization_id !== context.profile.organization_id ||
    data.lead_id !== leadId
  ) {
    return {
      error: "Simulacao da proposta nao encontrada.",
      ok: false as const,
      status: 404,
    };
  }

  return {
    ok: true as const,
    simulation: data,
  };
}

async function validateProposalOrganization(
  context: RequestContext,
  proposalId: string,
) {
  const { data, error } = await context.supabase
    .from("crm_lead_commercial_proposals")
    .select(commercialProposalColumns)
    .eq("id", proposalId)
    .maybeSingle<CommercialProposalRow>();

  if (error || !data?.organization_id) {
    return {
      error: "Proposta nao encontrada.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Proposta nao encontrada.",
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
    proposal: mapCommercialProposalRow(data),
  };
}

async function resolveNextCommercialProposalVersion(
  context: RequestContext,
  proposalNumber: string,
) {
  const { data } = await context.supabase
    .from("crm_lead_commercial_proposals")
    .select("version")
    .eq("organization_id", context.profile.organization_id)
    .eq("proposal_number", proposalNumber)
    .order("version", { ascending: false })
    .limit(1);

  return calculateNextCommercialProposalVersion(
    Array.isArray(data)
      ? data
          .map((row) => row.version)
          .filter((version): version is number => typeof version === "number")
      : [],
  );
}

async function insertCommercialProposalAuditEvent(
  context: RequestContext,
  proposal: CommercialProposal,
  eventType: CommercialProposalAuditEventType,
  metadata: Record<string, unknown>,
) {
  await context.supabase.from("commercial_proposal_audit_events").insert({
    created_by: context.profile.id,
    event_type: eventType,
    lead_id: proposal.leadId,
    metadata,
    organization_id: context.profile.organization_id,
    proposal_id: proposal.id,
    proposal_number: proposal.proposalNumber,
    proposal_version: proposal.version,
    simulation_id: proposal.simulationId,
  });
}

function validateCreateCommercialProposalInput(
  input: CreateCommercialProposalInput,
) {
  const title = input.title.trim();

  if (!input.leadId.trim()) {
    return {
      error: "Informe o lead da proposta.",
      ok: false as const,
      status: 400,
    };
  }

  if (!title) {
    return {
      error: "Informe o titulo da proposta.",
      ok: false as const,
      status: 400,
    };
  }

  if (!isCommercialProposalSource(input.sourceSuggestion)) {
    return {
      error: "Origem da proposta invalida.",
      ok: false as const,
      status: 400,
    };
  }

  if (
    !isPlainObject(input.originalSnapshot) ||
    !isPlainObject(input.savedSnapshot)
  ) {
    return {
      error: "Snapshots obrigatorios da proposta invalidos.",
      ok: false as const,
      status: 400,
    };
  }

  if (
    input.status &&
    input.status !== "draft" &&
    input.status !== "generated" &&
    input.status !== "saved"
  ) {
    return {
      error: "Status inicial da proposta invalido.",
      ok: false as const,
      status: 400,
    };
  }

  if (
    shouldRequireCommercialProposalSimulationId({
      metadata: input.metadata,
      status: input.status,
    }) &&
    !input.simulationId?.trim()
  ) {
    return {
      error: "Propostas criadas pelo simulador exigem uma simulacao vinculada.",
      ok: false as const,
      status: 400,
    };
  }

  return {
    ok: true as const,
  };
}

function buildCommercialProposalPayload(
  input: CreateCommercialProposalInput,
  assembly: CommercialProposalAssembly,
) {
  return {
    assembly_day_of_month: assembly.dayOfMonth,
    effective_next_assembly_date: assembly.effectiveNextAssemblyDate,
    metadata: normalizeOptionalSnapshot(input.metadata),
    original_snapshot: input.originalSnapshot,
    saved_snapshot: input.savedSnapshot,
    source_suggestion: input.sourceSuggestion,
    suggested_next_assembly_date: assembly.suggestedNextAssemblyDate,
    summary: normalizeOptionalSummary(input.summary),
    title: input.title.trim(),
  };
}

function createCommercialProposalNumber(referenceDate: Date) {
  const datePart = referenceDate.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = randomUUID().slice(0, 8).toUpperCase();
  return `PROP-${datePart}-${randomPart}`;
}

function isValidProfile(
  profile: CommercialProposalProfile | null,
): profile is CommercialProposalProfile & {
  is_active: true;
  organization_id: string;
  role: "admin" | "master" | "sdr";
} {
  return Boolean(
    profile?.id &&
      profile.organization_id &&
      profile.is_active === true &&
      (profile.role === "admin" ||
        profile.role === "master" ||
        profile.role === "sdr"),
  );
}

function mapCommercialProposalRow(
  row: CommercialProposalRow,
): CommercialProposal {
  const now = new Date().toISOString();

  return {
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    assembly: {
      dayOfMonth: row.assembly_day_of_month,
      effectiveNextAssemblyDate: row.effective_next_assembly_date,
      source: normalizeAssemblySource(row),
      suggestedNextAssemblyDate: row.suggested_next_assembly_date,
    },
    createdAt: row.created_at ?? now,
    createdBy: row.created_by,
    expiredAt: row.expired_at,
    id: row.id,
    leadId: row.lead_id,
    metadata: normalizeSnapshot(row.metadata),
    organizationId: row.organization_id,
    originalSnapshot: normalizeSnapshot(row.original_snapshot),
    previousVersionId: row.previous_version_id,
    proposalNumber: row.proposal_number ?? `LEGACY-${row.id}`,
    rejectedAt: row.rejected_at,
    rejectedBy: row.rejected_by,
    rootProposalId: row.root_proposal_id,
    savedSnapshot: normalizeSnapshot(row.saved_snapshot),
    simulationId: row.simulation_id,
    sourceSuggestion: normalizeProposalSource(row.source_suggestion),
    status: normalizeProposalStatus(row.status),
    summary: normalizeSnapshot(row.summary),
    supersededAt: row.superseded_at,
    supersededBy: row.superseded_by,
    title: row.title ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? now,
    version: row.version ?? 1,
  };
}

function normalizeAssemblySource(row: CommercialProposalRow) {
  if (row.effective_next_assembly_date && row.suggested_next_assembly_date) {
    return row.effective_next_assembly_date === row.suggested_next_assembly_date
      ? "calculated"
      : "manual";
  }

  return null;
}

function normalizeProposalSource(
  value: string | null,
): CommercialProposalSource {
  return isCommercialProposalSource(value) ? value : "recommended";
}

function normalizeProposalStatus(
  value: string | null,
): CommercialProposalStatus {
  return isCommercialProposalStatus(value) ? value : "saved";
}

function normalizeSnapshot(
  value: Record<string, unknown> | null,
): CommercialProposalSnapshot {
  return isPlainObject(value) ? value : {};
}

function normalizeOptionalSnapshot(value: unknown) {
  return isPlainObject(value) ? value : {};
}

function normalizeOptionalSummary(value: unknown): CommercialProposalSummary {
  return isPlainObject(value) ? value : {};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}
