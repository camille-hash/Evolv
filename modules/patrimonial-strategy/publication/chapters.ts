import {
  referenceCapitalProductKey,
  type ReferenceCapitalStrategySnapshot,
} from "../reference-capital-2227.ts";
import type {
  PatrimonialPublicationChapterAvailability,
  PatrimonialPublicationChapterDefinition,
  PatrimonialPublicationChapterKey,
  PatrimonialPublicationChapterSelection,
  PatrimonialPublicationCommercialProposalReference,
} from "./types.ts";

export const referenceCapitalExecutiveMaterialChapterCatalog = [
  {
    category: "identity",
    chapterKey: "cover",
    compatibleProductKeys: [referenceCapitalProductKey],
    defaultOrder: 1,
    description:
      "Identifica a Estrategia Patrimonial Patrion Asset, cliente, consultor, produto, codigo e versao.",
    editorialFallback:
      "Capitulo obrigatorio de identificacao do material executivo.",
    rendererKey: "reference_capital.cover.v1",
    requiredData: [
      "strategy.leadContext",
      "strategy.financialProductKey",
      "strategy.financialProductVersion",
      "strategy.result.product",
    ],
    requirement: "mandatory",
    title: "Capa",
    version: "1.0.0",
    visibilityRule: "Sempre visivel para material executivo do Grupo 2227.",
  },
  {
    category: "strategy",
    chapterKey: "strategy_synthesis",
    compatibleProductKeys: [referenceCapitalProductKey],
    defaultOrder: 2,
    description:
      "Resume credito total contratado, quantidade de cotas, composicao de creditos, prazo e visao consolidada.",
    editorialFallback:
      "Capitulo obrigatorio de sintese derivada do snapshot calculado.",
    rendererKey: "reference_capital.strategy_synthesis.v1",
    requiredData: [
      "strategy.result.consolidated",
      "strategy.result.compositionByCredit",
    ],
    requirement: "mandatory",
    title: "Sintese da Estrategia",
    version: "1.0.0",
    visibilityRule: "Sempre visivel quando o resultado consolidado existir.",
  },
  {
    category: "product",
    chapterKey: "used_product",
    compatibleProductKeys: [referenceCapitalProductKey],
    defaultOrder: 3,
    description:
      "Apresenta Grupo Exclusivo Referencia Capital, grupo 2227, modelo IMV115-PCRED, prazo, participantes e politica comercial.",
    editorialFallback:
      "Capitulo obrigatorio com dados oficiais congelados no snapshot.",
    rendererKey: "reference_capital.used_product.v1",
    requiredData: [
      "strategy.result.product",
      "strategy.result.officialRules",
      "strategy.result.commercialDistributionPolicy",
    ],
    requirement: "mandatory",
    title: "Produto Utilizado",
    version: "1.0.0",
    visibilityRule: "Sempre visivel para produto reconhecido.",
  },
  {
    category: "composition",
    chapterKey: "quota_structure",
    compatibleProductKeys: [referenceCapitalProductKey],
    defaultOrder: 4,
    description:
      "Lista cota, codigo comercial, credito, parcelas-base por fase e composicao individual.",
    editorialFallback:
      "Capitulo obrigatorio de composicao por cota calculada.",
    rendererKey: "reference_capital.quota_structure.v1",
    requiredData: ["strategy.result.quotas"],
    requirement: "mandatory",
    title: "Estrutura das Cotas",
    version: "1.0.0",
    visibilityRule: "Sempre visivel quando houver cotas no snapshot.",
  },
  {
    category: "financial",
    chapterKey: "installment_evolution",
    compatibleProductKeys: [referenceCapitalProductKey],
    defaultOrder: 5,
    description:
      "Mostra meses 1 a 12, 13 a 24, 25 a 216, valores consolidados, INCC e primeiro reajuste na 14a parcela.",
    editorialFallback:
      "Capitulo obrigatorio de evolucao das parcelas oficiais.",
    rendererKey: "reference_capital.installment_evolution.v1",
    requiredData: [
      "strategy.result.consolidated",
      "strategy.result.officialRules.firstInccAdjustmentInstallment",
    ],
    requirement: "mandatory",
    title: "Evolucao das Parcelas",
    version: "1.0.0",
    visibilityRule: "Sempre visivel quando parcelas consolidadas existirem.",
  },
  {
    category: "legal",
    chapterKey: "conditions_disclaimers",
    compatibleProductKeys: [referenceCapitalProductKey],
    defaultOrder: 6,
    description:
      "Reune seguro prestamista, INCC, contemplacoes previstas, ausencia de garantia e versao do produto.",
    editorialFallback:
      "Capitulo obrigatorio de condicoes oficiais e disclaimers.",
    rendererKey: "reference_capital.conditions_disclaimers.v1",
    requiredData: [
      "strategy.result.officialRules",
      "strategy.financialProductVersion",
    ],
    requirement: "mandatory",
    title: "Condicoes e Disclaimers",
    version: "1.0.0",
    visibilityRule: "Sempre visivel para material destinado ao cliente.",
  },
  {
    category: "advisory",
    chapterKey: "client_objectives",
    compatibleProductKeys: [referenceCapitalProductKey],
    defaultOrder: 7,
    description:
      "Prepara integracao com objetivos do Lead e futura narrativa consultiva.",
    editorialFallback:
      "Indisponivel quando nao houver objetivos comerciais estruturados no contexto do lead.",
    rendererKey: "reference_capital.client_objectives.v1",
    requiredData: ["strategy.leadContext.commercialContext"],
    requirement: "optional",
    title: "Objetivos do Cliente",
    version: "1.0.0",
    visibilityRule: "Disponivel apenas com contexto comercial estruturado.",
  },
  {
    category: "advisory",
    chapterKey: "patrimonial_consulting",
    compatibleProductKeys: [referenceCapitalProductKey],
    defaultOrder: 8,
    description:
      "Referencia a Commercial Proposal aprovada ou salva, sem duplicar narrativa editavel.",
    editorialFallback:
      "Indisponivel quando nao houver Commercial Proposal referenciada.",
    rendererKey: "reference_capital.patrimonial_consulting.v1",
    requiredData: ["sourceArtifacts.commercialProposal"],
    requirement: "optional",
    title: "Consultoria Patrimonial",
    version: "1.0.0",
    visibilityRule: "Disponivel com Commercial Proposal referenciada e reconhecida.",
  },
  {
    category: "strategy",
    chapterKey: "contemplation_scenarios",
    compatibleProductKeys: [referenceCapitalProductKey],
    defaultOrder: 9,
    description:
      "Inclui uma hipotese de contemplacao por cota, somente quando a preferencia editorial estiver ligada.",
    editorialFallback:
      "Indisponivel quando a preferencia editorial de cenarios estiver desligada.",
    rendererKey: "reference_capital.contemplation_scenarios.v1",
    requiredData: [
      "strategy.input.includeContemplationScenariosInMaterial",
      "strategy.input.quotas.contemplationScenarioMonth",
      "strategy.result.quotas",
    ],
    requirement: "optional",
    title: "Cenarios de Contemplacao",
    version: "1.0.0",
    visibilityRule:
      "Disponivel apenas quando includeContemplationScenariosInMaterial for true.",
  },
  {
    category: "technical",
    chapterKey: "calculation_memory",
    compatibleProductKeys: [referenceCapitalProductKey],
    defaultOrder: 10,
    description:
      "Capitulo tecnico opcional para futura memoria de calculo estruturada.",
    editorialFallback:
      "Disponivel como contrato tecnico; renderer completo fica para sprint posterior.",
    rendererKey: "reference_capital.calculation_memory.v1",
    requiredData: [
      "strategy.input",
      "strategy.result",
      "strategy.calculationEngineKey",
    ],
    requirement: "optional",
    title: "Memoria de Calculo",
    version: "1.0.0",
    visibilityRule:
      "Disponivel quando o snapshot contiver inputs e resultados completos.",
  },
] as const satisfies readonly PatrimonialPublicationChapterDefinition[];

