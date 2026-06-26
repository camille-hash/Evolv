import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import {
  isKnowledgeEvidenceStatus,
  isKnowledgeEvidenceType,
  type CreateKnowledgeEvidenceInput,
  type KnowledgeEvidence,
  type KnowledgeEvidenceStatus,
  type KnowledgeEvidenceType,
} from "../crm-lead-knowledge";

type KnowledgeEvidenceProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type KnowledgeItemRow = {
  id: string;
  lead_id: string;
  organization_id: string;
  status: string | null;
};

type KnowledgeEvidenceRow = {
  archived_at: string | null;
  created_at: string | null;
  created_by: string | null;
  evidence_type: string | null;
  id: string;
  knowledge_item_id: string;
  lead_id: string;
  organization_id: string;
  source: string | null;
  source_reference: string | null;
  status: string | null;
  summary: string | null;
  title: string | null;
  updated_at: string | null;
};

const knowledgeEvidenceColumns = [
  "id",
  "organization_id",
  "lead_id",
  "knowledge_item_id",
  "title",
  "summary",
  "evidence_type",
  "source",
  "source_reference",
  "status",
  "created_by",
  "archived_at",
  "created_at",
  "updated_at",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

type RequestContext = {
  profile: KnowledgeEvidenceProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "sdr";
  };
  supabase: ReturnType<typeof createServerEvidenceSupabaseClient>;
  user: SupabaseUser;
};

export type ListKnowledgeEvidenceResult =
  | { evidence: KnowledgeEvidence[]; ok: true }
  | { error: string; ok: false; status: number };

export type MutateKnowledgeEvidenceResult =
  | { evidence: KnowledgeEvidence; ok: true }
  | { error: string; ok: false; status: number };

