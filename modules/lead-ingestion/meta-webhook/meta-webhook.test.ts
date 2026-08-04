import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { recordLeadIngestionTransportEvent } from "../server.ts";
import type {
  LeadIngestionEventRow,
  LeadIngestionIntegrationConfigRow,
  LeadIngestionSupabaseClient,
} from "../types.ts";
import {
  createMetaWebhookSignature,
  loadMetaWebhookConfig,
  mapMetaLeadgenEventToLeadIngestionInput,
  metaWebhookDefaultMaxBodyBytes,
  parseMetaWebhookJson,
  parseMetaWebhookLeadgenEvents,
  processMetaWebhookNotification,
  processVerifiedMetaWebhookPayload,
  validateMetaWebhookSignature,
  verifyMetaWebhookChallenge,
} from "./index.ts";

const appSecret = "test-app-secret";
const verifyToken = "test-verify-token";

test("GET challenge valid returns exact challenge", () => {
  const result = verifyMetaWebhookChallenge({
    config: { verifyToken },
    searchParams: new URLSearchParams({
      "hub.challenge": "123456",
      "hub.mode": "subscribe",
      "hub.verify_token": verifyToken,
    }),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body, "123456");
  assert.equal(result.contentType, "text/plain");
});

test("GET challenge rejects invalid mode", () => {
  const result = verifyMetaWebhookChallenge({
    config: { verifyToken },
    searchParams: new URLSearchParams({
      "hub.challenge": "123456",
      "hub.mode": "unsubscribe",
      "hub.verify_token": verifyToken,
    }),
  });

  assert.equal(result.status, 403);
});

test("GET challenge rejects missing verify token", () => {
  const result = verifyMetaWebhookChallenge({
    config: { verifyToken },
    searchParams: new URLSearchParams({
      "hub.challenge": "123456",
      "hub.mode": "subscribe",
    }),
  });

  assert.equal(result.status, 403);
});

test("GET challenge rejects incorrect verify token", () => {
  const result = verifyMetaWebhookChallenge({
    config: { verifyToken },
    searchParams: new URLSearchParams({
      "hub.challenge": "123456",
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong-token",
    }),
  });

  assert.equal(result.status, 403);
});

test("GET challenge rejects missing challenge", () => {
  const result = verifyMetaWebhookChallenge({
    config: { verifyToken },
    searchParams: new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": verifyToken,
    }),
  });

  assert.equal(result.status, 400);
});

test("GET challenge error does not expose token", () => {
  const result = verifyMetaWebhookChallenge({
    config: { verifyToken },
    searchParams: new URLSearchParams({
      "hub.challenge": "123456",
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong-token",
    }),
  });

  assert.equal(result.body.includes(verifyToken), false);
  assert.equal(result.body.includes("wrong-token"), false);
});

test("GET challenge configuration fails without server-side token", () => {
  const result = loadMetaWebhookConfig({
    META_APP_SECRET: appSecret,
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 500);
    assert.equal(result.error.includes(appSecret), false);
  }
});

test("signature accepts valid sha256 over raw body", () => {
  const rawBody = JSON.stringify(validPayload());
  const rawBodyBytes = toBytes(rawBody);
  const signatureHeader = createMetaWebhookSignature({
    appSecret,
    rawBodyBytes,
  });

  const result = validateMetaWebhookSignature({
    appSecret,
    rawBodyBytes,
    signatureHeader,
  });

  assert.equal(result.ok, true);
});

test("signature rejects missing header", () => {
  const result = validateMetaWebhookSignature({
    appSecret,
    rawBodyBytes: toBytes("{}"),
    signatureHeader: null,
  });

  assert.deepEqual(result, {
    code: "SIGNATURE_MISSING",
    ok: false,
    status: 401,
  });
});

