import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

import type {
  DecisionTimelineEvent,
  DecisionTimelineParams,
  DecisionTimelineResponse,
} from "./decision-timeline.types";

const DECISION_MODEL_OUTPUTS_TABLE = "decision_model_outputs";
const DECISION_TIMELINE_COLUMNS = [
  "id",
  "lead_id",
  "model_id",
  "model_version",
  "decision",
  "attention_score",
  "confidence",
  "rationale",
  "created_at",
].join(",");

const defaultLimit = 50;
const maxLimit = 200;

type DecisionTimelineError = {
  message?: string;
};

type DecisionTimelineQueryResponse<T> = Promise<{
  data: T[] | null;
  error: DecisionTimelineError | null;
}>;

type DecisionTimelineQueryBuilder<T> = {
  eq(column: string, value: string): DecisionTimelineQueryBuilder<T>;
  gte(column: string, value: string): DecisionTimelineQueryBuilder<T>;
  limit(count: number): DecisionTimelineQueryResponse<T>;
  lte(column: string, value: string): DecisionTimelineQueryBuilder<T>;
  order(
    column: string,
    options: { ascending: boolean },
  ): DecisionTimelineQueryBuilder<T>;
};

type DecisionTimelineTableBuilder<T> = {
  select(columns: string): DecisionTimelineQueryBuilder<T>;
};

export type DecisionTimelineSupabaseClient = {
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: SupabaseUser | null };
      error: DecisionTimelineError | null;
    }>;
  };
  from(
    table: typeof DECISION_MODEL_OUTPUTS_TABLE,
  ): DecisionTimelineTableBuilder<DecisionTimelineRow>;
};

export type DecisionTimelineRow = {
  attention_score: number | string | null;
  confidence: number | string | null;
  created_at: string;
  decision: string | null;
  id: string;
  lead_id: string | null;
  model_id: string;
  model_version: string | null;
  rationale: Record<string, unknown> | null;
};

export type ListDecisionTimelineResult =
  | {
      ok: true;
      response: DecisionTimelineResponse;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export async function listDecisionTimelineServerSide(
  accessToken: string | null,
  params: DecisionTimelineParams,
): Promise<ListDecisionTimelineResult> {
  if (!accessToken) {
    return {
      error: "Sessao indisponivel ou expirada.",
      ok: false,
      status: 401,
    };
  }

  try {
    const supabase = createDecisionTimelineSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Sessao indisponivel ou expirada.",
        ok: false,
        status: 401,
      };
    }

    const response = await listDecisionTimeline(supabase, params);

    return {
      ok: true,
      response,
    };
  } catch (error) {
    return {
      error:
        error instanceof DecisionTimelineValidationError
          ? error.message
          : "Nao foi possivel carregar a Decision Timeline.",
      ok: false,
      status: error instanceof DecisionTimelineValidationError ? 400 : 500,
    };
  }
}

export async function listDecisionTimeline(
  supabase: Pick<DecisionTimelineSupabaseClient, "from">,
  params: DecisionTimelineParams,
): Promise<DecisionTimelineResponse> {
  const normalized = normalizeDecisionTimelineParams(params);
  let query = supabase
    .from(DECISION_MODEL_OUTPUTS_TABLE)
    .select(DECISION_TIMELINE_COLUMNS)
    .eq("lead_id", normalized.leadId);

  if (normalized.modelId) {
    query = query.eq("model_id", normalized.modelId);
  }

  if (normalized.modelVersion) {
    query = query.eq("model_version", normalized.modelVersion);
  }

  if (normalized.dateFrom) {
    query = query.gte("created_at", normalized.dateFrom);
  }

  if (normalized.dateTo) {
    query = query.lte("created_at", normalized.dateTo);
  }

  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(normalized.limit);

  if (error) {
    throw new Error("Decision Timeline query failed.");
  }

  return {
    events: (data ?? []).map(mapDecisionTimelineRowToEvent),
    filters: {
      applied: normalized,
    },
  };
}

export function normalizeDecisionTimelineParams(params: DecisionTimelineParams) {
  const leadId = normalizeString(params.leadId);

  if (!leadId) {
    throw new DecisionTimelineValidationError("leadId e obrigatorio.");
  }

  return {
    dateFrom: normalizeDate(params.dateFrom),
    dateTo: normalizeDate(params.dateTo),
    leadId,
    limit: clampInteger(params.limit, defaultLimit, 1, maxLimit),
    modelId: normalizeString(params.modelId),
    modelVersion: normalizeString(params.modelVersion),
  };
}

export function mapDecisionTimelineRowToEvent(
  row: DecisionTimelineRow,
): DecisionTimelineEvent {
  return {
    confidence: row.confidence,
    createdAt: row.created_at,
    decision: row.decision,
    id: row.id,
    leadId: row.lead_id ?? "",
    modelId: row.model_id,
    modelVersion: row.model_version,
    rationaleSummary: buildRationaleSummary(row.rationale),
    score: row.attention_score,
  };
}

class DecisionTimelineValidationError extends Error {}

function createDecisionTimelineSupabaseClient(
  accessToken: string,
): DecisionTimelineSupabaseClient {
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
  }) as unknown as DecisionTimelineSupabaseClient;
}

function buildRationaleSummary(rationale: Record<string, unknown> | null) {
  const candidates = [
    rationale?.decisionReason,
    rationale?.summary,
    rationale?.reason,
  ];
  const value = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length > 160
    ? `${normalized.slice(0, 157).trimEnd()}...`
    : normalized;
}

function normalizeString(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeDate(value: string | null | undefined) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? normalized : date.toISOString();
}

function normalizeNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function clampInteger(
  value: number | string | null | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = normalizeNumber(value);

  if (parsed === null) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}
