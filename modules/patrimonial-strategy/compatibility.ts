import type {
  FinancialProductDefinition,
  PublicationDefinition,
  StrategyArtifactReference,
} from "./types.ts";
import { defineFinancialProduct, definePublication } from "./registry.ts";

export const traditionalConsortiumProduct = defineFinancialProduct({
  description:
    "Produto de consorcio tradicional atualmente calculado pelo simulador comercial.",
  family: "traditional_consortium",
  id: "financial-product:traditional-consortium",
  name: "Consorcio Tradicional",
  supportedEngineIds: ["engine:traditional-consortium"],
});

export const multiQuotaProduct = defineFinancialProduct({
  description:
    "Estrategia Multi-Cotas existente, tratada como produto financeiro da Estrategia Patrimonial.",
  family: "multi_quota",
  id: "financial-product:multi-quota",
  name: "Estrategia Multi-Cotas",
  supportedEngineIds: ["engine:multi-quota"],
});

export const structuredGroupProduct = defineFinancialProduct({
  description:
    "Familia extensivel para produtos estruturados futuros, sem implementacao de produto nesta sprint.",
  family: "structured_group",
  id: "financial-product:structured-group",
  name: "Produto Estruturado",
  supportedEngineIds: ["engine:structured-group"],
});

export const currentFinancialProducts: FinancialProductDefinition[] = [
  traditionalConsortiumProduct,
  multiQuotaProduct,
  structuredGroupProduct,
];

export const existingPublicationChannels: PublicationDefinition[] = [
  definePublication({
    description:
      "Canal PDF existente. Permanece consumidor de snapshots, sem conhecer engines.",
    format: "pdf",
    id: "publication:pdf",
    name: "PDF Comercial",
  }),
  definePublication({
    description:
      "Canal assistido existente para compartilhamento, sem engine financeira acoplada.",
    format: "whatsapp",
    id: "publication:whatsapp-assisted",
    name: "WhatsApp Assistido",
  }),
  definePublication({
    description:
      "Canal assistido existente para e-mail, sem engine financeira acoplada.",
    format: "email",
    id: "publication:email-assisted",
    name: "Email Assistido",
  }),
];

export function simulationArtifactReference(input: {
  simulationId: string;
}): StrategyArtifactReference {
  return {
    artifactId: input.simulationId,
    artifactType: "simulation",
    source: "crm_lead_simulations",
  };
}

export function commercialProposalArtifactReference(input: {
  proposalId: string;
  version?: number | null;
}): StrategyArtifactReference {
  return {
    artifactId: input.proposalId,
    artifactType: "commercial_proposal",
    source: "crm_lead_commercial_proposals",
    version: input.version ?? null,
  };
}
