import {
  assertEngineSupportsProduct,
  defineCalculationEngine,
  defineFinancialProduct,
} from "./registry.ts";

export const referenceCapitalProductKey = "reference_capital_exclusive_2227";
export const referenceCapitalProductVersion = "2227-IMV115-PCRED-v1";
export const referenceCapitalEngineKey =
  "engine:reference-capital-exclusive-2227";
export const referenceCapitalEngineVersion = "1.0.0";

const currency = "BRL";
const termMonths = 216;
const minimumQuotaCount = 2;

export type ReferenceCapitalCreditAmount = 150000 | 175000 | 200000;

export type ReferenceCapitalQuotaInput = {
  creditAmount: ReferenceCapitalCreditAmount | number;
  contemplationScenarioMonth?: number;
  id?: string;
};

export type ReferenceCapitalStrategyInput = {
  contemplationScenarioMonth?: number;
  includeContemplationScenarioInMaterial?: boolean;
  includeContemplationScenariosInMaterial?: boolean;
  productKey?: string;
  productVersion?: string;
  quotas: ReferenceCapitalQuotaInput[];
};

export type ReferenceCapitalCatalogItem = {
  catalogCode: string;
  creditAmount: ReferenceCapitalCreditAmount;
  creditCents: number;
  currency: typeof currency;
  installmentMonths1To12Cents: number;
  installmentMonths13To24Cents: number;
  installmentMonths25To216Cents: number;
  productVersion: typeof referenceCapitalProductVersion;
};

export type ReferenceCapitalQuotaResult = {
  administrationFeeMonthly: "0.32456%";
  administrationFeeTotal: "28.50%";
  catalogCode: string;
  contemplationRules: string[];
  creditAmount: ReferenceCapitalCreditAmount;
  creditCents: number;
  contemplationScenarioMonth: number;
  currency: typeof currency;
  id: string;
  inccRule: {
    firstAdjustmentInstallment: 14;
    index: "INCC";
    periodicity: "annual";
    projectionApplied: false;
  };
  installmentMonths1To12Cents: number;
  installmentMonths13To24Cents: number;
  installmentMonths25To216Cents: number;
  position: number;
  productVersion: typeof referenceCapitalProductVersion;
  termMonths: typeof termMonths;
  insuranceIncluded: true;
};

export type ReferenceCapitalStrategyResult = {
  commercialDistributionPolicy: {
    minimumQuotaCount: typeof minimumQuotaCount;
    source: "Patrion Asset commercial policy";
  };
  compositionByCredit: Array<{
    creditAmount: ReferenceCapitalCreditAmount;
    creditCents: number;
    quotaCount: number;
  }>;
  consolidated: {
    installmentMonths1To12Cents: number;
    installmentMonths13To24Cents: number;
    installmentMonths25To216Cents: number;
    quotaCount: number;
    termMonths: typeof termMonths;
    totalCreditCents: number;
  };
  input: {
    includeContemplationScenariosInMaterial: boolean;
    productKey: typeof referenceCapitalProductKey;
    productVersion: typeof referenceCapitalProductVersion;
    quotas: Array<{
      creditAmount: ReferenceCapitalCreditAmount;
      contemplationScenarioMonth: number;
      id: string;
    }>;
  };
  officialRules: typeof referenceCapitalOfficialRules;
  product: typeof referenceCapitalExclusiveProductDefinition;
  quotas: ReferenceCapitalQuotaResult[];
};

export type ReferenceCapitalStrategySnapshot = {
  calculationEngineKey: typeof referenceCapitalEngineKey;
  calculationEngineVersion: typeof referenceCapitalEngineVersion;
  commercialProposal?: {
    artifactId?: string | null;
    status?: string | null;
    version?: number | null;
  } | null;
  createdAt: string;
  financialProductKey: typeof referenceCapitalProductKey;
  financialProductVersion: typeof referenceCapitalProductVersion;
  input: ReferenceCapitalStrategyResult["input"];
  leadContext?: {
    commercialContext?: Record<string, string | undefined> | null;
    leadId: string;
    leadName: string;
    responsibleName?: string | null;
  } | null;
  metadata: {
    source: "patrimonial_strategy";
    strategyDisplayName: "Estrategia Patrimonial Patrion Asset";
    strategyType: "patrimonial_strategy";
    version: "STR-003";
  };
  result: ReferenceCapitalStrategyResult;
  strategyType: "patrimonial_strategy";
};

export const referenceCapitalOfficialRules = {
  administrationFeeMonthly: "0.32456%",
  administrationFeeTotal: "28.50%",
  contemplationRules: [
    "1 por sorteio",
    "1 por lance livre",
    "1 por lance fidelidade, a partir da 3a assembleia e conforme regulamento",
    "1 por lance fixo de 20%",
  ],
  fixedBid: "20%",
  fixedBidEquivalentInstallments: 43,
  firstInccAdjustmentInstallment: 14,
  inccIndex: "INCC",
  inccProjectionApplied: false,
  inccUpdatePeriodicity: "annual",
  insuranceIncluded: true,
  participantCount: 700,
  termMonths,
} as const;

