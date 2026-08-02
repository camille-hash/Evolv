import type {
  CalculationEngineDefinition,
  FinancialProductDefinition,
  FinancialProductFamily,
  PatrimonialStrategyBlueprintInput,
  PatrimonialStrategy,
  PublicationDefinition,
  StrategyPublicationFormat,
  StrategyPublicationRequest,
  StrategyVersionReference,
} from "./types.ts";

export function defineFinancialProduct(
  definition: FinancialProductDefinition,
): FinancialProductDefinition {
  assertNonEmpty(definition.id, "Produto financeiro sem identificador.");
  assertNonEmpty(definition.name, "Produto financeiro sem nome.");

  if (!definition.supportedEngineIds.length) {
    throw new Error("Produto financeiro deve declarar ao menos uma engine.");
  }

  return {
    ...definition,
    supportedEngineIds: [...definition.supportedEngineIds],
  };
}

export function defineCalculationEngine<TInput, TOutput>(
  definition: CalculationEngineDefinition<TInput, TOutput>,
): CalculationEngineDefinition<TInput, TOutput> {
  assertNonEmpty(definition.engineId, "Engine financeira sem identificador.");
  assertNonEmpty(definition.version, "Engine financeira sem versao.");

  if (!definition.productFamilies.length) {
    throw new Error("Engine financeira deve declarar familias suportadas.");
  }

  return {
    ...definition,
    productFamilies: [...definition.productFamilies],
  };
}

export function definePublication(
  definition: PublicationDefinition,
): PublicationDefinition {
  assertNonEmpty(definition.id, "Publicacao sem identificador.");
  assertNonEmpty(definition.name, "Publicacao sem nome.");

  return definition;
}

export function assertEngineSupportsProduct(input: {
  engine: Pick<CalculationEngineDefinition, "engineId" | "productFamilies">;
  product: Pick<FinancialProductDefinition, "family" | "supportedEngineIds">;
}) {
  if (!input.product.supportedEngineIds.includes(input.engine.engineId)) {
    throw new Error("Produto financeiro nao declara suporte para esta engine.");
  }

  if (!input.engine.productFamilies.includes(input.product.family)) {
    throw new Error("Engine financeira nao suporta a familia do produto.");
  }
}

export function createPatrimonialStrategyBlueprint(
  input: PatrimonialStrategyBlueprintInput,
): PatrimonialStrategy {
  const now = new Date().toISOString();

  assertNonEmpty(input.leadId, "Estrategia Patrimonial sem lead.");
  assertNonEmpty(input.organizationId, "Estrategia Patrimonial sem organizacao.");
  assertNonEmpty(input.name, "Estrategia Patrimonial sem nome.");

  return {
    artifacts: input.artifacts?.map((artifact) => ({ ...artifact })) ?? [],
    createdAt: now,
    id: createStrategyId(input),
    leadId: input.leadId.trim(),
    metadata: input.metadata ?? {},
    name: input.name.trim(),
    objective: input.objective.trim(),
    organizationId: input.organizationId.trim(),
    products: input.products?.map((product) => ({ ...product })) ?? [],
    status: input.status ?? "draft",
    updatedAt: now,
    version: input.version ?? 1,
  };
}

export function createStrategyVersionReference(input: {
  currentVersion: number;
  reason?: string | null;
}): StrategyVersionReference {
  const safeVersion =
    Number.isInteger(input.currentVersion) && input.currentVersion > 0
      ? input.currentVersion
      : 1;

  return {
    createdAt: new Date().toISOString(),
    reason: normalizeOptionalText(input.reason),
    version: safeVersion + 1,
  };
}

export function createPublicationRequest(input: {
  format: StrategyPublicationFormat;
  strategy: Pick<PatrimonialStrategy, "artifacts" | "id" | "version">;
}): StrategyPublicationRequest {
  return {
    artifacts: input.strategy.artifacts.map((artifact) => ({ ...artifact })),
    format: input.format,
    strategyId: input.strategy.id,
    strategyVersion: input.strategy.version,
  };
}

export function supportsProductFamily(
  families: FinancialProductFamily[],
  family: FinancialProductFamily,
) {
  return families.includes(family);
}

function createStrategyId(input: PatrimonialStrategyBlueprintInput) {
  return `strategy:${input.organizationId.trim()}:${input.leadId.trim()}:${
    input.version ?? 1
  }`;
}

function assertNonEmpty(value: string, message: string) {
  if (!value.trim()) {
    throw new Error(message);
  }
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
