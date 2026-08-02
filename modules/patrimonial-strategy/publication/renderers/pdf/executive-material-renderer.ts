import {
  referenceCapitalProductKey,
} from "../../../reference-capital-2227.ts";
import type {
  PatrimonialPublication,
  PatrimonialPublicationRenderedArtifactMetadata,
} from "../../types.ts";
import { buildExecutiveMaterialPdfFileName } from "./filename.ts";
import { renderExecutiveMaterialPdfLayout } from "./layout.ts";
import {
  buildExecutiveMaterialPdfPages,
  buildExecutiveMaterialPdfTextIndex,
} from "./sections.ts";
import type {
  ExecutiveMaterialPdfArtifact,
  ExecutiveMaterialPdfRenderer,
} from "./types.ts";
import {
  executiveMaterialPdfRendererKey,
  executiveMaterialPdfRendererVersion,
} from "./types.ts";
import { assertExecutiveMaterialPdfRenderable } from "./validation.ts";

export const executiveMaterialPdfRenderer: ExecutiveMaterialPdfRenderer = {
  render: renderExecutiveMaterialPdf,
  rendererKey: executiveMaterialPdfRendererKey,
  rendererVersion: executiveMaterialPdfRendererVersion,
  supportedProducts: [referenceCapitalProductKey],
  supportedPublicationType: "executive_material",
};

export function renderExecutiveMaterialPdf(
  publication: PatrimonialPublication,
): ExecutiveMaterialPdfArtifact {
  assertExecutiveMaterialPdfRenderable(publication);

  const pages = buildExecutiveMaterialPdfPages(publication);
  const doc = renderExecutiveMaterialPdfLayout({ pages, publication });
  const arrayBuffer = doc.output("arraybuffer");
  const bytes = new Uint8Array(arrayBuffer);
  const createdAt = publication.createdAt;
  const fileName = buildExecutiveMaterialPdfFileName(publication);
  const checksum = createDeterministicChecksum(
    buildExecutiveMaterialPdfTextIndex(publication).join("\n"),
  );

  return {
    artifactId: createArtifactId({
      checksum,
      publicationId: publication.id,
      publicationVersion: publication.publicationVersion,
    }),
    byteLength: bytes.byteLength,
    bytes,
    checksum,
    createdAt,
    fileName,
    mimeType: "application/pdf",
    publicationId: publication.id,
    publicationVersion: publication.publicationVersion,
    rendererKey: executiveMaterialPdfRendererKey,
    rendererVersion: executiveMaterialPdfRendererVersion,
    status: "generated",
    strategyId: publication.strategyId,
    strategyVersion: publication.strategyVersion,
  };
}

export function attachExecutiveMaterialPdfArtifactMetadata(input: {
  artifact: ExecutiveMaterialPdfArtifact;
  publication: PatrimonialPublication;
}): PatrimonialPublication {
  const metadata = stripPdfBytes(input.artifact);
  const existingArtifacts = input.publication.renderedArtifacts ?? [];

  return {
    ...input.publication,
    renderedArtifacts: [
      ...existingArtifacts.filter(
        (artifact) =>
          !(
            artifact.rendererKey === metadata.rendererKey &&
            artifact.rendererVersion === metadata.rendererVersion &&
            artifact.publicationVersion === metadata.publicationVersion
          ),
      ),
      metadata,
    ],
    status: "rendered",
  };
}

function stripPdfBytes(
  artifact: ExecutiveMaterialPdfArtifact,
): PatrimonialPublicationRenderedArtifactMetadata {
  return {
    artifactId: artifact.artifactId,
    byteLength: artifact.byteLength,
    checksum: artifact.checksum,
    createdAt: artifact.createdAt,
    fileName: artifact.fileName,
    mimeType: artifact.mimeType,
    publicationId: artifact.publicationId,
    publicationVersion: artifact.publicationVersion,
    rendererKey: artifact.rendererKey,
    rendererVersion: artifact.rendererVersion,
    status: artifact.status,
    strategyId: artifact.strategyId,
    strategyVersion: artifact.strategyVersion,
  };
}

function createArtifactId(input: {
  checksum: string;
  publicationId: string;
  publicationVersion: number;
}) {
  const safePublicationId = input.publicationId
    .replace(/[^a-z0-9:-]/gi, "-")
    .slice(0, 120);

  return `artifact:${safePublicationId}:v${input.publicationVersion}:${input.checksum}`;
}

function createDeterministicChecksum(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
