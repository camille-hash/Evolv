export type OperationsHealthScoreStatus =
  | "attention"
  | "critical"
  | "healthy"
  | "stable";

export type OperationsHealthScoreFactor = {
  description: string;
  id: string;
  impact: "negative" | "neutral" | "positive";
  label: string;
};

export type OperationsHealthScore = {
  description: string;
  factors: OperationsHealthScoreFactor[];
  score: number;
  status: OperationsHealthScoreStatus;
  title: string;
};
