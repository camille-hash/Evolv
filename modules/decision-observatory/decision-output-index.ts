import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

import type {
  DecisionOutputIndexItem,
  DecisionOutputIndexParams,
  DecisionOutputIndexPeriod,
  DecisionOutputIndexResponse,
  DecisionOutputIndexSortBy,
  DecisionOutputIndexSortDirection,
} from "./decision-output-index.types";

const DECISION_MODEL_OUTPUTS_TABLE = "decision_model_outputs";
const DECISION_MODEL_OUTPUTS_INDEX_COLUMNS = [
  "id",
  "organization_id",
  "lead_id",
  "model_id",
  "model_version",
  "decision",
  "recommended_action",
  "attention_score",
  "confidence",
  "rationale",
  "metadata",
  "generated_at",
  "created_at",
].join(",");

const defaultPage = 1;
const defaultPageSize = 25;
const maxPageSize = 100;

type DecisionOutputIndexError = {
  message?: string;
};

type DecisionOutputIndexQueryResponse<T> = Promise<{
  count: number | null;
  data: T[] | null;
  error: DecisionOutputIndexError | null;
}>;

type DecisionOutputIndexQueryBuilder<T> = {
  eq(column: string, value: string): DecisionOutputIndexQueryBuilder<T>;
  gte(column: string, value: string | number): DecisionOutputIndexQueryBuilder<T>;
  lte(column: string, value: string | number): DecisionOutputIndexQueryBuilder<T>;
  order(
    column: string,
    options: { ascending: boolean },
  ): DecisionOutputIndexQueryBuilder<T>;
  range(from: number, to: number): DecisionOutputIndexQueryResponse<T>;
};

type DecisionOutputIndexTableBuilder<T> = {
  select(
    columns: string,
    options: { count: "exact" },
  ): DecisionOutputIndexQueryBuilder<T>;
};

export type DecisionOutputIndexSupabaseClient = {
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: SupabaseUser | null };
      error: DecisionOutputIndexError | null;
    }>;
  };
  from(
    table: typeof DECISION_MODEL_OUTPUTS_TABLE,
  ): DecisionOutputIndexTableBuilder<DecisionOutputIndexRow>;
};

export type DecisionOutputIndexRow = {
  attention_score: number | string | null;
  confidence: string | number | null;
  created_at: string;
  decision: string | null;
  generated_at: string;
  id: string;
  lead_id: string | null;
  metadata: Record<string, unknown> | null;
  model_id: string;
  model_version: string | null;
  organization_id: string | null;
  rationale: Record<string, unknown> | null;
  recommended_action: string | null;
};

export type ListDecisionOutputsResult =
  | {
      ok: true;
      response: DecisionOutputIndexResponse;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };

export async function listDecisionOutputsServerSide(
  accessToken: string | null,
  params: DecisionOutputIndexParams,
): Promise<ListDecisionOutputsResult> {
  if (!accessToken) {
    return {
      error: "Sessao indisponivel ou expirada.",
      ok: false,
      status: 401,
    };
  }

  try {
    const supabase = createDecisionOutputIndexSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Sessao indisponivel ou expirada.",
        ok: false,
        status: 401,
      };
    }

    return {
      ok: true,
      response: await listDecisionOutputs(supabase, params),
    };
  } catch {
    return {
      error: "Nao foi possivel carregar os Decision Outputs.",
      ok: false,
      status: 500,
    };
  }
}

