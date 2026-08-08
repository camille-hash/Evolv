import type {
  LeadIngestionCustomAnswer,
  LeadIngestionNormalizedPayload,
  LeadIngestionRawInput,
} from "./types.ts";
import { metaLeadAdsSourceSystem } from "./types.ts";

const emptyValues = new Set(["", "null", "undefined"]);

export function normalizeLeadIngestionPayload(
  input: LeadIngestionRawInput,
): LeadIngestionNormalizedPayload {
  const sourceSystem =
    normalizeText(input.sourceSystem) ?? metaLeadAdsSourceSystem;
  const externalId = normalizeText(input.externalId) ?? "";
  const externalAccountId =
    normalizeText(input.externalAccountId) ??
    normalizeText(input.pageId) ??
    "";
  const eventType = normalizeText(input.eventType) ?? "lead_created";
  const sourcePayload = normalizePlainObject(input.sourcePayload);
  const fullName = normalizeText(input.fullName) ??
    (sourceSystem === metaLeadAdsSourceSystem ? "Lead Meta Ads" : undefined);

  return removeEmptyObjectValues({
    adId: normalizeText(input.adId),
    adName: normalizeText(input.adName),
    adsetId: normalizeText(input.adsetId),
    adsetName: normalizeText(input.adsetName),
    campaignId: normalizeText(input.campaignId),
    campaignName: normalizeText(input.campaignName),
    createdTime: normalizeText(input.createdTime),
    customAnswers: normalizeCustomAnswers(input.customAnswers),
    email: normalizeEmail(input.email),
    eventType,
    externalAccountId,
    externalId,
    formId: normalizeText(input.formId),
    formName: normalizeText(input.formName),
    fullName,
    occurredAt: normalizeText(input.occurredAt),
    pageId: normalizeText(input.pageId) ?? externalAccountId,
    phone: normalizePhone(input.phone),
    sourcePayload,
    sourceSystem,
  }) as LeadIngestionNormalizedPayload;
}

export function normalizeEmail(value: unknown) {
  const text = normalizeText(value);

  return text ? text.toLowerCase() : undefined;
}

export function normalizePhone(value: unknown) {
  const text = normalizeText(value);

  if (!text) {
    return undefined;
  }

  const hasInternationalPrefix = text.startsWith("+");
  const digits = text.replace(/\D+/g, "");

  if (!digits) {
    return text;
  }

  return hasInternationalPrefix ? `+${digits}` : digits;
}

export function normalizeCustomAnswers(
  value: unknown,
): LeadIngestionCustomAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((answer) => normalizeCustomAnswer(answer))
    .filter((answer): answer is LeadIngestionCustomAnswer => Boolean(answer));
}

export function sanitizeLeadIngestionErrorMessage(value: string) {
  return value.replace(/\S+@\S+\.\S+/g, "[email]").replace(/\+?\d[\d\s().-]{7,}/g, "[phone]");
}

export function removeEmptyObjectValues(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === null) {
        return false;
      }

      if (typeof entry === "string") {
        return !emptyValues.has(entry.trim().toLowerCase());
      }

      if (Array.isArray(entry)) {
        return entry.length > 0;
      }

      return true;
    }),
  );
}

export function normalizePlainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeCustomAnswer(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const key =
    normalizeText(record.key) ??
    normalizeText(record.id) ??
    normalizeText(record.name) ??
    normalizeText(record.field);
  const answerValue =
    normalizeText(record.value) ??
    normalizeText(record.answer) ??
    normalizeText(record.values);

  if (!key || !answerValue) {
    return null;
  }

  return removeEmptyObjectValues({
    key,
    label: normalizeText(record.label) ?? normalizeText(record.question),
    value: answerValue,
  }) as LeadIngestionCustomAnswer;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}
