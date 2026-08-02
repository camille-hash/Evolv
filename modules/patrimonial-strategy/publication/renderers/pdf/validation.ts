import {
  referenceCapitalProductKey,
  referenceCapitalProductVersion,
} from "../../../reference-capital-2227.ts";
import type { PatrimonialPublication } from "../../types.ts";
import { assertValidPublicationSnapshot } from "../../validation.ts";
import {
  executiveMaterialPdfRendererKey,
  executiveMaterialPdfRendererVersion,
} from "./types.ts";

export function assertExecutiveMaterialPdfRenderable(
  publication: PatrimonialPublication,
) {
  assertValidPublicationSnapshot(publication);

  if (publication.status !== "ready" && publication.status !== "rendered") {
    throw new Error(
      "A publicacao precisa estar pronta antes da geracao do Material Executivo.",
    );
  }

  if (publication.publicationType !== "executive_material") {
    throw new Error("Tipo de publicacao incompativel com o renderer PDF.");
  }

  if (publication.contentSnapshot.product.key !== referenceCapitalProductKey) {
    throw new Error("Produto incompativel com o renderer PDF executivo.");
  }

  if (
    publication.contentSnapshot.product.version !== referenceCapitalProductVersion
  ) {
    throw new Error("Versao do produto incompativel com o renderer PDF.");
  }

  const selectedKeys = publication.selectedChapters.map(
    (chapter) => chapter.chapterKey,
  );
  const duplicatedKey = selectedKeys.find(
    (key, index) => selectedKeys.indexOf(key) !== index,
  );

  if (duplicatedKey) {
    throw new Error(`Capitulo duplicado no Material Executivo: ${duplicatedKey}.`);
  }

  const missingMandatory = publication.mandatoryChapters.find(
    (chapter) => !selectedKeys.includes(chapter.chapterKey),
  );

  if (missingMandatory) {
    throw new Error(
      `Capitulo obrigatorio ausente: ${missingMandatory.title}.`,
    );
  }
}

export function assertSupportedRendererMetadata(input: {
  rendererKey: string;
  rendererVersion: string;
}) {
  if (
    input.rendererKey !== executiveMaterialPdfRendererKey ||
    input.rendererVersion !== executiveMaterialPdfRendererVersion
  ) {
    throw new Error("Metadados do renderer PDF incompativeis.");
  }
}
