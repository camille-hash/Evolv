import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

import type {
  CommercialAttentionDecision,
  Dm001Input,
} from "./contracts.ts";
import type {
  CommercialAttentionDecisionStorage,
  PersistedCommercialAttentionDecision,
} from "./persistence.ts";
import type {
  CommercialAttentionSupabaseClient,
} from "./supabase-persistence-adapter.ts";
import { createDecisionModelRegistry } from "../registry.ts";
import {
  executeRegisteredCommercialAttentionAllocation,
  registerCommercialAttentionAllocation,
} from "./runtime-adapter.ts";
import { SupabaseCommercialAttentionDecisionStorage } from "./supabase-persistence-adapter.ts";

type Dm001ExecutionProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type Dm001ExecutionLeadRow = {
  id: string;
  organization_id: string | null;
};

export interface Dm001ServerSupabaseClient {
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: SupabaseUser | null };
      error: { message?: string } | null;
    }>;
  };
  from(table: "crm_leads"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle<T>(): Promise<{
          data: T | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
  from(table: "profiles"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle<T>(): Promise<{
          data: T | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
}

export type Dm001ServerRequestContext = {
  profile: Dm001ExecutionProfile & {
    is_active: true;
    organization_id: string;
  };
  supabase: Dm001ServerSupabaseClient;
  user: SupabaseUser;
};

export type ExecuteCommercialAttentionAllocationServerResult =
  | {
      decision: CommercialAttentionDecision;
      ok: true;
      persistedDecision: PersistedCommercialAttentionDecision;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export type ExecuteCommercialAttentionAllocationServerOptions = {
  persistedAt?: string;
};

export async function executeCommercialAttentionAllocationServerSide(
  accessToken: string | null,
  input: Dm001Input,
  options: ExecuteCommercialAttentionAllocationServerOptions = {},
): Promise<ExecuteCommercialAttentionAllocationServerResult> {
  const context = await resolveDm001ServerRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  return executeCommercialAttentionAllocationWithServerContext(
    context,
    input,
    {
      persistedAt: options.persistedAt,
      storage: new SupabaseCommercialAttentionDecisionStorage(
        context.supabase as unknown as CommercialAttentionSupabaseClient,
      ),
    },
  );
}

export async function executeCommercialAttentionAllocationWithServerContext(
  context: Dm001ServerRequestContext,
  input: Dm001Input,
  options: {
    persistedAt?: string;
    storage: CommercialAttentionDecisionStorage;
  },
): Promise<ExecuteCommercialAttentionAllocationServerResult> {
  const organizationValidation = validateInputOrganization(context, input);

  if (!organizationValidation.ok) {
    return organizationValidation;
  }

  const leadValidation = await validateInputLeadOrganization(context, input);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  try {
    const registry = createDecisionModelRegistry();
    registerCommercialAttentionAllocation(registry);

    const result = await executeRegisteredCommercialAttentionAllocation(input, {
      persistedAt: options.persistedAt,
      storage: options.storage,
    });

    return {
      decision: result.decision,
      ok: true,
      persistedDecision: result.persistedDecision,
    };
  } catch {
    return {
      error: "Nao foi possivel executar o modelo de decisao.",
      ok: false,
      status: 500,
    };
  }
}

function createServerDm001SupabaseClient(
  accessToken: string,
): Dm001ServerSupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase DM-001 server environment is not configured.");
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
  }) as unknown as Dm001ServerSupabaseClient;
}

async function resolveDm001ServerRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Nao foi possivel executar o modelo de decisao.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerDm001SupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Nao foi possivel executar o modelo de decisao.",
        ok: false as const,
        status: 401,
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, organization_id, role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle<Dm001ExecutionProfile>();

    if (profileError || !isValidExecutionProfile(profile)) {
      return {
        error: "Nao foi possivel executar o modelo de decisao.",
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
      error: "Nao foi possivel executar o modelo de decisao.",
      ok: false as const,
      status: 500,
    };
  }
}

function validateInputOrganization(
  context: Dm001ServerRequestContext,
  input: Dm001Input,
) {
  if (input.organizationId !== context.profile.organization_id) {
    return {
      error: "Nao foi possivel executar o modelo de decisao.",
      ok: false as const,
      status: 403,
    };
  }

  return {
    ok: true as const,
  };
}

async function validateInputLeadOrganization(
  context: Dm001ServerRequestContext,
  input: Dm001Input,
) {
  const { data, error } = await context.supabase
    .from("crm_leads")
    .select("id, organization_id")
    .eq("id", input.leadId)
    .maybeSingle<Dm001ExecutionLeadRow>();

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
    ok: true as const,
  };
}

function isValidExecutionProfile(
  profile: Dm001ExecutionProfile | null,
): profile is Dm001ExecutionProfile & {
  is_active: true;
  organization_id: string;
} {
  return (
    Boolean(profile?.id) &&
    profile?.is_active === true &&
    typeof profile.organization_id === "string" &&
    Boolean(profile.organization_id.trim())
  );
}