test("signature rejects malformed header", () => {
  const result = validateMetaWebhookSignature({
    appSecret,
    rawBodyBytes: toBytes("{}"),
    signatureHeader: "not-a-signature",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "SIGNATURE_MALFORMED");
  }
});

test("signature rejects unsupported algorithm", () => {
  const result = validateMetaWebhookSignature({
    appSecret,
    rawBodyBytes: toBytes("{}"),
    signatureHeader: "sha1=0123456789abcdef",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "SIGNATURE_UNSUPPORTED");
  }
});

test("signature rejects incorrect digest", () => {
  const result = validateMetaWebhookSignature({
    appSecret,
    rawBodyBytes: toBytes("{}"),
    signatureHeader:
      "sha256=0000000000000000000000000000000000000000000000000000000000000000",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "SIGNATURE_INVALID");
  }
});

test("signature rejects body altered after signing", () => {
  const rawBody = JSON.stringify(validPayload());
  const signatureHeader = createMetaWebhookSignature({
    appSecret,
    rawBodyBytes: toBytes(rawBody),
  });

  const result = validateMetaWebhookSignature({
    appSecret,
    rawBodyBytes: toBytes(`${rawBody} `),
    signatureHeader,
  });

  assert.equal(result.ok, false);
});

test("signature uses raw body and not JSON reserialization", () => {
  const rawBody =
    '{ "object" : "page", "entry" : [ { "id" : "page-1", "time" : 1, "changes" : [] } ] }';
  const reserialized = JSON.stringify(JSON.parse(rawBody));
  const signatureHeader = createMetaWebhookSignature({
    appSecret,
    rawBodyBytes: toBytes(rawBody),
  });

  assert.notEqual(rawBody, reserialized);
  const result = validateMetaWebhookSignature({
    appSecret,
    rawBodyBytes: toBytes(reserialized),
    signatureHeader,
  });

  assert.equal(result.ok, false);
});

test("signature uses exact bytes instead of decoded and reencoded text", () => {
  const rawBodyBytes = new Uint8Array([0x7b, 0x22, 0x61, 0x22, 0x3a, 0xff, 0x7d]);
  const decodedAndReencoded = toBytes(new TextDecoder().decode(rawBodyBytes));
  const signatureHeader = createMetaWebhookSignature({
    appSecret,
    rawBodyBytes,
  });

  const result = validateMetaWebhookSignature({
    appSecret,
    rawBodyBytes: decodedAndReencoded,
    signatureHeader,
  });

  assert.equal(result.ok, false);
});

test("service accepts valid unicode after byte signature validation", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  seedIntegration(supabase);
  const rawBody = JSON.stringify(validPayload({ formId: "formulário-ç" }));
  const rawBodyBytes = toBytes(rawBody);

  const result = await processMetaWebhookNotification({
    config: {
      appSecret,
      maxBodyBytes: metaWebhookDefaultMaxBodyBytes,
      verifyToken,
    },
    contentLength: String(rawBodyBytes.byteLength),
    contentType: "application/json",
    rawBodyBytes,
    signatureHeader: createMetaWebhookSignature({ appSecret, rawBodyBytes }),
    supabase,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.persistedCount, 1);
});

test("service rejects invalid UTF-8 after signature validation and before JSON parse", async () => {
  const rawBodyBytes = new Uint8Array([0xff]);

  const result = await processMetaWebhookNotification({
    config: {
      appSecret,
      maxBodyBytes: metaWebhookDefaultMaxBodyBytes,
      verifyToken,
    },
    contentLength: String(rawBodyBytes.byteLength),
    contentType: "application/json",
    rawBodyBytes,
    signatureHeader: createMetaWebhookSignature({ appSecret, rawBodyBytes }),
    supabase: createFakeLeadIngestionSupabase(),
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "Invalid UTF-8 payload.");
});

test("parser extracts a valid Meta leadgen payload", () => {
  const result = parseMetaWebhookLeadgenEvents(validPayload());

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0]?.leadgenId, "leadgen-1");
  assert.equal(result.events[0]?.pageId, "page-1");
});

