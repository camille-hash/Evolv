export type ContractStatus =
  | "draft"
  | "pending_documentation"
  | "submitted"
  | "approved"
  | "active"
  | "inactive"
  | "completed"
  | "cancelled"
  | "rejected";

export type ContractInactiveAction =
  | "keep_future_entries"
  | "cancel_future_entries"
  | "cancel_totally";

export type ContractInput = {
  activatedAt?: string | null;
  administratorId?: string | null;
  approvedAt?: string | null;
  cancelledAt?: string | null;
  clientId?: string | null;
  commissionPlanId?: string | null;
  completedAt?: string | null;
  contemplationModel?: string | null;
  contractNumber?: string | null;
  creditAmount?: number;
  installmentAmount?: number | null;
  leadId?: string | null;
  metadata?: Record<string, unknown>;
  productType?: string | null;
  rejectedAt?: string | null;
  signedAt?: string | null;
  status?: ContractStatus;
  submittedAt?: string | null;
  termMonths?: number | null;
};

export type Contract = {
  activatedAt: string | null;
  administratorId: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  clientId: string | null;
  commissionPlanId: string | null;
  completedAt: string | null;
  contemplationModel: string | null;
  contractNumber: string | null;
  createdAt: string;
  createdBy: string | null;
  creditAmount: number;
  id: string;
  installmentAmount: number | null;
  leadId: string | null;
  metadata: Record<string, unknown>;
  organizationId: string;
  productType: string | null;
  rejectedAt: string | null;
  signedAt: string | null;
  status: ContractStatus;
  submittedAt: string | null;
  termMonths: number | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type ContractListFilters = {
  administratorId?: string | null;
  clientId?: string | null;
  leadId?: string | null;
  limit?: number;
  offset?: number;
  status?: ContractStatus | null;
};

export type ContractStatusInput = {
  inactiveAction?: ContractInactiveAction | null;
  notes?: string | null;
  status: ContractStatus;
};

export type LeadContractSummary = {
  administratorId: string | null;
  clientId: string | null;
  commissionPlanId: string | null;
  contractNumber: string | null;
  createdAt: string;
  creditAmount: number;
  id: string;
  installmentAmount: number | null;
  productType: string | null;
  status: ContractStatus;
  termMonths: number | null;
  updatedAt: string;
};