export const referenceCapitalCreditCatalog = [
  catalogItem(150000, "29.09.5522", 68724, 82119, 98094),
  catalogItem(175000, "29.09.15116", 80178, 95806, 114443),
  catalogItem(200000, "29.09.5526", 91633, 109493, 130793),
] as const satisfies readonly ReferenceCapitalCatalogItem[];

export const referenceCapitalExclusiveProductDefinition =
  defineFinancialProduct({
    category: "exclusive_multi_quota",
    description:
      "Grupo Exclusivo Referencia Capital utilizado como instrumento financeiro da Estrategia Patrimonial Patrion Asset.",
    family: "structured_group",
    id: `financial-product:${referenceCapitalProductKey}`,
    metadata: {
      administrator: "Rodobens",
      distributor: "Referencia Capital",
      groupCode: "2227",
      modelCode: "IMV115-PCRED",
      participantCount: 700,
      partner: "Patrion Asset",
      plan: "216 meses",
      strategyDisplayName: "Estrategia Patrimonial Patrion Asset",
      termMonths,
    },
    name: "Grupo Exclusivo Referencia Capital",
    supportedEngineIds: [referenceCapitalEngineKey],
    version: referenceCapitalProductVersion,
  });

export const referenceCapitalExclusiveEngine = defineCalculationEngine<
  ReferenceCapitalStrategyInput,
  ReferenceCapitalStrategyResult
>({
  calculate: calculateReferenceCapitalExclusiveStrategy,
  engineId: referenceCapitalEngineKey,
  productFamilies: ["structured_group"],
  version: referenceCapitalEngineVersion,
});

export function calculateReferenceCapitalExclusiveStrategy(
  input: ReferenceCapitalStrategyInput,
): ReferenceCapitalStrategyResult {
  assertEngineSupportsProduct({
    engine: referenceCapitalExclusiveEngine,
    product: referenceCapitalExclusiveProductDefinition,
  });

  if (
    input.productKey &&
    input.productKey !== referenceCapitalProductKey
  ) {
    throw new Error("Produto financeiro desconhecido para esta estrategia.");
  }

  if (
    input.productVersion &&
    input.productVersion !== referenceCapitalProductVersion
  ) {
    throw new Error("Versao do produto financeiro desconhecida.");
  }

  if (!Array.isArray(input.quotas) || input.quotas.length < minimumQuotaCount) {
    throw new Error(
      "Adicione pelo menos duas cotas para estruturar esta estrategia.",
    );
  }

  const legacyContemplationScenarioMonth =
    input.contemplationScenarioMonth === undefined ||
    input.contemplationScenarioMonth === null
      ? null
      : normalizeContemplationScenarioMonth(input.contemplationScenarioMonth);

  const quotas = input.quotas.map((quota, index) => {
    const catalog = findCatalogItem(quota.creditAmount);

    if (!catalog) {
      throw new Error(
        "Selecione um dos creditos disponiveis para o Grupo Exclusivo Referencia Capital.",
      );
    }

    return {
      administrationFeeMonthly: "0.32456%",
      administrationFeeTotal: "28.50%",
      catalogCode: catalog.catalogCode,
      contemplationRules: [...referenceCapitalOfficialRules.contemplationRules],
      creditAmount: catalog.creditAmount,
      creditCents: catalog.creditCents,
      contemplationScenarioMonth:
        quota.contemplationScenarioMonth === undefined ||
        quota.contemplationScenarioMonth === null
          ? legacyContemplationScenarioMonth ?? defaultContemplationScenarioMonth(index)
          : normalizeContemplationScenarioMonth(quota.contemplationScenarioMonth),
      currency,
      id: quota.id?.trim() || `reference-capital-quota-${index + 1}`,
      inccRule: {
        firstAdjustmentInstallment: 14,
        index: "INCC",
        periodicity: "annual",
        projectionApplied: false,
      },
      installmentMonths1To12Cents: catalog.installmentMonths1To12Cents,
      installmentMonths13To24Cents: catalog.installmentMonths13To24Cents,
      installmentMonths25To216Cents: catalog.installmentMonths25To216Cents,
      insuranceIncluded: true,
      position: index + 1,
      productVersion: referenceCapitalProductVersion,
      termMonths,
    } satisfies ReferenceCapitalQuotaResult;
  });

  const consolidated: ReferenceCapitalStrategyResult["consolidated"] = quotas.reduce(
    (totals, quota) => ({
      installmentMonths1To12Cents:
        totals.installmentMonths1To12Cents +
        quota.installmentMonths1To12Cents,
      installmentMonths13To24Cents:
        totals.installmentMonths13To24Cents +
        quota.installmentMonths13To24Cents,
      installmentMonths25To216Cents:
        totals.installmentMonths25To216Cents +
        quota.installmentMonths25To216Cents,
      quotaCount: quotas.length,
      termMonths: termMonths as typeof termMonths,
      totalCreditCents: totals.totalCreditCents + quota.creditCents,
    }),
    {
      installmentMonths1To12Cents: 0,
      installmentMonths13To24Cents: 0,
      installmentMonths25To216Cents: 0,
      quotaCount: quotas.length,
      termMonths: termMonths as typeof termMonths,
      totalCreditCents: 0,
    },
  );

  return {
    commercialDistributionPolicy: {
      minimumQuotaCount,
      source: "Patrion Asset commercial policy",
    },
    compositionByCredit: buildCompositionByCredit(quotas),
    consolidated,
    input: {
      includeContemplationScenariosInMaterial:
        input.includeContemplationScenariosInMaterial ??
        input.includeContemplationScenarioInMaterial ??
        false,
      productKey: referenceCapitalProductKey,
      productVersion: referenceCapitalProductVersion,
      quotas: quotas.map((quota) => ({
        creditAmount: quota.creditAmount,
        contemplationScenarioMonth: quota.contemplationScenarioMonth,
        id: quota.id,
      })),
    },
    officialRules: referenceCapitalOfficialRules,
    product: referenceCapitalExclusiveProductDefinition,
    quotas,
  };
}

