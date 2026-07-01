import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

import { compareDecisionOutputs } from "./decision-comparison-engine.ts";
import type {
  DecisionComparableOutput,
  DecisionComparisonResult,
} from "./decision-comparison-engine.types.ts";

const DECISION_MODEL_OUTPUTS_TABLE = "decision_model_outputs";
const DECISION_DIFF_COLUMNS = [
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

type DecisionDiffError = {
  message?: string;
};

type DecisionDiffResponse<T> = Promise<{
  data: T | null;
  error: DecisionDiffError | null;
}>;

type DecisionDiffFilterBuilder<T> = {
  eq(column: string, value: string): DecisionDiffFilterBuilder<T>;
  maybeSingle(): DecisionDiffResponse<T>;
};

type DecisionDiffTableBuilder<T> = {
  select(columns: string): DecisionDiffFilterBuilder<T>;
};

export type DecisionDiffSupabaseClient = {
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: SupabaseUser | null };
      error: DecisionDiffError | null;
    }>;
  };
  from(
    table: typeof DECISION_MODEL_OUTPUTS_TABLE,
  ): DecisionDiffTableBuilder<DecisionDiffRow>;
};

export type DecisionDiffRow = {
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

export type DecisionDiffResponsePayload = {
  comparison: DecisionComparisonResult;
  currentOutput: DecisionComparableOutput;
  previousOutput: DecisionComparableOutput;
};

export type CompareDecisionOutputsResult =
  | {
      ok: true;
      response: DecisionDiffResponsePayload;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export async function compareDecisionOutputsServerSide(
  accessToken: string | null,
  params: {
    currentOutputId?: string | null;
    previousOutputId?: string | null;
  },
): Promise<CompareDecisionOutputsResult> {
  if (!accessToken) {
    return {
      error: "Sessao indisponivel ou expirada.",
      ok: false,
      status: 401,
    };
  }

  if (!params.previousOutputId?.trim() || !params.currentOutputId?.trim()) {
    return {
      error: "Informe previousOutputId e currentOutputId.",
      ok: false,
      status: 400,
    };
  }

  try {
    const supabase = createDecisionDiffSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Sessao indisponivel ou expirada.",
        ok: false,
        status: 401,
      };
    }

    return comparePersistedDecisionOutputs(supabase, {
      currentOutputId: params.currentOutputId,
      previousOutputId: params.previousOutputId,
    });
  } catch {
    return {
      error: "Nao foi possivel comparar os Decision Outputs.",
      ok: false,
      status: 500,
    };
  }
}

export async function comparePersistedDecisionOutputs(
  supabase: Pick<DecisionDiffSupabaseClient, "from">,
  params: {
    currentOutputId: string;
    previousOutputId: string;
  },
): Promise<CompareDecisionOutputsResult> {
  const [previousRow, currentRow] = await Promise.all([
    readDecisionOutputById(supabase, params.previousOutputId),
    readDecisionOutputById(supabase, params.currentOutputId),
  ]);

  if (previousRow.error || currentRow.error) {
    return {
      error: "Nao foi possivel carregar os Decision Outputs.",
      ok: false,
      status: 500,
    };
  }

  if (!previousRow.data || !currentRow.data) {
    return {
      error: "Decision Output nao encontrado.",
      ok: false,
      status: 404,
    };
  }

  const previousOutput = mapDecisionDiffRowToComparableOutput(previousRow.data);
  const currentOutput = mapDecisionDiffRowToComparableOutput(currentRow.data);

  return {
    ok: true,
    response: {
      comparison: compareDecisionOutputs(previousOutput, currentOutput),
      currentOutput,
      previousOutput,
    },
  };
}

export function mapDecisionDiffRowToComparableOutput(
  row: DecisionDiffRow,
): DecisionComparableOutput {
  return {
    confidence: row.confidence,
    createdAt: row.created_at,
    decision: row.decision,
    evidenceTrace: row.evidence_trace,
    generatedAt: row.generated_at,
    id: row.id,
    metadata: row.metadata,
    modelId: row.model_id,
    modelVersion: row.model_version,
    output: row.output,
    rationale: row.rationale,
    recommendedAction: row.recommended_action,
    score: row.attention_score,
    scoreContributors: row.score_contributors,
  };
}

async function readDecisionOutputById(
  supabase: Pick<DecisionDiffSupabaseClient, "from">,
  outputId: string,
) {
  return supabase
    .from(DECISION_MODEL_OUTPUTS_TABLE)
    .select(DECISION_DIFF_COLUMNS)
    .eq("id", outputId)
    .maybeSingle();
}

function createDecisionDiffSupabaseClient(
  accessToken: string,
): DecisionDiffSupabaseClient {
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
  }) as unknown as DecisionDiffSupabaseClient;
}
