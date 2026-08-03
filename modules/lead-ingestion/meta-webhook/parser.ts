import { metaLeadAdsSourceSystem } from "../types.ts";
import type {
  MetaWebhookIgnoredChange,
  MetaWebhookLeadgenEvent,
  MetaWebhookParseResult,
} from "./types.ts";

export function parseMetaWebhookJson(rawBody: string) {
  try {
    return {
      ok: true as const,
      payload: JSON.parse(rawBody) as unknown,
    };
  } catch {
    return {
      code: "JSON_INVALID",
      ok: false as const,
      status: 400,
    };
  }
}

export function parseMetaWebhookLeadgenEvents(
  payload: unknown,
): MetaWebhookParseResult {
  if (!isRecord(payload)) {
    return {
      events: [],
      ignored: [{ reason: "payload_not_object" }],
    };
  }

  if (payload.object !== "page") {
    return {
      events: [],
      ignored: [{ reason: "object_not_supported" }],
    };
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  const events: MetaWebhookLeadgenEvent[] = [];
  const ignored: MetaWebhookIgnoredChange[] = [];

  if (entries.length === 0) {
    ignored.push({ reason: "entry_missing" });
  }

  for (const entry of entries) {
    if (!isRecord(entry)) {
      ignored.push({ reason: "entry_not_object" });
      continue;
    }

    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    if (changes.length === 0) {
      ignored.push({ reason: "changes_missing" });
      continue;
    }

    for (const change of changes) {
      const extracted = extractLeadgenChange(entry, change);

      if (extracted.event) {
        events.push(extracted.event);
      } else {
        ignored.push({ reason: extracted.reason });
      }
    }
  }

  return { events, ignored };
}

export function mapMetaLeadgenEventToLeadIngestionInput(
  event: MetaWebhookLeadgenEvent,
) {
  return {
    adId: event.adId,
    adsetId: event.adsetId,
    createdTime: event.createdTime,
    eventType: "leadgen",
    externalAccountId: event.pageId,
    externalId: event.leadgenId,
    formId: event.formId,
    occurredAt: event.createdTime ?? event.entryTime,
    pageId: event.pageId,
    sourcePayload: buildSanitizedSourcePayload(event),
    sourceSystem: metaLeadAdsSourceSystem,
  };
}

function extractLeadgenChange(
  entry: Record<string, unknown>,
  change: unknown,
):
  | { event: MetaWebhookLeadgenEvent; reason?: never }
  | { event?: never; reason: string } {
  if (!isRecord(change)) {
    return { reason: "change_not_object" };
  }

  if (change.field !== "leadgen") {
    return { reason: "change_not_leadgen" };
  }

  if (!isRecord(change.value)) {
    return { reason: "leadgen_value_missing" };
  }

  const value = change.value;
  const leadgenId = normalizeText(value.leadgen_id);
  const pageId = normalizeText(value.page_id);

  if (!leadgenId) {
    return { reason: "leadgen_id_missing" };
  }

  if (!pageId) {
    return { reason: "page_id_missing" };
  }

  return {
    event: {
      adId: normalizeText(value.ad_id),
      adsetId: normalizeText(value.adgroup_id),
      createdTime: normalizeMetaTimestamp(value.created_time),
      entryId: normalizeText(entry.id),
      entryTime: normalizeMetaTimestamp(entry.time),
      field: "leadgen",
      formId: normalizeText(value.form_id),
      leadgenId,
      pageId,
    },
  };
}

function buildSanitizedSourcePayload(event: MetaWebhookLeadgenEvent) {
  return removeUndefinedValues({
    adId: event.adId,
    adsetId: event.adsetId,
    createdTime: event.createdTime,
    entryId: event.entryId,
    entryTime: event.entryTime,
    field: event.field,
    formId: event.formId,
    leadgenId: event.leadgenId,
    pageId: event.pageId,
  });
}

function normalizeMetaTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    return new Date(Number(trimmed) * 1000).toISOString();
  }

  const date = new Date(trimmed);

  return Number.isNaN(date.getTime()) ? trimmed : date.toISOString();
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function removeUndefinedValues(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}
