import type {
  CrmLead,
  CrmLeadInput,
  CrmOpportunityStatus,
  CrmPipeline,
  CrmPipelineDefinition,
  CrmPipelineSummary,
  CrmStage,
  CrmTemperature,
} from "./crm-types";
import { toCrmPipelineDefinitions } from "./crm-pipeline-engine";

export const crmPipelines: CrmPipelineDefinition[] = [
  {
    key: "prospecting",
    label: "Prospeccao",
    stages: [
      { key: "novos", label: "Novos" },
      { key: "abertura", label: "Abertura" },
      { key: "conexao", label: "Conexao" },
      { key: "qualificados", label: "Qualificados" },
      { key: "no-show", label: "No Show" },
      { key: "agendamento", label: "Agendamento" },
    ],
  },
  {
    key: "sales",
    label: "Vendas",
    stages: [
      { key: "primeira-reuniao", label: "1a Reuniao" },
      { key: "segunda-reuniao", label: "2a Reuniao" },
      { key: "contorno-objecoes", label: "Contorno de objecoes" },
      { key: "green-flag", label: "Green Flag" },
      { key: "documentacao", label: "Documentacao" },
    ],
  },
  {
    key: "administrative",
    label: "Administrativo",
    stages: [
      { key: "emissao-contrato", label: "Emissao do contrato" },
      { key: "etapa-pagamento", label: "Etapa de pagamento" },
      { key: "aguardando-assinatura", label: "Aguardando assinatura" },
      { key: "aprovacao-administradora", label: "Aprovacao da administradora" },
    ],
  },
  {
    key: "lost",
    label: "Perdidos",
    stages: [
      { key: "tentativas-contato", label: "Tentativas de contato" },
      { key: "apresentou-nao-comprou", label: "Apresentou mas nao comprou" },
      { key: "cliente-nao-compareceu", label: "Cliente nao compareceu" },
      { key: "nao-esta-no-momento", label: "Nao esta no momento" },
      { key: "fechou-concorrente", label: "Fechou com concorrente" },
    ],
  },
];

export const crmPipelineLabels = Object.fromEntries(
  crmPipelines.map((pipeline) => [pipeline.key, pipeline.label]),
) as Record<CrmPipeline, string>;

export const crmStageLabels = Object.fromEntries(
  crmPipelines.flatMap((pipeline) =>
    pipeline.stages.map((stage) => [stage.key, stage.label]),
  ),
) as Record<CrmStage, string>;

export const emptyCrmLeadInput: CrmLeadInput = {
  nome: "",
  telefone: "",
  email: "",
  pais: "",
  origem: "",
  consultor: "",
  valorPretendido: 0,
  observacoes: "",
  pipeline: "prospecting",
  etapa: "novos",
  tags: [],
  produtoInteresse: "",
  temperatura: "morna",
  status: "ativa",
  proximaAcao: "",
  dataProximaAcao: "",
};

export const crmTemperatureLabels: Record<CrmTemperature, string> = {
  fria: "Fria",
  morna: "Morna",
  quente: "Quente",
};

export const crmOpportunityStatusLabels: Record<CrmOpportunityStatus, string> =
  {
    ativa: "Ativa",
    ganha: "Ganha",
    perdida: "Perdida",
  };

export type CrmAdvancedSearchFilters = {
  freeText: string;
  status: CrmOpportunityStatus | "all";
  pipeline: CrmPipeline | "all";
  consultor: string;
  temperatura: CrmTemperature | "all";
  origem: string;
};

export type CrmAdvancedSearchSummary = {
  total: number;
  active: number;
  gained: number;
  lost: number;
  totalPotential: number;
};

// Future CRM path: Lead -> Cliente -> Simulacao Comercial -> Multi-Cotas -> Acompanhamento.
// This sprint intentionally keeps that path manual, without automations or integrations.

export function getStagesForPipeline(
  pipeline: CrmPipeline,
  pipelineDefinitions = crmPipelines,
) {
  return getPipelineDefinition(pipeline, pipelineDefinitions).stages;
}

export function getDefaultStageForPipeline(
  pipeline: CrmPipeline,
  pipelineDefinitions = crmPipelines,
): CrmStage {
  return getStagesForPipeline(pipeline, pipelineDefinitions)[0]?.key ?? "novos";
}

export function isStageInPipeline(
  pipeline: CrmPipeline,
  stage: CrmStage,
  pipelineDefinitions = crmPipelines,
): boolean {
  return getStagesForPipeline(pipeline, pipelineDefinitions).some(
    (item) => item.key === stage,
  );
}

