import type { ContractCommissionSummary } from "@/modules/commission-engine/types";

export type OperationsContractStatus =
  | "active"
  | "attention"
  | "cancelled"
  | "completed"
  | "inactive"
  | "pending"
  | "unknown";

export type OperationsContractRow = {
  administratorName: string;
  attentionItems: string[];
  clientName: string;
  commissionSummary?: ContractCommissionSummary;
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
