export type OperationsRevenueStatus =
  | "attention"
  | "cancelled"
  | "expected"
  | "pending"
  | "recognized";

export type OperationsRevenueSortField =
  | "cliente"
  | "contrato"
  | "status"
  | "valor"
  | "vencimento";

export type OperationsRevenueSortOrder = "asc" | "desc";

export type OperationsRevenueQuery = {
  administratorId?: string | null;
  clientId?: string | null;
  competency?: string | null;
  contract?: string | null;
  contractId?: string | null;
  dueFrom?: string | null;
  dueTo?: string | null;
  entryId?: string | null;
  maxAmount?: number | null;
  minAmount?: number | null;
  page?: number;
  pageSize?: number;
  search?: string | null;
  sort?: OperationsRevenueSortField;
  order?: OperationsRevenueSortOrder;
  status?: OperationsRevenueStatus | null;
};

export type OperationsRevenueRow = {
  administratorId?: string;
  administratorName: string;
  attentionItems: string[];
  clientId?: string;
  clientName: string;
  competency?: string;
  contractId: string;
  contractNumber?: string;
  contractStatus?: string;
  dueDate?: string;
  expectedAmount: number;
  id: string;
  paidAt?: string;
  planId?: string;
  planName?: string;
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

export type OperationsRevenueDailyMetric = {
  count: number;
  totalAmount: number;
};

export type OperationsRevenueCriticalEntry = {
  administratorName: string;
  clientName: string;
  contractId: string;
  contractNumber?: string;
  daysOverdue: number;
  dueDate?: string;
  expectedAmount: number;
  id: string;
  status: OperationsRevenueStatus;
};

export type OperationsRevenueDailyPanel = {
  criticalEntries: OperationsRevenueCriticalEntry[];
  dueToday: OperationsRevenueDailyMetric;
  dueTomorrow: OperationsRevenueDailyMetric;
  expectedToday: {
    totalAmount: number;
  };
  overdue: OperationsRevenueDailyMetric;
  receivedToday: OperationsRevenueDailyMetric;
};

export type OperationsRevenuePagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type OperationsRevenueFilterOption = {
  id: string;
  label: string;
};

export type OperationsRevenueFilterOptions = {
  administrators: OperationsRevenueFilterOption[];
  clients: OperationsRevenueFilterOption[];
  statuses: Array<{
    label: string;
    value: OperationsRevenueStatus;
  }>;
};

export type OperationsRevenueResponse = {
  dailyPanel: OperationsRevenueDailyPanel;
  entries: OperationsRevenueRow[];
  filters: OperationsRevenueFilterOptions;
  pagination: OperationsRevenuePagination;
  summary: OperationsRevenueSummary;
};
