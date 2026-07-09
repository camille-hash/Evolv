export type OperationsPortfolioStatus =
  | "attention"
  | "concentrated"
  | "empty"
  | "healthy"
  | "unknown";

export type OperationsPortfolioExposureType = "administrator" | "client";

export type OperationsPortfolioExposureRow = {
  attentionItems: string[];
  contractsCount: number;
  estimatedRevenue: number;
  exposurePercentage: number;
  id: string;
  label: string;
  recognizedRevenue: number;
  status: OperationsPortfolioStatus;
  totalCreditValue: number;
  type: OperationsPortfolioExposureType;
};

export type OperationsPortfolioContractRow = {
  administratorName: string;
  attentionItems: string[];
  clientName: string;
  contractNumber?: string;
  creditValue: number;
  estimatedRevenue: number;
  id: string;
  recognizedRevenue: number;
};

export type OperationsPortfolioSummary = {
  activeCreditValue: number;
  attentionItems: string[];
  estimatedRevenue: number;
  largestAdministratorExposurePercentage: number;
  largestClientExposurePercentage: number;
  recognizedRevenue: number;
  totalAdministrators: number;
  totalClients: number;
  totalContracts: number;
  totalPortfolioValue: number;
};

export type OperationsPortfolioResponse = {
  administratorExposures: OperationsPortfolioExposureRow[];
  clientExposures: OperationsPortfolioExposureRow[];
  contracts: OperationsPortfolioContractRow[];
  summary: OperationsPortfolioSummary;
};
