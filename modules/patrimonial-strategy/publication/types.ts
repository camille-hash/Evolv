import type { StrategyArtifactReference } from "../types.ts";
import type { ReferenceCapitalStrategySnapshot } from "../reference-capital-2227.ts";

export const patrimonialPublicationTypes = [
  "executive_material",
  "technical_material",
  "whatsapp_summary",
  "email_brief",
  "web_publication",
] as const;

export type PatrimonialPublicationType =
  (typeof patrimonialPublicationTypes)[number];

export const implementedPatrimonialPublicationTypes = [
  "executive_material",
] as const;

export type ImplementedPatrimonialPublicationType =
  (typeof implementedPatrimonialPublicationTypes)[number];

export const patrimonialPublicationStatuses = [
  "draft",
  "ready",
  "rendered",
  "archived",
] as const;

export type PatrimonialPublicationStatus =
  (typeof patrimonialPublicationStatuses)[number];

export const patrimonialPublicationAudiences = ["client", "internal"] as const;

export type PatrimonialPublicationAudience =
  (typeof patrimonialPublicationAudiences)[number];

export const patrimonialPublicationChapterCategories = [
  "identity",
  "strategy",
  "product",
  "composition",
  "financial",
  "advisory",
  "technical",
  "legal",
] as const;

export type PatrimonialPublicationChapterCategory =
  (typeof patrimonialPublicationChapterCategories)[number];

export const patrimonialPublicationChapterKeys = [
  "cover",
  "strategy_synthesis",
  "used_product",
  "quota_structure",
  "installment_evolution",
  "conditions_disclaimers",
  "client_objectives",
  "patrimonial_consulting",
  "contemplation_scenarios",
  "calculation_memory",
] as const;

export type PatrimonialPublicationChapterKey =
  (typeof patrimonialPublicationChapterKeys)[number];

export type PatrimonialPublicationChapterRequirement =
  | "mandatory"
  | "optional";

export type PatrimonialPublicationChapterAvailability = {
  available: boolean;
  reason: string | null;
};

export type PatrimonialPublicationChapterDefinition = {
  category: PatrimonialPublicationChapterCategory;
  chapterKey: PatrimonialPublicationChapterKey;
  compatibleProductKeys: readonly string[];
  defaultOrder: number;
  description: string;
  editorialFallback: string;
  rendererKey: string;
  requiredData: readonly string[];
  requirement: PatrimonialPublicationChapterRequirement;
  title: string;
  version: string;
  visibilityRule: string;
};

export type PatrimonialPublicationChapterSelection = {
  availability: PatrimonialPublicationChapterAvailability;
  category: PatrimonialPublicationChapterCategory;
  chapterKey: PatrimonialPublicationChapterKey;
  defaultOrder: number;
  description: string;
  rendererKey: string;
  requirement: PatrimonialPublicationChapterRequirement;
  selected: boolean;
  title: string;
  version: string;
};

export type PatrimonialPublicationEditorialPreferences = {
  includeContemplationScenariosInMaterial: boolean;
};

export type PatrimonialPublicationCommercialProposalReference = {
  artifactId: string;
  status: string | null;
  source: "crm_lead_commercial_proposals";
  version: number | null;
};

export type PatrimonialPublicationSourceArtifacts = {
  commercialProposal: PatrimonialPublicationCommercialProposalReference | null;
  strategyArtifacts: StrategyArtifactReference[];
};

export type PatrimonialPublicationContentSnapshot = {
  builderVersion: string;
  commercialProposal: PatrimonialPublicationCommercialProposalReference | null;
  createdFromSnapshotAt: string;
  engine: {
    key: string;
    version: string;
  };
  officialRules: ReferenceCapitalStrategySnapshot["result"]["officialRules"];
  product: {
    key: string;
    name: string;
    version: string;
  };
  quotas: ReferenceCapitalStrategySnapshot["result"]["quotas"];
  resolvedChapters: PatrimonialPublicationResolvedChapter[];
  result: ReferenceCapitalStrategySnapshot["result"];
  sourceSnapshot: ReferenceCapitalStrategySnapshot;
  strategy: {
    id: string;
    title: string;
    version: number;
  };
};

export type PatrimonialPublicationResolvedChapter = {
  chapterKey: PatrimonialPublicationChapterKey;
  content: Record<string, unknown>;
  order: number;
  rendererKey: string;
  title: string;
};

export type PatrimonialPublication = {
  audience: PatrimonialPublicationAudience;
  contentSnapshot: PatrimonialPublicationContentSnapshot;
  createdAt: string;
  createdBy: string | null;
  editorialPreferences: PatrimonialPublicationEditorialPreferences;
  id: string;
  mandatoryChapters: PatrimonialPublicationChapterSelection[];
  optionalChapters: PatrimonialPublicationChapterSelection[];
  publicationType: ImplementedPatrimonialPublicationType;
  publicationVersion: number;
  selectedChapters: PatrimonialPublicationChapterSelection[];
  sourceArtifacts: PatrimonialPublicationSourceArtifacts;
  status: PatrimonialPublicationStatus;
  strategyId: string;
  strategyVersion: number;
  title: string;
};

export type PatrimonialPublicationPreviewItem = {
  chapterKey: PatrimonialPublicationChapterKey;
  order: number;
  requirement: PatrimonialPublicationChapterRequirement;
  title: string;
};

export type PatrimonialPublicationRequest = {
  audience?: PatrimonialPublicationAudience;
  createdAt?: string;
  createdBy?: string | null;
  publicationId?: string;
  publicationType?: ImplementedPatrimonialPublicationType;
  publicationVersion?: number;
  selectedOptionalChapterKeys?: PatrimonialPublicationChapterKey[];
  sourceArtifacts?: Partial<PatrimonialPublicationSourceArtifacts>;
  status?: Extract<PatrimonialPublicationStatus, "draft" | "ready">;
  strategyId: string;
  strategySnapshot: ReferenceCapitalStrategySnapshot;
  strategyTitle: string;
  strategyVersion: number;
  title?: string;
};

export type PatrimonialPublicationValidationIssue = {
  chapterKey?: PatrimonialPublicationChapterKey;
  code: string;
  message: string;
};

export type PatrimonialPublicationValidationResult = {
  issues: PatrimonialPublicationValidationIssue[];
  valid: boolean;
};
