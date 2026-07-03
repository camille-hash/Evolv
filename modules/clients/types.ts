import type { ContractStatus } from "@/modules/contracts/types";

export type ClientSummary = {
  activeContractsCount: number;
  contractsCount: number;
  draftContractsCount: number;
  totalCreditAmount: number;
};

export type ClientListItem = {
  activeContractsCount: number;
  contractsCount: number;
  createdAt: string;
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  status: string;
  totalCreditAmount: number;
  updatedAt: string;
};

export type ClientDetail = {
  createdAt: string;
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  status: string;
  updatedAt: string;
};

export type ClientContract = {
  administratorId: string | null;
  commissionPlanId: string | null;
  contractNumber: string | null;
  createdAt: string;
  creditAmount: number;
  id: string;
  installmentAmount: number | null;
  leadId: string | null;
  productType: string | null;
  status: ContractStatus;
  termMonths: number | null;
  updatedAt: string;
};

export type ClientDetailResponse = {
  client: ClientDetail;
  contracts: ClientContract[];
  summary: ClientSummary;
};

export type ClientListFilters = {
  limit?: number;
  offset?: number;
  search?: string | null;
  status?: string | null;
};

export type LeadClientConversion = {
  client: ClientDetail;
  created: boolean;
  lead: {
    id: string;
  };
};
