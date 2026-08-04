import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadIngestionSupabaseClient = SupabaseClient;

export const metaLeadAdsSourceSystem = "meta_lead_ads" as const;

export type LeadIngestionIntegrationStatus = "active" | "inactive";

export type LeadIngestionStatus =
  | "received"
  | "tenant_unresolved"
  | "fetch_pending"
  | "processing"
  | "materialization_pending"
  | "review_required"
  | "processing_failed"
  | "integrity_conflict"
  | "materialized"
  | "rejected"
  | "retry_exhausted";

export type LeadIngestionFailedStage =
  | "tenant_resolution"
  | "authorization"
  | "graph_fetch"
  | "normalization"
  | "reconciliation"
  | "materialization"
  | "internal";

export type LeadIngestionCustomAnswer = {
  key: string;
  label?: string;
  value: string;
};

export type LeadIngestionNormalizedPayload = {
  adId?: string;
  adName?: string;
  adsetId?: string;
  adsetName?: string;
  campaignId?: string;
  campaignName?: string;
  createdTime?: string;
  customAnswers: LeadIngestionCustomAnswer[];
  email?: string;
  eventType: string;
  externalAccountId: string;
  externalId: string;
  formId?: string;
  formName?: string;
  fullName?: string;
  occurredAt?: string;
  pageId?: string;
  phone?: string;
  sourcePayload: Record<string, unknown>;
  sourceSystem: string;
};

export type LeadIngestionRawInput = {
  adId?: unknown;
  adName?: unknown;
  adsetId?: unknown;
  adsetName?: unknown;
  campaignId?: unknown;
  campaignName?: unknown;
  createdTime?: unknown;
  customAnswers?: unknown;
  email?: unknown;
  eventType?: unknown;
  externalAccountId?: unknown;
  externalEventId?: unknown;
  externalId?: unknown;
  formId?: unknown;
  formName?: unknown;
  fullName?: unknown;
  occurredAt?: unknown;
  pageId?: unknown;
  phone?: unknown;
  sourcePayload?: unknown;
  sourceSystem?: unknown;
};

export type LeadIngestionIntegrationConfig = {
  allowedFormIds: string[];
  createdAt: string;
  externalAccountId: string;
  id: string;
  organizationId: string;
  publicMetadata: Record<string, unknown>;
  sourceSystem: string;
  status: LeadIngestionIntegrationStatus;
  updatedAt: string;
};

export type LeadIngestionEvent = {
  attemptCount: number;
  createdAt: string;
  crmLeadId: string | null;
  eventType: string;
  errorCategory: string | null;
  externalEventId: string | null;
  externalId: string;
  failedStage: LeadIngestionFailedStage | null;
  formId: string | null;
  id: string;
  integrationConfigId: string | null;
  lastErrorCode: LeadIngestionRejectionCode | string | null;
  lastErrorMessage: string | null;
  materializationResult: "created" | "linked_existing" | null;
  normalizedPayload: LeadIngestionNormalizedPayload | Record<string, unknown>;
  organizationId: string | null;
  processedAt: string | null;
  retryable: boolean;
  receivedAt: string;
  sourcePayload: Record<string, unknown>;
  sourceSystem: string;
  status: LeadIngestionStatus;
  updatedAt: string;
};

export type LeadIngestionCrmLead = {
  email: string;
  externalId: string;
  id: string;
  nome: string;
  organizationId: string;
  origem: string;
  phone: string;
  pipeline: string;
  sourceSystem: string;
  stage: string;
  status: string;
  temperature: string;
};

export type CreateLeadIngestionIntegrationConfigParams = {
  allowedFormIds?: string[];
  externalAccountId: string;
  organizationId: string;
  publicMetadata?: Record<string, unknown>;
  sourceSystem: string;
  status?: LeadIngestionIntegrationStatus;
  supabase: LeadIngestionSupabaseClient;
};

export type ResolveLeadIngestionIntegrationConfigParams = {
  externalAccountId: string;
  sourceSystem: string;
  supabase: LeadIngestionSupabaseClient;
};

export type RecordLeadIngestionEventParams = {
  input: LeadIngestionRawInput;
  receivedAt?: string;
  supabase: LeadIngestionSupabaseClient;
};

export type RecordLeadIngestionTransportEventParams = {
  input: LeadIngestionRawInput;
  receivedAt?: string;
  supabase: LeadIngestionSupabaseClient;
};

export type MaterializeLeadIngestionEventParams = {
  claimToken: string;
  eventId: string;
  processedAt?: string;
  supabase: LeadIngestionSupabaseClient;
  targetLeadId?: string;
};

export type LeadIngestionRejectionCode =
  | "DUPLICATE_EVENT"
  | "INTEGRATION_INACTIVE"
  | "INTEGRATION_NOT_FOUND"
  | "FORM_NOT_ALLOWED"
  | "INVALID_EXTERNAL_ACCOUNT"
  | "INVALID_EXTERNAL_ID"
  | "INVALID_SOURCE_SYSTEM"
  | "MISSING_CONTACT"
  | "MISSING_NAME"
  | "PAYLOAD_INVALID"
  | "STATUS_TRANSITION_INVALID";

export type LeadIngestionResult<T> =
  | ({ ok: true } & T)
  | {
      code: LeadIngestionRejectionCode | string;
      error: string;
      ok: false;
      status: number;
    };

export type RecordLeadIngestionEventResult = LeadIngestionResult<{
  event: LeadIngestionEvent;
  idempotent: boolean;
  integrationConfig: LeadIngestionIntegrationConfig | null;
}>;

export type MaterializeLeadIngestionEventResult = LeadIngestionResult<{
  event: LeadIngestionEvent;
  lead: LeadIngestionCrmLead | null;
}>;

export type LeadIngestionIntegrationConfigRow = {
  allowed_form_ids?: string[] | null;
  created_at: string | null;
  external_account_id: string | null;
  id: string;
  organization_id: string | null;
  public_metadata: Record<string, unknown> | null;
  source_system: string | null;
  status: string | null;
  updated_at: string | null;
};

export type LeadIngestionEventRow = {
  attempt_count: number | null;
  created_at: string | null;
  crm_lead_id: string | null;
  event_type: string | null;
  error_category?: string | null;
  external_event_id: string | null;
  external_id: string | null;
  failed_stage?: string | null;
  form_id?: string | null;
  id: string;
  integration_config_id: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  materialization_result?: string | null;
  normalized_payload: Record<string, unknown> | null;
  organization_id: string | null;
  processed_at: string | null;
  retryable?: boolean | null;
  received_at: string | null;
  source_payload: Record<string, unknown> | null;
  source_system: string | null;
  status: string | null;
  updated_at: string | null;
};

export type LeadIngestionCrmLeadRow = {
  email: string | null;
  etapa: string | null;
  external_id: string | null;
  id: string;
  nome: string | null;
  organization_id: string | null;
  origem: string | null;
  pipeline: string | null;
  source_system: string | null;
  status: string | null;
  telefone: string | null;
  temperatura: string | null;
};

export type MaterializeLeadIngestionEventTransactionRow = {
  crm_lead: LeadIngestionCrmLeadRow | null;
  ingestion_event: LeadIngestionEventRow;
};
