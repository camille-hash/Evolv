import {
  referenceCapitalEngineKey,
  referenceCapitalEngineVersion,
  referenceCapitalExclusiveProductDefinition,
  referenceCapitalProductKey,
  referenceCapitalProductVersion,
  type ReferenceCapitalStrategySnapshot,
} from "../reference-capital-2227.ts";
import {
  getReferenceCapitalExecutiveMaterialChapters,
  referenceCapitalContemplationDisclaimer,
  resolveChapterAvailability,
  toChapterSelection,
} from "./chapters.ts";
import type {
  PatrimonialPublication,
  PatrimonialPublicationChapterKey,
  PatrimonialPublicationChapterSelection,
  PatrimonialPublicationCommercialProposalReference,
  PatrimonialPublicationPreviewItem,
  PatrimonialPublicationRequest,
  PatrimonialPublicationResolvedChapter,
  PatrimonialPublicationSourceArtifacts,
} from "./types.ts";
import {
  assertValidPublicationRequest,
  assertValidPublicationSnapshot,
} from "./validation.ts";

export const patrimonialPublicationBuilderVersion = "STR-004-v1";

export function buildPatrimonialPublication(
  request: PatrimonialPublicationRequest,
): PatrimonialPublication {
  assertValidPublicationRequest(request);

  const createdAt = request.createdAt ?? new Date().toISOString();
  const commercialProposal = resolveCommercialProposalReference(request);
  const sourceArtifacts = resolveSourceArtifacts(request, commercialProposal);
  const chapters = getReferenceCapitalExecutiveMaterialChapters();
  const optionalKeys = resolveSelectedOptionalChapterKeys({
    requestedKeys: request.selectedOptionalChapterKeys,
    strategySnapshot: request.strategySnapshot,
  });

  const selections = chapters.map((chapter) => {
    const availability = resolveChapterAvailability({
      chapter,
      commercialProposal,
      strategySnapshot: request.strategySnapshot,
    });
    const selected =
      chapter.requirement === "mandatory" ||
      (optionalKeys.includes(chapter.chapterKey) && availability.available);

    return toChapterSelection({
      availability,
      chapter,
      selected,
    });
  });

  const selectedChapters = selections
    .filter((chapter) => chapter.selected)
    .sort((left, right) => left.defaultOrder - right.defaultOrder);
  const mandatoryChapters = selections.filter(
    (chapter) => chapter.requirement === "mandatory",
  );
  const optionalChapters = selections.filter(
    (chapter) => chapter.requirement === "optional",
  );
  const publicationVersion = request.publicationVersion ?? 1;

  const publication: PatrimonialPublication = deepFreeze({
    audience: request.audience ?? "client",
    contentSnapshot: {
      builderVersion: patrimonialPublicationBuilderVersion,
      commercialProposal,
      createdFromSnapshotAt: request.strategySnapshot.createdAt,
      engine: {
        key: referenceCapitalEngineKey,
        version: referenceCapitalEngineVersion,
      },
      officialRules: clone(request.strategySnapshot.result.officialRules),
      product: {
        key: referenceCapitalProductKey,
        name: referenceCapitalExclusiveProductDefinition.name,
        version: referenceCapitalProductVersion,
      },
      quotas: clone(request.strategySnapshot.result.quotas),
      resolvedChapters: selectedChapters.map((chapter) =>
        resolveChapterContent({
          chapter,
          commercialProposal,
          strategySnapshot: request.strategySnapshot,
        }),
      ),
      result: clone(request.strategySnapshot.result),
      sourceSnapshot: clone(request.strategySnapshot),
      strategy: {
        id: request.strategyId,
        title: request.strategyTitle,
        version: request.strategyVersion,
      },
    },
    createdAt,
    createdBy: request.createdBy ?? null,
    editorialPreferences: {
      includeContemplationScenariosInMaterial:
        request.strategySnapshot.input.includeContemplationScenariosInMaterial,
    },
    id:
      request.publicationId ??
      createPublicationId({
        createdAt,
        publicationVersion,
        strategyId: request.strategyId,
        strategyVersion: request.strategyVersion,
      }),
    mandatoryChapters,
    optionalChapters,
    publicationType: request.publicationType ?? "executive_material",
    publicationVersion,
    selectedChapters,
    sourceArtifacts,
    status: request.status ?? "ready",
    strategyId: request.strategyId,
    strategyVersion: request.strategyVersion,
    title:
      request.title?.trim() ||
      `Material Executivo - ${request.strategyTitle.trim()}`,
  });

  assertValidPublicationSnapshot(publication);

  return publication;
}

export function createPublicationPreview(
  publication: Pick<PatrimonialPublication, "selectedChapters">,
): PatrimonialPublicationPreviewItem[] {
  return publication.selectedChapters.map((chapter, index) => ({
    chapterKey: chapter.chapterKey,
    order: index + 1,
    requirement: chapter.requirement,
    title: chapter.title,
  }));
}

export function reopenPatrimonialPublicationDraft(
  publication: PatrimonialPublication,
): PatrimonialPublication {
  assertValidPublicationSnapshot(publication);
  return deepFreeze(clone(publication));
}

function resolveSelectedOptionalChapterKeys(input: {
  requestedKeys?: PatrimonialPublicationChapterKey[];
  strategySnapshot: ReferenceCapitalStrategySnapshot;
}): PatrimonialPublicationChapterKey[] {
  if (input.requestedKeys) {
    return [...input.requestedKeys];
  }

  return input.strategySnapshot.input.includeContemplationScenariosInMaterial
    ? ["contemplation_scenarios"]
    : [];
}