test("parser ignores unexpected object", () => {
  const result = parseMetaWebhookLeadgenEvents({ object: "user", entry: [] });

  assert.equal(result.events.length, 0);
  assert.equal(result.ignored[0]?.reason, "object_not_supported");
});

test("parser reports missing entry", () => {
  const result = parseMetaWebhookLeadgenEvents({ object: "page" });

  assert.equal(result.events.length, 0);
  assert.equal(result.ignored[0]?.reason, "entry_missing");
});

test("parser reports missing changes", () => {
  const result = parseMetaWebhookLeadgenEvents({
    entry: [{ id: "page-1" }],
    object: "page",
  });

  assert.equal(result.events.length, 0);
  assert.equal(result.ignored[0]?.reason, "changes_missing");
});

test("parser ignores non leadgen changes", () => {
  const result = parseMetaWebhookLeadgenEvents({
    entry: [{ changes: [{ field: "feed", value: {} }], id: "page-1" }],
    object: "page",
  });

  assert.equal(result.events.length, 0);
  assert.equal(result.ignored[0]?.reason, "change_not_leadgen");
});

test("parser rejects leadgen change without leadgen_id", () => {
  const result = parseMetaWebhookLeadgenEvents({
    entry: [
      { changes: [{ field: "leadgen", value: { page_id: "page-1" } }] },
    ],
    object: "page",
  });

  assert.equal(result.events.length, 0);
  assert.equal(result.ignored[0]?.reason, "leadgen_id_missing");
});

test("parser rejects leadgen change without page_id", () => {
  const result = parseMetaWebhookLeadgenEvents({
    entry: [
      { changes: [{ field: "leadgen", value: { leadgen_id: "leadgen-1" } }] },
    ],
    object: "page",
  });

  assert.equal(result.events.length, 0);
  assert.equal(result.ignored[0]?.reason, "page_id_missing");
});

test("parser supports mixed arrays without blocking valid changes", () => {
  const result = parseMetaWebhookLeadgenEvents({
    entry: [
      {
        changes: [
          { field: "feed", value: {} },
          {
            field: "leadgen",
            value: {
              leadgen_id: "leadgen-1",
              page_id: "page-1",
            },
          },
        ],
        id: "page-1",
      },
    ],
    object: "page",
  });

  assert.equal(result.events.length, 1);
  assert.equal(result.ignored.length, 1);
});

test("parser extracts multiple valid leadgen events", () => {
  const result = parseMetaWebhookLeadgenEvents({
    entry: [
      {
        changes: [
          {
            field: "leadgen",
            value: {
              leadgen_id: "leadgen-1",
              page_id: "page-1",
            },
          },
          {
            field: "leadgen",
            value: {
              leadgen_id: "leadgen-2",
              page_id: "page-1",
            },
          },
        ],
        id: "page-1",
      },
    ],
    object: "page",
  });

  assert.equal(result.events.length, 2);
});

test("parser reports invalid JSON", () => {
  const result = parseMetaWebhookJson("{");

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 400);
  }
});

test("service rejects excessive payload", async () => {
  const result = await processVerifiedMetaWebhookPayload({
    config: { maxBodyBytes: 1 },
    rawBodyBytes: toBytes("{}"),
    recorder: async () => {
      throw new Error("recorder should not run");
    },
  });

  assert.equal(result.status, 413);
});

test("service rejects excessive content-length before trusting body bytes", async () => {
  const rawBodyBytes = toBytes("{}");
  const result = await processMetaWebhookNotification({
    config: {
      appSecret,
      maxBodyBytes: 1,
      verifyToken,
    },
    contentLength: "2",
    contentType: "application/json",
    rawBodyBytes,
    signatureHeader: createMetaWebhookSignature({ appSecret, rawBodyBytes }),
    supabase: createFakeLeadIngestionSupabase(),
  });

  assert.equal(result.status, 413);
});

