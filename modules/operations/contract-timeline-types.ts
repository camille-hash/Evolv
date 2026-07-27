export type ContractAssemblyStatus =
  | "scheduled"
  | "completed"
  | "postponed"
  | "cancelled";

export type ContractBidModality = "free" | "fixed" | "loyalty" | "other";
export type ContractBidComposition = "cash" | "embedded" | "mixed";
export type ContractBidResult =
  | "draft"
  | "submitted"
  | "approved_by_client"
  | "rejected_by_client"
  | "not_contemplated"
  | "contemplated"
  | "cancelled";
export type ContractContemplationType =
  | "draw"
  | "free_bid"
  | "fixed_bid"
  | "other";

export type ContractAssembly = {
  assemblyDate: string;
  assemblyNumber?: string;
  contractId: string;
  id: string;
  notes?: string;
  status: ContractAssemblyStatus;
};

export type ContractBid = {
  assemblyId: string;
  bidComposition: ContractBidComposition;
  bidModality: ContractBidModality;
  cashAmount: number;
  cashPercentage?: number;
  contemplated?: boolean;
  contemplationType?: ContractContemplationType;
  contractId: string;
  creditBaseAmount: number;
  embeddedAmount: number;
  embeddedPercentage?: number;
  id: string;
  notes?: string;
  result: ContractBidResult;
  submittedAt?: string;
  totalAmount: number;
  totalPercentage?: number;
  winningPercentage?: number;
};

export type ContractTimelineEventType =
  | "contract_created"
  | "assembly_scheduled"
  | "assembly_updated"
  | "assembly_completed"
  | "bid_created"
  | "bid_submitted"
  | "bid_result_recorded"
  | "contemplated"
  | "note_added";

export type ContractTimelineEvent = {
  description?: string;
  eventAt: string;
  eventType: ContractTimelineEventType;
  id: string;
  metadata: Record<string, unknown>;
  sourceEntityId?: string;
  sourceEntityType?: "contract" | "assembly" | "bid";
  title: string;
};

export type ContractOperationalTimeline = {
  assemblies: ContractAssembly[];
  bids: ContractBid[];
  events: ContractTimelineEvent[];
};

export type RegisterAssemblyInput = {
  assemblyDate: string;
  assemblyNumber?: string;
  id: string;
  notes?: string;
  status: ContractAssemblyStatus;
};

export type RegisterBidInput = {
  assemblyId: string;
  bidComposition: ContractBidComposition;
  bidModality: ContractBidModality;
  cashAmount: number;
  embeddedAmount: number;
  id: string;
  notes?: string;
  result: ContractBidResult;
  submittedAt?: string;
};

export type RegisterBidResultInput = {
  contemplated: boolean;
  contemplationType?: ContractContemplationType;
  notes?: string;
  winningPercentage?: number;
};
