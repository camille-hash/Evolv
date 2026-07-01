import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { triggerDm001RecalculationAfterCrmEvent } from "../../decision-models/dm-001/event-hooks";
import type { CreateCrmLeadNoteInput, CrmLeadNote, CrmLeadNoteType } from "../crm-lead-notes";

type CrmLeadNotesProfile = {
  id: string;
  organization_id: string | null;
  role: string | null;
  is_active: boolean | null;
};

type CrmLeadNotesLeadRow = {
  id: string;
  organization_id: string | null;
};

type CrmLeadNoteRow = {
  author_profile_id: string | null;
  content: string | null;
  created_at: string | null;
  deleted_at: string | null;
  deleted_by_profile_id: string | null;
  id: string;
  is_internal: boolean | null;
  lead_id: string;
  metadata: Record<string, unknown> | null;
  note_type: string | null;
  organization_id: string;
  updated_at: string | null;
  updated_by_profile_id: string | null;
};

const crmLeadNoteColumns = [
  "id",
  "organization_id",
  "lead_id",
  "author_profile_id",
  "updated_by_profile_id",
  "deleted_by_profile_id",
  "content",
  "note_type",
  "is_internal",
  "metadata",
  "created_at",
  "updated_at",
  "deleted_at",
].join(",");

export type ListLeadNotesResult =
  | { notes: CrmLeadNote[]; ok: true }
  | { error: string; ok: false; status: number };

export type CreateLeadNoteResult =
  | { note: CrmLeadNote; ok: true }
  | { error: string; ok: false; status: number };

type RequestContext = {
  profile: CrmLeadNotesProfile & {
    organization_id: string;
    role: "admin" | "sdr";
    is_active: true;
  };
  supabase: ReturnType<typeof createServerNotesSupabaseClient>;
  user: SupabaseUser;
};

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function listLeadNotes(
  accessToken: string | null,
  leadId: string,
): Promise<ListLeadNotesResult> {
  const context = await resolveRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const { data, error } = await context.supabase
    .from("crm_lead_notes")
    .select(crmLeadNoteColumns)
    .eq("lead_id", leadId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  return {
    notes: ((data ?? []) as unknown as CrmLeadNoteRow[]).map(mapCrmLeadNoteRow),
    ok: true,
  };
}

export async function createLeadNote(
  accessToken: string | null,
  input: CreateCrmLeadNoteInput,
): Promise<CreateLeadNoteResult> {
  const content = input.content.trim();

  if (!input.leadId || !content) {
    return {
      error: "Informe o lead e o conteudo da nota.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, input.leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const payload = {
    author_profile_id: context.profile.id,
    content,
    is_internal: true,
    lead_id: input.leadId,
    metadata: input.metadata ?? {},
    note_type: input.noteType ?? "history",
    organization_id: context.profile.organization_id,
  };

  const { data, error } = await context.supabase
    .from("crm_lead_notes")
    .insert(payload)
    .select(crmLeadNoteColumns)
    .single();

  if (error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  const note = mapCrmLeadNoteRow(data as unknown as CrmLeadNoteRow);
  await triggerDm001RecalculationAfterCrmEvent({
    accessToken,
    leadId: note.leadId,
    reason: "note_created",
  });

  return {
    note,
    ok: true,
  };
}

function createServerNotesSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase CRM notes server environment is not configured.");
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
      error: genericAccessError,
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerNotesSupabaseClient(accessToken);
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
      .maybeSingle<CrmLeadNotesProfile>();

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
    .maybeSingle<CrmLeadNotesLeadRow>();

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
      status: 403,
    };
  }

  return {
    ok: true as const,
  };
}

function isValidProfile(
  profile: CrmLeadNotesProfile | null,
): profile is CrmLeadNotesProfile & {
  organization_id: string;
  role: "admin" | "sdr";
  is_active: true;
} {
  return Boolean(
    profile?.id &&
      profile.organization_id &&
      profile.is_active === true &&
      (profile.role === "admin" || profile.role === "sdr"),
  );
}

function mapCrmLeadNoteRow(row: CrmLeadNoteRow): CrmLeadNote {
  const now = new Date().toISOString();

  return {
    authorProfileId: row.author_profile_id,
    content: row.content ?? "",
    createdAt: row.created_at ?? now,
    deletedAt: row.deleted_at,
    deletedByProfileId: row.deleted_by_profile_id,
    id: row.id,
    isInternal: row.is_internal ?? true,
    leadId: row.lead_id,
    metadata: row.metadata ?? {},
    noteType: normalizeNoteType(row.note_type),
    organizationId: row.organization_id,
    updatedAt: row.updated_at ?? row.created_at ?? now,
    updatedByProfileId: row.updated_by_profile_id,
  };
}

function normalizeNoteType(noteType: string | null): CrmLeadNoteType {
  if (
    noteType === "strategic_context" ||
    noteType === "latest_movement" ||
    noteType === "history" ||
    noteType === "initial_context"
  ) {
    return noteType;
  }

  return "history";
}
