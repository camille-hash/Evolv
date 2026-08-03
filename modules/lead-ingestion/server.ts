import {
  normalizeLeadIngestionPayload,
  normalizePlainObject,
  sanitizeLeadIngestionErrorMessage,
} from "./normalization.ts";
import {
  assertLeadIngestionStatusTransition,
  isLeadIngestionStatus,
} from "./status.ts";
import type {
  CreateLeadIngestionIntegrationConfigParams,
  LeadIngestionCrmLeadRow,
  LeadIngestionEvent,
  LeadIngestionEventRow,
  LeadIngestionIntegrationConfig,
  LeadIngestionIntegrationConfigRow,
  LeadIngestionIntegrationStatus,
  LeadIngestionNormalizedPayload,
  LeadIngestionResult,
  LeadIngestionStatus,
  MaterializeLeadIngestionEventParams,
  MaterializeLeadIngestionEventResult,
  MaterializeLeadIngestionEventTransactionRow,
  RecordLeadIngestionEventParams,
  RecordLeadIngestionEventResult,
  RecordLeadIngestionTransportEventParams,
  ResolveLeadIngestionIntegrationConfigParams,
} from "./types.ts";

const integrationConfigColumns = [
  "id",
  "organization_id",
  "source_system",
  "external_account_id",
  "status",
  "public_metadata",
  "created_at",
  "updated_at",
].join(",");

const ingestionEventColumns = [
  "id",
  "integration_config_id",
  "organization_id",
  "source_system",
  "external_id",
  "external_event_id",
  "event_type",
  "status",
  "source_payload",
  "normalized_payload",
  "crm_lead_id",
  "attempt_count",
  "last_error_code",
  "last_error_message",
  "received_at",
  "processed_at",
  "created_at",
  "updated_at",
].join(",");

export async function createLeadIngestionIntegrationConfig(
  params: CreateLeadIngestionIntegrationConfigParams,
): Promise<
  LeadIngestionResult<{ integrationConfig: LeadIngestionIntegrationConfig }>
> {
  const sourceSystem = params.sourceSystem.trim();
  const externalAccountId = params.externalAccountId.trim();
  const organizationId = params.organizationId.trim();

  if (!sourceSystem) {
    return leadIngestionError("INVALID_SOURCE_SYSTEM", "Origem invalida.", 400);
  }

  if (!externalAccountId) {
    return leadIngestionError(
      "INVALID_EXTERNAL_ACCOUNT",
      "Conta externa invalida.",
      400,
    );
  }

  if (!organizationId) {
    return leadIngestionError("PAYLOAD_INVALID", "Organizacao invalida.", 400);
  }

  const { data, error } = await params.supabase
    .from("lead_ingestion_integration_configs")
    .insert({
      external_account_id: externalAccountId,
      organization_id: organizationId,
      public_metadata: normalizePlainObject(params.publicMetadata),
      source_system: sourceSystem,
      status: normalizeIntegrationStatus(params.status),
    })
    .select(integrationConfigColumns)
    .single<LeadIngestionIntegrationConfigRow>();

  if (error || !data) {
    return leadIngestionError(
      "PAYLOAD_INVALID",
      sanitizeLeadIngestionErrorMessage(
        error?.message ?? "Nao foi possivel criar configuracao de ingestao.",
      ),
      error?.code === "23505" ? 409 : 500,
    );
  }

  return {
    integrationConfig: mapIntegrationConfigRow(data),
    ok: true,
  };
}

export async function resolveLeadIngestionIntegrationConfig(
  params: ResolveLeadIngestionIntegrationConfigParams,
): Promise<
  LeadIngestionResult<{ integrationConfig: LeadIngestionIntegrationConfig }>
