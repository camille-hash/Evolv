export const crmLeadKnowledgeTypes = [
  "financial",
  "behavioral",
  "commercial",
  "relationship",
  "strategic",
  "wealth",
  "risk",
  "objective",
  "communication",
  "objection",
  "motivation",
  "timing",
  "profile",
] as const;

export type CrmLeadKnowledgeType = (typeof crmLeadKnowledgeTypes)[number];

export const crmLeadKnowledgeCategories = [
  "DECLARED",
  "OBSERVED",
  "INFERRED",
  "CALCULATED",
  "DECIDED",
  "LEARNED",
] as const;

export type CrmLeadKnowledgeCategory =
  (typeof crmLeadKnowledgeCategories)[number];

export const crmLeadKnowledgeConfidences = [
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNKNOWN",
] as const;

export type CrmLeadKnowledgeConfidence =
  (typeof crmLeadKnowledgeConfidences)[number];

export const crmLeadKnowledgeStatuses = ["ACTIVE", "ARCHIVED"] as const;

export type CrmLeadKnowledgeStatus =
  (typeof crmLeadKnowledgeStatuses)[number];

export type CrmLeadKnowledgeItem = {
  archivedAt: string | null;
  confidence: CrmLeadKnowledgeConfidence;
  createdAt: string;
  createdBy: string | null;
  id: string;
  knowledgeCategory: CrmLeadKnowledgeCategory;
  knowledgeType: CrmLeadKnowledgeType;
  leadId: string;
  organizationId: string;
  source: string;
  status: CrmLeadKnowledgeStatus;
  summary: string | null;
  title: string;
  updatedAt: string;
};

export type CreateCrmLeadKnowledgeItemInput = {
  confidence?: CrmLeadKnowledgeConfidence;
  knowledgeCategory?: CrmLeadKnowledgeCategory;
  knowledgeType: CrmLeadKnowledgeType;
  leadId: string;
  summary?: string | null;
  title: string;
};

export function isCrmLeadKnowledgeType(
  value: unknown,
): value is CrmLeadKnowledgeType {
  return (
    typeof value === "string" &&
    crmLeadKnowledgeTypes.includes(value as CrmLeadKnowledgeType)
  );
}

export function isCrmLeadKnowledgeCategory(
  value: unknown,
): value is CrmLeadKnowledgeCategory {
  return (
    typeof value === "string" &&
    crmLeadKnowledgeCategories.includes(value as CrmLeadKnowledgeCategory)
  );
}

export function isCrmLeadKnowledgeConfidence(
  value: unknown,
): value is CrmLeadKnowledgeConfidence {
  return (
    typeof value === "string" &&
    crmLeadKnowledgeConfidences.includes(value as CrmLeadKnowledgeConfidence)
  );
}

export function isCrmLeadKnowledgeStatus(
  value: unknown,
): value is CrmLeadKnowledgeStatus {
  return (
    typeof value === "string" &&
    crmLeadKnowledgeStatuses.includes(value as CrmLeadKnowledgeStatus)
  );
}

export const knowledgeEvidenceTypes = [
  "note",
  "task",
  "simulation",
  "document",
  "conversation",
  "manual",
] as const;

export type KnowledgeEvidenceType = (typeof knowledgeEvidenceTypes)[number];

export const knowledgeEvidenceStatuses = ["ACTIVE", "ARCHIVED"] as const;

export type KnowledgeEvidenceStatus =
  (typeof knowledgeEvidenceStatuses)[number];

export type KnowledgeEvidence = {
  archivedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  evidenceType: KnowledgeEvidenceType;
  id: string;
  knowledgeItemId: string;
  leadId: string;
  organizationId: string;
  source: string;
  sourceReference: string | null;
  status: KnowledgeEvidenceStatus;
  summary: string | null;
  title: string;
  updatedAt: string;
};

export type CreateKnowledgeEvidenceInput = {
  evidenceType: KnowledgeEvidenceType;
  knowledgeItemId: string;
  source?: string | null;
  sourceReference?: string | null;
  summary?: string | null;
  title: string;
};

export function isKnowledgeEvidenceType(
  value: unknown,
): value is KnowledgeEvidenceType {
  return (
    typeof value === "string" &&
    knowledgeEvidenceTypes.includes(value as KnowledgeEvidenceType)
  );
}

export function isKnowledgeEvidenceStatus(
  value: unknown,
): value is KnowledgeEvidenceStatus {
  return (
    typeof value === "string" &&
    knowledgeEvidenceStatuses.includes(value as KnowledgeEvidenceStatus)
  );
}
