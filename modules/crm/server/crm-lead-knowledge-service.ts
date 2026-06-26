import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import {
  isCrmLeadKnowledgeCategory,
  isCrmLeadKnowledgeConfidence,
  isCrmLeadKnowledgeStatus,
  isCrmLeadKnowledgeType,
  type CreateCrmLeadKnowledgeItemInput,
  type CrmLeadKnowledgeCategory,
  type CrmLeadKnowledgeConfidence,
  type CrmLeadKnowledgeItem,
  type CrmLeadKnowledgeStatus,
  type CrmLeadKnowledgeType,
} from "../crm-lead-knowledge";

type CrmLeadKnowledgeProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type CrmLeadKnowledgeLeadRow = {
  id: string;
  organization_id: string | null;
};

type CrmLeadKnowledgeRow = {
  archived_at: string | null;
  confidence: string | null;
  created_at: string | null;
  created_by: string | null;
  id: string;
  knowledge_category: string | null;
  knowledge_type: string | null;
  lead_id: string;
  organization_id: string;
  source: string | null;
  status: string | null;
  summary: string | null;
  title: string | null;
  updated_at: string | null;
};

const leadKnowledgeColumns = [
  "id",
  "organization_id",
  "lead_id",
  "title",
  "summary",
  "knowledge_type",
  "knowledge_category",
  "confidence",
  "status",
  "source",
  "created_by",
  "archived_at",
  "created_at",
  "updated_at",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

type RequestContext = {
  profile: CrmLeadKnowledgeProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "sdr";
  };
  supabase: ReturnType<typeof createServerKnowledgeSupabaseClient>;
  user: SupabaseUser;
};

export type ListLeadKnowledgeItemsResult =
  | { items: CrmLeadKnowledgeItem[]; ok: true }
  | { error: string; ok: false; status: number };

export type MutateLeadKnowledgeItemResult =
  | { item: CrmLeadKnowledgeItem; ok: true }
  | { error: string; ok: false; status: number };

