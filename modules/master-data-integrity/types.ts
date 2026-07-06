export type IntegrityIssueCode =
  | "MDR-001"
  | "MDR-002"
  | "MDR-003"
  | "MDR-004"
  | "MDR-005"
  | "MDR-006"
  | "MDR-007"
  | "MDR-008"
  | "MDR-009"
  | "MDR-010";

export type IntegrityIssueSeverity = "error" | "warning";

export type IntegrityIssueEntityType =
  | "commission_plan"
  | "contract"
  | "contract_commission_snapshot"
  | "expected_revenue_entry";

export type IntegrityIssue = {
  code: IntegrityIssueCode;
  description: string;
  entityId: string;
  entityType: IntegrityIssueEntityType;
  metadata: Record<string, unknown>;
  recommendation: string;
  severity: IntegrityIssueSeverity;
  title: string;
};

export type MasterDataIntegrityContractRecord = {
  administratorId: string | null;
  administratorName: string | null;
  clientId: string | null;
  clientName: string | null;
  commissionPlanId: string | null;
  commissionPlanName: string | null;
  commissionPlanStatus: string | null;
  contractCommissionScheduleItemsCount: number;
  contractId: string;
  contractNumber: string | null;
  creditAmount: number;
  expectedRevenueEntriesCount: number;
  hasSnapshot: boolean;
  issues: IntegrityIssue[];
  planScheduleItemsCount: number;
  snapshotCount: number;
  snapshotItemsCount: number;
  status: string;
};

export type MasterDataIntegrityContractsSummary = {
  contractsWithIssues: number;
  errors: number;
  scannedAt: string;
  totalContracts: number;
  totalIssues: number;
  warnings: number;
};

export type MasterDataIntegrityContractsResponse = {
  contracts: MasterDataIntegrityContractRecord[];
  issues: IntegrityIssue[];
  summary: MasterDataIntegrityContractsSummary;
};

export type MasterDataIntegrityContractsResult =
  | {
      ok: true;
      response: MasterDataIntegrityContractsResponse;
    }
  | {
      error: string;
      ok: false;
      status: number;
    };