> {
  const sourceSystem = params.sourceSystem.trim();
  const externalAccountId = params.externalAccountId.trim();

  if (!sourceSystem) {
    return leadIngestionError("INVALID_SOURCE_SYSTEM", "Origem invalida.", 400);
  }

  if (!externalAccountId) {
    return leadIngestionError(
      "INVALID_EXTERNAL_ACCOUNT",
      "Conta externa invalida.",
      400,
    );
  }

  const { data, error } = await params.supabase
    .from("lead_ingestion_integration_configs")
    .select(integrationConfigColumns)
    .eq("source_system", sourceSystem)
    .eq("external_account_id", externalAccountId)
    .maybeSingle<LeadIngestionIntegrationConfigRow>();

  if (error) {
    return leadIngestionError(
      "PAYLOAD_INVALID",
      "Nao foi possivel resolver a integracao de origem.",
      500,
    );
  }

  if (!data) {
    return leadIngestionError(
      "INTEGRATION_NOT_FOUND",
      "Integracao de origem nao configurada.",
      404,
    );
  }

  const integrationConfig = mapIntegrationConfigRow(data);

  if (integrationConfig.status !== "active") {
    return leadIngestionError(
      "INTEGRATION_INACTIVE",
      "Integracao de origem inativa.",
      409,
    );
  }

  return {
    integrationConfig,
    ok: true,
  };
}

export async function recordLeadIngestionEvent(
  params: RecordLeadIngestionEventParams,
): Promise<RecordLeadIngestionEventResult> {
  const normalizedPayload = normalizeLeadIngestionPayload(params.input);
  const identityValidation = validateIngestionIdentity(normalizedPayload);

  if (!identityValidation.ok) {
    return identityValidation;
  }

  const integrationLookup = await lookupIntegrationConfigForEvent(
    params,
    normalizedPayload,
  );
  const validation = validateMaterializationPayload(normalizedPayload);
  const eventStatus = resolveInitialEventStatus(integrationLookup, validation);
  const rejection = resolveInitialRejection(integrationLookup, validation);
  const receivedAt = normalizeTimestamp(params.receivedAt) ?? new Date().toISOString();

  const { data, error } = await params.supabase
    .from("lead_ingestion_events")
    .insert({
      event_type: normalizedPayload.eventType,
      external_event_id: normalizeOptionalText(params.input.externalEventId),
      external_id: normalizedPayload.externalId,
      integration_config_id: integrationLookup.integrationConfig?.id ?? null,
      last_error_code: rejection?.code ?? null,
      last_error_message: rejection?.message ?? null,
      normalized_payload: normalizedPayload,
      organization_id: integrationLookup.integrationConfig?.organizationId ?? null,
      received_at: receivedAt,
      source_payload: normalizedPayload.sourcePayload,
      source_system: normalizedPayload.sourceSystem,
      status: eventStatus,
    })
    .select(ingestionEventColumns)
    .single<LeadIngestionEventRow>();

  if (error) {
    if (error.code === "23505") {
      return resolveIdempotentEvent(params, normalizedPayload);
    }

    return leadIngestionError(
      "PAYLOAD_INVALID",
      sanitizeLeadIngestionErrorMessage(
        error.message || "Nao foi possivel preservar evento de ingestao.",
      ),
      500,
    );
  }

  return {
    event: mapEventRow(data),
    idempotent: false,
    integrationConfig: integrationLookup.integrationConfig,
    ok: true,
  };
}

export async function recordLeadIngestionTransportEvent(
  params: RecordLeadIngestionTransportEventParams,
): Promise<RecordLeadIngestionEventResult> {
  const normalizedPayload = normalizeLeadIngestionPayload(params.input);
  const identityValidation = validateIngestionIdentity(normalizedPayload);

  if (!identityValidation.ok) {
    return identityValidation;
  }

  const integrationLookup = await lookupIntegrationConfigForEvent(
    params,
    normalizedPayload,
  );
  const eventStatus = resolveInitialTransportEventStatus(integrationLookup);
  const rejection = resolveInitialTransportRejection(integrationLookup);
  const receivedAt = normalizeTimestamp(params.receivedAt) ?? new Date().toISOString();

  const { data, error } = await params.supabase
    .from("lead_ingestion_events")
    .insert({
      event_type: normalizedPayload.eventType,
      external_event_id: normalizeOptionalText(params.input.externalEventId),
      external_id: normalizedPayload.externalId,
      integration_config_id: integrationLookup.integrationConfig?.id ?? null,
      last_error_code: rejection?.code ?? null,
      last_error_message: rejection?.message ?? null,
      normalized_payload: normalizedPayload,
      organization_id: integrationLookup.integrationConfig?.organizationId ?? null,
      received_at: receivedAt,
      source_payload: normalizedPayload.sourcePayload,
      source_system: normalizedPayload.sourceSystem,
      status: eventStatus,
    })
    .select(ingestionEventColumns)
    .single<LeadIngestionEventRow>();

  if (error) {
    if (error.code === "23505") {
      return resolveIdempotentEvent(params, normalizedPayload);
    }

    return leadIngestionError(
      "PAYLOAD_INVALID",
      sanitizeLeadIngestionErrorMessage(
        error.message || "Nao foi possivel preservar envelope de ingestao.",
      ),
      500,
    );
  }

  return {
    event: mapEventRow(data),
    idempotent: false,
    integrationConfig: integrationLookup.integrationConfig,
    ok: true,
  };
}

