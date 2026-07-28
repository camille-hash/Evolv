export const contractBidOfferStatuses = [
  "draft",
  "generated",
  "sent",
  "approved",
  "rejected",
  "expired",
  "cancelled",
  "submitted",
] as const;

export type ContractBidOfferStatus =
  (typeof contractBidOfferStatuses)[number];
export type ContractBidOfferChannel =
  | "download"
  | "email"
  | "whatsapp"
  | "other";

export type ContractBidOffer = {
  administratorName: string;
  approvedAt?: string;
  assemblyDate: string;
  assemblyId: string;
  bidId?: string;
  cashAmount: number;
  cashPercentage?: number;
  clientEmail?: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  contractId: string;
  contractName: string;
  createdAt: string;
  creditBaseAmount: number;
  embeddedAmount: number;
  embeddedPercentage?: number;
  estimatedNetCredit?: number;
  generatedAt?: string;
  groupNumber?: string;
  id: string;
  notes?: string;
  quotaNumber?: string;
  rejectedAt?: string;
  sentAt?: string;
  sentChannel?: ContractBidOfferChannel;
  status: ContractBidOfferStatus;
  totalAmount: number;
  totalPercentage?: number;
  version: number;
};

export type SaveContractBidOfferInput = {
  assemblyId: string;
  bidId?: string;
  cashAmount: number;
  embeddedAmount: number;
  id: string;
  notes?: string;
};
