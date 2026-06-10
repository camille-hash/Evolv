export type CrmPipeline = string;

export type CrmStage = string;

export type CrmStageDefinition = {
  key: CrmStage;
  label: string;
};

export type CrmPipelineDefinition = {
  key: CrmPipeline;
  label: string;
  stages: CrmStageDefinition[];
};

export type CrmConfigurableStage = {
  id: CrmStage;
  nome: string;
  ordem: number;
};

export type CrmConfigurablePipeline = {
  id: CrmPipeline;
  nome: string;
  ordem: number;
  ativo: boolean;
  etapas: CrmConfigurableStage[];
};

export type CrmTemperature = "fria" | "morna" | "quente";
export type CrmOpportunityStatus = "ativa" | "ganha" | "perdida";

export type CrmLead = {
  id: string;
  externalId?: string;
  closedAt?: string;
  tituloOportunidade?: string;
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  consultor: string;
  valorPretendido: number;
  observacoes: string;
  pipeline: CrmPipeline;
  etapa: CrmStage;
  tags: string[];
  produtoInteresse: string;
  temperatura: CrmTemperature;
  status: CrmOpportunityStatus;
  proximaAcao: string;
  dataProximaAcao: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmLeadInput = Omit<CrmLead, "id" | "createdAt" | "updatedAt">;

export type CrmPipelineSummary = {
  totalLeads: number;
  prospecting: number;
  sales: number;
  administrative: number;
  lost: number;
  [pipeline: string]: number;
};

export type CrmNote = {
  id: string;
  leadId: string;
  content: string;
  createdAt: string;
};

export type CrmActivityType =
  | "ligacao"
  | "whatsapp"
  | "reuniao"
  | "proposta"
  | "retorno"
  | "outro";

export type CrmActivityStatus = "pending" | "completed";

export type CrmActivity = {
  id: string;
  leadId: string;
  titulo: string;
  tipo: CrmActivityType;
  data: string;
  hora: string;
  status: CrmActivityStatus;
  createdAt: string;
  completedAt?: string;
};

export type CrmStageChange = {
  id: string;
  leadId: string;
  fromPipeline: CrmPipeline;
  fromStage: CrmStage;
  toPipeline: CrmPipeline;
  toStage: CrmStage;
  createdAt: string;
};

export type CrmTimelineEventType =
  | "lead-created"
  | "note-created"
  | "activity-created"
  | "activity-completed"
  | "stage-changed";

export type CrmTimelineEvent = {
  id: string;
  type: CrmTimelineEventType;
  timestamp: string;
  description: string;
};
