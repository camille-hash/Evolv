export type OperationsContractStatus =
  | "active"
  | "attention"
  | "cancelled"
  | "completed"
  | "pending"
  | "unknown";

export type OperationsContractRow = {
  administratorName: string;
  attentionItems: string[];
  clientName: string;
  contractNumber?: string;
  createdAt?: string;
  creditValue: number;
  estimatedRevenue: number;
  id: string;
  recognizedRevenue: number;
  sourceStatus?: string;
  status: OperationsContractStatus;
  updatedAt?: string;
};

export type OperationsContractsSummary = {
  activeContracts: number;
  attentionContracts: number;
  estimatedRevenue: number;
  recognizedRevenue: number;
  totalContracts: number;
  totalCreditValue: number;
};

export type OperationsContractsResponse = {
  contracts: OperationsContractRow[];
  summary: OperationsContractsSummary;
};
