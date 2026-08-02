import {
  type PatrimonialPublication,
  type PatrimonialPublicationChapterKey,
} from "../../index.ts";
import {
  formatCurrencyFromCents,
  formatLongDate,
  formatMonth,
  formatQuotaCount,
} from "./formatting.ts";
import type { ExecutiveMaterialPdfPage } from "./types.ts";

export function buildExecutiveMaterialPdfPages(
  publication: PatrimonialPublication,
): ExecutiveMaterialPdfPage[] {
  return publication.selectedChapters.flatMap((chapter) => {
    const section = buildChapterPage(publication, chapter.chapterKey);
    return section ? [section] : [];
  });
}

export function buildExecutiveMaterialPdfTextIndex(
  publication: PatrimonialPublication,
) {
  return buildExecutiveMaterialPdfPages(publication).flatMap((page) => [
    page.title,
    ...page.body,
  ]);
}

function buildChapterPage(
  publication: PatrimonialPublication,
  chapterKey: PatrimonialPublicationChapterKey,
): ExecutiveMaterialPdfPage | null {
  if (chapterKey === "cover") {
    return buildCoverPage(publication);
  }

  if (chapterKey === "strategy_synthesis") {
    return buildSynthesisPage(publication);
  }

  if (chapterKey === "used_product") {
    return buildProductPage(publication);
  }

  if (chapterKey === "quota_structure") {
    return buildQuotaStructurePage(publication);
  }

  if (chapterKey === "installment_evolution") {
    return buildInstallmentEvolutionPage(publication);
  }

  if (chapterKey === "contemplation_scenarios") {
    return buildContemplationScenarioPage(publication);
  }

  if (chapterKey === "patrimonial_consulting") {
    return buildConsultingPage(publication);
  }

  if (chapterKey === "client_objectives") {
    return buildClientObjectivesPage(publication);
  }

  if (chapterKey === "calculation_memory") {
    return buildCalculationMemoryPage();
  }

  return buildDisclaimersPage(publication);
}

function buildCoverPage(
  publication: PatrimonialPublication,
): ExecutiveMaterialPdfPage {
  const snapshot = publication.contentSnapshot.sourceSnapshot;
  const consolidated = publication.contentSnapshot.result.consolidated;

  return {
    body: [
      "Patrion Asset",
      "Planejamento patrimonial estruturado utilizando o Grupo Exclusivo Referência Capital como instrumento financeiro.",
      `Cliente: ${snapshot.leadContext?.leadName ?? "Nao informado"}`,
      `Consultor: ${snapshot.leadContext?.responsibleName ?? "Nao informado"}`,
      `Data: ${formatLongDate(publication.createdAt)}`,
      "Produto utilizado: Grupo Exclusivo Referência Capital",
      `Crédito total contratado: ${formatCurrencyFromCents(consolidated.totalCreditCents)}`,
      formatQuotaCount(consolidated.quotaCount),
      `Publicação v${publication.publicationVersion}`,
    ],
    title: "Estratégia Patrimonial Patrion Asset",
  };
}

function buildSynthesisPage(
  publication: PatrimonialPublication,
): ExecutiveMaterialPdfPage {
  const result = publication.contentSnapshot.result;

  return {
    body: [
      `Esta estratégia foi estruturada utilizando ${formatQuotaCount(result.consolidated.quotaCount)} do Grupo Exclusivo Referência Capital, totalizando ${formatCurrencyFromCents(result.consolidated.totalCreditCents)} em crédito contratado.`,
      `Crédito total contratado: ${formatCurrencyFromCents(result.consolidated.totalCreditCents)}`,
      `Quantidade de cotas: ${formatQuotaCount(result.consolidated.quotaCount)}`,
      `Prazo: ${result.consolidated.termMonths} meses`,
      `Parcela-base - meses 1 a 12: ${formatCurrencyFromCents(result.consolidated.installmentMonths1To12Cents)}`,
      `Parcela-base - meses 13 a 24: ${formatCurrencyFromCents(result.consolidated.installmentMonths13To24Cents)}`,
      `Parcela-base - meses 25 a 216: ${formatCurrencyFromCents(result.consolidated.installmentMonths25To216Cents)}`,
      `Composição resumida: ${result.compositionByCredit
        .map(
          (item) =>
            `${formatCurrencyFromCents(item.creditCents)} (${item.quotaCount} ${item.quotaCount === 1 ? "cota" : "cotas"})`,
        )
        .join(" | ")}`,
      "Valores-base sujeitos a atualização anual pelo INCC, conforme regras do grupo.",
    ],
    title: "Síntese da Estratégia",
  };
}

function buildProductPage(
  publication: PatrimonialPublication,
): ExecutiveMaterialPdfPage {
  const rules = publication.contentSnapshot.officialRules;

  return {
    body: [
      "Grupo Exclusivo Referência Capital",
      "Administradora: Rodobens",
      "Grupo: 2227",
      `Plano: ${rules.termMonths} meses`,
      "Modelo: IMV115-PCRED",
      "Seguro prestamista incluso na parcela.",
      `Atualização anual pelo ${rules.inccIndex}.`,
      `Primeiro reajuste na ${rules.firstInccAdjustmentInstallment}ª parcela.`,
    ],
    title: "Produto Utilizado",
  };
}

