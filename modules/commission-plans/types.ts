export type CommissionPlanStatus = "active" | "inactive";

export type CommissionType = "fixed" | "hybrid" | "percentage";

export type CommissionPaymentTrigger =
  | "contract_activation"
  | "contract_approved"
  | "contract_signed"
  | "contract_submitted"
  | "manual";

export type CommissionScheduleEventType = "contemplation" | "installment";

export type CommissionPlanScheduleItem = {
  amount: number;
  dueDate: string | null;
  eventType: CommissionScheduleEventType;
  id: string;
  installmentNumber: number | null;
  offsetDays: number | null;
  offsetMonths: number | null;
  percentage: number;
  sortOrder: number;
};

export type CommissionPlanScheduleItemInput = {
  amount?: number;
  dueDate?: string | null;
  eventType: CommissionScheduleEventType;
  installmentNumber?: number | null;
  offsetDays?: number | null;
  offsetMonths?: number | null;
  percentage: number;
  sortOrder?: number;
};

export type CommissionPlan = {
  administratorId: string;
  administrationFeePercentage: number | null;
  commissionFixedAmount: number | null;
  commissionPercentage: number | null;
  commissionType: CommissionType;
  contractTermMonths: number | null;
  createdAt: string;
  createdBy: string | null;
  id: string;
  metadata: Record<string, unknown>;
  name: string;
  organizationId: string;
  paymentInstallments: number;
  paymentTrigger: CommissionPaymentTrigger;
  referenceCreditAmount: number | null;
  scheduleItems: CommissionPlanScheduleItem[];
  status: CommissionPlanStatus;
  totalScheduleAmount: number | null;
  totalSchedulePercentage: number | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type CommissionPlanCreateInput = {
  administratorId: string;
  administrationFeePercentage?: number | null;
  commissionFixedAmount?: number | null;
  commissionPercentage?: number | null;
  commissionType: CommissionType;
  contractTermMonths?: number | null;
  metadata?: Record<string, unknown>;
  name: string;
  paymentInstallments?: number;
  paymentTrigger: CommissionPaymentTrigger;
  referenceCreditAmount?: number | null;
  scheduleItems?: CommissionPlanScheduleItemInput[];
  status?: CommissionPlanStatus;
};

export type CommissionPlanUpdateInput = {
  administratorId?: string;
  administrationFeePercentage?: number | null;
  commissionFixedAmount?: number | null;
  commissionPercentage?: number | null;
  commissionType?: CommissionType;
  contractTermMonths?: number | null;
  metadata?: Record<string, unknown>;
  name?: string;
  paymentInstallments?: number;
  paymentTrigger?: CommissionPaymentTrigger;
  referenceCreditAmount?: number | null;
  scheduleItems?: CommissionPlanScheduleItemInput[];
  status?: CommissionPlanStatus;
};

export type CommissionPlanListFilters = {
  administratorId?: string | null;
  limit?: number;
  offset?: number;
  search?: string | null;
  status?: CommissionPlanStatus | null;
};
