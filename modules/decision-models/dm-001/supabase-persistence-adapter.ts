import type {
  CommercialAttentionDecisionOutputRecord,
  CommercialAttentionDecisionSnapshot,
  CommercialAttentionDecisionStorage,
  PersistedCommercialAttentionDecision,
} from "./persistence.ts";

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
].join(",");

type SupabasePersistenceError = {
  message?: string;
};

type SupabasePersistenceResponse<T> = Promise<{
  data: T | null;
  error: SupabasePersistenceError | null;
}>;

type SupabaseInsertSelection<T> = {
  single(): SupabasePersistenceResponse<T>;
};

type SupabaseInsertBuilder<T> = {
  select(columns: string): SupabaseInsertSelection<T>;
};

type SupabaseFilterBuilder<T> = {
  eq(column: string, value: string): SupabaseFilterBuilder<T>;
  limit(count: number): SupabaseFilterBuilder<T>;
  maybeSingle(): SupabasePersistenceResponse<T>;
  order(
    column: string,
    options: { ascending: boolean },
  ): SupabaseFilterBuilder<T>;
};

type SupabaseTableBuilder<T> = {
  insert(record: CommercialAttentionDecisionOutputRecord): SupabaseInsertBuilder<T>;
  select(columns: string): SupabaseFilterBuilder<T>;
};

export type CommercialAttentionSupabaseClient = {
  from(table: typeof DECISION_MODEL_OUTPUTS_TABLE): SupabaseTableBuilder<CommercialAttentionDecisionOutputRow>;
};

export type CommercialAttentionDecisionOutputRow = Omit<
  CommercialAttentionDecisionOutputRecord,
  "attention_score"
> & {
  attention_score: number | string | null;
  created_at: string;
  id: string;
};

export class SupabaseCommercialAttentionDecisionStorage
  implements CommercialAttentionDecisionStorage
{
  private readonly supabase: CommercialAttentionSupabaseClient;

  constructor(supabase: CommercialAttentionSupabaseClient) {
    this.supabase = supabase;
  }

  async getLatestByLeadModelVersion(params: {
    leadId: string;
    modelId: "DM-001";
    modelVersion: string;
    organizationId: string;
  }): Promise<PersistedCommercialAttentionDecision | null> {
    const { data, error } = await this.supabase
      .from(DECISION_MODEL_OUTPUTS_TABLE)
      .select(DECISION_MODEL_OUTPUTS_COLUMNS)
      .eq("organization_id", params.organizationId)
      .eq("lead_id", params.leadId)
      .eq("model_id", params.modelId)
      .eq("model_version", params.modelVersion)
      .order("generated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        `DM-001 Supabase persistence latest read failed: ${formatSupabaseError(error)}`,
      );
    }

    return data ? mapDecisionModelOutputRow(data) : null;
  }

  async insert(
    record: CommercialAttentionDecisionOutputRecord,
  ): Promise<PersistedCommercialAttentionDecision> {
    const { data, error } = await this.supabase
      .from(DECISION_MODEL_OUTPUTS_TABLE)
      .insert(record)
      .select(DECISION_MODEL_OUTPUTS_COLUMNS)
      .single();

    if (error) {
      throw new Error(
        `DM-001 Supabase persistence insert failed: ${formatSupabaseError(error)}`,
      );
    }

    if (!data) {
      throw new Error("DM-001 Supabase persistence insert returned no row.");
    }

    return mapDecisionModelOutputRow(data);
  }
}

function mapDecisionModelOutputRow(
  row: CommercialAttentionDecisionOutputRow,
): PersistedCommercialAttentionDecision {
  return {
    id: row.id,
    leadId: row.lead_id,
    organizationId: row.organization_id,
    snapshot: mapDecisionModelOutputSnapshot(row),
    createdAt: row.created_at,
  };
}

function mapDecisionModelOutputSnapshot(
  row: CommercialAttentionDecisionOutputRow,
): CommercialAttentionDecisionSnapshot {
  return {
    modelId: row.model_id,
    modelName: row.model_name,
    modelVersion: row.model_version,
    decision: row.decision,
    recommendedAction: row.recommended_action,
    attentionScore:
      row.attention_score === null ? null : Number(row.attention_score),
    confidence: row.confidence,
    calibrationStatus: row.calibration_status,
    rationale: row.rationale,
    signals: row.signals,
    evidenceTrace: row.evidence_trace,
    scoreContributors: row.score_contributors,
    metadata: row.metadata,
    output: row.output,
    generatedAt: row.generated_at,
  };
}

function formatSupabaseError(error: SupabasePersistenceError): string {
  return error.message?.trim() || "unknown Supabase error";
}