export async function listDecisionOutputs(
  supabase: Pick<DecisionOutputIndexSupabaseClient, "from">,
  params: DecisionOutputIndexParams,
): Promise<DecisionOutputIndexResponse> {
  const normalized = normalizeDecisionOutputIndexParams(params);
  let query = supabase
    .from(DECISION_MODEL_OUTPUTS_TABLE)
    .select(DECISION_MODEL_OUTPUTS_INDEX_COLUMNS, { count: "exact" });

  if (normalized.modelId) {
    query = query.eq("model_id", normalized.modelId);
  }

  if (normalized.modelVersion) {
    query = query.eq("model_version", normalized.modelVersion);
  }

  if (normalized.organizationId) {
    query = query.eq("organization_id", normalized.organizationId);
  }

  if (normalized.leadId) {
    query = query.eq("lead_id", normalized.leadId);
  }

  if (normalized.dateFrom) {
    query = query.gte("created_at", normalized.dateFrom);
  }

  if (normalized.dateTo) {
    query = query.lte("created_at", normalized.dateTo);
  }

  if (typeof normalized.scoreMin === "number") {
    query = query.gte("attention_score", normalized.scoreMin);
  }

  if (typeof normalized.scoreMax === "number") {
    query = query.lte("attention_score", normalized.scoreMax);
  }

  const sortColumn = mapSortByToColumn(normalized.sortBy);
  const from = (normalized.page - 1) * normalized.pageSize;
  const to = from + normalized.pageSize - 1;
  const { count, data, error } = await query
    .order(sortColumn, { ascending: normalized.sortDirection === "asc" })
    .range(from, to);

  if (error) {
    throw new Error("Decision Output Index query failed.");
  }

  const rows = data ?? [];
  const items = rows
    .map(mapDecisionOutputIndexRowToItem)
    .filter((item) => matchesConfidenceRange(item, normalized));
  const total = count ?? items.length;

  return {
    filters: {
      applied: buildAppliedFilters(normalized),
    },
    items,
    pagination: {
      page: normalized.page,
      pageSize: normalized.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / normalized.pageSize)),
    },
  };
}

export function normalizeDecisionOutputIndexParams(
  params: DecisionOutputIndexParams,
) {
  const period = normalizePeriod(params.period);
  const page = clampInteger(params.page, defaultPage, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInteger(params.pageSize, defaultPageSize, 1, maxPageSize);
  const dateRange = resolveDateRange({
    dateFrom: normalizeString(params.dateFrom),
    dateTo: normalizeString(params.dateTo),
    period,
  });
  const leadQuery = normalizeString(params.leadQuery);

  return {
    confidenceMax: normalizeNumber(params.confidenceMax),
    confidenceMin: normalizeNumber(params.confidenceMin),
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    leadId: leadQuery && isUuidLike(leadQuery) ? leadQuery : null,
    leadQuery,
    modelId: normalizeString(params.modelId),
    modelVersion: normalizeString(params.modelVersion),
    organizationId: normalizeString(params.organizationId),
    page,
    pageSize,
    period,
    scoreMax: normalizeNumber(params.scoreMax),
    scoreMin: normalizeNumber(params.scoreMin),
    sortBy: normalizeSortBy(params.sortBy),
    sortDirection: normalizeSortDirection(params.sortDirection),
  };
}

export function mapDecisionOutputIndexRowToItem(
  row: DecisionOutputIndexRow,
): DecisionOutputIndexItem {
  return {
    confidence: normalizeConfidenceValue(row.confidence),
    createdAt: row.created_at,
    decision: row.decision,
    id: row.id,
    leadId: row.lead_id,
    leadName: null,
    modelId: row.model_id,
    modelVersion: row.model_version,
    organizationId: row.organization_id,
    rationalePreview: buildRationalePreview(row.rationale),
    runtimeVersion: readMetadataString(row.metadata, "runtimeVersion"),
    score: row.attention_score === null ? null : Number(row.attention_score),
    status: readMetadataString(row.metadata, "status"),
    trigger: readRecalculationReason(row.metadata),
  };
}

function createDecisionOutputIndexSupabaseClient(
  accessToken: string,
): DecisionOutputIndexSupabaseClient {
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
  }) as unknown as DecisionOutputIndexSupabaseClient;
}

