import type {
  PatrimonialPublication,
  PatrimonialPublicationRenderedArtifactMetadata,
} from "../../types.ts";

export const executiveMaterialPdfRendererKey =
  "patrimonial_strategy_executive_pdf" as const;

export const executiveMaterialPdfRendererVersion = "STR-005-v1" as const;

export type ExecutiveMaterialPdfRendererKey =
  typeof executiveMaterialPdfRendererKey;

export type ExecutiveMaterialPdfArtifact =
  PatrimonialPublicationRenderedArtifactMetadata & {
    bytes: Uint8Array;
  };

export type ExecutiveMaterialPdfRenderer = {
  render: (publication: PatrimonialPublication) => ExecutiveMaterialPdfArtifact;
  rendererKey: ExecutiveMaterialPdfRendererKey;
  rendererVersion: typeof executiveMaterialPdfRendererVersion;
  supportedProducts: string[];
  supportedPublicationType: "executive_material";
};

export type ExecutiveMaterialPdfPage = {
  body: string[];
  title: string;
};