test("service rejects invalid JSON before recording", async () => {
  let calls = 0;
  const result = await processVerifiedMetaWebhookPayload({
    config: { maxBodyBytes: metaWebhookDefaultMaxBodyBytes },
    rawBodyBytes: toBytes("{"),
    recorder: async () => {
      calls += 1;
      throw new Error("recorder should not run");
    },
  });

  assert.equal(result.status, 400);
  assert.equal(calls, 0);
});

test("service rejects unsupported content type", async () => {
  const rawBodyBytes = toBytes("{}");
  const result = await processMetaWebhookNotification({
    config: {
      appSecret,
      maxBodyBytes: metaWebhookDefaultMaxBodyBytes,
      verifyToken,
    },
    contentLength: String(rawBodyBytes.byteLength),
    contentType: "text/plain",
    rawBodyBytes,
    signatureHeader: createMetaWebhookSignature({ appSecret, rawBodyBytes }),
    supabase: createFakeLeadIngestionSupabase(),
  });

  assert.equal(result.status, 415);
});

test("service rejects missing signature before recording", async () => {
  const rawBodyBytes = toBytes(JSON.stringify(validPayload()));
  const result = await processMetaWebhookNotification({
    config: {
      appSecret,
      maxBodyBytes: metaWebhookDefaultMaxBodyBytes,
      verifyToken,
    },
    contentLength: String(rawBodyBytes.byteLength),
    contentType: "application/json",
    rawBodyBytes,
    signatureHeader: null,
    supabase: createFakeLeadIngestionSupabase(),
  });

  assert.equal(result.status, 401);
});

test("service persists all valid leadgen changes in a batch", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  seedIntegration(supabase, { externalAccountId: "page-1" });
  const rawBody = JSON.stringify({
    entry: [
      {
        changes: [
          {
            field: "leadgen",
            value: { leadgen_id: "leadgen-1", page_id: "page-1" },
          },
          {
            field: "leadgen",
            value: { leadgen_id: "leadgen-2", page_id: "page-1" },
          },
        ],
        id: "page-1",
      },
    ],
    object: "page",
  });
  const rawBodyBytes = toBytes(rawBody);

  const result = await processMetaWebhookNotification({
    config: {
      appSecret,
      maxBodyBytes: metaWebhookDefaultMaxBodyBytes,
      verifyToken,
    },
    contentLength: String(rawBodyBytes.byteLength),
    contentType: "application/json; charset=utf-8",
    rawBodyBytes,
    signatureHeader: createMetaWebhookSignature({ appSecret, rawBodyBytes }),
    supabase,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.persistedCount, 2);
  assert.equal(supabase.tables.lead_ingestion_events.length, 2);
});

test("transport persistence stores a valid event as fetch_pending", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  seedIntegration(supabase);

  const result = await recordLeadIngestionTransportEvent({
    input: leadgenInput(),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.status, "fetch_pending");
    assert.equal(result.event.crmLeadId, null);
    assert.equal(result.event.organizationId, "org-1");
    assert.equal(result.event.integrationConfigId, "config-1");
  }
});

test("transport persistence resolves tenant by page_id", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  seedIntegration(supabase, { externalAccountId: "page-9" });

  const result = await recordLeadIngestionTransportEvent({
    input: leadgenInput({ externalAccountId: "page-9", pageId: "page-9" }),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.organizationId, "org-1");
  }
});

test("transport persistence ignores organization_id from source payload", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  seedIntegration(supabase, { organizationId: "org-real" });

  const result = await recordLeadIngestionTransportEvent({
    input: leadgenInput({
      sourcePayload: { leadgenId: "leadgen-1", organization_id: "org-forged" },
    }),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.organizationId, "org-real");
  }
});