function buildAppliedFilters(
  params: ReturnType<typeof normalizeDecisionOutputIndexParams>,
) {
  return {
    confidenceMax: params.confidenceMax,
    confidenceMin: params.confidenceMin,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    leadQuery: params.leadQuery,
    modelId: params.modelId,
    modelVersion: params.modelVersion,
    organizationId: params.organizationId,
    page: params.page,
    pageSize: params.pageSize,
    period: params.period,
    scoreMax: params.scoreMax,
    scoreMin: params.scoreMin,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  };
}

function buildRationalePreview(rationale: Record<string, unknown> | null) {
  const reason = rationale?.decisionReason;

  if (typeof reason !== "string") {
    return null;
  }

  const normalized = reason.trim().replace(/\s+/g, " ");

  return normalized.length > 120
    ? `${normalized.slice(0, 117).trimEnd()}...`
    : normalized;
}

function readMetadataString(
  metadata: Record<string, unknown> | null,
  key: string,
) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function readRecalculationReason(metadata: Record<string, unknown> | null) {
  const recalculation = metadata?.recalculation;

  if (!isRecord(recalculation)) {
    return null;
  }

  const reason = recalculation.reason;

  return typeof reason === "string" && reason.trim() ? reason : null;
}

function matchesConfidenceRange(
  item: DecisionOutputIndexItem,
  params: ReturnType<typeof normalizeDecisionOutputIndexParams>,
) {
  if (item.confidence === null) {
    return !params.confidenceMin && !params.confidenceMax;
  }

  if (
    typeof params.confidenceMin === "number" &&
    item.confidence < params.confidenceMin
  ) {
    return false;
  }

  if (
    typeof params.confidenceMax === "number" &&
    item.confidence > params.confidenceMax
  ) {
    return false;
  }

  return true;
}

function normalizeConfidenceValue(value: string | number | null) {
  if (value === null) {
    return null;
  }

  if (typeof value === "number") {
    return value <= 1 ? Math.round(value * 100) : value;
  }

  const numeric = Number(value);

  if (Number.isFinite(numeric)) {
    return numeric <= 1 ? Math.round(numeric * 100) : numeric;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === "HIGH") {
    return 100;
  }

  if (normalized === "MEDIUM") {
    return 70;
  }

  if (normalized === "LOW") {
    return 40;
  }

  if (normalized === "UNKNOWN") {
    return 0;
  }

  return null;
}

function resolveDateRange({
  dateFrom,
  dateTo,
  period,
}: {
  dateFrom: string | null;
  dateTo: string | null;
  period: DecisionOutputIndexPeriod;
}) {
  if (period === "all") {
    return {
      dateFrom: null,
      dateTo: null,
    };
  }

  if (period === "custom") {
    return {
      dateFrom,
      dateTo,
    };
  }

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "last_7_days") {
    start.setDate(start.getDate() - 6);
  }

  if (period === "last_30_days") {
    start.setDate(start.getDate() - 29);
  }

  return {
    dateFrom: start.toISOString(),
    dateTo: now.toISOString(),
  };
}

function mapSortByToColumn(sortBy: DecisionOutputIndexSortBy) {
  if (sortBy === "score") {
    return "attention_score";
  }

  if (sortBy === "confidence") {
    return "confidence";
  }

  return "created_at";
}

function normalizePeriod(
  value: DecisionOutputIndexParams["period"],
): DecisionOutputIndexPeriod {
  return value === "today" ||
    value === "last_7_days" ||
    value === "last_30_days" ||
    value === "custom" ||
    value === "all"
    ? value
    : "all";
}

function normalizeSortBy(
  value: DecisionOutputIndexParams["sortBy"],
): DecisionOutputIndexSortBy {
  return value === "score" || value === "confidence" || value === "created_at"
    ? value
    : "created_at";
}

function normalizeSortDirection(
  value: DecisionOutputIndexParams["sortDirection"],
): DecisionOutputIndexSortDirection {
  return value === "asc" ? "asc" : "desc";
}

function normalizeString(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
