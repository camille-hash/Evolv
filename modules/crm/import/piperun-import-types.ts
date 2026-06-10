import type { CrmOpportunityStatus } from "@/modules/crm/crm-types";

export type PiperunRawRow = {
  hash: string;
  funil: string;
  etapa: string;
  donoOportunidade: string;
  nomeDonoOportunidade: string;
  origem: string;
  dataCadastro: string;
  dataFechamento: string;
  titulo: string;
  descricao: string;
  observacoes: string;
  status: string;
  situacao: string;
  valorPs: number | null;
  tags: string;
  nomePessoa: string;
  emailPessoa: string;
  telefonePessoa: string;
};

export type PiperunContactRow = {
  nomeCompleto: string;
  consultorEmail: string;
  email: string;
  telefone: string;
  tags: string;
  csResponsavel: string;
  nomeFantasiaEmpresa: string;
  hash?: string;
};

export type PiperunPhoneMatchSource = "hash" | "email" | "name" | "none";

export type PiperunImportWarning =
  | "missing-phone"
  | "repeated-email"
  | "unknown-status"
  | "empty-pipeline"
  | "empty-stage"
  | "empty-value"
  | "duplicate-external-id";

export type PiperunMappedLeadPreview = {
  externalId: string;
  pipeline: string;
  etapa: string;
  consultor: string;
  origem: string;
  createdAt: string;
  closedAt: string;
  tituloOportunidade: string;
  observacoes: string;
  status: CrmOpportunityStatus;
  statusOriginal: string;
  valorPotencial: number;
  tags: string[];
  nome: string;
  email: string;
  telefone: string;
  phoneMatchSource: PiperunPhoneMatchSource;
  warnings: PiperunImportWarning[];
  validForImport: boolean;
};

export type PiperunImportSummary = {
  sourceFile: string;
  sheetName: string;
  totalRows: number;
  validRows: number;
  ignoredMissingPhone: number;
  repeatedEmailRows: number;
  emptyValueRows: number;
  phoneRows: number;
  statusCrmCounts: Record<string, number>;
  consultantCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  pipelineCounts: Record<string, number>;
  stageCounts: Record<string, number>;
  warningCounts: Record<PiperunImportWarning, number>;
};

export type PiperunImportPreview = {
  summary: PiperunImportSummary;
  rows: PiperunMappedLeadPreview[];
  previewRows: PiperunMappedLeadPreview[];
};
