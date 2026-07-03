import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  Administrator,
  AdministratorCreateInput,
  AdministratorListFilters,
  AdministratorStatus,
  AdministratorUpdateInput,
} from "./types";
import { createAdministratorSlug } from "./validation";

type AdministratorProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type AdministratorRow = {
  created_at: string | null;
  created_by: string | null;
  id: string;
  metadata: Record<string, unknown> | null;
  name: string | null;
  organization_id: string | null;
  slug: string | null;
  status: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

type RequestContext = {
  profile: AdministratorProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerAdministratorsSupabaseClient>;
  user: SupabaseUser;
};

type AdministratorOrganizationSupabaseClient = {
  from(table: "administrators"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle<T>(): PromiseLike<{ data: T | null; error: unknown }>;
      };
    };
  };
};

export type AdministratorMutationResult =
  | { administrator: Administrator; ok: true }
  | { error: string; ok: false; status: number };

export type AdministratorListResult =
  | { administrators: Administrator[]; ok: true }
  | { error: string; ok: false; status: number };

export type AdministratorValidationResult =
  | { ok: true }
  | { error: string; ok: false; status: number };

const administratorColumns = [
  "id",
  "organization_id",
  "name",
  "slug",
  "status",
  "metadata",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
].join(",");

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function listAdministrators(
  accessToken: string | null,
  filters: AdministratorListFilters,
): Promise<AdministratorListResult> {
  const context = await resolveAdministratorRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const normalizedFilters = normalizeAdministratorListFilters(filters);
  let query = context.supabase
    .from("administrators")
    .select(administratorColumns)
    .eq("organization_id", context.profile.organization_id)
    .order("name", { ascending: true });

  if (normalizedFilters.status) {
    query = query.eq("status", normalizedFilters.status);
  }

  if (normalizedFilters.search) {
    const searchPattern = `%${escapePostgrestSearch(normalizedFilters.search)}%`;
    query = query.or(
      [`name.ilike.${searchPattern}`, `slug.ilike.${searchPattern}`].join(","),
    );
  }

  const { data, error } = await query.range(
    normalizedFilters.offset,
    normalizedFilters.offset + normalizedFilters.limit - 1,
  );

  if (error) {
    logAdministratorServerError("list_query_failed", {
      error: formatSupabaseDebugError(error),
      filters: normalizedFilters,
      organizationId: context.profile.organization_id,
    });

    return {
      error: "Nao foi possivel carregar as administradoras.",
      ok: false,
      status: 500,
    };
  }

  return {
    administrators: ((data ?? []) as unknown as AdministratorRow[])
      .filter((row) => row.organization_id === context.profile.organization_id)
      .map(mapAdministratorRow),
    ok: true,
  };
}

export async function getAdministratorById(
  accessToken: string | null,
  administratorId: string,
): Promise<AdministratorMutationResult> {
  if (!administratorId.trim()) {
    return {
      error: "Informe a administradora.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveAdministratorRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const result = await getAdministratorFromCurrentOrganization(
    context,
    administratorId,
  );

  if (!result.ok) {
    return result;
  }

  return {
    administrator: result.administrator,
    ok: true,
  };
}

export async function createAdministrator(
  accessToken: string | null,
  input: AdministratorCreateInput,
): Promise<AdministratorMutationResult> {
  const context = await resolveAdministratorRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const slug = input.slug || createAdministratorSlug(input.name);
  const slugValidation = await validateAdministratorSlugIsUnique(
    context,
    slug,
  );

  if (!slugValidation.ok) {
    return slugValidation;
  }

  const { data, error } = await context.supabase
    .from("administrators")
    .insert({
      created_by: context.profile.id,
      metadata: input.metadata ?? {},
      name: input.name,
      organization_id: context.profile.organization_id,
      slug,
      status: input.status ?? "active",
      updated_by: context.profile.id,
    })
    .select(administratorColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel criar a administradora.",
      ok: false,
      status: 500,
    };
  }

  return {
    administrator: mapAdministratorRow(data as unknown as AdministratorRow),
    ok: true,
  };
}

