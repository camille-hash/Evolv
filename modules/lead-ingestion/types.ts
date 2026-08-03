import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadIngestionSupabaseClient = SupabaseClient;

export const metaLeadAdsSourceSystem = "meta_lead_ads" as const;

export type LeadIngestionIntegrationStatus = "active" | "inactive";

export type LeadIngestionStatus =
  | "received"
  | "fetch_pending"
  | "fetch_failed"
  | "materialization_pending"
  | "materialized"
  | "duplicate"
  | "rejected"
  | "retry_exhausted";

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
  externalEventId: string | null;
  externalId: string;
  id: string;
  integrationConfigId: string | null;
  lastErrorCode: LeadIngestionRejectionCode | string | null;
  lastErrorMessage: string | null;
  normalizedPayload: LeadIngestionNormalizedPayload | Record<string, unknown>;
  organizationId: string | null;
  processedAt: string | null;
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

export type MaterializeLeadIngestionEventParams = {
  eventId: string;
  processedAt?: string;
  supabase: LeadIngestionSupabaseClient;
};

export type LeadIngestionRejectionCode =
  | "DUPLICATE_EVENT"
  | "INTEGRATION_INACTIVE"
  | "INTEGRATION_NOT_FOUND"
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
  external_event_id: string | null;
  external_id: string | null;
  id: string;
  integration_config_id: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  normalized_payload: Record<string, unknown> | null;
  organization_id: string | null;
  processed_at: string | null;
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
