export type OperationsTimelineArea =
  | "administrators"
  | "attention"
  | "clients"
  | "contracts"
  | "operation"
  | "portfolio"
  | "revenue";

export type OperationsTimelineSeverity = "attention" | "critical" | "info";

export type OperationsTimelineEventType =
  | "client_created"
  | "contract_activated"
  | "contract_approved"
  | "contract_cancelled"
  | "contract_completed"
  | "contract_created"
  | "contract_inactivated"
  | "contract_reactivated"
  | "contract_rejected"
  | "contract_submitted"
  | "revenue_recognized";

export type OperationsTimelineItem = {
  area: OperationsTimelineArea;
  description: string;
  eventType: OperationsTimelineEventType;
  href?: string;
  id: string;
  occurredAt: string;
  severity: OperationsTimelineSeverity;
  title: string;
};

export type OperationsTimelineResponse = {
  items: OperationsTimelineItem[];
};