function resolveCommercialProposalReference(
  request: PatrimonialPublicationRequest,
): PatrimonialPublicationCommercialProposalReference | null {
  const explicitReference = request.sourceArtifacts?.commercialProposal;
  if (explicitReference?.artifactId) {
    return {
      artifactId: explicitReference.artifactId,
      source: "crm_lead_commercial_proposals",
      status: explicitReference.status ?? null,
      version: explicitReference.version ?? null,
    };
  }

  const snapshotReference = request.strategySnapshot.commercialProposal;
  if (snapshotReference?.artifactId) {
    return {
      artifactId: snapshotReference.artifactId,
      source: "crm_lead_commercial_proposals",
      status: snapshotReference.status ?? null,
      version: snapshotReference.version ?? null,
    };
  }

  return null;
}

function resolveSourceArtifacts(
  request: PatrimonialPublicationRequest,
  commercialProposal: PatrimonialPublicationCommercialProposalReference | null,
): PatrimonialPublicationSourceArtifacts {
  return {
    commercialProposal,
    strategyArtifacts: request.sourceArtifacts?.strategyArtifacts
      ? request.sourceArtifacts.strategyArtifacts.map((artifact) => ({
          ...artifact,
        }))
      : [],
  };
}

function resolveChapterContent(input: {
  chapter: PatrimonialPublicationChapterSelection;
  commercialProposal: PatrimonialPublicationCommercialProposalReference | null;
  strategySnapshot: ReferenceCapitalStrategySnapshot;
}): PatrimonialPublicationResolvedChapter {
  const { chapter, commercialProposal, strategySnapshot } = input;

  return {
    chapterKey: chapter.chapterKey,
    content: buildChapterContent({
      chapterKey: chapter.chapterKey,
      commercialProposal,
      strategySnapshot,
    }),
    order: chapter.defaultOrder,
    rendererKey: chapter.rendererKey,
    title: chapter.title,
  };
}

function buildChapterContent(input: {
  chapterKey: PatrimonialPublicationChapterKey;
  commercialProposal: PatrimonialPublicationCommercialProposalReference | null;
  strategySnapshot: ReferenceCapitalStrategySnapshot;
}): Record<string, unknown> {
  const { chapterKey, commercialProposal, strategySnapshot } = input;
  const result = strategySnapshot.result;

  if (chapterKey === "cover") {
    return {
      clientName: strategySnapshot.leadContext?.leadName ?? null,
      consultantName: strategySnapshot.leadContext?.responsibleName ?? null,
      productKey: strategySnapshot.financialProductKey,
      productName: result.product.name,
      productVersion: strategySnapshot.financialProductVersion,
      strategyDisplayName: strategySnapshot.metadata.strategyDisplayName,
    };
  }

  if (chapterKey === "strategy_synthesis") {
    return {
      compositionByCredit: clone(result.compositionByCredit),
      consolidated: clone(result.consolidated),
    };
  }

  if (chapterKey === "used_product") {
    return {
      commercialDistributionPolicy: clone(result.commercialDistributionPolicy),
      officialRules: clone(result.officialRules),
      product: clone(result.product),
    };
  }

  if (chapterKey === "quota_structure") {
    return {
      quotas: clone(result.quotas),
    };
  }

  if (chapterKey === "installment_evolution") {
    return {
      consolidated: clone(result.consolidated),
      firstInccAdjustmentInstallment:
        result.officialRules.firstInccAdjustmentInstallment,
      inccIndex: result.officialRules.inccIndex,
    };
  }

  if (chapterKey === "conditions_disclaimers") {
    return {
      officialRules: clone(result.officialRules),
      productVersion: strategySnapshot.financialProductVersion,
    };
  }

  if (chapterKey === "client_objectives") {
    return {
      commercialContext: clone(
        strategySnapshot.leadContext?.commercialContext ?? {},
      ),
    };
  }

  if (chapterKey === "patrimonial_consulting") {
    return {
      commercialProposal,
    };
  }

  if (chapterKey === "contemplation_scenarios") {
    return {
      disclaimer: referenceCapitalContemplationDisclaimer,
      scenarios: result.quotas.map((quota) => ({
        catalogCode: quota.catalogCode,
        contemplationScenarioMonth: quota.contemplationScenarioMonth,
        creditCents: quota.creditCents,
        id: quota.id,
        position: quota.position,
      })),
    };
  }

  return {
    engineKey: strategySnapshot.calculationEngineKey,
    engineVersion: strategySnapshot.calculationEngineVersion,
    input: clone(strategySnapshot.input),
    result: clone(strategySnapshot.result),
  };
}

function createPublicationId(input: {
  createdAt: string;
  publicationVersion: number;
  strategyId: string;
  strategyVersion: number;
}) {
  const safeCreatedAt = input.createdAt.replace(/[^0-9a-z]/gi, "").slice(0, 14);
  const safeStrategyId = input.strategyId.replace(/[^0-9a-z:-]/gi, "-");

  return `publication:${safeStrategyId}:strategy-v${input.strategyVersion}:publication-v${input.publicationVersion}:${safeCreatedAt}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }

  Object.freeze(value);
  Object.values(value as Record<string, unknown>).forEach((nestedValue) => {
    if (
      nestedValue &&
      typeof nestedValue === "object" &&
      !Object.isFrozen(nestedValue)
    ) {
      deepFreeze(nestedValue);
    }
  });

  return value;
}
