import type { CrmLead } from "../crm/crm-types";

export type DualPipelineDomain =
  | "prospecting"
  | "sales"
  | "administrative"
  | "lost";

export type ProspectingStageDomain =
  | "novo"
  | "abertura"
  | "conexao"
  | "qualificados"
  | "agendamento"
  | "no_show";

export type SalesStageDomain =
  | "primeira_reuniao"
  | "segunda_reuniao"
  | "contorno_objecoes"
  | "green_flag"
  | "documentacao"
  | "primeiro_boleto_pago"
  | "venda_concluida";

export type AdministrativeStageDomain =
  | "emissao_contrato"
  | "etapa_pagamento"
  | "aguardando_assinatura"
  | "aprovacao_administradora";

export type LostStageDomain =
  | "tentativas_contato"
  | "apresentou_nao_comprou"
  | "cliente_nao_compareceu"
  | "nao_esta_no_momento"
  | "fechou_concorrente";

export type DualStageDomain =
  | ProspectingStageDomain
  | SalesStageDomain
  | AdministrativeStageDomain
  | LostStageDomain;

export type DualPipelineFutureLeadFields = {
  pipelineDomain?: string | null;
  stageDomain?: string | null;
  lastStageChangedAt?: string | null;
  firstInvoicePaid?: boolean | null;
  firstInvoicePaidAt?: string | null;
  salesClosedAt?: string | null;
};

export type CrmLeadDualPipelineSource = CrmLead & DualPipelineFutureLeadFields;

export type DualPipelineSnapshotSource =
  | "legacy-current-pipeline"
  | "future-domain-fields";

export type CrmLeadDualPipelineSnapshot = {
  leadId: string;
  pipelineDomain: DualPipelineDomain | null;
  pipelineDomainSource: DualPipelineSnapshotSource;
  stageDomain: DualStageDomain | null;
  stageDomainSource: DualPipelineSnapshotSource;
  lastStageChangedAt: string | null;
  currentPipeline: string;
  currentStage: string;
};

export type DualStageEventType =
  | "manual_move"
  | "green_flag_created"
  | "green_flag_rescheduled"
  | "green_flag_resolved"
  | "meeting_scheduled"
  | "no_show"
  | "lost"
  | "restored";

export type CrmStageEventDraft = {
  organizationId?: string | null;
  leadId: string;
  actorProfileId?: string | null;
  eventType: DualStageEventType;
  fromPipelineDomain: DualPipelineDomain | null;
  fromStageDomain: DualStageDomain | null;
  toPipelineDomain: DualPipelineDomain | null;
  toStageDomain: DualStageDomain | null;
  note: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type GreenFlagStatus =
  | "active"
  | "rescheduled"
  | "meeting_scheduled"
  | "lost"
  | "resolved"
  | "expired";

export type CrmGreenFlagDraft = {
  organizationId?: string | null;
  leadId: string;
  stageEventId?: string | null;
  createdByProfileId?: string | null;
  assignedProfileId?: string | null;
  resolvedByProfileId?: string | null;
  status: GreenFlagStatus;
  dueAt: string | null;
  note: string | null;
  context: string | null;
  resolutionReason: string | null;
  resolvedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  source: "legacy-derived" | "future-table";
};

export type RevenueRecognitionStatus =
  | "not_started"
  | "awaiting_first_invoice_payment"
  | "recognized"
  | "legacy_closed_without_invoice_confirmation";

export type RevenueRecognitionSnapshot = {
  leadId: string;
  status: RevenueRecognitionStatus;
  firstInvoicePaid: boolean;
  firstInvoicePaidAt: string | null;
  salesClosedAt: string | null;
  legacyClosedAt: string | null;
  requiresExplicitConfirmation: boolean;
};
