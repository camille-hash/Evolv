export type OperationsRevenueStatus =
  | "attention"
  | "cancelled"
  | "expected"
  | "pending"
  | "recognized";

export type OperationsRevenueRow = {
  administratorName: string;
  attentionItems: string[];
  clientName: string;
  contractId: string;
  contractNumber?: string;
  dueDate?: string;
  expectedAmount: number;
  id: string;
  paidAt?: string;
  recognizedAmount: number;
  status: OperationsRevenueStatus;
};

export type OperationsRevenueSummary = {
  divergentEntries: number;
  expectedRevenue: number;
  pendingRevenue: number;
  recognizedPercentage: number;
  recognizedRevenue: number;
  totalEntries: number;
};

export type OperationsRevenueResponse = {
  entries: OperationsRevenueRow[];
  summary: OperationsRevenueSummary;
};
