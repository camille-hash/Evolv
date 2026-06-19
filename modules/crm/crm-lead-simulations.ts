export const crmLeadSimulationTypes = ["commercial", "multi_cotas"] as const;

export type CrmLeadSimulationType = (typeof crmLeadSimulationTypes)[number];

export const crmLeadSimulationStatuses = [
  "draft",
  "presented",
  "proposal_generated",
  "pdf_generated",
  "pdf_sent",
  "archived",
] as const;

export type CrmLeadSimulationPersistentStatus =
  (typeof crmLeadSimulationStatuses)[number];

export const crmLeadSimulationSources = [
  "lead_detail",
  "simulator",
  "multi_cotas",
  "api",
] as const;

export type CrmLeadSimulationSource =
  (typeof crmLeadSimulationSources)[number];

export type CrmLeadSimulationSnapshot = Record<string, unknown>;

export type CrmLeadSimulationSummary = {
  commercialCredit?: number | null;
  contemplationMonth?: number | null;
  estimatedGain?: number | null;
  estimatedRoi?: number | null;
  estimatedSaleValue?: number | null;
  inccRate?: number | null;
  monthlyPayment?: number | null;
  postContemplationPayment?: number | null;
  quotaCount?: number | null;
  totalCredit?: number | null;
  updatedCredit?: number | null;
  [key: string]: unknown;
};

export type CrmLeadSimulation = {
  archivedAt: string | null;
  archivedBy: string | null;
  calculationSnapshot: CrmLeadSimulationSnapshot;
  commercialCredit: number | null;
  contemplationMonth: number | null;
  createdAt: string;
  createdBy: string | null;
  estimatedGain: number | null;
  estimatedRoi: number | null;
  estimatedSaleValue: number | null;
  id: string;
  inccRate: number | null;
  leadId: string;
  monthlyPayment: number | null;
  organizationId: string;
  pdfGeneratedAt: string | null;
  pdfGeneratedBy: string | null;
  pdfSentAt: string | null;
  pdfSentBy: string | null;
  postContemplationPayment: number | null;
  presentationSnapshot: CrmLeadSimulationSnapshot;
  presentedAt: string | null;
  presentedBy: string | null;
  proposalGeneratedAt: string | null;
  proposalGeneratedBy: string | null;
  quotaCount: number | null;
  simulationType: CrmLeadSimulationType;
  source: CrmLeadSimulationSource;
  status: CrmLeadSimulationPersistentStatus;
  summary: CrmLeadSimulationSummary;
  technicalInput: CrmLeadSimulationSnapshot;
  title: string;
  totalCredit: number | null;
  updatedAt: string;
  updatedCredit: number | null;
};

export type CreateCrmLeadSimulationInput = {
  calculationSnapshot: CrmLeadSimulationSnapshot;
  leadId: string;
  presentationSnapshot: CrmLeadSimulationSnapshot;
  simulationType: CrmLeadSimulationType;
  source?: CrmLeadSimulationSource;
  summary?: CrmLeadSimulationSummary;
  technicalInput: CrmLeadSimulationSnapshot;
  title: string;
};

export type LeadSimulationCommercialEvent =
  | "presented"
  | "proposal_generated"
  | "pdf_generated"
  | "pdf_sent"
  | "archived";

export function isCrmLeadSimulationType(
  value: unknown,
): value is CrmLeadSimulationType {
  return (
    typeof value === "string" &&
    crmLeadSimulationTypes.includes(value as CrmLeadSimulationType)
  );
}

export function isCrmLeadSimulationSource(
  value: unknown,
): value is CrmLeadSimulationSource {
  return (
    typeof value === "string" &&
    crmLeadSimulationSources.includes(value as CrmLeadSimulationSource)
  );
}

export function isCrmLeadSimulationStatus(
  value: unknown,
): value is CrmLeadSimulationPersistentStatus {
  return (
    typeof value === "string" &&
    crmLeadSimulationStatuses.includes(
      value as CrmLeadSimulationPersistentStatus,
    )
  );
}
