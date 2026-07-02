import type {
  OperationalInsight,
  OperationalPriorityBanner,
} from "./intelligence-types";
import type { OperationsHealthScore } from "./health-score-types";

export type OperationalHealthStatus = "attention" | "critical" | "healthy" | "neutral";

export type OperationAttentionSeverity = "critical" | "high" | "medium" | "low";

export type OperationAttentionArea =
  | "administrators"
  | "clients"
  | "contracts"
  | "portfolio"
  | "revenue";

export type OperationAttentionItem = {
  area: OperationAttentionArea;
  description: string;
  href?: string;
  id: string;
  severity: OperationAttentionSeverity;
  title: string;
  value: string;
};

export type OperationDrilldownCard = {
  description: string;
  href?: string;
  id: string;
  label: string;
  status: OperationalHealthStatus;
  value: string;
};

export type OperationMovementItem = {
  description: string;
  id: string;
  occurredAt: string;
  title: string;
  type: "administrator" | "client" | "contract" | "portfolio" | "revenue";
};

export type OperationsSnapshotMetric = {
  id: string;
  label: string;
  tone: OperationalHealthStatus;
  value: string;
};

export type OperationsSummary = {
  attentionItems: OperationAttentionItem[];
  drilldowns: OperationDrilldownCard[];
  generatedAt: string;
  healthScore: OperationsHealthScore;
  healthStatus: OperationalHealthStatus;
  insights: OperationalInsight[];
  movementFeed: OperationMovementItem[];
  priorityBanner?: OperationalPriorityBanner;
  snapshot: OperationsSnapshotMetric[];
};