export async function materializeLeadIngestionEvent(
  params: MaterializeLeadIngestionEventParams,
): Promise<MaterializeLeadIngestionEventResult> {
  const eventId = params.eventId.trim();

  if (!eventId) {
    return leadIngestionError("PAYLOAD_INVALID", "Evento invalido.", 400);
  }

  const { data, error } = await params.supabase
    .rpc("materialize_lead_ingestion_event_transaction", {
      p_event_id: eventId,
      p_processed_at: normalizeTimestamp(params.processedAt) ?? new Date().toISOString(),
    })
    .maybeSingle<MaterializeLeadIngestionEventTransactionRow>();

  if (error || !data?.ingestion_event) {
    return leadIngestionError(
      "PAYLOAD_INVALID",
      sanitizeLeadIngestionErrorMessage(
        error?.message ?? "Nao foi possivel materializar evento de ingestao.",
      ),
      mapRpcStatus(error?.code),
    );
  }

  return {
    event: mapEventRow(data.ingestion_event),
    lead: data.crm_lead ? mapCrmLeadRow(data.crm_lead) : null,
    ok: true,
  };
}

export async function updateLeadIngestionEventStatus(params: {
  eventId: string;
  fromStatus: LeadIngestionStatus;
  nextStatus: LeadIngestionStatus;
  supabase: RecordLeadIngestionEventParams["supabase"];
}): Promise<LeadIngestionResult<{ event: LeadIngestionEvent }>> {
  try {
    assertLeadIngestionStatusTransition(params.fromStatus, params.nextStatus);
  } catch (error) {
    return leadIngestionError(
      "STATUS_TRANSITION_INVALID",
      error instanceof Error ? error.message : "Transicao de ingestao invalida.",
      409,
    );
  }

  const { data, error } = await params.supabase
    .from("lead_ingestion_events")
    .update({ status: params.nextStatus })
    .eq("id", params.eventId)
    .eq("status", params.fromStatus)
    .select(ingestionEventColumns)
    .single<LeadIngestionEventRow>();

  if (error || !data) {
    return leadIngestionError(
      "PAYLOAD_INVALID",
      "Nao foi possivel atualizar status de ingestao.",
      500,
    );
  }

  return {
    event: mapEventRow(data),
    ok: true,
  };
}

export function mapNormalizedPayloadToCrmLeadInsert(params: {
  ingestionEventId: string;
  normalizedPayload: LeadIngestionNormalizedPayload;
  organizationId: string;
}) {
  return {
    assigned_profile_id: null,
    consultor: "",
    data_proxima_acao: null,
    email: params.normalizedPayload.email ?? "",
    etapa: "novos",
    external_id: params.normalizedPayload.externalId,
    metadata: {
      adId: params.normalizedPayload.adId,
      adName: params.normalizedPayload.adName,
      adsetId: params.normalizedPayload.adsetId,
      adsetName: params.normalizedPayload.adsetName,
      campaignId: params.normalizedPayload.campaignId,
      campaignName: params.normalizedPayload.campaignName,
      customAnswers: params.normalizedPayload.customAnswers,
      externalAccountId: params.normalizedPayload.externalAccountId,
      formId: params.normalizedPayload.formId,
      formName: params.normalizedPayload.formName,
      leadIngestionEventId: params.ingestionEventId,
      sourceSystem: params.normalizedPayload.sourceSystem,
    },
    nome: params.normalizedPayload.fullName ?? "",
    observacoes: "",
    organization_id: params.organizationId,
    origem: "Meta Lead Ads",
    pais: "",
    pipeline: "prospecting",
    produto_interesse: "",
    proxima_acao: "",
    source_system: params.normalizedPayload.sourceSystem,
    status: "ativa",
    tags: [],
    telefone: params.normalizedPayload.phone ?? "",
    temperatura: "morna",
    valor_pretendido: 0,
  };
}

