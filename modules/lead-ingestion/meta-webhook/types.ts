import type {
  LeadIngestionEvent,
  LeadIngestionRawInput,
  LeadIngestionSupabaseClient,
} from "../types.ts";

export type MetaWebhookConfig = {
  appSecret: string;
  maxBodyBytes: number;
  verifyToken: string;
};

export type MetaWebhookConfigResult =
  | { config: MetaWebhookConfig; ok: true }
  | { error: string; ok: false; status: number };

export type MetaWebhookChallengeResult = {
  body: string;
  contentType: "text/plain" | "application/json";
  status: number;
};

export type MetaWebhookLeadgenEvent = {
  adId?: string;
  adsetId?: string;
  createdTime?: string;
  entryId?: string;
  entryTime?: string;
  field: "leadgen";
  formId?: string;
  leadgenId: string;
  pageId: string;
};

export type MetaWebhookIgnoredChange = {
  reason: string;
};

export type MetaWebhookParseResult = {
  events: MetaWebhookLeadgenEvent[];
  ignored: MetaWebhookIgnoredChange[];
};

export type MetaWebhookProcessParams = {
  contentLength: string | null;
  contentType: string | null;
  rawBodyBytes: Uint8Array;
  receivedAt?: string;
  signatureHeader: string | null;
  supabase: LeadIngestionSupabaseClient;
  config: MetaWebhookConfig;
};

export type MetaWebhookPersistedEvent = {
  event: LeadIngestionEvent;
  idempotent: boolean;
};

export type MetaWebhookProcessResult = {
  body: {
    duplicateCount: number;
    error?: string;
    ignoredCount: number;
    persistedCount: number;
    received: boolean;
  };
  status: number;
};

export type MetaWebhookRecordResult =
  | {
      event: LeadIngestionEvent;
      idempotent: boolean;
      ok: true;
    }
  | {
      code: string;
      error: string;
      ok: false;
      status: number;
    };

export type MetaWebhookRecorder = (
  input: LeadIngestionRawInput,
) => Promise<MetaWebhookRecordResult>;
