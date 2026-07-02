export type OperationsClientStatus =
  | "active"
  | "attention"
  | "inactive"
  | "unknown";

export type OperationsClientRow = {
  activeContractsCount: number;
  administrators: string[];
  attentionItems: string[];
  contractsCount: number;
  createdAt?: string;
  email?: string;
  estimatedRevenue: number;
  id: string;
  name: string;
  phone?: string;
  recognizedRevenue: number;
  status: OperationsClientStatus;
  totalCreditValue: number;
  updatedAt?: string;
};

export type OperationsClientsSummary = {
  activeClients: number;
  clientsWithAttention: number;
  clientsWithContracts: number;
  clientsWithoutContracts: number;
  estimatedRevenue: number;
  recognizedRevenue: number;
  totalClients: number;
  totalCreditValue: number;
};

export type OperationsClientsResponse = {
  clients: OperationsClientRow[];
  summary: OperationsClientsSummary;
};
