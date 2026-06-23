import { createClient } from "@supabase/supabase-js";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  CreateCrmLeadProfileInput,
  CrmLeadProfile,
  isCrmLeadProfileCurrentMoment,
  isCrmLeadProfilePrimaryGoal,
  isCrmLeadProfileStrategicTopic,
  UpdateCrmLeadProfileInput,
} from "../crm-lead-profiles";

type CrmLeadProfilesProfile = {
  id: string;
  organization_id: string | null;
  role: string | null;
  is_active: boolean | null;
};

type CrmLeadProfilesLeadRow = {
  id: string;
  organization_id: string | null;
};

type CrmLeadProfileRow = {
  created_at: string | null;
  current_moment: string | null;
  id: string;
  lead_id: string;
  primary_goal: string | null;
  strategic_notes: string | null;
  strategic_topics: string[] | null;
  updated_at: string | null;
};

const crmLeadProfileColumns = [
  "id",
  "lead_id",
  "primary_goal",
  "current_moment",
  "strategic_topics",
  "strategic_notes",
  "created_at",
  "updated_at",
].join(",");

export type GetLeadProfileResult =
  | { ok: true; profile: CrmLeadProfile | null }
  | { error: string; ok: false; status: number };

export type CreateLeadProfileResult =
  | { ok: true; profile: CrmLeadProfile }
  | { error: string; ok: false; status: number };

export type UpdateLeadProfileResult = CreateLeadProfileResult;

type RequestContext = {
  profile: CrmLeadProfilesProfile & {
    organization_id: string;
    role: "admin" | "sdr";
    is_active: true;
  };
  supabase: ReturnType<typeof createServerProfilesSupabaseClient>;
  user: SupabaseUser;
};

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function getLeadProfile(
  accessToken: string | null,
  leadId: string,
): Promise<GetLeadProfileResult> {
  const context = await resolveRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const leadValidation = await validateLeadOrganization(context, leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  const { data, error } = await context.supabase
    .from("crm_lead_profiles")
    .select(crmLeadProfileColumns)
    .eq("lead_id", leadId)
    .maybeSingle<CrmLeadProfileRow>();

  if (error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    profile: data ? mapCrmLeadProfileRow(data) : null,
  };
}

export async function createLeadProfile(
  accessToken: string | null,
  input: CreateCrmLeadProfileInput,
): Promise<CreateLeadProfileResult> {
  if (!input.leadId) {
    return {
      error: "Informe o lead do perfil estrategico.",
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

  const existing = await context.supabase
    .from("crm_lead_profiles")
    .select("id")
    .eq("lead_id", input.leadId)
    .maybeSingle<{ id: string }>();

  if (existing.data?.id) {
    return {
      error: "Perfil estrategico ja existe para este lead.",
      ok: false,
      status: 409,
    };
  }

  if (existing.error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  const { data, error } = await context.supabase
    .from("crm_lead_profiles")
    .insert({
      current_moment: normalizeNullableText(input.currentMoment),
      lead_id: input.leadId,
      primary_goal: normalizeNullableText(input.primaryGoal),
      strategic_notes: normalizeNullableText(input.strategicNotes),
      strategic_topics: normalizeStrategicTopics(input.strategicTopics),
    })
    .select(crmLeadProfileColumns)
    .single();

  if (error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    profile: mapCrmLeadProfileRow(data as unknown as CrmLeadProfileRow),
  };
}

export async function updateLeadProfile(
  accessToken: string | null,
  input: UpdateCrmLeadProfileInput,
): Promise<UpdateLeadProfileResult> {
  if (!input.leadId) {
    return {
      error: "Informe o lead do perfil estrategico.",
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

  const existing = await context.supabase
    .from("crm_lead_profiles")
    .select("id")
    .eq("lead_id", input.leadId)
    .maybeSingle<{ id: string }>();

  if (existing.error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  if (!existing.data?.id) {
    return {
      error: "Perfil estrategico ainda nao existe para este lead.",
      ok: false,
      status: 404,
    };
  }

  const { data, error } = await context.supabase
    .from("crm_lead_profiles")
    .update({
      current_moment: normalizeNullableText(input.currentMoment),
      primary_goal: normalizeNullableText(input.primaryGoal),
      strategic_notes: normalizeNullableText(input.strategicNotes),
      strategic_topics: normalizeStrategicTopics(input.strategicTopics),
    })
    .eq("lead_id", input.leadId)
    .select(crmLeadProfileColumns)
    .single();

  if (error) {
    return {
      error: genericAccessError,
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    profile: mapCrmLeadProfileRow(data as unknown as CrmLeadProfileRow),
  };
}

function createServerProfilesSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase CRM profiles server environment is not configured.");
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
    const supabase = createServerProfilesSupabaseClient(accessToken);
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
      .maybeSingle<CrmLeadProfilesProfile>();

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
    .maybeSingle<CrmLeadProfilesLeadRow>();

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
  profile: CrmLeadProfilesProfile | null,
): profile is RequestContext["profile"] {
  return Boolean(
    profile?.id &&
      profile.organization_id &&
      profile.is_active === true &&
      (profile.role === "admin" || profile.role === "sdr"),
  );
}

function normalizeNullableText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeStrategicTopics(topics: string[] | null | undefined) {
  if (!Array.isArray(topics) || !topics.length) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      topics
        .filter((topic): topic is string => typeof topic === "string")
        .map((topic) => topic.trim())
        .filter(Boolean),
    ),
  );
}

function mapCrmLeadProfileRow(row: CrmLeadProfileRow): CrmLeadProfile {
  const now = new Date().toISOString();

  return {
    createdAt: row.created_at ?? now,
    currentMoment: isCrmLeadProfileCurrentMoment(row.current_moment)
      ? row.current_moment
      : null,
    id: row.id,
    leadId: row.lead_id,
    primaryGoal: isCrmLeadProfilePrimaryGoal(row.primary_goal)
      ? row.primary_goal
      : null,
    strategicNotes: row.strategic_notes,
    strategicTopics: Array.isArray(row.strategic_topics)
      ? row.strategic_topics.filter(
          (topic): topic is import("../crm-lead-profiles").CrmLeadProfileStrategicTopic =>
            typeof topic === "string" &&
            Boolean(topic) &&
            isCrmLeadProfileStrategicTopic(topic),
        )
      : [],
    updatedAt: row.updated_at ?? row.created_at ?? now,
  };
}
