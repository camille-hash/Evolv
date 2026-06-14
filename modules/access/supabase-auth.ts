import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type { User, UserRole } from "./access-types";

const profileAccessErrorMessage =
  "Nao foi possivel concluir seu acesso. Entre em contato com o administrador.";

type SupabaseAccessProfile = {
  id: string;
  organization_id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
};

export function isSupabaseAuthEnabled() {
  return process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "true";
}

export async function loadSupabaseCurrentUser(): Promise<User | null> {
  try {
    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.user) {
      return null;
    }

    const profile = await loadValidatedProfile(supabase, data.session.user);

    if (!profile) {
      await supabase.auth.signOut();
      return null;
    }

    return mapSupabaseUserToAccessUser(data.session.user, profile);
  } catch {
    return null;
  }
}

export async function signInWithSupabaseAuth(
  email: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> {
  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    return {
      error: "E-mail ou senha invalidos.",
      user: null,
    };
  }

  const profile = await loadValidatedProfile(supabase, data.user);

  if (!profile) {
    await supabase.auth.signOut();

    return {
      error: profileAccessErrorMessage,
      user: null,
    };
  }

  return {
    error: null,
    user: mapSupabaseUserToAccessUser(data.user, profile),
  };
}

export async function signOutFromSupabaseAuth() {
  const supabase = createSupabaseAuthClient();
  await supabase.auth.signOut();
}

export async function requestSupabasePasswordReset(email: string) {
  const supabase = createSupabaseAuthClient();
  await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
  });
}

function createSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase Auth public environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

async function loadValidatedProfile(
  supabase: ReturnType<typeof createSupabaseAuthClient>,
  user: SupabaseUser,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, organization_id, name, email, role, is_active")
    .eq("id", user.id)
    .maybeSingle<SupabaseAccessProfile>();

  if (error || !isValidProfile(data)) {
    return null;
  }

  return data;
}

function isValidProfile(
  profile: SupabaseAccessProfile | null,
): profile is SupabaseAccessProfile & {
  organization_id: string;
  role: UserRole;
  is_active: true;
} {
  return Boolean(
    profile?.id &&
      profile.organization_id &&
      (profile.role === "admin" || profile.role === "sdr") &&
      profile.is_active === true,
  );
}

function mapSupabaseUserToAccessUser(
  user: SupabaseUser,
  profile: SupabaseAccessProfile & {
    organization_id: string;
    role: UserRole;
    is_active: true;
  },
): User {
  const name =
    readMetadataText(profile.name) ??
    readMetadataText(user.user_metadata?.name) ??
    readMetadataText(user.user_metadata?.full_name) ??
    user.email ??
    "Usuario EVOLV";
  const timestamp = user.updated_at ?? user.created_at ?? new Date().toISOString();

  return {
    ativo: true,
    createdAt: user.created_at ?? timestamp,
    email: profile.email ?? user.email ?? undefined,
    id: user.id,
    mustChangePassword: false,
    nome: name,
    organizationId: profile.organization_id,
    role: profile.role,
    senha: "",
    updatedAt: timestamp,
    usuario: profile.email ?? user.email ?? user.id,
  };
}

function readMetadataText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
