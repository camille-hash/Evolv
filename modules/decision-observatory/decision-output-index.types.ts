export type DecisionOutputIndexPeriod =
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "custom"
  | "all";

export type DecisionOutputIndexSortBy =
  | "created_at"
  | "score"
  | "confidence";

export type DecisionOutputIndexSortDirection = "asc" | "desc";

export type DecisionOutputIndexParams = {
  confidenceMax?: number | string | null;
  confidenceMin?: number | string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  leadQuery?: string | null;
  modelId?: string | null;
  modelVersion?: string | null;
  organizationId?: string | null;
  page?: number | string | null;
  pageSize?: number | string | null;
  period?: DecisionOutputIndexPeriod | null;
  scoreMax?: number | string | null;
  scoreMin?: number | string | null;
  sortBy?: DecisionOutputIndexSortBy | null;
  sortDirection?: DecisionOutputIndexSortDirection | null;
};

export type DecisionOutputIndexItem = {
  confidence: number | null;
  createdAt: string;
  decision: string | null;
  id: string;
  leadId: string | null;
  leadName?: string | null;
  modelId: string;
  modelVersion: string | null;
  organizationId: string | null;
  rationalePreview?: string | null;
  runtimeVersion?: string | null;
  score: number | null;
  status?: string | null;
  trigger?: string | null;
};

export type DecisionOutputIndexResponse = {
  filters: {
    applied: Record<string, unknown>;
  };
  items: DecisionOutputIndexItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
