import type {
  CrmLeadDualPipelineSnapshot,
  CrmLeadDualPipelineSource,
  DualPipelineDomain,
  DualStageDomain,
} from "./types";

const PIPELINE_DOMAIN_MAP: Record<string, DualPipelineDomain> = {
  administrative: "administrative",
  administrativo: "administrative",
  lost: "lost",
  perdidos: "lost",
  prospecting: "prospecting",
  prospeccao: "prospecting",
  sales: "sales",
  vendas: "sales",
};

const STAGE_DOMAIN_MAP: Record<string, DualStageDomain> = {
  abertura: "abertura",
  agendamento: "agendamento",
  aguardando_assinatura: "aguardando_assinatura",
  "aguardando-assinatura": "aguardando_assinatura",
  aprovacao_administradora: "aprovacao_administradora",
  "aprovacao-administradora": "aprovacao_administradora",
  cliente_nao_compareceu: "cliente_nao_compareceu",
  "cliente-nao-compareceu": "cliente_nao_compareceu",
  conexao: "conexao",
  contorno_objecoes: "contorno_objecoes",
  "contorno-objecoes": "contorno_objecoes",
  documentacao: "documentacao",
  emissao_contrato: "emissao_contrato",
  "emissao-contrato": "emissao_contrato",
  etapa_pagamento: "etapa_pagamento",
  "etapa-pagamento": "etapa_pagamento",
  fechou_concorrente: "fechou_concorrente",
  "fechou-concorrente": "fechou_concorrente",
  green_flag: "green_flag",
  "green-flag": "green_flag",
  nao_esta_no_momento: "nao_esta_no_momento",
  "nao-esta-no-momento": "nao_esta_no_momento",
  no_show: "no_show",
  "no-show": "no_show",
  novo: "novo",
  novos: "novo",
  primeira_reuniao: "primeira_reuniao",
  "primeira-reuniao": "primeira_reuniao",
  qualificados: "qualificados",
  segunda_reuniao: "segunda_reuniao",
  "segunda-reuniao": "segunda_reuniao",
  tentativas_contato: "tentativas_contato",
  "tentativas-contato": "tentativas_contato",
};

export function resolvePipelineDomain(value: string | null | undefined) {
  return PIPELINE_DOMAIN_MAP[normalizeDomainToken(value)] ?? null;
}

export function resolveStageDomain(value: string | null | undefined) {
  return STAGE_DOMAIN_MAP[normalizeDomainToken(value)] ?? null;
}

export function buildDualPipelineSnapshot(
  lead: CrmLeadDualPipelineSource,
): CrmLeadDualPipelineSnapshot {
  const pipelineDomainFromFuture = resolvePipelineDomain(lead.pipelineDomain);
  const stageDomainFromFuture = resolveStageDomain(lead.stageDomain);

  return {
    leadId: lead.id,
    pipelineDomain: pipelineDomainFromFuture ?? resolvePipelineDomain(lead.pipeline),
    pipelineDomainSource: pipelineDomainFromFuture
      ? "future-domain-fields"
      : "legacy-current-pipeline",
    stageDomain: stageDomainFromFuture ?? resolveStageDomain(lead.etapa),
    stageDomainSource: stageDomainFromFuture
      ? "future-domain-fields"
      : "legacy-current-pipeline",
    lastStageChangedAt: lead.lastStageChangedAt ?? null,
    currentPipeline: lead.pipeline,
    currentStage: lead.etapa,
  };
}

export function isGreenFlagStageDomain(stageDomain: DualStageDomain | null) {
  return stageDomain === "green_flag";
}

function normalizeDomainToken(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
