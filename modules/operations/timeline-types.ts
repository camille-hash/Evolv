export type OperationsTimelineArea =
  | "administrators"
  | "attention"
  | "clients"
  | "contracts"
  | "operation"
  | "portfolio"
  | "revenue";

export type OperationsTimelineSeverity = "attention" | "critical" | "info";

export type OperationsTimelineItem = {
  area: OperationsTimelineArea;
  description: string;
  href?: string;
  id: string;
  occurredAt: string;
  severity: OperationsTimelineSeverity;
  title: string;
};

export type OperationsTimelineResponse = {
  items: OperationsTimelineItem[];
};
