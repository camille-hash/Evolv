import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

import { replayDecisionOutput } from "./decision-replay-engine.ts";
import type {
  ReplayOriginalOutput,
  ReplayReport,
  ReplayRuntimeAdapter,
} from "./decision-replay.types.ts";
import { createReplayRuntimeAdapter } from "./replay-runtime-adapter.ts";

const DECISION_MODEL_OUTPUTS_TABLE = "decision_model_outputs";
const DECISION_REPLAY_COLUMNS = [
  "id",
  "model_id",
  "model_version",
  "decision",
  "recommended_action",
  "attention_score",
  "confidence",
  "rationale",
  "evidence_trace",
  "score_contributors",
  "output",
  "metadata",
  "generated_at",
  "created_at",
].join(",");

type DecisionReplayServiceError = {
  message?: string;
};

type DecisionReplayServiceResponse<T> = Promise<{
  data: T | null;
  error: DecisionReplayServiceError | null;
}>;

type DecisionReplayFilterBuilder<T> = {
  eq(column: string, value: string): DecisionReplayFilterBuilder<T>;
  maybeSingle(): DecisionReplayServiceResponse<T>;
};

type DecisionReplayTableBuilder<T> = {
  select(columns: string): DecisionReplayFilterBuilder<T>;
};

export type DecisionReplaySupabaseClient = {
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: SupabaseUser | null };
      error: DecisionReplayServiceError | null;
    }>;
  };
  from(
    table: typeof DECISION_MODEL_OUTPUTS_TABLE,
  ): DecisionReplayTableBuilder<DecisionReplayRow>;
};

export type DecisionReplayRow = {
  attention_score: number | string | null;
  confidence: number | string | null;
  created_at: string;
  decision: string | null;
  evidence_trace: unknown;
  generated_at: string | null;
  id: string;
  metadata: Record<string, unknown> | null;
  model_id: string;
  model_version: string | null;
  output: Record<string, unknown> | null;
  rationale: Record<string, unknown> | null;
  recommended_action: string | null;
  score_contributors: unknown;
};

export type RunDecisionReplayResult =
  | {
      ok: true;
      report: ReplayReport;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export async function runDecisionReplayServerSide(
  accessToken: string | null,
  params: {
    outputId?: string | null;
  },
): Promise<RunDecisionReplayResult> {
  if (!accessToken) {
    return {
      error: "Sessao indisponivel ou expirada.",
      ok: false,
      status: 401,
    };
  }

  if (!params.outputId?.trim()) {
    return {
      error: "Informe outputId.",
      ok: false,
      status: 400,
    };
  }

  try {
    const supabase = createDecisionReplaySupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Sessao indisponivel ou expirada.",
        ok: false,
        status: 401,
      };
    }

    return runDecisionReplay(supabase, {
      outputId: params.outputId,
      runtimeAdapter: createReplayRuntimeAdapter(),
    });
  } catch {
    return {
      error: "Nao foi possivel executar o replay.",
      ok: false,
      status: 500,
    };
  }
}

export async function runDecisionReplay(
  supabase: Pick<DecisionReplaySupabaseClient, "from">,
  params: {
    now?: () => string;
    outputId: string;
    runtimeAdapter: ReplayRuntimeAdapter;
  },
): Promise<RunDecisionReplayResult> {
  const { data, error } = await supabase
    .from(DECISION_MODEL_OUTPUTS_TABLE)
    .select(DECISION_REPLAY_COLUMNS)
    .eq("id", params.outputId)
    .maybeSingle();

  if (error) {
    return {
      error: "Nao foi possivel carregar o Decision Output.",
      ok: false,
      status: 500,
    };
  }

  if (!data) {
    return {
      error: "Decision Output nao encontrado.",
      ok: false,
      status: 404,
    };
  }

  return {
    ok: true,
    report: await replayDecisionOutput({
      now: params.now,
      originalOutput: mapDecisionReplayRowToOriginalOutput(data),
      runtimeAdapter: params.runtimeAdapter,
    }),
  };
}

export function mapDecisionReplayRowToOriginalOutput(
  row: DecisionReplayRow,
): ReplayOriginalOutput {
  return {
    confidence: row.confidence,
    createdAt: row.created_at,
    decision: row.decision,
    evidenceTrace: row.evidence_trace,
    generatedAt: row.generated_at,
    id: row.id,
    metadata: readReplayMetadata(row),
    modelId: row.model_id,
    modelVersion: row.model_version,
    output: row.output,
    rationale: row.rationale,
    recommendedAction: row.recommended_action,
    score: row.attention_score,
    scoreContributors: row.score_contributors,
  };
}

function readReplayMetadata(row: DecisionReplayRow) {
  const outputMetadata = row.output?.metadata;

  if (isRecord(outputMetadata)) {
    return {
      ...(row.metadata ?? {}),
      ...outputMetadata,
    };
  }

  return row.metadata;
}

function createDecisionReplaySupabaseClient(
  accessToken: string,
): DecisionReplaySupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase Decision Observatory environment is not configured.");
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
  }) as unknown as DecisionReplaySupabaseClient;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
