export type CommissionPlanStatus = "active" | "inactive";

export type CommissionType = "fixed" | "hybrid" | "percentage";

export type CommissionPaymentTrigger =
  | "contract_activation"
  | "contract_approved"
  | "contract_signed"
  | "contract_submitted"
  | "manual";

export type CommissionPlan = {
  administratorId: string;
  commissionFixedAmount: number | null;
  commissionPercentage: number | null;
  commissionType: CommissionType;
  createdAt: string;
  createdBy: string | null;
  id: string;
  metadata: Record<string, unknown>;
  name: string;
  organizationId: string;
  paymentInstallments: number;
  paymentTrigger: CommissionPaymentTrigger;
  status: CommissionPlanStatus;
  updatedAt: string;
  updatedBy: string | null;
};

export type CommissionPlanCreateInput = {
  administratorId: string;
  commissionFixedAmount?: number | null;
  commissionPercentage?: number | null;
  commissionType: CommissionType;
  metadata?: Record<string, unknown>;
  name: string;
  paymentInstallments?: number;
  paymentTrigger: CommissionPaymentTrigger;
  status?: CommissionPlanStatus;
};

export type CommissionPlanUpdateInput = {
  administratorId?: string;
  commissionFixedAmount?: number | null;
  commissionPercentage?: number | null;
  commissionType?: CommissionType;
  metadata?: Record<string, unknown>;
  name?: string;
  paymentInstallments?: number;
  paymentTrigger?: CommissionPaymentTrigger;
  status?: CommissionPlanStatus;
};

export type CommissionPlanListFilters = {
  administratorId?: string | null;
  limit?: number;
  offset?: number;
  search?: string | null;
  status?: CommissionPlanStatus | null;
};