export async function listKnowledgeItemsByLead(
  accessToken: string | null,
  leadId: string,
): Promise<ListLeadKnowledgeItemsResult> {
  if (!leadId.trim()) {
    return {
      error: "Informe o lead da memoria organizacional.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveKnowledgeRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const { data, error } = await context.supabase
    .from("lead_knowledge_items")
    .select(leadKnowledgeColumns)
    .eq("lead_id", leadId)
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
    items: ((data ?? []) as unknown as CrmLeadKnowledgeRow[]).map(
      mapLeadKnowledgeRow,
    ),
    ok: true,
  };
}

export async function createKnowledgeItem(
  accessToken: string | null,
  input: CreateCrmLeadKnowledgeItemInput,
): Promise<MutateLeadKnowledgeItemResult> {
  const title = input.title.trim();
  const summary = normalizeOptionalText(input.summary);
  const knowledgeCategory = input.knowledgeCategory ?? "DECLARED";
  const confidence = input.confidence ?? "MEDIUM";

  if (!input.leadId.trim()) {
    return {
      error: "Informe o lead da memoria organizacional.",
      ok: false,
      status: 400,
    };
  }

  if (!title) {
    return {
      error: "Titulo e obrigatorio.",
      ok: false,
      status: 400,
    };
  }

  if (!isCrmLeadKnowledgeType(input.knowledgeType)) {
    return {
      error: "Tipo de conhecimento invalido.",
      ok: false,
      status: 400,
    };
  }

  if (!isCrmLeadKnowledgeCategory(knowledgeCategory)) {
    return {
      error: "Categoria de conhecimento invalida.",
      ok: false,
      status: 400,
    };
  }

  if (!isCrmLeadKnowledgeConfidence(confidence)) {
    return {
      error: "Confianca invalida.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveKnowledgeRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, input.leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const { data, error } = await context.supabase
    .from("lead_knowledge_items")
    .insert({
      confidence,
      created_by: context.profile.id,
      knowledge_category: knowledgeCategory,
      knowledge_type: input.knowledgeType,
      lead_id: input.leadId,
      organization_id: context.profile.organization_id,
      source: "Manual",
      status: "ACTIVE",
      summary,
      title,
    })
    .select(leadKnowledgeColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel criar o conhecimento.",
      ok: false,
      status: 500,
    };
  }

  return {
    item: mapLeadKnowledgeRow(data as unknown as CrmLeadKnowledgeRow),
    ok: true,
  };
}

export async function archiveKnowledgeItem(
  accessToken: string | null,
  itemId: string,
): Promise<MutateLeadKnowledgeItemResult> {
  if (!itemId.trim()) {
    return {
      error: "Informe o conhecimento.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveKnowledgeRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const itemValidation = await validateKnowledgeItemOrganization(
    context,
    itemId,
  );

  if (!itemValidation.ok) {
    return itemValidation;
  }

  if (itemValidation.item.status !== "ACTIVE") {
    return {
      error: "Conhecimento nao encontrado.",
      ok: false,
      status: 409,
    };
  }

  const { data, error } = await context.supabase
    .from("lead_knowledge_items")
    .update({
      archived_at: new Date().toISOString(),
      status: "ARCHIVED",
    })
    .eq("id", itemId)
    .eq("organization_id", context.profile.organization_id)
    .eq("status", "ACTIVE")
    .select(leadKnowledgeColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel arquivar o conhecimento.",
      ok: false,
      status: 500,
    };
  }

  return {
    item: mapLeadKnowledgeRow(data as unknown as CrmLeadKnowledgeRow),
    ok: true,
  };
}

function createServerKnowledgeSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase CRM knowledge server environment is not configured.");
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

async function resolveKnowledgeRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerKnowledgeSupabaseClient(accessToken);
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
      .maybeSingle<CrmLeadKnowledgeProfile>();

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
    .maybeSingle<CrmLeadKnowledgeLeadRow>();

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

async function validateKnowledgeItemOrganization(
  context: RequestContext,
  itemId: string,
) {
  const { data, error } = await context.supabase
    .from("lead_knowledge_items")
    .select(leadKnowledgeColumns)
    .eq("id", itemId)
    .maybeSingle<CrmLeadKnowledgeRow>();

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
    item: mapLeadKnowledgeRow(data),
    ok: true as const,
  };
}

function isValidProfile(
  profile: CrmLeadKnowledgeProfile | null,
): profile is RequestContext["profile"] {
  return Boolean(
    profile?.id &&
      profile.organization_id &&
      profile.is_active === true &&
      (profile.role === "admin" || profile.role === "sdr"),
  );
}

function mapLeadKnowledgeRow(row: CrmLeadKnowledgeRow): CrmLeadKnowledgeItem {
  const now = new Date().toISOString();

  return {
    archivedAt: row.archived_at,
    confidence: normalizeKnowledgeConfidence(row.confidence),
    createdAt: row.created_at ?? now,
    createdBy: row.created_by,
    id: row.id,
    knowledgeCategory: normalizeKnowledgeCategory(row.knowledge_category),
    knowledgeType: normalizeKnowledgeType(row.knowledge_type),
    leadId: row.lead_id,
    organizationId: row.organization_id,
    source: row.source ?? "Manual",
    status: normalizeKnowledgeStatus(row.status),
    summary: row.summary,
    title: row.title ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? now,
  };
}

function normalizeKnowledgeType(
  value: string | null,
): CrmLeadKnowledgeType {
  return isCrmLeadKnowledgeType(value) ? value : "strategic";
}

function normalizeKnowledgeCategory(
  value: string | null,
): CrmLeadKnowledgeCategory {
  return isCrmLeadKnowledgeCategory(value) ? value : "DECLARED";
}

function normalizeKnowledgeConfidence(
  value: string | null,
): CrmLeadKnowledgeConfidence {
  return isCrmLeadKnowledgeConfidence(value) ? value : "MEDIUM";
}

function normalizeKnowledgeStatus(
  value: string | null,
): CrmLeadKnowledgeStatus {
  return isCrmLeadKnowledgeStatus(value) ? value : "ACTIVE";
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}
