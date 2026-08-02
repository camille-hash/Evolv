import {
  isReferenceCapitalStrategySnapshot,
  referenceCapitalProductKey,
  referenceCapitalProductVersion,
} from "../reference-capital-2227.ts";
import {
  findReferenceCapitalPublicationChapter,
  referenceCapitalExecutiveMaterialChapterCatalog,
} from "./chapters.ts";
import {
  implementedPatrimonialPublicationTypes,
  patrimonialPublicationAudiences,
  patrimonialPublicationChapterKeys,
  patrimonialPublicationStatuses,
  type PatrimonialPublication,
  type PatrimonialPublicationChapterKey,
  type PatrimonialPublicationRequest,
  type PatrimonialPublicationValidationIssue,
  type PatrimonialPublicationValidationResult,
} from "./types.ts";

export function validatePublicationRequest(
  request: PatrimonialPublicationRequest,
): PatrimonialPublicationValidationResult {
  const issues: PatrimonialPublicationValidationIssue[] = [];

  if (!request.strategyId.trim()) {
    issues.push({
      code: "strategy_id_required",
      message: "Informe a estrategia de origem da publicacao.",
    });
  }

  if (
    !Number.isInteger(request.strategyVersion) ||
    request.strategyVersion <= 0
  ) {
    issues.push({
      code: "strategy_version_invalid",
      message: "Versao da estrategia invalida.",
    });
  }

  if (!isReferenceCapitalStrategySnapshot(request.strategySnapshot)) {
    issues.push({
      code: "strategy_snapshot_unrecognized",
      message:
        "Snapshot da Estrategia Patrimonial nao reconhecido para publicacao.",
    });
  } else {
    validateReferenceCapitalSnapshot(request.strategySnapshot, issues);
  }

  const publicationType = request.publicationType ?? "executive_material";
  if (!implementedPatrimonialPublicationTypes.includes(publicationType)) {
    issues.push({
      code: "publication_type_unsupported",
      message: "Tipo de publicacao ainda nao implementado nesta sprint.",
    });
  }

  const audience = request.audience ?? "client";
  if (!patrimonialPublicationAudiences.includes(audience)) {
    issues.push({
      code: "audience_invalid",
      message: "Audiencia da publicacao invalida.",
    });
  }

  const status = request.status ?? "ready";
  if (!patrimonialPublicationStatuses.includes(status)) {
    issues.push({
      code: "status_invalid",
      message: "Status da publicacao invalido.",
    });
  }

  if (
    request.publicationVersion !== undefined &&
    (!Number.isInteger(request.publicationVersion) ||
      request.publicationVersion <= 0)
  ) {
    issues.push({
      code: "publication_version_invalid",
      message: "Versao da publicacao invalida.",
    });
  }

  validateSelectedOptionalChapters(request.selectedOptionalChapterKeys, issues);

  return {
    issues,
    valid: issues.length === 0,
  };
}

export function validatePublicationSnapshot(
  publication: PatrimonialPublication,
): PatrimonialPublicationValidationResult {
  const issues: PatrimonialPublicationValidationIssue[] = [];

  if (!publication.id.trim()) {
    issues.push({
      code: "publication_id_required",
      message: "Publicacao sem identificador.",
    });
  }

  if (!publication.title.trim()) {
    issues.push({
      code: "publication_title_required",
      message: "Publicacao sem titulo.",
    });
  }

  if (!implementedPatrimonialPublicationTypes.includes(publication.publicationType)) {
    issues.push({
      code: "publication_type_unsupported",
      message: "Tipo de publicacao ainda nao implementado nesta sprint.",
    });
  }

  if (!patrimonialPublicationStatuses.includes(publication.status)) {
    issues.push({
      code: "status_invalid",
      message: "Status da publicacao invalido.",
    });
  }

  if (!patrimonialPublicationAudiences.includes(publication.audience)) {
    issues.push({
      code: "audience_invalid",
      message: "Audiencia da publicacao invalida.",
    });
  }

  if (
    !Number.isInteger(publication.publicationVersion) ||
    publication.publicationVersion <= 0
  ) {
    issues.push({
      code: "publication_version_invalid",
      message: "Versao da publicacao invalida.",
    });
  }

  const mandatoryKeys = referenceCapitalExecutiveMaterialChapterCatalog
    .filter((chapter) => chapter.requirement === "mandatory")
    .map((chapter) => chapter.chapterKey);
  const selectedKeys = publication.selectedChapters
    .filter((chapter) => chapter.selected)
    .map((chapter) => chapter.chapterKey);

  mandatoryKeys.forEach((chapterKey) => {
    if (!selectedKeys.includes(chapterKey)) {
      issues.push({
        chapterKey,
        code: "mandatory_chapter_missing",
        message: `Capitulo obrigatorio ausente: ${chapterKey}.`,
      });
    }
  });

  findDuplicatedKeys(selectedKeys).forEach((chapterKey) => {
    issues.push({
      chapterKey,
      code: "duplicated_chapter",
      message: `Capitulo duplicado na publicacao: ${chapterKey}.`,
    });
  });

  const orders = publication.selectedChapters
    .filter((chapter) => chapter.selected)
    .map((chapter) => chapter.defaultOrder);
  const ordered = orders.every(
    (order, index) => index === 0 || order > orders[index - 1],
  );

  if (!ordered) {
    issues.push({
      code: "chapter_order_invalid",
      message: "A ordem dos capitulos selecionados deve seguir o catalogo.",
    });
  }

  if (
    publication.contentSnapshot.product.key !== referenceCapitalProductKey ||
    publication.contentSnapshot.product.version !== referenceCapitalProductVersion
  ) {
    issues.push({
      code: "product_unrecognized",
      message: "Produto da publicacao nao reconhecido.",
    });
  }

  if (
    publication.editorialPreferences.includeContemplationScenariosInMaterial !==
    publication.contentSnapshot.sourceSnapshot.input
      .includeContemplationScenariosInMaterial
  ) {
    issues.push({
      code: "contemplation_preference_changed",
      message:
        "Preferencia editorial de cenarios diverge do snapshot da estrategia.",
    });
  }

  return {
    issues,
    valid: issues.length === 0,
  };
}

