import type {
  CommissionPaymentTrigger,
  CommissionScheduleEventType,
  CommissionType,
} from "@/modules/commission-plans/types";

export type RevenueEntryType = "adjustment" | "bonus" | "chargeback" | "commission";

export type RevenueEntryStatus =
  | "cancelled"
  | "expected"
  | "overdue"
  | "paid"
  | "pending";

export type RevenueGenerationMode = "create_missing" | "replace_expected";

export type RevenueCalculationBase = {
  commissionFixedAmount: number | null;
  commissionPercentage: number | null;
  commissionType: CommissionType;
  creditAmount: number;
};

export type RevenueCommissionScheduleItemSnapshot = {
  eventType: CommissionScheduleEventType;
  id: string;
  installmentNumber: number | null;
  offsetDays: number | null;
  offsetMonths: number | null;
  percentage: number;
  sortOrder: number;
};

export type RevenueEntry = {
  actualAmount: number | null;
  administratorId: string | null;
  cancelledAt: string | null;
  clientId: string | null;
  contractId: string;
  createdAt: string;
  dueDate: string | null;
  expectedAmount: number;
  id: string;
  metadata: Record<string, unknown>;
  organizationId: string;
  paidAt: string | null;
  status: RevenueEntryStatus;
  type: RevenueEntryType;
  updatedAt: string;
};

export type RevenueGenerationResult = {
  createdEntries: RevenueEntry[];
  existingEntries: RevenueEntry[];
  skippedReason: string | null;
};

export type ExpectedRevenueInput = {
  dueDate?: string | null;
  expectedAmount: number;
  metadata?: Record<string, unknown>;
};

export type RevenueInstallmentDraft = {
  dueDate: string;
  eventType: CommissionScheduleEventType;
  expectedAmount: number;
  installmentNumber: number | null;
  installmentsTotal: number;
  metadata: Record<string, unknown>;
};

export type RevenueContractSnapshot = {
  administratorId: string | null;
  approvedAt: string | null;
  activatedAt: string | null;
  clientId: string | null;
  commissionPlanId: string | null;
  creditAmount: number;
  id: string;
  organizationId: string;
  signedAt: string | null;
  status: string;
  submittedAt: string | null;
};

export type RevenueCommissionPlanSnapshot = {
  commissionFixedAmount: number | null;
  commissionPercentage: number | null;
  commissionType: CommissionType;
  id: string;
  organizationId: string;
  paymentInstallments: number;
  paymentTrigger: CommissionPaymentTrigger;
  scheduleItems: RevenueCommissionScheduleItemSnapshot[];
  status: string;
};
