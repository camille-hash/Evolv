import { createClient } from "@supabase/supabase-js";
import { recordLeadIngestionTransportEvent } from "../server.ts";
import {
  mapMetaLeadgenEventToLeadIngestionInput,
  parseMetaWebhookJson,
  parseMetaWebhookLeadgenEvents,
} from "./parser.ts";
import { validateMetaWebhookSignature } from "./signature.ts";
import type {
  MetaWebhookConfig,
  MetaWebhookProcessParams,
  MetaWebhookProcessResult,
  MetaWebhookRecorder,
} from "./types.ts";

export function createMetaWebhookServiceRoleClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function processMetaWebhookNotification(
  params: MetaWebhookProcessParams,
): Promise<MetaWebhookProcessResult> {
  const contentTypeValidation = validateJsonContentType(params.contentType);

  if (!contentTypeValidation.ok) {
    return safeError(contentTypeValidation.error, contentTypeValidation.status);
  }

  const contentLengthValidation = validateContentLength(
    params.contentLength,
    params.config.maxBodyBytes,
  );

  if (!contentLengthValidation.ok) {
    return safeError(contentLengthValidation.error, contentLengthValidation.status);
  }

  if (params.rawBodyBytes.byteLength > params.config.maxBodyBytes) {
    return safeError("Payload too large.", 413);
  }

  const signatureValidation = validateMetaWebhookSignature({
    appSecret: params.config.appSecret,
    rawBodyBytes: params.rawBodyBytes,
    signatureHeader: params.signatureHeader,
  });

  if (!signatureValidation.ok) {
    return safeError("Invalid webhook signature.", signatureValidation.status);
  }

  return processVerifiedMetaWebhookPayload({
    config: params.config,
    rawBodyBytes: params.rawBodyBytes,
    recorder: (input) =>
      recordLeadIngestionTransportEvent({
        input,
        receivedAt: params.receivedAt,
        supabase: params.supabase,
      }),
  });
}

export async function processVerifiedMetaWebhookPayload(params: {
  config: Pick<MetaWebhookConfig, "maxBodyBytes">;
  rawBodyBytes: Uint8Array;
  recorder: MetaWebhookRecorder;
}): Promise<MetaWebhookProcessResult> {
  if (params.rawBodyBytes.byteLength > params.config.maxBodyBytes) {
    return safeError("Payload too large.", 413);
  }

  const decodeResult = decodeWebhookBody(params.rawBodyBytes);

  if (!decodeResult.ok) {
    return safeError("Invalid UTF-8 payload.", 400);
  }

  const jsonResult = parseMetaWebhookJson(decodeResult.text);

  if (!jsonResult.ok) {
    return safeError("Invalid JSON payload.", jsonResult.status);
  }

  const parseResult = parseMetaWebhookLeadgenEvents(jsonResult.payload);
  let duplicateCount = 0;
  let persistedCount = 0;

  for (const event of parseResult.events) {
    const input = mapMetaLeadgenEventToLeadIngestionInput(event);
    const recordResult = await params.recorder(input);

    if (!recordResult.ok) {
      return safeError("Could not preserve webhook event.", recordResult.status);
    }

    if (recordResult.idempotent) {
      duplicateCount += 1;
    } else {
      persistedCount += 1;
    }
  }

  return {
    body: {
      duplicateCount,
      ignoredCount: parseResult.ignored.length,
      persistedCount,
      received: true,
    },
    status: 200,
  };
}

function validateJsonContentType(contentType: string | null) {
  if (!contentType) {
    return { error: "Unsupported content type.", ok: false as const, status: 415 };
  }

  const normalizedContentType = contentType.toLowerCase();

  if (
    normalizedContentType === "application/json" ||
    normalizedContentType.startsWith("application/json;")
  ) {
    return { ok: true as const };
  }

  return { error: "Unsupported content type.", ok: false as const, status: 415 };
}

function validateContentLength(contentLength: string | null, maxBodyBytes: number) {
  if (!contentLength) {
    return { ok: true as const };
  }

  const parsedLength = Number(contentLength);

  if (!Number.isFinite(parsedLength) || parsedLength < 0) {
    return { error: "Invalid content length.", ok: false as const, status: 400 };
  }

  if (parsedLength > maxBodyBytes) {
    return { error: "Payload too large.", ok: false as const, status: 413 };
  }

  return { ok: true as const };
}

function decodeWebhookBody(rawBodyBytes: Uint8Array) {
  try {
    return {
      ok: true as const,
      text: new TextDecoder("utf-8", { fatal: true }).decode(rawBodyBytes),
    };
  } catch {
    return { ok: false as const };
  }
}

function safeError(error: string, status: number): MetaWebhookProcessResult {
  return {
    body: {
      duplicateCount: 0,
      error,
      ignoredCount: 0,
      persistedCount: 0,
      received: false,
    },
    status,
  };
}
