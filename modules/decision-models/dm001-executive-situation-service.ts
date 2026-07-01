import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

import type {
  ExecutiveSituation,
  OperationalContext,
} from "../cognitive/contracts";
import { SituationIntegrationPipeline } from "../cognitive/pipelines/situation-integration/situation-integration-pipeline.ts";
import {
  getLatestRegisteredCommercialAttentionAllocation,
} from "./dm-001/runtime-adapter.ts";
import type {
  CommercialAttentionDecisionStorage,
  PersistedCommercialAttentionDecision,
} from "./dm-001/persistence.ts";
import type {
  CommercialAttentionSupabaseClient,
} from "./dm-001/supabase-persistence-adapter.ts";
import { SupabaseCommercialAttentionDecisionStorage } from "./dm-001/supabase-persistence-adapter.ts";
import { withCommercialAttentionDecisionOutput } from "./dm001-executive-situation-adapter.ts";

type Dm001ExecutiveSituationProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type Dm001ExecutiveSituationLeadRow = {
  id: string;
  organization_id: string | null;
};

export interface Dm001ExecutiveSituationSupabaseClient {
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

export type Dm001ExecutiveSituationServerContext = {
  profile: Dm001ExecutiveSituationProfile & {
    is_active: true;
    organization_id: string;
  };
  supabase: Dm001ExecutiveSituationSupabaseClient;
  user: SupabaseUser;
};

export type BuildExecutiveSituationFromDm001LatestInput = {
  data?: Record<string, unknown>;
  generatedAt?: string;
  leadId: string;
  metadata?: Record<string, unknown>;
  pipelineVersion?: string;
  sources?: OperationalContext["sources"];
};

export type BuildExecutiveSituationFromDm001LatestResult = {
  executiveSituation: ExecutiveSituation;
  latestDecision: PersistedCommercialAttentionDecision | null;
  ok: true;
};

export type Dm001ExecutiveSituationServerResult =
  | BuildExecutiveSituationFromDm001LatestResult
  | {
      error: string;
      ok: false;
      status: number;
    };

export async function buildExecutiveSituationFromLatestCommercialAttention(
  input: BuildExecutiveSituationFromDm001LatestInput,
  options: {
    organizationId: string;
    storage: CommercialAttentionDecisionStorage;
  },
): Promise<BuildExecutiveSituationFromDm001LatestResult> {
  const latestDecision = await getLatestRegisteredCommercialAttentionAllocation(
    options.storage,
    {
      leadId: input.leadId,
      organizationId: options.organizationId,
    },
  );
  const context = withCommercialAttentionDecisionOutput(
    buildOperationalContext(input, options.organizationId),
    latestDecision,
  );

  return {
    executiveSituation: SituationIntegrationPipeline.execute(context),
    latestDecision,
    ok: true,
  };
}

export async function buildExecutiveSituationFromLatestCommercialAttentionServerSide(
  accessToken: string | null,
  input: BuildExecutiveSituationFromDm001LatestInput,
): Promise<Dm001ExecutiveSituationServerResult> {
  const context = await resolveDm001ExecutiveSituationServerContext(accessToken);

  if (!context.ok) {
    return context;
  }

  return buildExecutiveSituationFromLatestCommercialAttentionWithServerContext(
    context,
    input,
    {
      storage: new SupabaseCommercialAttentionDecisionStorage(
        context.supabase as unknown as CommercialAttentionSupabaseClient,
      ),
    },
  );
}

export async function buildExecutiveSituationFromLatestCommercialAttentionWithServerContext(
  context: Dm001ExecutiveSituationServerContext,
  input: BuildExecutiveSituationFromDm001LatestInput,
  options: {
    storage: CommercialAttentionDecisionStorage;
  },
): Promise<Dm001ExecutiveSituationServerResult> {
  const leadValidation = await validateLeadOrganization(context, input.leadId);

  if (!leadValidation.ok) {
    return leadValidation;
  }

  try {
    return await buildExecutiveSituationFromLatestCommercialAttention(input, {
      organizationId: context.profile.organization_id,
      storage: options.storage,
    });
  } catch {
    return {
      error: "Nao foi possivel gerar a Executive Situation.",
      ok: false,
      status: 500,
    };
  }
}

function buildOperationalContext(
  input: BuildExecutiveSituationFromDm001LatestInput,
  organizationId: string,
): OperationalContext {
  return {
    data: input.data,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    leadId: input.leadId,
    metadata: input.metadata,
    organizationId,
    pipelineVersion: input.pipelineVersion ?? SituationIntegrationPipeline.version,
    sources: input.sources,
  };
}

function createExecutiveSituationSupabaseClient(
  accessToken: string,
): Dm001ExecutiveSituationSupabaseClient {
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
  }) as unknown as Dm001ExecutiveSituationSupabaseClient;
}

async function resolveDm001ExecutiveSituationServerContext(
  accessToken: string | null,
) {
  if (!accessToken) {
    return {
      error: "Nao foi possivel gerar a Executive Situation.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createExecutiveSituationSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Nao foi possivel gerar a Executive Situation.",
        ok: false as const,
        status: 401,
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, organization_id, role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle<Dm001ExecutiveSituationProfile>();

    if (profileError || !isValidExecutionProfile(profile)) {
      return {
        error: "Nao foi possivel gerar a Executive Situation.",
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
      error: "Nao foi possivel gerar a Executive Situation.",
      ok: false as const,
      status: 500,
    };
  }
}

async function validateLeadOrganization(
  context: Dm001ExecutiveSituationServerContext,
  leadId: string,
) {
  const { data, error } = await context.supabase
    .from("crm_leads")
    .select("id, organization_id")
    .eq("id", leadId)
    .maybeSingle<Dm001ExecutiveSituationLeadRow>();

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
  profile: Dm001ExecutiveSituationProfile | null,
): profile is Dm001ExecutiveSituationProfile & {
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
