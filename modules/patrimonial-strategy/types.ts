export const patrimonialStrategyStatuses = [
  "draft",
  "active",
  "published",
  "archived",
] as const;

export type PatrimonialStrategyStatus =
  (typeof patrimonialStrategyStatuses)[number];

export const financialProductFamilies = [
  "traditional_consortium",
  "multi_quota",
  "structured_group",
  "custom",
] as const;

export type FinancialProductFamily = (typeof financialProductFamilies)[number];

export const strategyArtifactTypes = [
  "simulation",
  "commercial_proposal",
  "executive_material",
  "publication",
  "delivery",
] as const;

export type StrategyArtifactType = (typeof strategyArtifactTypes)[number];

export const strategyPublicationFormats = [
  "pdf",
  "whatsapp",
  "email",
  "internal_view",
] as const;

export type StrategyPublicationFormat =
  (typeof strategyPublicationFormats)[number];

export type PatrimonialStrategyMetadata = Record<string, unknown>;

export type StrategyVersionReference = {
  createdAt: string;
  reason: string | null;
  version: number;
};

export type PatrimonialStrategy = {
  artifacts: StrategyArtifactReference[];
  createdAt: string;
  id: string;
  leadId: string;
  metadata: PatrimonialStrategyMetadata;
  name: string;
  objective: string;
  organizationId: string;
  products: StrategyFinancialProductReference[];
  status: PatrimonialStrategyStatus;
  updatedAt: string;
  version: number;
};

export type StrategyFinancialProductReference = {
  engineId: string;
  productFamily: FinancialProductFamily;
  productId: string;
  role: "primary" | "supporting";
};

export type StrategyArtifactReference = {
  artifactId: string;
  artifactType: StrategyArtifactType;
  source: string;
  version?: number | null;
};

export type FinancialProductDefinition = {
  description: string;
  family: FinancialProductFamily;
  id: string;
  name: string;
  supportedEngineIds: string[];
};

export type CalculationEngineDefinition<
  TInput = unknown,
  TOutput = unknown,
> = {
  calculate: (input: TInput) => TOutput;
  engineId: string;
  productFamilies: FinancialProductFamily[];
  version: string;
};

export type PublicationDefinition = {
  description: string;
  format: StrategyPublicationFormat;
  id: string;
  name: string;
};

export type StrategyPublicationRequest = {
  artifacts: StrategyArtifactReference[];
  format: StrategyPublicationFormat;
  strategyId: string;
  strategyVersion: number;
};

export type PatrimonialStrategyBlueprintInput = {
  artifacts?: StrategyArtifactReference[];
  leadId: string;
  metadata?: PatrimonialStrategyMetadata;
  name: string;
  objective: string;
  organizationId: string;
  products?: StrategyFinancialProductReference[];
  status?: PatrimonialStrategyStatus;
  version?: number;
};