export function createCrmLead(input: CrmLeadInput): CrmLead {
  const now = new Date().toISOString();
  const normalizedPipeline = normalizePipeline(input.pipeline);
  const normalizedStage = normalizeStageForPipeline(
    normalizedPipeline,
    input.etapa,
  );

  return {
    ...normalizeLeadInput(input),
    id: crypto.randomUUID(),
    pipeline: normalizedPipeline,
    etapa: normalizedStage,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateCrmLead(
  lead: CrmLead,
  input: CrmLeadInput,
): CrmLead {
  const normalizedPipeline = normalizePipeline(input.pipeline);
  const normalizedStage = normalizeStageForPipeline(
    normalizedPipeline,
    input.etapa,
  );

  return {
    ...lead,
    ...normalizeLeadInput(input),
    pipeline: normalizedPipeline,
    etapa: normalizedStage,
    updatedAt: new Date().toISOString(),
  };
}

export function moveCrmLead(
  lead: CrmLead,
  pipeline: CrmPipeline,
  stage?: CrmStage,
  pipelineDefinitions = crmPipelines,
): CrmLead {
  const movement = resolveCrmLeadMovement({
    lead,
    pipeline,
    pipelineDefinitions,
    stage,
  });

  return {
    ...lead,
    pipeline: movement.toPipeline,
    etapa: movement.toStage,
    updatedAt: new Date().toISOString(),
  };
}

export function resolveCrmLeadMovement({
  lead,
  pipeline,
  pipelineDefinitions = crmPipelines,
  stage,
}: {
  lead: CrmLead;
  pipeline: CrmPipeline;
  pipelineDefinitions?: CrmPipelineDefinition[];
  stage?: CrmStage;
}) {
  const normalizedPipeline = normalizePipeline(pipeline);
  const targetStage =
    stage ??
    (isStageInPipeline(normalizedPipeline, lead.etapa, pipelineDefinitions)
      ? lead.etapa
      : getDefaultStageForPipeline(normalizedPipeline, pipelineDefinitions));
  const normalizedStage = normalizeStageForPipeline(
    normalizedPipeline,
    targetStage,
    pipelineDefinitions,
  );

  return {
    changed:
      lead.pipeline !== normalizedPipeline || lead.etapa !== normalizedStage,
    fromPipeline: lead.pipeline,
    fromStage: lead.etapa,
    toPipeline: normalizedPipeline,
    toStage: normalizedStage,
  };
}

export function summarizeCrmPipeline(leads: CrmLead[]): CrmPipelineSummary {
  return leads.reduce<CrmPipelineSummary>(
    (summary, lead) => ({
      ...summary,
      totalLeads: summary.totalLeads + 1,
      [lead.pipeline]: (summary[lead.pipeline] ?? 0) + 1,
    }),
    {
      totalLeads: 0,
      prospecting: 0,
      sales: 0,
      administrative: 0,
      lost: 0,
    },
  );
}

export function filterCrmLeadsAdvanced(
  leads: CrmLead[],
  filters: CrmAdvancedSearchFilters,
) {
  const normalizedSearch = normalizeSearchText(filters.freeText);
  const normalizedPhoneSearch = normalizePhone(filters.freeText);

  return leads.filter((lead) => {
    const matchesFreeText =
      !normalizedSearch ||
      getCrmLeadSearchFields(lead).some((value) =>
        normalizeSearchText(value).includes(normalizedSearch),
      ) ||
      (Boolean(normalizedPhoneSearch) &&
        normalizePhone(lead.telefone).includes(normalizedPhoneSearch));
    const matchesStatus =
      filters.status === "all" || lead.status === filters.status;
    const matchesPipeline =
      filters.pipeline === "all" || lead.pipeline === filters.pipeline;
    const matchesConsultor =
      filters.consultor === "all" || lead.consultor === filters.consultor;
    const matchesTemperature =
      filters.temperatura === "all" ||
      lead.temperatura === filters.temperatura;
    const matchesOrigin =
      filters.origem === "all" || lead.origem === filters.origem;

    return (
      matchesFreeText &&
      matchesStatus &&
      matchesPipeline &&
      matchesConsultor &&
      matchesTemperature &&
      matchesOrigin
    );
  });
}

export function summarizeCrmAdvancedSearch(
  leads: CrmLead[],
): CrmAdvancedSearchSummary {
  return leads.reduce<CrmAdvancedSearchSummary>(
    (summary, lead) => ({
      active: summary.active + (lead.status === "ativa" ? 1 : 0),
      gained: summary.gained + (lead.status === "ganha" ? 1 : 0),
      lost: summary.lost + (lead.status === "perdida" ? 1 : 0),
      total: summary.total + 1,
      totalPotential: summary.totalPotential + lead.valorPretendido,
    }),
    {
      active: 0,
      gained: 0,
      lost: 0,
      total: 0,
      totalPotential: 0,
    },
  );
}

export function buildCrmAdvancedSearchOptions(leads: CrmLead[]) {
  return {
    consultores: uniqueFilledValues(leads.map((lead) => lead.consultor)),
    origens: uniqueFilledValues(leads.map((lead) => lead.origem)),
    pipelines: uniqueFilledValues(leads.map((lead) => lead.pipeline)),
  };
}

export function normalizeCrmLead(value: unknown): CrmLead | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CrmLead>;
  const pipeline = normalizePipeline(candidate.pipeline);
  const etapa = normalizeStageForPipeline(pipeline, candidate.etapa);
  const createdAt =
    typeof candidate.createdAt === "string"
      ? candidate.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof candidate.updatedAt === "string" ? candidate.updatedAt : createdAt;

  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id
        : crypto.randomUUID(),
    externalId:
      typeof candidate.externalId === "string" ? candidate.externalId : undefined,
    closedAt:
      typeof candidate.closedAt === "string" ? candidate.closedAt : undefined,
    tituloOportunidade:
      typeof candidate.tituloOportunidade === "string"
        ? candidate.tituloOportunidade
        : undefined,
    nome: typeof candidate.nome === "string" ? candidate.nome : "",
    telefone:
      typeof candidate.telefone === "string" ? candidate.telefone : "",
    email: typeof candidate.email === "string" ? candidate.email : "",
    pais: typeof candidate.pais === "string" ? candidate.pais : "",
    origem: typeof candidate.origem === "string" ? candidate.origem : "",
    consultor:
      typeof candidate.consultor === "string" ? candidate.consultor : "",
    valorPretendido:
      typeof candidate.valorPretendido === "number"
        ? candidate.valorPretendido
        : 0,
    observacoes:
      typeof candidate.observacoes === "string"
        ? candidate.observacoes
        : "",
    pipeline,
    etapa,
    tags: normalizeTags(candidate.tags),
    produtoInteresse:
      typeof candidate.produtoInteresse === "string"
        ? candidate.produtoInteresse
        : "",
    temperatura: normalizeTemperature(candidate.temperatura),
    status: normalizeOpportunityStatus(candidate.status),
    proximaAcao:
      typeof candidate.proximaAcao === "string" ? candidate.proximaAcao : "",
    dataProximaAcao:
      typeof candidate.dataProximaAcao === "string"
        ? candidate.dataProximaAcao
        : "",
    createdAt,
    updatedAt,
  };
}