test("unknown page is preserved without tenant", async () => {
  const supabase = createFakeLeadIngestionSupabase();

  const result = await recordLeadIngestionTransportEvent({
    input: leadgenInput(),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.status, "tenant_unresolved");
    assert.equal(result.event.organizationId, null);
    assert.equal(result.event.integrationConfigId, null);
    assert.equal(result.event.lastErrorCode, "INTEGRATION_NOT_FOUND");
  }
});

test("inactive integration is preserved and rejected", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  seedIntegration(supabase, { status: "inactive" });

  const result = await recordLeadIngestionTransportEvent({
    input: leadgenInput(),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.status, "rejected");
    assert.equal(result.event.organizationId, "org-1");
    assert.equal(result.event.integrationConfigId, "config-1");
    assert.equal(result.event.lastErrorCode, "INTEGRATION_INACTIVE");
  }
});

test("redelivery does not create a second inbox row", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  seedIntegration(supabase);

  const first = await recordLeadIngestionTransportEvent({
    input: leadgenInput(),
    supabase,
  });
  const second = await recordLeadIngestionTransportEvent({
    input: leadgenInput(),
    supabase,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(supabase.tables.lead_ingestion_events.length, 1);
  if (second.ok) {
    assert.equal(second.idempotent, true);
  }
});

test("duplicate conflict returns deterministic idempotent result", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  seedIntegration(supabase);
  await recordLeadIngestionTransportEvent({
    input: leadgenInput(),
    supabase,
  });

  const result = await recordLeadIngestionTransportEvent({
    input: leadgenInput({ formId: "new-form" }),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.idempotent, true);
    assert.equal(result.event.externalId, "leadgen-1");
  }
});

test("redelivery does not regress materialized event", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  seedIntegration(supabase);
  await recordLeadIngestionTransportEvent({
    input: leadgenInput(),
    supabase,
  });
  supabase.tables.lead_ingestion_events[0] = {
    ...supabase.tables.lead_ingestion_events[0],
    crm_lead_id: "lead-1",
    status: "materialized",
  };

  const result = await recordLeadIngestionTransportEvent({
    input: leadgenInput(),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.status, "materialized");
    assert.equal(result.event.crmLeadId, "lead-1");
  }
});

test("redelivery does not clear crm_lead_id", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  seedIntegration(supabase);
  await recordLeadIngestionTransportEvent({
    input: leadgenInput(),
    supabase,
  });
  supabase.tables.lead_ingestion_events[0] = {
    ...supabase.tables.lead_ingestion_events[0],
    crm_lead_id: "lead-1",
    status: "materialized",
  };

  await recordLeadIngestionTransportEvent({
    input: leadgenInput(),
    supabase,
  });

  assert.equal(supabase.tables.lead_ingestion_events[0]?.crm_lead_id, "lead-1");
});

