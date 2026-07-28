import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type { User, UserRole } from "./access-types";

const profileAccessErrorMessage =
  "Nao foi possivel concluir seu acesso. Entre em contato com o administrador.";
const localConfigurationErrorMessage =
  "A autenticacao local nao esta configurada. Verifique o ambiente da aplicacao.";
const networkErrorMessage =
  "Nao foi possivel conectar ao servico de autenticacao.";

type SupabaseLoginFailure =
  | "configuration"
  | "invalid_credentials"
  | "network"
  | "profile"
  | "unauthorized"
  | "unexpected";

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

    const profileResult = await loadValidatedProfile(
      supabase,
      data.session.user,
    );

    if (!profileResult.ok) {
      await supabase.auth.signOut();
      return null;
    }

    return mapSupabaseUserToAccessUser(
      data.session.user,
      profileResult.profile,
    );
  } catch {
    return null;
  }
}

export async function signInWithSupabaseAuth(
  email: string,
  password: string,
): Promise<{
  user: User | null;
  error: string | null;
  failure?: SupabaseLoginFailure;
}> {
  logSupabaseAuthDevelopment("signIn:start", null);

  let supabase: ReturnType<typeof createSupabaseAuthClient>;

  try {
    supabase = createSupabaseAuthClient();
  } catch (error) {
    logSupabaseAuthDevelopment("signIn:create-client", error);
    return {
      error: localConfigurationErrorMessage,
      failure: "configuration",
      user: null,
    };
  }

  let authResult: Awaited<
    ReturnType<typeof supabase.auth.signInWithPassword>
  >;

  try {
    authResult = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
  } catch (error) {
    logSupabaseAuthDevelopment("signIn:request", error);
    return {
      error: isNetworkError(error)
        ? networkErrorMessage
        : "Nao foi possivel concluir a autenticacao.",
      failure: isNetworkError(error) ? "network" : "unexpected",
      user: null,
    };
  }

  const { data, error } = authResult;

  if (error || !data.user) {
    logSupabaseAuthDevelopment("signIn:response", error);
    const failure = classifySupabaseAuthError(error);
    return {
      error:
        failure === "invalid_credentials"
          ? "E-mail ou senha invalidos."
          : failure === "unauthorized"
            ? "Este usuario nao esta autorizado a acessar a plataforma."
            : failure === "network"
              ? networkErrorMessage
              : "Nao foi possivel concluir a autenticacao.",
      failure,
      user: null,
    };
  }

  logSupabaseAuthDevelopment("signIn:session", null, {
    sessionPersisted: Boolean(data.session),
  });
  const profileResult = await loadValidatedProfile(supabase, data.user);

  if (!profileResult.ok) {
    logSupabaseAuthDevelopment("signIn:profile", profileResult.error);
    await supabase.auth.signOut();

    return {
      error:
        profileResult.reason === "missing"
          ? "Perfil de acesso nao encontrado."
          : profileAccessErrorMessage,
      failure:
        profileResult.reason === "missing" ? "profile" : "unauthorized",
      user: null,
    };
  }

  logSupabaseAuthDevelopment("signIn:complete", null);
  return {
    error: null,
    user: mapSupabaseUserToAccessUser(data.user, profileResult.profile),
  };
}

export async function signOutFromSupabaseAuth() {
  const supabase = createSupabaseAuthClient();
  await supabase.auth.signOut();
}

export async function requestSupabasePasswordReset(email: string) {
  const supabase = createSupabaseAuthClient();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${appUrl.replace(/\/$/, "")}/reset-password`,
  });
}

const recoverySessionUnavailableMessage =
  "Nao foi possivel validar sua sessao de recuperacao. Solicite um novo link e tente novamente.";

export async function ensureSupabaseRecoverySession() {
  const supabase = createSupabaseAuthClient();

  if (typeof window !== "undefined") {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return {
          error: recoverySessionUnavailableMessage,
          ok: false as const,
        };
      }

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.user) {
    return {
      error: recoverySessionUnavailableMessage,
      ok: false as const,
    };
  }

  return {
    error: null,
    ok: true as const,
  };
}

export async function updateSupabasePasswordForRecovery(password: string) {
  const sessionResult = await ensureSupabaseRecoverySession();

  if (!sessionResult.ok) {
    return sessionResult;
  }

  const supabase = createSupabaseAuthClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error: "Nao foi possivel redefinir sua senha. Solicite um novo link e tente novamente.",
      ok: false as const,
    };
  }

  return {
    error: null,
    ok: true as const,
  };
}
function createSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  logSupabaseAuthDevelopment("createClient:configuration", null);

  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    throw new Error("Supabase Auth public environment variables are not configured.");
  }

  try {
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    logSupabaseAuthDevelopment("createClient:complete", null);
    return client;
  } catch (error) {
    logSupabaseAuthDevelopment("createClient:error", error);
    throw error;
  }
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

  if (error) {
    return { error, ok: false as const, reason: "query" as const };
  }

  if (!data) {
    return { error: null, ok: false as const, reason: "missing" as const };
  }

  if (!isValidProfile(data)) {
    return { error: null, ok: false as const, reason: "unauthorized" as const };
  }

  return { ok: true as const, profile: data };
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
      (profile.role === "admin" ||
        profile.role === "master" ||
        profile.role === "sdr") &&
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

function classifySupabaseAuthError(error: unknown): SupabaseLoginFailure {
  const code = readErrorText(error, "code");
  const message = readErrorText(error, "message").toLowerCase();

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials")
  ) {
    return "invalid_credentials";
  }

  if (
    code === "email_not_confirmed" ||
    code === "user_banned" ||
    message.includes("not authorized")
  ) {
    return "unauthorized";
  }

  return isNetworkError(error) ? "network" : "unexpected";
}

function isNetworkError(error: unknown) {
  const name = readErrorText(error, "name");
  const message = readErrorText(error, "message").toLowerCase();
  return (
    name === "AuthRetryableFetchError" ||
    name === "TypeError" ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch") ||
    message.includes("network")
  );
}

function readErrorText(error: unknown, field: "code" | "message" | "name") {
  if (!error || typeof error !== "object") return "";
  const record = error as Record<string, unknown>;
  return typeof record[field] === "string" ? record[field] : "";
}

function logSupabaseAuthDevelopment(
  stage: string,
  error: unknown,
  extra: Record<string, boolean> = {},
) {
  if (process.env.NODE_ENV === "production") return;

  const technicalError =
    error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack }
      : error;

  console.error("[STAB-007] Supabase Auth", {
    environment: {
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
      hasPublishableKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
      ),
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
      useSupabaseAuth: isSupabaseAuthEnabled(),
    },
    error: technicalError,
    stage,
    ...extra,
  });
}


