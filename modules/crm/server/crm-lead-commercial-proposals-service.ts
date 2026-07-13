import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import {
  isCrmLeadCommercialProposalSource,
  isCrmLeadCommercialProposalStatus,
  type CreateCrmLeadCommercialProposalInput,
  type CrmLeadCommercialProposal,
  type CrmLeadCommercialProposalSnapshot,
  type CrmLeadCommercialProposalSource,
  type CrmLeadCommercialProposalStatus,
  type CrmLeadCommercialProposalSummary,
} from "../crm-lead-commercial-proposals";

type CrmLeadCommercialProposalsProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type CrmLeadCommercialProposalsLeadRow = {
  id: string;
  organization_id: string | null;
};

type CrmLeadCommercialProposalRow = {
  created_at: string | null;
  created_by: string | null;
  id: string;
  lead_id: string;
  metadata: Record<string, unknown> | null;
  organization_id: string;
  original_snapshot: Record<string, unknown> | null;
  saved_snapshot: Record<string, unknown> | null;
  source_suggestion: string | null;
  status: string | null;
  summary: Record<string, unknown> | null;
  title: string | null;
  updated_at: string | null;
};

type RequestContext = {
  profile: CrmLeadCommercialProposalsProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "sdr";
  };
  supabase: ReturnType<typeof createServerCommercialProposalsSupabaseClient>;
  user: SupabaseUser;
};

export type ListLeadCommercialProposalsResult =
  | { ok: true; proposals: CrmLeadCommercialProposal[] }
  | { error: string; ok: false; status: number };

export type GetLeadCommercialProposalResult =
  | { ok: true; proposal: CrmLeadCommercialProposal }
  | { error: string; ok: false; status: number };

export type CreateLeadCommercialProposalResult =
  | { ok: true; proposal: CrmLeadCommercialProposal }
  | { error: string; ok: false; status: number };

const commercialProposalColumns = [
  "id",
  "organization_id",
  "lead_id",
  "created_by",
  "title",
  "source_suggestion",
  "status",
  "original_snapshot",
  "saved_snapshot",
  "summary",
  "metadata",
  "created_at",
  "updated_at",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function listLeadCommercialProposalsByLeadId(
  accessToken: string | null,
  leadId: string,
): Promise<ListLeadCommercialProposalsResult> {
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
    proposals: ((data ?? []) as unknown as CrmLeadCommercialProposalRow[]).map(
      mapCommercialProposalRow,
    ),
  };
}

export async function getLeadCommercialProposalById(
  accessToken: string | null,
  proposalId: string,
): Promise<GetLeadCommercialProposalResult> {
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

export async function createLeadCommercialProposal(
  accessToken: string | null,
  input: CreateCrmLeadCommercialProposalInput,
): Promise<CreateLeadCommercialProposalResult> {
  const title = input.title.trim();

  if (!input.leadId.trim()) {
    return {
      error: "Informe o lead da proposta.",
      ok: false,
      status: 400,
    };
  }

  if (!title) {
    return {
      error: "Informe o titulo da proposta.",
      ok: false,
      status: 400,
    };
  }

  if (!isCrmLeadCommercialProposalSource(input.sourceSuggestion)) {
    return {
      error: "Origem da proposta invalida.",
      ok: false,
      status: 400,
    };
  }

  if (
    !isPlainObject(input.originalSnapshot) ||
    !isPlainObject(input.savedSnapshot)
  ) {
    return {
      error: "Snapshots obrigatorios da proposta invalidos.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveCommercialProposalRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, input.leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const payload = {
    created_by: context.profile.id,
    lead_id: input.leadId,
    metadata: normalizeOptionalSnapshot(input.metadata),
    organization_id: context.profile.organization_id,
    original_snapshot: input.originalSnapshot,
    saved_snapshot: input.savedSnapshot,
    source_suggestion: input.sourceSuggestion,
    status: "saved",
    summary: normalizeOptionalSummary(input.summary),
    title,
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

  return {
    ok: true,
    proposal: mapCommercialProposalRow(
      data as unknown as CrmLeadCommercialProposalRow,
    ),
  };
}

function createServerCommercialProposalsSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase CRM commercial proposals server environment is not configured.",
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
      .maybeSingle<CrmLeadCommercialProposalsProfile>();

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
    .maybeSingle<CrmLeadCommercialProposalsLeadRow>();

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

async function validateProposalOrganization(
  context: RequestContext,
  proposalId: string,
) {
  const { data, error } = await context.supabase
    .from("crm_lead_commercial_proposals")
    .select(commercialProposalColumns)
    .eq("id", proposalId)
    .maybeSingle<CrmLeadCommercialProposalRow>();

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

function isValidProfile(
  profile: CrmLeadCommercialProposalsProfile | null,
): profile is CrmLeadCommercialProposalsProfile & {
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

function mapCommercialProposalRow(
  row: CrmLeadCommercialProposalRow,
): CrmLeadCommercialProposal {
  const now = new Date().toISOString();

  return {
    createdAt: row.created_at ?? now,
    createdBy: row.created_by,
    id: row.id,
    leadId: row.lead_id,
    metadata: normalizeSnapshot(row.metadata),
    organizationId: row.organization_id,
    originalSnapshot: normalizeSnapshot(row.original_snapshot),
    savedSnapshot: normalizeSnapshot(row.saved_snapshot),
    sourceSuggestion: normalizeProposalSource(row.source_suggestion),
    status: normalizeProposalStatus(row.status),
    summary: normalizeSnapshot(row.summary),
    title: row.title ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? now,
  };
}

function normalizeProposalSource(
  value: string | null,
): CrmLeadCommercialProposalSource {
  return isCrmLeadCommercialProposalSource(value) ? value : "recommended";
}

function normalizeProposalStatus(
  value: string | null,
): CrmLeadCommercialProposalStatus {
  return isCrmLeadCommercialProposalStatus(value) ? value : "saved";
}

function normalizeSnapshot(
  value: Record<string, unknown> | null,
): CrmLeadCommercialProposalSnapshot {
  return isPlainObject(value) ? value : {};
}

function normalizeOptionalSnapshot(value: unknown) {
  return isPlainObject(value) ? value : {};
}

function normalizeOptionalSummary(
  value: unknown,
): CrmLeadCommercialProposalSummary {
  return isPlainObject(value) ? value : {};
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}