test("unsupported item does not create event", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  seedIntegration(supabase);
  const rawBody = JSON.stringify({
    entry: [{ changes: [{ field: "feed", value: {} }], id: "page-1" }],
    object: "page",
  });

  const result = await processVerifiedMetaWebhookPayload({
    config: { maxBodyBytes: metaWebhookDefaultMaxBodyBytes },
    rawBodyBytes: toBytes(rawBody),
    recorder: async (input) => {
      await recordLeadIngestionTransportEvent({ input, supabase });
      throw new Error("unsupported item should not record");
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.persistedCount, 0);
  assert.equal(supabase.tables.lead_ingestion_events.length, 0);
});

test("malformed item does not invent identity", () => {
  const result = parseMetaWebhookLeadgenEvents({
    entry: [{ changes: [{ field: "leadgen", value: {} }], id: "page-1" }],
    object: "page",
  });

  assert.equal(result.events.length, 0);
  assert.equal(result.ignored[0]?.reason, "leadgen_id_missing");
});

test("persistence failure does not return false success", async () => {
  const result = await processVerifiedMetaWebhookPayload({
    config: { maxBodyBytes: metaWebhookDefaultMaxBodyBytes },
    rawBodyBytes: toBytes(JSON.stringify(validPayload())),
    recorder: async () => ({
      code: "PAYLOAD_INVALID",
      error: "failure",
      ok: false,
      status: 500,
    }),
  });

  assert.equal(result.status, 500);
  assert.equal(result.body.received, false);
});

test("mapped source payload does not include raw body, headers or signature", () => {
  const event = parseMetaWebhookLeadgenEvents(validPayload()).events[0];

  assert.ok(event);
  const input = mapMetaLeadgenEventToLeadIngestionInput(event);
  const serialized = JSON.stringify(input.sourcePayload);

  assert.equal(serialized.includes("x-hub-signature-256"), false);
  assert.equal(serialized.includes("rawBody"), false);
  assert.equal(serialized.includes("secret"), false);
});

test("route does not import CRM materialization", () => {
  const route = readFileSync(
    "app/api/integrations/meta/webhook/route.ts",
    "utf8",
  );

  assert.equal(route.includes("materializeLeadIngestionEvent"), false);
  assert.equal(route.includes("crm_leads"), false);
});

test("route reads raw bytes with arrayBuffer before transport processing", () => {
  const route = readFileSync(
    "app/api/integrations/meta/webhook/route.ts",
    "utf8",
  );

  assert.equal(route.includes("request.arrayBuffer()"), true);
  assert.equal(route.includes("request.text()"), false);
});

test("service does not call Graph API", () => {
  const source = readFileSync(
    "modules/lead-ingestion/meta-webhook/service.ts",
    "utf8",
  );

  assert.equal(source.includes("graph.facebook.com"), false);
  assert.equal(source.includes("fetch("), false);
});

test("route does not depend on React, browser session or localStorage", () => {
  const route = readFileSync(
    "app/api/integrations/meta/webhook/route.ts",
    "utf8",
  );

  assert.equal(route.includes("react"), false);
  assert.equal(route.includes("localStorage"), false);
  assert.equal(route.includes("getUser"), false);
});

function validPayload(overrides: { formId?: string } = {}) {
  return {
    entry: [
      {
        changes: [
          {
            field: "leadgen",
            value: {
              ad_id: "ad-1",
              adgroup_id: "adset-1",
              created_time: 1_787_832_000,
              form_id: overrides.formId ?? "form-1",
              leadgen_id: "leadgen-1",
              page_id: "page-1",
            },
          },
        ],
        id: "page-1",
        time: 1_787_832_000,
      },
    ],
    object: "page",
  };
}

function toBytes(value: string) {
  return new TextEncoder().encode(value);
}

function leadgenInput(overrides: Record<string, unknown> = {}) {
  return {
    eventType: "leadgen",
    externalAccountId: "page-1",
    externalId: "leadgen-1",
    formId: "form-1",
    pageId: "page-1",
    sourcePayload: { leadgenId: "leadgen-1", pageId: "page-1" },
    sourceSystem: "meta_lead_ads",
    ...overrides,
  };
}

function createFakeLeadIngestionSupabase() {
  const tables = {
    lead_ingestion_events: [] as LeadIngestionEventRow[],
    lead_ingestion_integration_configs: [] as LeadIngestionIntegrationConfigRow[],
  };

  return {
    from(table: string) {
      return new FakeQueryBuilder(tables, table);
    },
    tables,
  } as unknown as LeadIngestionSupabaseClient & {
    tables: typeof tables;
  };
}

function seedIntegration(
  supabase: ReturnType<typeof createFakeLeadIngestionSupabase>,
  overrides: SeedIntegrationOptions = {},
) {
  supabase.tables.lead_ingestion_integration_configs.push({
    allowed_form_ids: ["form-1", "formulário-ç", "new-form"],
    created_at: "2026-08-03T12:00:00.000Z",
    external_account_id:
      overrides.external_account_id ?? overrides.externalAccountId ?? "page-1",
    id: overrides.id ?? "config-1",
    organization_id:
      overrides.organization_id ?? overrides.organizationId ?? "org-1",
    public_metadata: {},
    source_system: overrides.source_system ?? "meta_lead_ads",
    status: overrides.status ?? "active",
    updated_at: "2026-08-03T12:00:00.000Z",
  });
}

type SeedIntegrationOptions = Partial<LeadIngestionIntegrationConfigRow> & {
  externalAccountId?: string;
  organizationId?: string;
};

class FakeQueryBuilder {
  private filters: Record<string, unknown> = {};
  private insertPayload: Record<string, unknown> | null = null;
  private readonly table: string;
  private readonly tables: {
    lead_ingestion_events: LeadIngestionEventRow[];
    lead_ingestion_integration_configs: LeadIngestionIntegrationConfigRow[];
  };

  constructor(
    tables: {
      lead_ingestion_events: LeadIngestionEventRow[];
      lead_ingestion_integration_configs: LeadIngestionIntegrationConfigRow[];
    },
    table: string,
  ) {
    this.table = table;
    this.tables = tables;
  }

  insert(payload: Record<string, unknown>) {
    this.insertPayload = payload;

    return this;
  }

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value;

    return this;
  }

  async maybeSingle<T>() {
    if (this.table === "lead_ingestion_integration_configs") {
      const row = this.tables.lead_ingestion_integration_configs.find((entry) =>
        Object.entries(this.filters).every(
          ([column, value]) =>
            entry[column as keyof LeadIngestionIntegrationConfigRow] === value,
        ),
      );

      return { data: (row ?? null) as T | null, error: null };
    }

    if (this.table === "lead_ingestion_events") {
      const row = this.tables.lead_ingestion_events.find((entry) =>
        Object.entries(this.filters).every(
          ([column, value]) =>
            entry[column as keyof LeadIngestionEventRow] === value,
        ),
      );

      return { data: (row ?? null) as T | null, error: null };
    }

    return { data: null as T | null, error: null };
  }

  async single<T>() {
    if (this.table !== "lead_ingestion_events" || !this.insertPayload) {
      return { data: null as T | null, error: null };
    }

    const duplicate = this.tables.lead_ingestion_events.some(
      (row) =>
        row.source_system === this.insertPayload?.source_system &&
        row.external_id === this.insertPayload?.external_id,
    );

    if (duplicate) {
      return {
        data: null as T | null,
        error: { code: "23505", message: "duplicate key value" },
      };
    }

    const row: LeadIngestionEventRow = {
      attempt_count: 0,
      created_at: "2026-08-03T12:00:00.000Z",
      crm_lead_id: null,
      event_type: String(this.insertPayload.event_type ?? ""),
      external_event_id: toNullableString(this.insertPayload.external_event_id),
      external_id: String(this.insertPayload.external_id ?? ""),
      id: `event-${this.tables.lead_ingestion_events.length + 1}`,
      integration_config_id: toNullableString(this.insertPayload.integration_config_id),
      last_error_code: toNullableString(this.insertPayload.last_error_code),
      last_error_message: toNullableString(this.insertPayload.last_error_message),
      normalized_payload: toRecord(this.insertPayload.normalized_payload),
      organization_id: toNullableString(this.insertPayload.organization_id),
      processed_at: null,
      received_at: String(this.insertPayload.received_at ?? "2026-08-03T12:00:00.000Z"),
      source_payload: toRecord(this.insertPayload.source_payload),
      source_system: String(this.insertPayload.source_system ?? ""),
      status: String(this.insertPayload.status ?? "received"),
      updated_at: "2026-08-03T12:00:00.000Z",
    };

    this.tables.lead_ingestion_events.push(row);

    return { data: row as T, error: null };
  }
}

function toNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
