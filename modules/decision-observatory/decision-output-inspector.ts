import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

const DECISION_MODEL_OUTPUTS_TABLE = "decision_model_outputs";
const DECISION_MODEL_OUTPUTS_COLUMNS = [
  "id",
  "organization_id",
  "lead_id",
  "model_id",
  "model_name",
  "model_version",
  "decision",
  "recommended_action",
  "attention_score",
  "confidence",
  "calibration_status",
  "rationale",
  "signals",
  "evidence_trace",
  "score_contributors",
  "output",
  "metadata",
  "generated_at",
  "created_at",
  "updated_at",
].join(",");

type DecisionInspectorError = {
  message?: string;
};

type DecisionInspectorResponse<T> = Promise<{
  data: T | null;
  error: DecisionInspectorError | null;
}>;

type DecisionInspectorFilterBuilder<T> = {
  eq(column: string, value: string): DecisionInspectorFilterBuilder<T>;
  maybeSingle(): DecisionInspectorResponse<T>;
};

type DecisionInspectorTableBuilder<T> = {
  select(columns: string): DecisionInspectorFilterBuilder<T>;
};

export type DecisionInspectorSupabaseClient = {
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: SupabaseUser | null };
      error: DecisionInspectorError | null;
    }>;
  };
  from(
    table: typeof DECISION_MODEL_OUTPUTS_TABLE,
  ): DecisionInspectorTableBuilder<DecisionOutputRow>;
};

export type DecisionOutputRow = {
  attention_score: number | string | null;
  calibration_status: string;
  confidence: string;
  created_at: string;
  decision: string;
  evidence_trace: unknown;
  generated_at: string;
  id: string;
  lead_id: string;
  metadata: Record<string, unknown>;
  model_id: string;
  model_name: string;
  model_version: string;
  organization_id: string;
  output: Record<string, unknown>;
  rationale: Record<string, unknown>;
  recommended_action: string;
  score_contributors: unknown;
  signals: unknown;
  updated_at: string;
};

export type DecisionContextSummary = {
  categories: Record<string, number>;
  evidenceCount: number;
  signalTypes: Record<string, number>;
  totalSignals: number;
};

export type DecisionOutputInspection = {
  attentionScore: number | null;
  calibrationStatus: string;
  confidence: string;
  createdAt: string;
  decision: string;
  decisionContextSummary: DecisionContextSummary | null;
  evidenceTrace: unknown[];
  generatedAt: string;
  id: string;
  leadId: string;
  metadata: Record<string, unknown>;
  modelId: string;
  modelName: string;
  modelVersion: string;
  organizationId: string;
  output: Record<string, unknown>;
  persistedOutput: Record<string, unknown>;
  rationale: Record<string, unknown>;
  recommendedAction: string;
  scoreContributors: unknown[];
  signals: unknown[];
  updatedAt: string;
};

export type InspectDecisionOutputResult =
  | {
      inspection: DecisionOutputInspection;
      ok: true;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export async function inspectDecisionOutputByIdServerSide(
  accessToken: string | null,
  outputId: string,
): Promise<InspectDecisionOutputResult> {
  if (!accessToken) {
    return {
      error: "Nao foi possivel carregar o Decision Output.",
      ok: false,
      status: 401,
    };
  }

  if (!outputId.trim()) {
    return {
      error: "Informe o Decision Output ID.",
      ok: false,
      status: 400,
    };
  }

  try {
    const supabase = createDecisionInspectorSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Nao foi possivel carregar o Decision Output.",
        ok: false,
        status: 401,
      };
    }

    return inspectDecisionOutputById(supabase, outputId);
  } catch {
    return {
      error: "Nao foi possivel carregar o Decision Output.",
      ok: false,
      status: 500,
    };
  }
}

export async function inspectDecisionOutputById(
  supabase: Pick<DecisionInspectorSupabaseClient, "from">,
  outputId: string,
): Promise<InspectDecisionOutputResult> {
  const { data, error } = await supabase
    .from(DECISION_MODEL_OUTPUTS_TABLE)
    .select(DECISION_MODEL_OUTPUTS_COLUMNS)
    .eq("id", outputId)
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
    inspection: mapDecisionOutputRowToInspection(data),
    ok: true,
  };
}

export function mapDecisionOutputRowToInspection(
  row: DecisionOutputRow,
): DecisionOutputInspection {
  const signals = asArray(row.signals);
  const evidenceTrace = asArray(row.evidence_trace);
  const scoreContributors = asArray(row.score_contributors);

  return {
    attentionScore:
      row.attention_score === null ? null : Number(row.attention_score),
    calibrationStatus: row.calibration_status,
    confidence: row.confidence,
    createdAt: row.created_at,
    decision: row.decision,
    decisionContextSummary: buildDecisionContextSummary(signals),
    evidenceTrace,
    generatedAt: row.generated_at,
    id: row.id,
    leadId: row.lead_id,
    metadata: row.metadata,
    modelId: row.model_id,
    modelName: row.model_name,
    modelVersion: row.model_version,
    organizationId: row.organization_id,
    output: row.output,
    persistedOutput: {
      ...row,
      evidence_trace: evidenceTrace,
      score_contributors: scoreContributors,
      signals,
    },
    rationale: row.rationale,
    recommendedAction: row.recommended_action,
    scoreContributors,
    signals,
    updatedAt: row.updated_at,
  };
}

function buildDecisionContextSummary(
  signals: unknown[],
): DecisionContextSummary | null {
  if (!signals.length) {
    return null;
  }

  const categories: Record<string, number> = {};
  const signalTypes: Record<string, number> = {};
  const evidenceIds = new Set<string>();

  for (const signal of signals) {
    if (!isRecord(signal)) {
      continue;
    }

    increment(categories, readString(signal.category) ?? "unknown");
    increment(signalTypes, readString(signal.signalType) ?? "unknown");

    const evidence = signal.evidence;

    if (isRecord(evidence)) {
      const evidenceId = readString(evidence.evidenceId);

      if (evidenceId) {
        evidenceIds.add(evidenceId);
      }
    }
  }

  return {
    categories,
    evidenceCount: evidenceIds.size,
    signalTypes,
    totalSignals: signals.length,
  };
}

function createDecisionInspectorSupabaseClient(
  accessToken: string,
): DecisionInspectorSupabaseClient {
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
  }) as unknown as DecisionInspectorSupabaseClient;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function increment(groups: Record<string, number>, key: string) {
  groups[key] = (groups[key] ?? 0) + 1;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
