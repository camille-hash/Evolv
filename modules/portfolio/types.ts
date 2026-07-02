export type PortfolioSummary = {
  activeContractsCount: number;
  activeCreditAmount: number;
  cancelledContractsCount: number;
  cancelledRevenueAmount: number;
  clientsCount: number;
  completedContractsCount: number;
  contractsCount: number;
  draftContractsCount: number;
  expectedRevenueAmount: number;
  overdueRevenueAmount: number;
  paidRevenueAmount: number;
  pendingRevenueAmount: number;
  totalCreditAmount: number;
};

export type PortfolioByAdministrator = {
  activeContractsCount: number;
  administratorId: string | null;
  administratorName: string;
  contractsCount: number;
  expectedRevenueAmount: number;
  paidRevenueAmount: number;
  totalCreditAmount: number;
};

export type PortfolioByStatus = {
  contractsCount: number;
  expectedRevenueAmount: number;
  status: string;
  totalCreditAmount: number;
};

export type PortfolioClient = {
  activeContractsCount: number;
  clientId: string;
  clientName: string;
  contractsCount: number;
  expectedRevenueAmount: number;
  lastContractAt: string | null;
  paidRevenueAmount: number;
  totalCreditAmount: number;
};

export type PortfolioSummaryResponse = {
  byAdministrator: PortfolioByAdministrator[];
  byStatus: PortfolioByStatus[];
  summary: PortfolioSummary;
  topClients: PortfolioClient[];
};

export type PortfolioClientFilters = {
  limit?: number;
  offset?: number;
  search?: string | null;
  status?: string | null;
};
