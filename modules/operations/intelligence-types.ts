export type OperationalInsightSeverity = "attention" | "critical" | "info";

export type OperationalInsightCategory =
  | "administrators"
  | "clients"
  | "contracts"
  | "operation"
  | "portfolio"
  | "revenue";

export type OperationalInsight = {
  category: OperationalInsightCategory;
  description: string;
  href?: string;
  id: string;
  priority: number;
  severity: OperationalInsightSeverity;
  title: string;
};

export type OperationalPriorityBanner = {
  description: string;
  severity: OperationalInsightSeverity;
  title: string;
};
