import {
  isCrmLeadProfileCurrentMoment,
  isCrmLeadProfilePrimaryGoal,
  isCrmLeadProfileStrategicTopic,
} from "@/modules/crm";
import type {
  ClientCommercialArtifactSummary,
  ClientContext,
  ClientConversionEvent,
  ClientRecord,
  ClientStrategicProfileBridge,
  ConvertLeadToClientInput,
} from "@/modules/client-context/types";

export const CLIENT_CONTEXT_STORAGE_KEY = "evolv.client-context.v1";
export const CLIENT_RECORD_STORAGE_KEY = "evolv.client-record.v1";
export const CLIENT_CONVERSION_HISTORY_STORAGE_KEY =
  "evolv.client-conversion-history.v1";

export const emptyClientContext: ClientContext = {
  nome: "",
  telefone: "",
  email: "",
  perfil: "",
  patrimonioAtual: 0,
  metaPatrimonial: 0,
  rendaAtual: 0,
  metaRenda: 0,
  prazoMeta: 120,
  observacoes: "",
};

export function loadClientContext(): ClientContext {
  if (!canUseLocalStorage()) {
    return emptyClientContext;
  }

  const currentClientRecord = loadCurrentClientRecord();

  if (currentClientRecord) {
    return currentClientRecord.context;
  }

  const rawValue = window.localStorage.getItem(CLIENT_CONTEXT_STORAGE_KEY);

  if (!rawValue) {
    return emptyClientContext;
  }

  try {
    return normalizeClientContext(JSON.parse(rawValue));
  } catch {
    return emptyClientContext;
  }
}

export function saveClientContext(context: ClientContext) {
  if (!canUseLocalStorage()) {
    return;
  }

  const normalizedContext = normalizeClientContext(context);
  const currentClientRecord = loadCurrentClientRecord();

  if (currentClientRecord) {
    saveCurrentClientRecord({
      ...currentClientRecord,
      context: normalizedContext,
      updatedAt: new Date().toISOString(),
    });
  }

  window.localStorage.setItem(
    CLIENT_CONTEXT_STORAGE_KEY,
    JSON.stringify(normalizedContext),
  );
}