export async function updateAdministrator(
  accessToken: string | null,
  administratorId: string,
  input: AdministratorUpdateInput,
): Promise<AdministratorMutationResult> {
  if (!administratorId.trim()) {
    return {
      error: "Informe a administradora.",
      ok: false,
      status: 400,
    };
  }

  const context = await resolveAdministratorRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const existing = await getAdministratorFromCurrentOrganization(
    context,
    administratorId,
  );

  if (!existing.ok) {
    return existing;
  }

  const payload: Record<string, unknown> = {
    updated_by: context.profile.id,
  };

  if (input.name !== undefined) {
    payload.name = input.name;
  }

  if (input.status !== undefined) {
    payload.status = input.status;
  }

  if (input.metadata !== undefined) {
    payload.metadata = input.metadata;
  }

  const { data, error } = await context.supabase
    .from("administrators")
    .update(payload)
    .eq("id", administratorId)
    .eq("organization_id", context.profile.organization_id)
    .select(administratorColumns)
    .single();

  if (error) {
    return {
      error: "Nao foi possivel atualizar a administradora.",
      ok: false,
      status: 500,
    };
  }

  return {
    administrator: mapAdministratorRow(data as unknown as AdministratorRow),
    ok: true,
  };
}

export async function validateAdministratorBelongsToOrganization(
  supabase: AdministratorOrganizationSupabaseClient,
  administratorId: string,
  organizationId: string,
): Promise<AdministratorValidationResult> {
  const { data, error } = await supabase
    .from("administrators")
    .select("id, organization_id")
    .eq("id", administratorId)
    .maybeSingle<{ id: string; organization_id: string | null }>();

  if (error || !data?.organization_id) {
    return {
      error: "Administradora nao encontrada.",
      ok: false,
      status: 404,
    };
  }

  if (data.organization_id !== organizationId) {
    return {
      error: "Administradora nao encontrada.",
      ok: false,
      status: 404,
    };
  }

  return {
    ok: true,
  };
}

function createServerAdministratorsSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase administrators server environment is not configured.",
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

async function resolveAdministratorRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerAdministratorsSupabaseClient(accessToken);
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
      .maybeSingle<AdministratorProfile>();

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

async function getAdministratorFromCurrentOrganization(
  context: RequestContext,
  administratorId: string,
) {
  const { data, error } = await context.supabase
    .from("administrators")
    .select(administratorColumns)
    .eq("id", administratorId)
    .maybeSingle<AdministratorRow>();

  if (error || !data?.organization_id) {
    return {
      error: "Administradora nao encontrada.",
      ok: false as const,
      status: 404,
    };
  }

  if (data.organization_id !== context.profile.organization_id) {
    return {
      error: "Administradora nao encontrada.",
      ok: false as const,
      status: 404,
    };
  }

  return {
    administrator: mapAdministratorRow(data),
    ok: true as const,
  };
}

async function validateAdministratorSlugIsUnique(
  context: RequestContext,
  slug: string,
) {
  const { data, error } = await context.supabase
    .from("administrators")
    .select("id, organization_id")
    .eq("organization_id", context.profile.organization_id)
    .eq("slug", slug)
    .maybeSingle<{ id: string; organization_id: string | null }>();

  if (error) {
    return {
      error: "Nao foi possivel validar o slug da administradora.",
      ok: false as const,
      status: 500,
    };
  }

  if (data?.id) {
    return {
      error: "Ja existe uma administradora com este slug.",
      ok: false as const,
      status: 409,
    };
  }

  return {
    ok: true as const,
  };
}

function normalizeAdministratorListFilters(filters: AdministratorListFilters) {
  return {
    limit: Math.min(Math.max(filters.limit ?? 50, 1), 100),
    offset: Math.max(filters.offset ?? 0, 0),
    search: normalizeNullableText(filters.search),
    status: filters.status ?? null,
  };
}

function mapAdministratorRow(row: AdministratorRow): Administrator {
  const now = new Date().toISOString();

  return {
    createdAt: row.created_at ?? now,
    createdBy: row.created_by,
    id: row.id,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    name: normalizeText(row.name) || "Administradora sem nome",
    organizationId: row.organization_id ?? "",
    slug: normalizeText(row.slug),
    status: normalizeAdministratorStatus(row.status),
    updatedAt: row.updated_at ?? row.created_at ?? now,
    updatedBy: row.updated_by,
  };
}

function normalizeAdministratorStatus(value: string | null): AdministratorStatus {
  return value === "inactive" ? "inactive" : "active";
}

function isValidProfile(
  profile: AdministratorProfile | null,
): profile is AdministratorProfile & {
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

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizeText(value: unknown) {
  return normalizeNullableText(value) ?? "";
}

function escapePostgrestSearch(value: string) {
  return value.replace(/[%*,()]/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function logAdministratorServerError(
  stage: string,
  payload: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.error("[EVOLV administrators]", {
    ...payload,
    stage,
  });
}

function formatSupabaseDebugError(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const record = error as Record<string, unknown>;

  return {
    code: typeof record.code === "string" ? record.code : null,
    details: typeof record.details === "string" ? record.details : null,
    hint: typeof record.hint === "string" ? record.hint : null,
    message: typeof record.message === "string" ? record.message : null,
  };
}
