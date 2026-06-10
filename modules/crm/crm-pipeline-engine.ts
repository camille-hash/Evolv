import type {
  CrmConfigurablePipeline,
  CrmConfigurableStage,
  CrmLead,
  CrmPipelineDefinition,
  CrmStage,
} from "./crm-types";

export const defaultCrmPipelineConfig: CrmConfigurablePipeline[] = [
  {
    id: "prospecting",
    nome: "Prospeccao",
    ordem: 1,
    ativo: true,
    etapas: [
      buildDefaultStage("novos", "Novos", 1),
      buildDefaultStage("abertura", "Abertura", 2),
      buildDefaultStage("conexao", "Conexao", 3),
      buildDefaultStage("qualificados", "Qualificados", 4),
      buildDefaultStage("no-show", "No Show", 5),
      buildDefaultStage("agendamento", "Agendamento", 6),
    ],
  },
  {
    id: "sales",
    nome: "Vendas",
    ordem: 2,
    ativo: true,
    etapas: [
      buildDefaultStage("primeira-reuniao", "1a Reuniao", 1),
      buildDefaultStage("segunda-reuniao", "2a Reuniao", 2),
      buildDefaultStage("contorno-objecoes", "Contorno de objecoes", 3),
      buildDefaultStage("green-flag", "Green Flag", 4),
      buildDefaultStage("documentacao", "Documentacao", 5),
    ],
  },
  {
    id: "administrative",
    nome: "Administrativo",
    ordem: 3,
    ativo: true,
    etapas: [
      buildDefaultStage("emissao-contrato", "Emissao do contrato", 1),
      buildDefaultStage("etapa-pagamento", "Etapa de pagamento", 2),
      buildDefaultStage("aguardando-assinatura", "Aguardando assinatura", 3),
      buildDefaultStage(
        "aprovacao-administradora",
        "Aprovacao da administradora",
        4,
      ),
    ],
  },
  {
    id: "lost",
    nome: "Perdidos",
    ordem: 4,
    ativo: true,
    etapas: [
      buildDefaultStage("tentativas-contato", "Tentativas de contato", 1),
      buildDefaultStage(
        "apresentou-nao-comprou",
        "Apresentou mas nao comprou",
        2,
      ),
      buildDefaultStage("cliente-nao-compareceu", "Cliente nao compareceu", 3),
      buildDefaultStage("nao-esta-no-momento", "Nao esta no momento", 4),
      buildDefaultStage("fechou-concorrente", "Fechou com concorrente", 5),
    ],
  },
];

export function normalizeCrmPipelineConfig(
  value: unknown,
): CrmConfigurablePipeline[] {
  if (!Array.isArray(value)) {
    return cloneDefaultCrmPipelineConfig();
  }

  const normalized = value
    .map(normalizePipeline)
    .filter((pipeline): pipeline is CrmConfigurablePipeline =>
      Boolean(pipeline),
    )
    .sort((left, right) => left.ordem - right.ordem);

  return normalized.length ? normalized : cloneDefaultCrmPipelineConfig();
}

export function cloneDefaultCrmPipelineConfig() {
  return defaultCrmPipelineConfig.map((pipeline) => ({
    ...pipeline,
    etapas: pipeline.etapas.map((stage) => ({ ...stage })),
  }));
}

export function toCrmPipelineDefinitions(
  pipelines: CrmConfigurablePipeline[],
): CrmPipelineDefinition[] {
  return pipelines
    .filter((pipeline) => pipeline.ativo)
    .sort((left, right) => left.ordem - right.ordem)
    .map((pipeline) => ({
      key: pipeline.id,
      label: pipeline.nome,
      stages: [...pipeline.etapas]
        .sort((left, right) => left.ordem - right.ordem)
        .map((stage) => ({
          key: stage.id,
          label: stage.nome,
        })),
    }));
}

export function buildCrmPipelineLabels(
  pipelineDefinitions: CrmPipelineDefinition[],
) {
  return Object.fromEntries(
    pipelineDefinitions.map((pipeline) => [pipeline.key, pipeline.label]),
  ) as Record<string, string>;
}

export function buildCrmStageLabels(
  pipelineDefinitions: CrmPipelineDefinition[],
) {
  return Object.fromEntries(
    pipelineDefinitions.flatMap((pipeline) =>
      pipeline.stages.map((stage) => [stage.key, stage.label]),
    ),
  ) as Record<string, string>;
}

export function mergeLeadPipelinesIntoDefinitions({
  leads,
  pipelineDefinitions,
}: {
  leads: CrmLead[];
  pipelineDefinitions: CrmPipelineDefinition[];
}): CrmPipelineDefinition[] {
  const nextDefinitions = pipelineDefinitions.map((pipeline) => ({
    ...pipeline,
    stages: pipeline.stages.map((stage) => ({ ...stage })),
  }));

  leads.forEach((lead) => {
    let pipeline = nextDefinitions.find((item) => item.key === lead.pipeline);

    if (!pipeline) {
      pipeline = {
        key: lead.pipeline,
        label: `${lead.pipeline} (nao configurado)`,
        stages: [],
      };
      nextDefinitions.push(pipeline);
    }

    if (!pipeline.stages.some((stage) => stage.key === lead.etapa)) {
      pipeline.stages.push({
        key: lead.etapa,
        label: `${lead.etapa} (nao configurada)`,
      });
    }
  });

  return nextDefinitions;
}

export function isLeadUsingMissingPipelineOrStage({
  lead,
  pipelineDefinitions,
}: {
  lead: CrmLead;
  pipelineDefinitions: CrmPipelineDefinition[];
}) {
  const pipeline = pipelineDefinitions.find((item) => item.key === lead.pipeline);

  return !pipeline || !pipeline.stages.some((stage) => stage.key === lead.etapa);
}

export function createCrmStageId(name: string): CrmStage {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return (normalized || `etapa-${Date.now()}`) as CrmStage;
}

function buildDefaultStage(
  id: CrmStage,
  nome: string,
  ordem: number,
): CrmConfigurableStage {
  return { id, nome, ordem };
}

function normalizePipeline(value: unknown): CrmConfigurablePipeline | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CrmConfigurablePipeline>;

  if (!candidate.id) {
    return null;
  }

  const etapas = Array.isArray(candidate.etapas)
    ? candidate.etapas
        .map(normalizeStage)
        .filter((stage): stage is CrmConfigurableStage => Boolean(stage))
    : [];

  return {
    id: candidate.id,
    nome: candidate.nome?.trim() || String(candidate.id),
    ordem: Number.isFinite(candidate.ordem) ? Number(candidate.ordem) : 999,
    ativo: candidate.ativo !== false,
    etapas: etapas
      .sort((left, right) => left.ordem - right.ordem)
      .map((stage, index) => ({ ...stage, ordem: index + 1 })),
  };
}

function normalizeStage(value: unknown): CrmConfigurableStage | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CrmConfigurableStage>;

  if (!candidate.id) {
    return null;
  }

  return {
    id: candidate.id,
    nome: candidate.nome?.trim() || String(candidate.id),
    ordem: Number.isFinite(candidate.ordem) ? Number(candidate.ordem) : 999,
  };
}