export function loadCurrentClientRecord(): ClientRecord | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(CLIENT_RECORD_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return normalizeClientRecord(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function saveCurrentClientRecord(record: ClientRecord) {
  if (!canUseLocalStorage()) {
    return;
  }

  const normalizedRecord = normalizeClientRecord(record);

  window.localStorage.setItem(
    CLIENT_RECORD_STORAGE_KEY,
    JSON.stringify(normalizedRecord),
  );
  window.localStorage.setItem(
    CLIENT_CONTEXT_STORAGE_KEY,
    JSON.stringify(normalizedRecord.context),
  );
}

export function loadClientConversionHistory(): ClientConversionEvent[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(CLIENT_CONVERSION_HISTORY_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);

    return Array.isArray(parsed)
      ? parsed.map(normalizeClientConversionEvent)
      : [];
  } catch {
    return [];
  }
}

export function convertLeadToClient(
  input: ConvertLeadToClientInput,
): ClientRecord {
  const now = new Date().toISOString();
  const strategicProfile = normalizeStrategicProfileBridge(input.strategicProfile);
  const context = normalizeClientContext({
    ...emptyClientContext,
    email: input.lead.email,
    nome: input.lead.nome,
    observacoes: strategicProfile.strategicNotes ?? "",
    perfil: buildClientProfileLabel(strategicProfile),
    telefone: input.lead.telefone,
  });
  const record = normalizeClientRecord({
    context,
    convertedAt: now,
    convertedByName: normalizeText(input.convertedBy.name) || "EVOLV",
    convertedByUserId: normalizeNullableText(input.convertedBy.userId),
    createdAt: now,
    id: crypto.randomUUID(),
    latestCommercialSimulation: toCommercialArtifactSummary(
      input.latestCommercialSimulation,
    ),
    latestMultiCotasStudy: toCommercialArtifactSummary(
      input.latestMultiCotasStudy,
    ),
    leadId: input.lead.id,
    strategicProfile,
    updatedAt: now,
  });

  saveCurrentClientRecord(record);

  const nextEvent = normalizeClientConversionEvent({
    clientId: record.id,
    contextSnapshot: record.context,
    convertedAt: record.convertedAt,
    convertedByName: record.convertedByName,
    convertedByUserId: record.convertedByUserId,
    id: crypto.randomUUID(),
    latestCommercialSimulation: record.latestCommercialSimulation,
    latestMultiCotasStudy: record.latestMultiCotasStudy,
    leadId: record.leadId,
    leadName: record.context.nome,
    strategicProfile: record.strategicProfile,
  });

  const history = [nextEvent, ...loadClientConversionHistory()];
  window.localStorage.setItem(
    CLIENT_CONVERSION_HISTORY_STORAGE_KEY,
    JSON.stringify(history),
  );

  return record;
}

export function normalizeClientContext(value: unknown): ClientContext {
  const context = value as Partial<ClientContext>;

  return {
    nome: normalizeText(context.nome),
    telefone: normalizeText(context.telefone),
    email: normalizeText(context.email),
    perfil: normalizeText(context.perfil),
    patrimonioAtual: normalizePositiveNumber(context.patrimonioAtual),
    metaPatrimonial: normalizePositiveNumber(context.metaPatrimonial),
    rendaAtual: normalizePositiveNumber(context.rendaAtual),
    metaRenda: normalizePositiveNumber(context.metaRenda),
    prazoMeta: normalizePositiveInteger(context.prazoMeta),
    observacoes: normalizeText(context.observacoes),
  };
}

export function normalizeClientRecord(value: unknown): ClientRecord {
  const record = value as Partial<ClientRecord>;

  return {
    context: normalizeClientContext(record.context),
    convertedAt: normalizeIsoDate(record.convertedAt),
    convertedByName: normalizeText(record.convertedByName) || "EVOLV",
    convertedByUserId: normalizeNullableText(record.convertedByUserId),
    createdAt: normalizeIsoDate(record.createdAt),
    id: normalizeId(record.id),
    latestCommercialSimulation: toCommercialArtifactSummary(
      record.latestCommercialSimulation,
    ),
    latestMultiCotasStudy: toCommercialArtifactSummary(
      record.latestMultiCotasStudy,
    ),
    leadId: normalizeText(record.leadId),
    strategicProfile: normalizeStrategicProfileBridge(record.strategicProfile),
    updatedAt: normalizeIsoDate(record.updatedAt),
  };
}

export function normalizeClientConversionEvent(
  value: unknown,
): ClientConversionEvent {
  const event = value as Partial<ClientConversionEvent>;

  return {
    clientId: normalizeText(event.clientId),
    contextSnapshot: normalizeClientContext(event.contextSnapshot),
    convertedAt: normalizeIsoDate(event.convertedAt),
    convertedByName: normalizeText(event.convertedByName) || "EVOLV",
    convertedByUserId: normalizeNullableText(event.convertedByUserId),
    id: normalizeId(event.id),
    latestCommercialSimulation: toCommercialArtifactSummary(
      event.latestCommercialSimulation,
    ),
    latestMultiCotasStudy: toCommercialArtifactSummary(
      event.latestMultiCotasStudy,
    ),
    leadId: normalizeText(event.leadId),
    leadName: normalizeText(event.leadName),
    strategicProfile: normalizeStrategicProfileBridge(event.strategicProfile),
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeNullableText(value: unknown) {
  const normalizedValue = normalizeText(value);

  return normalizedValue || null;
}

function normalizePositiveNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function normalizePositiveInteger(value: unknown) {
  const numberValue = normalizePositiveNumber(value);

  return numberValue > 0 ? Math.max(1, Math.trunc(numberValue)) : 120;
}

function normalizeStrategicProfileBridge(
  value: unknown,
): ClientStrategicProfileBridge {
  const bridge = value as Partial<ClientStrategicProfileBridge>;
  const currentMoment = isCrmLeadProfileCurrentMoment(bridge.currentMoment)
    ? bridge.currentMoment
    : null;
  const primaryGoal = isCrmLeadProfilePrimaryGoal(bridge.primaryGoal)
    ? bridge.primaryGoal
    : null;

  return {
    currentMoment,
    primaryGoal,
    strategicNotes: normalizeNullableText(bridge.strategicNotes),
    strategicTopics: Array.isArray(bridge.strategicTopics)
      ? bridge.strategicTopics
          .filter(isCrmLeadProfileStrategicTopic)
      : [],
  };
}

function toCommercialArtifactSummary(
  value: unknown,
): ClientCommercialArtifactSummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const artifact = value as Partial<ClientCommercialArtifactSummary> & {
    totalCredit?: unknown;
    updatedCredit?: unknown;
  };
  const commercialCredit = normalizePositiveNumber(
    artifact.commercialCredit ?? artifact.updatedCredit ?? artifact.totalCredit,
  );
  const monthlyPayment = normalizePositiveNumber(artifact.monthlyPayment);

  return {
    commercialCredit: commercialCredit > 0 ? commercialCredit : null,
    createdAt: normalizeIsoDate(artifact.createdAt),
    id: normalizeId(artifact.id),
    monthlyPayment: monthlyPayment > 0 ? monthlyPayment : null,
    simulationType:
      artifact.simulationType === "multi_cotas" ? "multi_cotas" : "commercial",
    title: normalizeText(artifact.title) || "Artefato comercial",
  };
}

function normalizeIsoDate(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return new Date(0).toISOString();
}

function normalizeId(value: unknown) {
  const normalizedValue = normalizeText(value);

  return normalizedValue || crypto.randomUUID();
}

function buildClientProfileLabel(bridge: ClientStrategicProfileBridge) {
  return [bridge.primaryGoal, bridge.currentMoment].filter(Boolean).join(" - ");
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