export function assertValidPublicationRequest(
  request: PatrimonialPublicationRequest,
) {
  const validation = validatePublicationRequest(request);

  if (!validation.valid) {
    throw new Error(validation.issues.map((issue) => issue.message).join(" "));
  }
}

export function assertValidPublicationSnapshot(
  publication: PatrimonialPublication,
) {
  const validation = validatePublicationSnapshot(publication);

  if (!validation.valid) {
    throw new Error(validation.issues.map((issue) => issue.message).join(" "));
  }
}

function validateReferenceCapitalSnapshot(
  snapshot: PatrimonialPublicationRequest["strategySnapshot"],
  issues: PatrimonialPublicationValidationIssue[],
) {
  if (snapshot.financialProductKey !== referenceCapitalProductKey) {
    issues.push({
      code: "product_unrecognized",
      message: "Produto financeiro nao reconhecido para publicacao.",
    });
  }

  if (snapshot.financialProductVersion !== referenceCapitalProductVersion) {
    issues.push({
      code: "product_version_unrecognized",
      message: "Versao do produto financeiro nao reconhecida.",
    });
  }

  if (!snapshot.result?.consolidated || !snapshot.result?.quotas?.length) {
    issues.push({
      code: "strategy_result_incomplete",
      message: "Resultado da estrategia incompleto para publicacao.",
    });
  }

  if (!snapshot.result?.officialRules) {
    issues.push({
      code: "official_rules_missing",
      message: "Regras oficiais ausentes no snapshot da estrategia.",
    });
  }
}

function validateSelectedOptionalChapters(
  chapterKeys: PatrimonialPublicationChapterKey[] | undefined,
  issues: PatrimonialPublicationValidationIssue[],
) {
  if (!chapterKeys?.length) {
    return;
  }

  findDuplicatedKeys(chapterKeys).forEach((chapterKey) => {
    issues.push({
      chapterKey,
      code: "duplicated_chapter",
      message: `Capitulo duplicado na selecao: ${chapterKey}.`,
    });
  });

  chapterKeys.forEach((chapterKey) => {
    if (!patrimonialPublicationChapterKeys.includes(chapterKey)) {
      issues.push({
        chapterKey,
        code: "chapter_unrecognized",
        message: `Capitulo nao reconhecido: ${chapterKey}.`,
      });
      return;
    }

    const chapter = findReferenceCapitalPublicationChapter(chapterKey);
    if (!chapter) {
      issues.push({
        chapterKey,
        code: "chapter_unrecognized",
        message: `Capitulo nao cadastrado no catalogo: ${chapterKey}.`,
      });
      return;
    }

    if (chapter.requirement === "mandatory") {
      issues.push({
        chapterKey,
        code: "mandatory_chapter_cannot_be_optional_selection",
        message: `Capitulo obrigatorio nao pode ser tratado como opcional: ${chapterKey}.`,
      });
    }
  });
}

function findDuplicatedKeys<T extends string>(keys: T[]) {
  return keys.filter((key, index) => keys.indexOf(key) !== index);
}
