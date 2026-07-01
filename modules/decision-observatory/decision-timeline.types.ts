export type DecisionTimelineParams = {
  dateFrom?: string | null;
  dateTo?: string | null;
  leadId?: string | null;
  limit?: number | string | null;
  modelId?: string | null;
  modelVersion?: string | null;
};

export type DecisionTimelineEvent = {
  confidence: number | string | null;
  createdAt: string;
  decision: string | null;
  id: string;
  leadId: string;
  modelId: string;
  modelVersion: string | null;
  rationaleSummary: string | null;
  score: number | string | null;
};

export type DecisionTimelineResponse = {
  events: DecisionTimelineEvent[];
  filters: {
    applied: {
      dateFrom: string | null;
      dateTo: string | null;
      leadId: string;
      limit: number;
      modelId: string | null;
      modelVersion: string | null;
    };
  };
};