function validateIngestionIdentity(
  normalizedPayload: LeadIngestionNormalizedPayload,
) {
  if (!normalizedPayload.sourceSystem.trim()) {
    return leadIngestionError("INVALID_SOURCE_SYSTEM", "Origem invalida.", 400);
  }

  if (!normalizedPayload.externalId.trim()) {
    return leadIngestionError("INVALID_EXTERNAL_ID", "Identidade externa invalida.", 400);
  }

  if (!normalizedPayload.externalAccountId.trim()) {
    return leadIngestionError(
      "INVALID_EXTERNAL_ACCOUNT",
      "Conta externa invalida.",
      400,
    );
  }

  return { ok: true as const };
}

function validateMaterializationPayload(
  normalizedPayload: LeadIngestionNormalizedPayload,
) {
  if (!normalizedPayload.fullName) {
    return leadIngestionError("MISSING_NAME", "Nome obrigatorio ausente.", 422);
  }

  if (!normalizedPayload.phone && !normalizedPayload.email) {
    return leadIngestionError(
      "MISSING_CONTACT",
      "Telefone ou e-mail obrigatorio ausente.",
      422,
    );
  }

  return { ok: true as const };
}

async function lookupIntegrationConfigForEvent(
  params: RecordLeadIngestionEventParams,
  normalizedPayload: LeadIngestionNormalizedPayload,
) {
  const { data, error } = await params.supabase
    .from("lead_ingestion_integration_configs")
    .select(integrationConfigColumns)
    .eq("source_system", normalizedPayload.sourceSystem)
    .eq("external_account_id", normalizedPayload.externalAccountId)
    .maybeSingle<LeadIngestionIntegrationConfigRow>();

  if (error || !data) {
    return {
      errorCode: "INTEGRATION_NOT_FOUND" as const,
      errorMessage: "Integracao de origem nao configurada.",
      integrationConfig: null,
    };
  }

  const integrationConfig = mapIntegrationConfigRow(data);

  if (integrationConfig.status !== "active") {
    return {
      errorCode: "INTEGRATION_INACTIVE" as const,
      errorMessage: "Integracao de origem inativa.",
      integrationConfig,
    };
  }

  return {
    errorCode: null,
    errorMessage: null,
    integrationConfig,
  };
}

function resolveInitialEventStatus(
  integrationLookup: Awaited<ReturnType<typeof lookupIntegrationConfigForEvent>>,
  validation: ReturnType<typeof validateMaterializationPayload>,
): LeadIngestionStatus {
  if (integrationLookup.errorCode || !validation.ok) {
    return "rejected";
  }

  return "materialization_pending";
}

function resolveInitialTransportEventStatus(
  integrationLookup: Awaited<ReturnType<typeof lookupIntegrationConfigForEvent>>,
): LeadIngestionStatus {
  if (integrationLookup.errorCode) {
    return "rejected";
  }

  return "fetch_pending";
}

function resolveInitialRejection(
  integrationLookup: Awaited<ReturnType<typeof lookupIntegrationConfigForEvent>>,
  validation: ReturnType<typeof validateMaterializationPayload>,
) {
  if (integrationLookup.errorCode) {
    return {
      code: integrationLookup.errorCode,
      message: integrationLookup.errorMessage ?? "Evento rejeitado.",
    };
  }

  if (!validation.ok) {
    return {
      code: validation.code,
      message: validation.error,
    };
  }

  return null;
}