export async function listEvidenceByKnowledge(
  accessToken: string | null,
  knowledgeItemId: string,
): Promise<ListKnowledgeEvidenceResult> {
  if (!knowledgeItemId.trim()) {
    return {
      error: "Informe o conhecimento.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveEvidenceRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const itemValidation = await validateKnowledgeItemOrganization(
    context,
    knowledgeItemId,
  );

  if (!itemValidation.ok) {
    return itemValidation;
  }

  const { data, error } = await context.supabase
    .from("knowledge_evidence")
    .select(knowledgeEvidenceColumns)
    .eq("knowledge_item_id", knowledgeItemId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  return {
    evidence: ((data ?? []) as unknown as KnowledgeEvidenceRow[]).map(
      mapKnowledgeEvidenceRow,
    ),
    ok: true,
  };
}

export async function createEvidence(
  accessToken: string | null,
  input: CreateKnowledgeEvidenceInput,
): Promise<MutateKnowledgeEvidenceResult> {
  const title = input.title.trim();
  const summary = normalizeOptionalText(input.summary);
  const source = normalizeOptionalText(input.source) ?? "Manual";
  const sourceReference = normalizeOptionalText(input.sourceReference);

  if (!input.knowledgeItemId.trim()) {
    return {
      error: "Informe o conhecimento.",
      ok: false,
      status: 400,
    };
  }

  if (!title) {
    return {
      error: "Titulo da evidencia e obrigatorio.",
      ok: false,
      status: 400,
    };
  }

  if (!isKnowledgeEvidenceType(input.evidenceType)) {
    return {
      error: "Tipo de evidencia invalido.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveEvidenceRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const itemValidation = await validateKnowledgeItemOrganization(
    context,
    input.knowledgeItemId,
  );

  if (!itemValidation.ok) {
    return itemValidation;
  }

  if (itemValidation.item.status !== "ACTIVE") {
    return {
      error: "Conhecimento nao encontrado.",
      ok: false,
      status: 404,
    };
  }

  const { data, error } = await context.supabase
    .from("knowledge_evidence")
    .insert({
      created_by: context.profile.id,
      evidence_type: input.evidenceType,
      knowledge_item_id: itemValidation.item.id,
      lead_id: itemValidation.item.lead_id,
      organization_id: context.profile.organization_id,
      source,
      source_reference: sourceReference,
      status: "ACTIVE",
      summary,
      title,
    })
    .select(knowledgeEvidenceColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel criar a evidencia.",
      ok: false,
      status: 500,
    };
  }

  return {
    evidence: mapKnowledgeEvidenceRow(data as unknown as KnowledgeEvidenceRow),
    ok: true,
  };
}

export async function archiveEvidence(
  accessToken: string | null,
  evidenceId: string,
): Promise<MutateKnowledgeEvidenceResult> {
  if (!evidenceId.trim()) {
    return {
      error: "Informe a evidencia.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveEvidenceRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const evidenceValidation = await validateEvidenceOrganization(
    context,
    evidenceId,
  );

  if (!evidenceValidation.ok) {
    return evidenceValidation;
  }

  if (evidenceValidation.evidence.status !== "ACTIVE") {
    return {
      error: "Evidencia nao encontrada.",
      ok: false,
      status: 409,
    };
  }

  const { data, error } = await context.supabase
    .from("knowledge_evidence")
    .update({
      archived_at: new Date().toISOString(),
      status: "ARCHIVED",
    })
    .eq("id", evidenceId)
    .eq("organization_id", context.profile.organization_id)
    .eq("status", "ACTIVE")
    .select(knowledgeEvidenceColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel arquivar a evidencia.",
      ok: false,
      status: 500,
    };
  }

  return {
    evidence: mapKnowledgeEvidenceRow(data as unknown as KnowledgeEvidenceRow),
    ok: true,
  };
}

function createServerEvidenceSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase knowledge evidence server environment is not configured.");
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

async function resolveEvidenceRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerEvidenceSupabaseClient(accessToken);
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
      .maybeSingle<KnowledgeEvidenceProfile>();

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

async function validateKnowledgeItemOrganization(
  context: RequestContext,
  knowledgeItemId: string,
) {
  const { data, error } = await context.supabase
    .from("lead_knowledge_items")
    .select("id, organization_id, lead_id, status")
    .eq("id", knowledgeItemId)
    .maybeSingle<KnowledgeItemRow>();

  if (error || !data?.organization_id) {
    return {
      error: "Conhecimento nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Conhecimento nao encontrado.",
      ok: false as const,
      status: 404,
    };
  }

  return {
    item: data,
    ok: true as const,
  };
}

async function validateEvidenceOrganization(
  context: RequestContext,
  evidenceId: string,
) {
  const { data, error } = await context.supabase
    .from("knowledge_evidence")
    .select(knowledgeEvidenceColumns)
    .eq("id", evidenceId)
    .maybeSingle<KnowledgeEvidenceRow>();

  if (error || !data?.organization_id) {
    return {
      error: "Evidencia nao encontrada.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Evidencia nao encontrada.",
      ok: false as const,
      status: 404,
    };
  }

  return {
    evidence: mapKnowledgeEvidenceRow(data),
    ok: true as const,
  };
}

function isValidProfile(
  profile: KnowledgeEvidenceProfile | null,
): profile is RequestContext["profile"] {
  return Boolean(
    profile?.id &&
      profile.organization_id &&
      profile.is_active === true &&
      (profile.role === "admin" || profile.role === "sdr"),
  );
}

function mapKnowledgeEvidenceRow(row: KnowledgeEvidenceRow): KnowledgeEvidence {
  const now = new Date().toISOString();

  return {
    archivedAt: row.archived_at,
    createdAt: row.created_at ?? now,
    createdBy: row.created_by,
    evidenceType: normalizeEvidenceType(row.evidence_type),
    id: row.id,
    knowledgeItemId: row.knowledge_item_id,
    leadId: row.lead_id,
    organizationId: row.organization_id,
    source: row.source ?? "Manual",
    sourceReference: row.source_reference,
    status: normalizeEvidenceStatus(row.status),
    summary: row.summary,
    title: row.title ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? now,
  };
}

function normalizeEvidenceType(
  value: string | null,
): KnowledgeEvidenceType {
  return isKnowledgeEvidenceType(value) ? value : "manual";
}

function normalizeEvidenceStatus(
  value: string | null,
): KnowledgeEvidenceStatus {
  return isKnowledgeEvidenceStatus(value) ? value : "ACTIVE";
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}