export function getDefaultCrmPipelineDefinitions() {
  return toCrmPipelineDefinitions(crmPipelines.map((pipeline, index) => ({
    id: pipeline.key,
    nome: pipeline.label,
    ordem: index + 1,
    ativo: true,
    etapas: pipeline.stages.map((stage, stageIndex) => ({
      id: stage.key,
      nome: stage.label,
      ordem: stageIndex + 1,
    })),
  })));
}

function getPipelineDefinition(
  pipeline: CrmPipeline,
  pipelineDefinitions: CrmPipelineDefinition[],
) {
  return (
    pipelineDefinitions.find((item) => item.key === pipeline) ??
    pipelineDefinitions[0] ??
    crmPipelines[0]
  );
}

function normalizePipeline(pipeline: unknown): CrmPipeline {
  return typeof pipeline === "string" && pipeline.trim()
    ? pipeline.trim()
    : "prospecting";
}

function normalizeStageForPipeline(
  pipeline: CrmPipeline,
  stage: unknown,
  pipelineDefinitions = crmPipelines,
): CrmStage {
  if (typeof stage === "string" && stage.trim()) {
    return stage.trim();
  }

  return getDefaultStageForPipeline(pipeline, pipelineDefinitions);
}

function normalizeLeadInput(input: CrmLeadInput): CrmLeadInput {
  return {
    ...input,
    nome: input.nome.trim(),
    telefone: input.telefone.trim(),
    email: input.email.trim(),
    pais: input.pais?.trim() ?? "",
    origem: input.origem.trim(),
    consultor: input.consultor.trim(),
    valorPretendido: Number.isFinite(input.valorPretendido)
      ? Math.max(input.valorPretendido, 0)
      : 0,
    observacoes: input.observacoes.trim(),
    tags: normalizeTags(input.tags),
    produtoInteresse: input.produtoInteresse.trim(),
    temperatura: normalizeTemperature(input.temperatura),
    status: normalizeOpportunityStatus(input.status),
    proximaAcao: input.proximaAcao.trim(),
    dataProximaAcao: input.dataProximaAcao.trim(),
  };
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeTemperature(temperature: unknown): CrmTemperature {
  return temperature === "fria" ||
    temperature === "morna" ||
    temperature === "quente"
    ? temperature
    : "morna";
}

function normalizeOpportunityStatus(status: unknown): CrmOpportunityStatus {
  return status === "ativa" || status === "ganha" || status === "perdida"
    ? status
    : "ativa";
}

function getCrmLeadSearchFields(lead: CrmLead) {
  return [
    lead.nome,
    lead.telefone,
    lead.email,
    lead.pais ?? "",
    lead.status,
    lead.pipeline,
    lead.etapa,
    lead.consultor,
    lead.origem,
    lead.temperatura,
    lead.produtoInteresse,
    lead.observacoes,
    lead.tituloOportunidade ?? "",
    lead.tags.join(" "),
  ];
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizePhone(value: string) {
  return value.replace(/\D+/g, "");
}

function uniqueFilledValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right, "pt-BR"),
  );
}