export const referenceCapitalContemplationDisclaimer =
  "Os meses apresentados representam hipoteses de planejamento utilizadas durante a reuniao e nao constituem garantia de contemplacao.";

export function getReferenceCapitalExecutiveMaterialChapters() {
  return referenceCapitalExecutiveMaterialChapterCatalog.map((chapter) => ({
    ...chapter,
    compatibleProductKeys: [...chapter.compatibleProductKeys],
    requiredData: [...chapter.requiredData],
  }));
}

export function findReferenceCapitalPublicationChapter(
  chapterKey: PatrimonialPublicationChapterKey,
) {
  return referenceCapitalExecutiveMaterialChapterCatalog.find(
    (chapter) => chapter.chapterKey === chapterKey,
  );
}

export function resolveChapterAvailability(input: {
  chapter: PatrimonialPublicationChapterDefinition;
  commercialProposal: PatrimonialPublicationCommercialProposalReference | null;
  strategySnapshot: ReferenceCapitalStrategySnapshot;
}): PatrimonialPublicationChapterAvailability {
  const { chapter, commercialProposal, strategySnapshot } = input;

  if (
    !chapter.compatibleProductKeys.includes(strategySnapshot.financialProductKey)
  ) {
    return {
      available: false,
      reason: "Capitulo incompativel com o produto financeiro da estrategia.",
    };
  }

  if (chapter.chapterKey === "client_objectives") {
    const commercialContext = strategySnapshot.leadContext?.commercialContext;
    const hasContext = Boolean(
      commercialContext &&
        Object.values(commercialContext).some(
          (value) => typeof value === "string" && value.trim().length > 0,
        ),
    );

    return hasContext
      ? { available: true, reason: null }
      : {
          available: false,
          reason:
            "Objetivos do cliente indisponiveis no contexto comercial do lead.",
        };
  }

  if (chapter.chapterKey === "patrimonial_consulting") {
    return commercialProposal
      ? { available: true, reason: null }
      : {
          available: false,
          reason:
            "Commercial Proposal nao referenciada para esta estrategia.",
        };
  }

  if (chapter.chapterKey === "contemplation_scenarios") {
    return strategySnapshot.input.includeContemplationScenariosInMaterial
      ? { available: true, reason: null }
      : {
          available: false,
          reason:
            "A preferencia editorial de cenarios de contemplacao esta desligada.",
        };
  }

  return { available: true, reason: null };
}

export function toChapterSelection(input: {
  availability: PatrimonialPublicationChapterAvailability;
  chapter: PatrimonialPublicationChapterDefinition;
  selected: boolean;
}): PatrimonialPublicationChapterSelection {
  const { availability, chapter, selected } = input;

  return {
    availability,
    category: chapter.category,
    chapterKey: chapter.chapterKey,
    defaultOrder: chapter.defaultOrder,
    description: chapter.description,
    rendererKey: chapter.rendererKey,
    requirement: chapter.requirement,
    selected,
    title: chapter.title,
    version: chapter.version,
  };
}