function buildQuotaStructurePage(
  publication: PatrimonialPublication,
): ExecutiveMaterialPdfPage {
  const result = publication.contentSnapshot.result;

  return {
    body: [
      "A composição abaixo apresenta somente as cotas efetivamente utilizadas nesta estratégia.",
      "Cota | Código | Crédito | Meses 1-12 | Meses 13-24 | Meses 25-216",
      ...result.quotas.map(
        (quota) =>
          `Cota ${quota.position} | ${quota.catalogCode} | ${formatCurrencyFromCents(quota.creditCents)} | ${formatCurrencyFromCents(quota.installmentMonths1To12Cents)} | ${formatCurrencyFromCents(quota.installmentMonths13To24Cents)} | ${formatCurrencyFromCents(quota.installmentMonths25To216Cents)}`,
      ),
      `Crédito total: ${formatCurrencyFromCents(result.consolidated.totalCreditCents)}`,
      `Quantidade de cotas: ${formatQuotaCount(result.consolidated.quotaCount)}`,
    ],
    title: "Estrutura da Estratégia",
  };
}

function buildInstallmentEvolutionPage(
  publication: PatrimonialPublication,
): ExecutiveMaterialPdfPage {
  const consolidated = publication.contentSnapshot.result.consolidated;

  return {
    body: [
      `Fase 1 - Meses 1 a 12: ${formatCurrencyFromCents(consolidated.installmentMonths1To12Cents)}`,
      "O planejamento financeiro considera três fases de parcelas-base previstas no produto.",
      `Fase 2 - Meses 13 a 24: ${formatCurrencyFromCents(consolidated.installmentMonths13To24Cents)}`,
      "Período intermediário conforme tabela oficial do produto.",
      `Fase 3 - Meses 25 a 216: ${formatCurrencyFromCents(consolidated.installmentMonths25To216Cents)}`,
      "Parcela-base - meses 25 a 216.",
      "O crédito e as mensalidades são atualizados pelo INCC a cada 12 meses, com o primeiro reajuste na 14ª parcela.",
    ],
    title: "Evolução das Parcelas",
  };
}

function buildContemplationScenarioPage(
  publication: PatrimonialPublication,
): ExecutiveMaterialPdfPage {
  const rules = publication.contentSnapshot.officialRules;

  return {
    body: [
      "Cota | Crédito | Mês",
      ...publication.contentSnapshot.result.quotas.map(
        (quota) =>
          `Cota ${quota.position} | ${formatCurrencyFromCents(quota.creditCents)} | ${formatMonth(quota.contemplationScenarioMonth)}`,
      ),
      "Os meses apresentados representam hipóteses utilizadas durante a reunião e não constituem garantia de contemplação.",
      "Modalidades previstas no grupo:",
      ...rules.contemplationRules.map((rule) => `- ${rule}`),
    ],
    title: "Cenários utilizados na reunião",
  };
}

function buildConsultingPage(
  publication: PatrimonialPublication,
): ExecutiveMaterialPdfPage | null {
  const commercialProposal = publication.sourceArtifacts.commercialProposal;

  if (!commercialProposal) {
    return null;
  }

  return {
    body: [
      "A Consultoria Patrimonial contempla a estruturação da estratégia, a análise técnica da composição das cartas e o acompanhamento consultivo durante a tomada de decisão.",
      `Versão comercial associada: ${commercialProposal.version ?? "não informada"}`,
      `Status comercial: ${commercialProposal.status ?? "não informado"}`,
    ],
    title: "Consultoria Patrimonial",
  };
}

function buildClientObjectivesPage(
  publication: PatrimonialPublication,
): ExecutiveMaterialPdfPage {
  const context =
    publication.contentSnapshot.sourceSnapshot.leadContext?.commercialContext ??
    {};
  const entries = Object.entries(context).filter(([, value]) =>
    Boolean(value?.trim()),
  );

  return {
    body: entries.length
      ? entries.map(([key, value]) => `${key}: ${value}`)
      : ["Objetivos comerciais estruturados não informados."],
    title: "Objetivos do Cliente",
  };
}

function buildCalculationMemoryPage(): ExecutiveMaterialPdfPage | null {
  return null;
}

function buildDisclaimersPage(
  publication: PatrimonialPublication,
): ExecutiveMaterialPdfPage {
  const rules = publication.contentSnapshot.officialRules;
  const hasContemplationScenarioChapter = publication.selectedChapters.some(
    (chapter) => chapter.chapterKey === "contemplation_scenarios",
  );

  return {
    body: [
      `Produto: ${formatClientFacingProductName(publication.contentSnapshot.product.name)}`,
      "Grupo: 2227 | Modelo: IMV115-PCRED",
      `Prazo: ${rules.termMonths} meses`,
      "Seguro prestamista incluso na parcela.",
      `Atualização anual pelo ${rules.inccIndex}.`,
      "Contemplações conforme regulamento:",
      ...rules.contemplationRules.map((rule) => `- ${rule}`),
      hasContemplationScenarioChapter
        ? "Os meses apresentados representam hipóteses utilizadas durante a reunião e não constituem garantia de contemplação."
        : "A contemplação depende das regras, recursos disponíveis e resultados das assembleias do grupo.",
      "Os valores apresentados correspondem às parcelas-base constantes no material oficial do produto e estão sujeitos às atualizações previstas contratualmente.",
      "A liberação do crédito depende da apresentação e aprovação das garantias exigidas pela administradora.",
    ],
    title: "Condições e Disclaimers",
  };
}

function formatClientFacingProductName(productName: string) {
  return productName.replace(
    "Grupo Exclusivo Referencia Capital",
    "Grupo Exclusivo Referência Capital",
  );
}
