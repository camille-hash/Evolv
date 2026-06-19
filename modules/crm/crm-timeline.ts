export type CrmOperationalTimelineEventType =
  | "note_created"
  | "commercial_simulation_created"
  | "multi_cotas_created"
  | "task_created"
  | "task_completed"
  | "task_cancelled";

export type CrmOperationalTimelineEventSource =
  | "crm_lead_notes"
  | "crm_lead_simulations"
  | "crm_tasks";

export type CrmOperationalTimelineEvent = {
  authorName: string;
  authorProfileId: string | null;
  description: string | null;
  id: string;
  leadId: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  source: CrmOperationalTimelineEventSource;
  sourceId: string;
  title: string;
  type: CrmOperationalTimelineEventType;
};

export type CrmTimelineReadModel = {
  events: CrmOperationalTimelineEvent[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
  };
};