export function buildReferenceCapitalStrategySnapshot(input: {
  commercialProposal?: ReferenceCapitalStrategySnapshot["commercialProposal"];
  leadContext?: ReferenceCapitalStrategySnapshot["leadContext"];
  result: ReferenceCapitalStrategyResult;
}): ReferenceCapitalStrategySnapshot {
  return {
    calculationEngineKey: referenceCapitalEngineKey,
    calculationEngineVersion: referenceCapitalEngineVersion,
    commercialProposal: input.commercialProposal ?? null,
    createdAt: new Date().toISOString(),
    financialProductKey: referenceCapitalProductKey,
    financialProductVersion: referenceCapitalProductVersion,
    input: input.result.input,
    leadContext: input.leadContext ?? null,
    metadata: {
      source: "patrimonial_strategy",
      strategyDisplayName: "Estrategia Patrimonial Patrion Asset",
      strategyType: "patrimonial_strategy",
      version: "STR-003",
    },
    result: input.result,
    strategyType: "patrimonial_strategy",
  };
}

export function isReferenceCapitalStrategySnapshot(
  value: unknown,
): value is ReferenceCapitalStrategySnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<ReferenceCapitalStrategySnapshot>;

  return (
    candidate.strategyType === "patrimonial_strategy" &&
    candidate.financialProductKey === referenceCapitalProductKey &&
    candidate.financialProductVersion === referenceCapitalProductVersion &&
    candidate.calculationEngineKey === referenceCapitalEngineKey &&
    candidate.result !== undefined
  );
}

export function centsToCurrencyAmount(cents: number) {
  return cents / 100;
}

function catalogItem(
  creditAmount: ReferenceCapitalCreditAmount,
  catalogCode: string,
  installmentMonths1To12Cents: number,
  installmentMonths13To24Cents: number,
  installmentMonths25To216Cents: number,
): ReferenceCapitalCatalogItem {
  return {
    catalogCode,
    creditAmount,
    creditCents: creditAmount * 100,
    currency,
    installmentMonths1To12Cents,
    installmentMonths13To24Cents,
    installmentMonths25To216Cents,
    productVersion: referenceCapitalProductVersion,
  };
}

function findCatalogItem(creditAmount: number) {
  return referenceCapitalCreditCatalog.find(
    (item) => item.creditAmount === creditAmount,
  );
}

function normalizeContemplationScenarioMonth(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Informe um mes de cenario de contemplacao valido.");
  }

  if (value > termMonths) {
    throw new Error("O cenario de contemplacao deve respeitar o prazo de 216 meses.");
  }

  return value;
}

function defaultContemplationScenarioMonth(index: number) {
  return Math.min(termMonths, (index + 1) * 12);
}

function buildCompositionByCredit(quotas: ReferenceCapitalQuotaResult[]) {
  return referenceCapitalCreditCatalog
    .map((catalog) => ({
      creditAmount: catalog.creditAmount,
      creditCents: catalog.creditCents,
      quotaCount: quotas.filter(
        (quota) => quota.creditAmount === catalog.creditAmount,
      ).length,
    }))
    .filter((composition) => composition.quotaCount > 0);
}