function resolveInitialTransportRejection(
  integrationLookup: Awaited<ReturnType<typeof lookupIntegrationConfigForEvent>>,
) {
  if (integrationLookup.errorCode) {
    return {
      code: integrationLookup.errorCode,
      message: integrationLookup.errorMessage ?? "Envelope rejeitado.",
    };
  }

  return null;
}

async function resolveIdempotentEvent(
  params: RecordLeadIngestionEventParams,
  normalizedPayload: LeadIngestionNormalizedPayload,
): Promise<RecordLeadIngestionEventResult> {
  const { data, error } = await params.supabase
    .from("lead_ingestion_events")
    .select(ingestionEventColumns)
    .eq("source_system", normalizedPayload.sourceSystem)
    .eq("external_id", normalizedPayload.externalId)
    .maybeSingle<LeadIngestionEventRow>();

  if (error || !data) {
    return leadIngestionError(
      "DUPLICATE_EVENT",
      "Evento duplicado ja registrado, mas nao foi possivel recupera-lo.",
      409,
    );
  }

  return {
    event: mapEventRow(data),
    idempotent: true,
    integrationConfig: null,
    ok: true,
  };
}

function mapIntegrationConfigRow(
  row: LeadIngestionIntegrationConfigRow,
): LeadIngestionIntegrationConfig {
  const now = new Date().toISOString();

  return {
    createdAt: row.created_at ?? now,
    externalAccountId: row.external_account_id ?? "",
    id: row.id,
    organizationId: row.organization_id ?? "",
    publicMetadata: normalizePlainObject(row.public_metadata),
    sourceSystem: row.source_system ?? "",
    status: normalizeIntegrationStatus(row.status),
    updatedAt: row.updated_at ?? row.created_at ?? now,
  };
}

function mapEventRow(row: LeadIngestionEventRow): LeadIngestionEvent {
  const now = new Date().toISOString();

  return {
    attemptCount: row.attempt_count ?? 0,
    createdAt: row.created_at ?? now,
    crmLeadId: row.crm_lead_id,
    eventType: row.event_type ?? "",
    externalEventId: row.external_event_id,
    externalId: row.external_id ?? "",
    id: row.id,
    integrationConfigId: row.integration_config_id,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    normalizedPayload: normalizePlainObject(row.normalized_payload),
    organizationId: row.organization_id,
    processedAt: row.processed_at,
    receivedAt: row.received_at ?? now,
    sourcePayload: normalizePlainObject(row.source_payload),
    sourceSystem: row.source_system ?? "",
    status: normalizeLeadIngestionStatus(row.status),
    updatedAt: row.updated_at ?? row.created_at ?? now,
  };
}

function mapCrmLeadRow(row: LeadIngestionCrmLeadRow) {
  return {
    email: row.email ?? "",
    externalId: row.external_id ?? "",
    id: row.id,
    nome: row.nome ?? "",
    organizationId: row.organization_id ?? "",
    origem: row.origem ?? "",
    phone: row.telefone ?? "",
    pipeline: row.pipeline ?? "",
    sourceSystem: row.source_system ?? "",
    stage: row.etapa ?? "",
    status: row.status ?? "",
    temperature: row.temperatura ?? "",
  };
}

function normalizeIntegrationStatus(
  value: unknown,
): LeadIngestionIntegrationStatus {
  return value === "inactive" ? "inactive" : "active";
}

function normalizeLeadIngestionStatus(value: unknown): LeadIngestionStatus {
  return isLeadIngestionStatus(value) ? value : "received";
}

function normalizeTimestamp(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function leadIngestionError(
  code: LeadIngestionResult<never> extends { ok: false; code: infer T }
    ? T
    : string,
  error: string,
  status: number,
) {
  return {
    code,
    error,
    ok: false as const,
    status,
  };
}

function mapRpcStatus(code: string | undefined) {
  if (code === "22023") {
    return 400;
  }

  if (code === "P0002") {
    return 404;
  }

  if (code === "P0001") {
    return 409;
  }

  return 500;
}
