export type OperationsAdministratorStatus =
  | "attention"
  | "concentrated"
  | "healthy"
  | "inactive"
  | "unknown";

export type OperationsAdministratorRow = {
  activeContractsCount: number;
  attentionItems: string[];
  clientsCount: number;
  contractsCount: number;
  createdAt?: string;
  estimatedRevenue: number;
  exposurePercentage: number;
  id: string;
  name: string;
  recognizedRevenue: number;
  status: OperationsAdministratorStatus;
  totalCreditValue: number;
  updatedAt?: string;
};

export type OperationsAdministratorsSummary = {
  activeAdministrators: number;
  administratorsWithAttention: number;
  administratorsWithContracts: number;
  administratorsWithoutContracts: number;
  estimatedRevenue: number;
  largestExposurePercentage: number;
  recognizedRevenue: number;
  totalAdministrators: number;
  totalCreditValue: number;
};

export type OperationsAdministratorsResponse = {
  administrators: OperationsAdministratorRow[];
  summary: OperationsAdministratorsSummary;
};
