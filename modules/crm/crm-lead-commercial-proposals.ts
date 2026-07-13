export const crmLeadCommercialProposalSources = [
  "conservative",
  "recommended",
  "patrimonial",
] as const;

export type CrmLeadCommercialProposalSource =
  (typeof crmLeadCommercialProposalSources)[number];

export const crmLeadCommercialProposalStatuses = ["saved"] as const;

export type CrmLeadCommercialProposalStatus =
  (typeof crmLeadCommercialProposalStatuses)[number];

export type CrmLeadCommercialProposalSnapshot = Record<string, unknown>;

export type CrmLeadCommercialProposalSummary = {
  commercialCredit?: number | null;
  contemplationMonth?: number | null;
  estimatedGain?: number | null;
  estimatedRoi?: number | null;
  estimatedSaleValue?: number | null;
  monthlyPayment?: number | null;
  postContemplationPayment?: number | null;
  [key: string]: unknown;
};

export type CrmLeadCommercialProposal = {
  createdAt: string;
  createdBy: string | null;
  id: string;
  leadId: string;
  metadata: CrmLeadCommercialProposalSnapshot;
  organizationId: string;
  originalSnapshot: CrmLeadCommercialProposalSnapshot;
  savedSnapshot: CrmLeadCommercialProposalSnapshot;
  sourceSuggestion: CrmLeadCommercialProposalSource;
  status: CrmLeadCommercialProposalStatus;
  summary: CrmLeadCommercialProposalSummary;
  title: string;
  updatedAt: string;
};

export type CreateCrmLeadCommercialProposalInput = {
  leadId: string;
  metadata?: CrmLeadCommercialProposalSnapshot;
  originalSnapshot: CrmLeadCommercialProposalSnapshot;
  savedSnapshot: CrmLeadCommercialProposalSnapshot;
  sourceSuggestion: CrmLeadCommercialProposalSource;
  summary?: CrmLeadCommercialProposalSummary;
  title: string;
};

export function isCrmLeadCommercialProposalSource(
  value: unknown,
): value is CrmLeadCommercialProposalSource {
  return (
    typeof value === "string" &&
    crmLeadCommercialProposalSources.includes(
      value as CrmLeadCommercialProposalSource,
    )
  );
}

export function isCrmLeadCommercialProposalStatus(
  value: unknown,
): value is CrmLeadCommercialProposalStatus {
  return (
    typeof value === "string" &&
    crmLeadCommercialProposalStatuses.includes(
      value as CrmLeadCommercialProposalStatus,
    )
  );
}
