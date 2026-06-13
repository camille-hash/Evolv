import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type { User, UserRole } from "./access-types";

export function isSupabaseAuthEnabled() {
  return process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "true";
}

export async function loadSupabaseCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.user) {
    return null;
  }

  return mapSupabaseUserToAccessUser(data.session.user);
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

  return {
    error: null,
    user: mapSupabaseUserToAccessUser(data.user),
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

function mapSupabaseUserToAccessUser(user: SupabaseUser): User {
  const role = normalizeSupabaseRole(user.user_metadata?.role);
  const name =
    readMetadataText(user.user_metadata?.name) ??
    readMetadataText(user.user_metadata?.full_name) ??
    user.email ??
    "Usuario EVOLV";
  const timestamp = user.updated_at ?? user.created_at ?? new Date().toISOString();

  return {
    ativo: true,
    createdAt: user.created_at ?? timestamp,
    id: user.id,
    mustChangePassword: false,
    nome: name,
    role,
    senha: "",
    updatedAt: timestamp,
    usuario: user.email ?? user.id,
  };
}

function normalizeSupabaseRole(role: unknown): UserRole {
  return role === "sdr" ? "sdr" : "admin";
}

function readMetadataText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
