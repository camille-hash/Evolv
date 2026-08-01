export const commercialProposalSources = [
  "conservative",
  "recommended",
  "patrimonial",
] as const;

export type CommercialProposalSource =
  (typeof commercialProposalSources)[number];

export const commercialProposalStatuses = [
  "draft",
  "generated",
  "presented",
  "approved",
  "rejected",
  "expired",
  "superseded",
  "saved",
] as const;

export type CommercialProposalStatus =
  (typeof commercialProposalStatuses)[number];

export const commercialProposalAuditEventTypes = [
  "created",
  "version_created",
  "presented",
  "approved",
  "rejected",
  "expired",
  "superseded",
] as const;

export type CommercialProposalAuditEventType =
  (typeof commercialProposalAuditEventTypes)[number];

export type CommercialProposalSnapshot = Record<string, unknown>;

export type CommercialProposalSummary = {
  commercialCredit?: number | null;
  contemplationMonth?: number | null;
  estimatedGain?: number | null;
  estimatedRoi?: number | null;
  estimatedSaleValue?: number | null;
  monthlyPayment?: number | null;
  postContemplationPayment?: number | null;
  [key: string]: unknown;
};

export type CommercialProposalAssembly = {
  dayOfMonth: number | null;
  effectiveNextAssemblyDate: string | null;
  source: "calculated" | "manual" | null;
  suggestedNextAssemblyDate: string | null;
};

export type CommercialProposal = {
  approvedAt: string | null;
  approvedBy: string | null;
  assembly: CommercialProposalAssembly;
  createdAt: string;
  createdBy: string | null;
  expiredAt: string | null;
  id: string;
  leadId: string;
  metadata: CommercialProposalSnapshot;
  organizationId: string;
  originalSnapshot: CommercialProposalSnapshot;
  previousVersionId: string | null;
  proposalNumber: string;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rootProposalId: string | null;
  savedSnapshot: CommercialProposalSnapshot;
  simulationId: string | null;
  sourceSuggestion: CommercialProposalSource;
  status: CommercialProposalStatus;
  summary: CommercialProposalSummary;
  supersededAt: string | null;
  supersededBy: string | null;
  title: string;
  updatedAt: string;
  version: number;
};

export type CreateCommercialProposalInput = {
  assembly?: Partial<CommercialProposalAssembly> | null;
  leadId: string;
  metadata?: CommercialProposalSnapshot;
  originalSnapshot: CommercialProposalSnapshot;
  savedSnapshot: CommercialProposalSnapshot;
  simulationId?: string | null;
  sourceSuggestion: CommercialProposalSource;
  status?: Extract<CommercialProposalStatus, "draft" | "generated" | "saved">;
  summary?: CommercialProposalSummary;
  title: string;
};

export type CreateCommercialProposalVersionInput = Omit<
  CreateCommercialProposalInput,
  "leadId" | "simulationId" | "sourceSuggestion" | "status"
> & {
  previousProposalId: string;
  status?: Extract<CommercialProposalStatus, "draft" | "generated">;
};

export type CommercialProposalApprovalInput = {
  approvedBy?: string | null;
  proposalId: string;
};

export function isCommercialProposalSource(
  value: unknown,
): value is CommercialProposalSource {
  return (
    typeof value === "string" &&
    commercialProposalSources.includes(value as CommercialProposalSource)
  );
}

export function isCommercialProposalStatus(
  value: unknown,
): value is CommercialProposalStatus {
  return (
    typeof value === "string" &&
    commercialProposalStatuses.includes(value as CommercialProposalStatus)
  );
}
