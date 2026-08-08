import assert from "node:assert/strict";
import test from "node:test";
import { fetchMetaLead } from "./client.ts";
import { normalizeMetaGraphLead } from "./normalize.ts";
import { metaGraphApiVersion, metaGraphHost, metaGraphLeadFields } from "./types.ts";

const syntheticToken = "synthetic-test-token";

test("fetches from the fixed endpoint using server configuration", async () => withRuntime(async () => {
  let requestedUrl = "";
  let authorization = "";
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    authorization = new Headers(init?.headers).get("authorization") ?? "";
    return jsonResponse(validGraphLead());
  };
  const result = await fetchMetaLead("lead_123");
  assert.equal(result.ok, true);
  const url = new URL(requestedUrl);
  assert.equal(url.origin, metaGraphHost);
  assert.equal(url.pathname, `/${metaGraphApiVersion}/lead_123`);
  assert.equal(url.searchParams.get("fields"), metaGraphLeadFields.join(","));
  assert.equal(url.searchParams.has("access_token"), false);
  assert.equal(authorization, `Bearer ${syntheticToken}`);
}));

test("rejects an invalid lead identifier before transport", async () => withRuntime(async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return jsonResponse(validGraphLead()); };
  const result = await fetchMetaLead("https://example.test/v1/lead");
  assert.equal(result.ok ? null : result.category, "graph_invalid_lead_id");
  assert.equal(called, false);
}));

test("fails explicitly when the server-side token is missing", async () => withRuntime(async () => {
  delete process.env.META_GRAPH_ACCESS_TOKEN;
  const result = await fetchMetaLead("lead_123");
  assert.equal(result.ok ? null : result.category, "graph_configuration_missing");
}));

test("uses the smaller lease budget and configured timeout", async () => withRuntime(async () => {
  process.env.META_GRAPH_TIMEOUT_MS = "100";
  let elapsed = 0;
  const started = Date.now();
  globalThis.fetch = (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => { elapsed = Date.now() - started; reject(new Error("aborted")); });
  });
  const result = await fetchMetaLead("lead_123", { timeoutMs: 5 });
  assert.equal(result.ok ? null : result.category, "graph_timeout");
  assert.ok(elapsed < 80, `lease timeout was not honored: ${elapsed}ms`);
}));

test("caps a larger lease budget at the configured timeout", async () => withRuntime(async () => {
  process.env.META_GRAPH_TIMEOUT_MS = "5";
  globalThis.fetch = (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
  });
  const result = await fetchMetaLead("lead_123", { timeoutMs: 60_000 });
  assert.equal(result.ok ? null : result.category, "graph_timeout");
}));

test("honors an external abort without exposing its reason", async () => withRuntime(async () => {
  const controller = new AbortController();
  controller.abort(syntheticToken);
  globalThis.fetch = async (_input, init) => {
    if (init?.signal?.aborted) throw new Error("aborted");
    return jsonResponse(validGraphLead());
  };
  const result = await fetchMetaLead("lead_123", { signal: controller.signal });
  assert.equal(result.ok ? null : result.category, "graph_fetch_failed");
  assert.equal(JSON.stringify(result).includes(syntheticToken), false);
}));

for (const scenario of [
  { category: "graph_rate_limited", code: 4, retryable: true, status: 429 },
  { category: "graph_fetch_failed", code: 2, retryable: true, status: 503 },
  { category: "graph_auth_failed", code: 190, retryable: false, status: 401 },
  { category: "graph_permission_denied", code: 10, retryable: false, status: 403 },
  { category: "graph_lead_not_found", code: 100, retryable: false, status: 404 },
] as const) {
  test(`classifies Graph code ${scenario.code}`, async () => withRuntime(async () => {
    globalThis.fetch = async () => jsonResponse({ error: {
      code: scenario.code, error_subcode: 99, fbtrace_id: "safe-request-id", message: syntheticToken,
      type: scenario.code === 190 ? "OAuthException" : "GraphMethodException",
    } }, scenario.status);
    const result = await fetchMetaLead("lead_123");
    assert.equal(result.ok ? null : result.category, scenario.category);
    if (!result.ok) {
      assert.equal(result.retryable, scenario.retryable);
      assert.equal(result.requestId, "safe-request-id");
      assert.equal(JSON.stringify(result).includes(syntheticToken), false);
    }
  }));
}

