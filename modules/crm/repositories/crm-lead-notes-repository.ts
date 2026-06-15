import { createClient } from "@supabase/supabase-js";
import type { CreateCrmLeadNoteInput, CrmLeadNote, CrmLeadNoteType } from "../crm-lead-notes";

type SupabaseCrmLeadNoteRow = {
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

const missingSessionMessage =
  "Supabase authenticated CRM notes session is not available.";

export type CrmLeadNotesRepository = {
  createCrmLeadNote(input: CreateCrmLeadNoteInput): Promise<CrmLeadNote>;
  listCrmLeadNotesByLeadId(leadId: string): Promise<CrmLeadNote[]>;
};

export class SupabaseCrmLeadNotesRepository implements CrmLeadNotesRepository {
  private readonly supabase = createClient(
    this.supabaseUrl,
    this.publishableKey,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    },
  );

  constructor(
    private readonly supabaseUrl: string,
    private readonly publishableKey: string,
  ) {}

  async listCrmLeadNotesByLeadId(leadId: string): Promise<CrmLeadNote[]> {
    await this.requireAuthenticatedSession("listCrmLeadNotesByLeadId");

    const { data, error } = await this.supabase
      .from("crm_lead_notes")
      .select(crmLeadNoteColumns)
      .eq("lead_id", leadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as SupabaseCrmLeadNoteRow[];

    console.info("[EVOLV CRM] Notes repository list preparado.", {
      leadId,
      total: rows.length,
    });

    return rows.map(mapSupabaseCrmLeadNote);
  }

  async createCrmLeadNote(input: CreateCrmLeadNoteInput): Promise<CrmLeadNote> {
    const session = await this.requireAuthenticatedSession("createCrmLeadNote");
    const payload = mapCreateCrmLeadNoteInputToSupabaseRow(input, session.userId);

    const { data, error } = await this.supabase
      .from("crm_lead_notes")
      .insert(payload)
      .select(crmLeadNoteColumns)
      .single();

    if (error) {
      throw error;
    }

    console.info("[EVOLV CRM] Notes repository create preparado.", {
      leadId: input.leadId,
      noteType: payload.note_type,
    });

    return mapSupabaseCrmLeadNote(data as unknown as SupabaseCrmLeadNoteRow);
  }

  private async requireAuthenticatedSession(operation: string) {
    const { data, error } = await this.supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      console.warn("[EVOLV CRM] Notes repository sem sessao valida.", {
        operation,
      });

      throw new Error(missingSessionMessage);
    }

    return {
      userId: data.session.user.id,
    };
  }
}

export function canCreateSupabaseCrmLeadNotesRepository() {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  );
}

export function createSupabaseCrmLeadNotesRepository() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase CRM notes public environment variables are not configured.",
    );
  }

  return new SupabaseCrmLeadNotesRepository(supabaseUrl, publishableKey);
}

function mapSupabaseCrmLeadNote(row: SupabaseCrmLeadNoteRow): CrmLeadNote {
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

function mapCreateCrmLeadNoteInputToSupabaseRow(
  input: CreateCrmLeadNoteInput,
  fallbackAuthorProfileId: string,
) {
  const payload: Record<string, unknown> = {
    author_profile_id: input.authorProfileId ?? fallbackAuthorProfileId,
    content: input.content,
    is_internal: true,
    lead_id: input.leadId,
    metadata: input.metadata ?? {},
    note_type: input.noteType ?? "history",
  };

  if (input.organizationId) {
    payload.organization_id = input.organizationId;
  }

  return payload;
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