test("rejects invalid JSON, incomplete and excessive responses", async () => withRuntime(async () => {
  globalThis.fetch = async () => new Response("not json");
  assert.equal((await fetchMetaLead("lead_123")).ok, false);
  globalThis.fetch = async () => jsonResponse({ id: "lead_123" });
  assert.equal((await fetchMetaLead("lead_123")).ok, false);
  globalThis.fetch = async () => new Response("{}", { headers: { "content-length": String(1024 * 1024 + 1) } });
  assert.equal((await fetchMetaLead("lead_123")).ok, false);
}));

test("exposes only sanitized field data shape diagnostics", async () => withRuntime(async () => {
  globalThis.fetch = async () => jsonResponse({
    ad_id: "ad-1",
    field_data: [
      { name: "nome_completo", values: ["SECRET_PERSON_NAME"] },
      { name: "telefone", values: ["SECRET_PHONE_VALUE"] },
      "malformed-entry",
      { values: ["SECRET_WITHOUT_NAME"] },
      { name: "observacao", values: [null, ""] },
    ],
    form_id: "form-1",
    id: "lead_123",
  });

  const result = await fetchMetaLead("lead_123");

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.lead.fieldDataDiagnostic : null, {
    acceptedEntryCount: 3,
    discardedEntryCount: 2,
    discardedEntryReasons: {
      entry_not_object: 1,
      missing_name: 1,
    },
    fieldDataShape: [
      { name: "nome_completo", valueCount: 1 },
      { name: "telefone", valueCount: 1 },
      { name: "observacao", valueCount: 0 },
    ],
    receivedEntryCount: 5,
  });

  const serializedDiagnostic = JSON.stringify(result.ok ? result.lead.fieldDataDiagnostic : null);
  assert.equal(serializedDiagnostic.includes("SECRET_PERSON_NAME"), false);
  assert.equal(serializedDiagnostic.includes("SECRET_PHONE_VALUE"), false);
  assert.equal(serializedDiagnostic.includes("SECRET_WITHOUT_NAME"), false);
  assert.equal(serializedDiagnostic.includes(syntheticToken), false);
}));

test("normalizes canonical fields and preserves unknown answers", () => {
  const result = normalizeMetaGraphLead({
    fieldData: [
      { name: "first_name", values: [" Ana "] }, { name: "last_name", values: ["Silva"] },
      { name: "email", values: ["ANA@EXAMPLE.TEST"] }, { name: "product", values: ["A", "B"] },
      { name: "product", values: ["C"] },
    ], formId: "form-evidence", id: "lead_123",
  }, { formId: "transport-form", pageId: "trusted-config-lookup" });
  assert.equal(result.fullName, "Ana Silva");
  assert.deepEqual(result.customAnswers, [
    { key: "product", value: "A" }, { key: "product", value: "B" }, { key: "product", value: "C" },
  ]);
  assert.equal("organizationId" in result, false);
});

test("prefers full_name and handles empty field data", () => {
  const named = normalizeMetaGraphLead({ fieldData: [
    { name: "full_name", values: ["Canonical Name", "Ignored"] }, { name: "first_name", values: ["Alias"] },
  ], id: "lead_123" }, { pageId: "page-1" });
  const empty = normalizeMetaGraphLead({ fieldData: [], id: "lead_124" }, { pageId: "page-1" });
  assert.equal(named.fullName, "Canonical Name");
  assert.equal(empty.fullName, undefined);
});

async function withRuntime(run: () => Promise<void>) {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.META_GRAPH_ACCESS_TOKEN;
  const originalTimeout = process.env.META_GRAPH_TIMEOUT_MS;
  process.env.META_GRAPH_ACCESS_TOKEN = syntheticToken;
  delete process.env.META_GRAPH_TIMEOUT_MS;
  try { await run(); } finally {
    globalThis.fetch = originalFetch;
    restoreEnv("META_GRAPH_ACCESS_TOKEN", originalToken);
    restoreEnv("META_GRAPH_TIMEOUT_MS", originalTimeout);
  }
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]; else process.env[name] = value;
}

function validGraphLead() {
  return { ad_id: "ad-1", created_time: "2026-08-04T12:00:00+0000", field_data: [
    { name: "full_name", values: ["Synthetic Lead"] },
  ], form_id: "form-1", id: "lead_123" };
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { headers: { "content-type": "application/json" }, status });
}
