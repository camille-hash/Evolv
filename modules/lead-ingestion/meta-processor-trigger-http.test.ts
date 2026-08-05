import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createMetaProcessorTriggerHttpHandlerForTesting } from "./meta-processor-trigger-http.ts";
import {
  MetaProcessorFailure,
  type MetaProcessorFailureCode,
  type MetaProcessorFailureStage,
} from "./meta-processor-failure.ts";
import type { MetaProcessorFailureLog } from "./meta-processor-trigger-http.ts";

const secret = "synthetic-trigger-secret";

test("returns 503 when the server secret is absent", async () => {
  const response = await handler({ secret: undefined })(request(secret, {}));
  assert.equal(response.status, 503);
});

test("rejects missing and invalid authorization identically", async () => {
  const missing = await handler()(request(null, {}));
  const invalid = await handler()(request("incorrect-secret", {}));
  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
  assert.deepEqual(await missing.json(), await invalid.json());
});

test("rejects every non-canonical authorization form identically", async () => {
  const authorizations = [
    null,
    "",
    "Bearer short",
    `Bearer ${secret}suffix`,
    `Bearer prefix${secret}`,
    `Bearer  ${secret}`,
    `Bearer ${secret} `,
    ` Bearer ${secret}`,
    `bearer ${secret}`,
    `Basic ${secret}`,
  ];
  let expectedBody: unknown;
  for (const authorization of authorizations) {
    const response = await handler()(requestWithRawAuthorization(authorization));
    assert.equal(response.status, 401, authorization ?? "missing");
    const body = await response.json();
    expectedBody ??= body;
    assert.deepEqual(body, expectedBody);
  }
});

test("compares fixed-size secret digests without an original-length branch", () => {
  const source = readFileSync("modules/lead-ingestion/meta-processor-trigger-http.ts", "utf8");
  assert.match(source, /createHash\("sha256"\)[\s\S]*createHash\("sha256"\)/);
  assert.equal(source.includes("leftBytes.length"), false);
  assert.equal(source.includes("rightBytes.length"), false);
});

test("accepts a valid bearer secret without returning it", async () => {
  const response = await handler()(request(secret, {}));
  assert.equal(response.status, 200);
  assert.equal(JSON.stringify(await response.json()).includes(secret), false);
});

test("rejects incompatible content type", async () => {
  const response = await handler()(request(secret, {}, "text/plain"));
  assert.equal(response.status, 415);
});

test("rejects malformed JSON", async () => {
  const response = await handler()(request(secret, "{"));
  assert.equal(response.status, 400);
});

test("rejects non-object JSON values", async () => {
  for (const body of [null, [], "value", 7]) {
    assert.equal((await handler()(request(secret, body))).status, 400);
  }
});

test("accepts an exactly 4096-byte JSON body", async () => {
  const prefix = JSON.stringify({ batchSize: 1 });
  const body = prefix + " ".repeat(4096 - Buffer.byteLength(prefix));
  assert.equal(Buffer.byteLength(body), 4096);
  assert.equal((await handler()(request(secret, body))).status, 200);
});

test("rejects oversized bodies regardless of Content-Length", async () => {
  const prefix = '{"value":"';
  const suffix = '"}';
  const oversized = prefix + "x".repeat(4097 - Buffer.byteLength(prefix + suffix)) + suffix;
  assert.equal(Buffer.byteLength(oversized), 4097);

  for (const contentLength of [undefined, "1", "4097"]) {
    const response = await handler()(requestWithAuthorization(
      `Bearer ${secret}`,
      oversized,
      contentLength ? { "content-length": contentLength } : undefined,
    ));
    assert.equal(response.status, 413);
  }
});

test("stops consuming a streaming body as soon as the limit is exceeded", async () => {
  let pulls = 0;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
    pull(controller) {
      pulls += 1;
      controller.enqueue(new Uint8Array(pulls === 1 ? 3000 : 2000));
    },
  }, { highWaterMark: 0 });
  const response = await handler()(new Request(
    "http://localhost/api/internal/meta/lead-processor",
    {
      body: stream,
      duplex: "half",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      method: "POST",
    } as RequestInit & { duplex: "half" },
  ));
  assert.equal(response.status, 413);
  assert.equal(pulls, 2);
  assert.equal(cancelled, true);
});

test("rejects invalid or excessive operational bounds", async () => {
  for (const body of [
    { batchSize: 0 }, { batchSize: 26 }, { batchSize: 1.5 },
    { cycles: 0 }, { cycles: 6 }, { cycles: "1" },
  ]) {
    assert.equal((await handler()(request(secret, body))).status, 400);
  }
});

test("rejects unexpected fields", async () => {
  assert.equal((await handler()(request(secret, { accessToken: "no" }))).status, 400);
});

test("uses conservative defaults and returns only the operational summary", async () => {
  let received: unknown;
  const response = await handler({ execute: async (params) => {
    received = params;
    return summary();
  } })(request(secret, {}));
  assert.equal(response.status, 200);
  assert.deepEqual(received, { batchSize: 10, cycles: 1 });
  assert.deepEqual(await response.json(), summary());
});

test("passes explicit bounded values to the service", async () => {
  let received: unknown;
  await handler({ execute: async (params) => {
    received = params;
    return summary();
  } })(request(secret, { batchSize: 25, cycles: 5 }));
  assert.deepEqual(received, { batchSize: 25, cycles: 5 });
});

test("sanitizes unexpected internal failures", async () => {
  const logs: MetaProcessorFailureLog[] = [];
  const response = await handler({ execute: async () => {
    throw new Error([
      "SECRET_SENTINEL",
      "TOKEN_SENTINEL",
      "EMAIL_SENTINEL",
      "PHONE_SENTINEL",
      "URL_SENTINEL",
      "EXTERNAL_ERROR_SENTINEL",
      secret,
    ].join(" "));
  }, logs })(request(secret, {}));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Meta lead processing failed." });
  assert.deepEqual(logs, [{
    code: "processor_unexpected_failure",
    correlationId: "correlation-test",
    event: "meta_lead_processor_failure",
    retryable: false,
    stage: "unexpected",
    timestamp: "2026-08-05T15:30:00.000Z",
  }]);
  const recorded = JSON.stringify(logs);
  for (const sentinel of [
    "SECRET_SENTINEL", "TOKEN_SENTINEL", "EMAIL_SENTINEL",
    "PHONE_SENTINEL", "URL_SENTINEL", "EXTERNAL_ERROR_SENTINEL", secret,
  ]) {
    assert.equal(recorded.includes(sentinel), false);
  }
  assert.equal(recorded.includes("stack"), false);
  assert.equal(recorded.includes("message"), false);
});

test("logs each typed global failure exactly once with its controlled classification", async () => {
  const cases: Array<{
    code: MetaProcessorFailureCode;
    retryable: boolean;
    stage: MetaProcessorFailureStage;
  }> = [
    { code: "processor_persistence_not_configured", retryable: false, stage: "configuration" },
    { code: "processor_client_initialization_failed", retryable: false, stage: "client_initialization" },
    { code: "processor_claim_rpc_failed", retryable: false, stage: "claim" },
    { code: "processor_supabase_transport_failed", retryable: true, stage: "claim" },
    { code: "processor_materialization_failed", retryable: true, stage: "materialization" },
  ];
  for (const item of cases) {
    const logs: MetaProcessorFailureLog[] = [];
    const response = await handler({ execute: async () => {
      throw new MetaProcessorFailure(item.code, item.stage, item.retryable);
    }, logs })(request(secret, {}));
    assert.equal(response.status, 500);
    assert.equal(logs.length, 1);
    assert.equal(logs[0]?.code, item.code);
    assert.equal(logs[0]?.stage, item.stage);
    assert.equal(logs[0]?.retryable, item.retryable);
    assert.equal(logs[0]?.correlationId, "correlation-test");
  }
});

test("preserves the sanitized response when the best-effort logger throws", async () => {
  let executeCalls = 0;
  let logCalls = 0;
  const loggerSentinel = "EXTERNAL_LOGGER_ERROR_SENTINEL";
  const response = await handler({
    execute: async () => {
      executeCalls += 1;
      throw new MetaProcessorFailure(
        "processor_claim_rpc_failed",
        "claim",
        false,
      );
    },
    logFailure: () => {
      logCalls += 1;
      throw new Error(loggerSentinel);
    },
  })(request(secret, {}));

  assert.equal(executeCalls, 1);
  assert.equal(logCalls, 1);
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.deepEqual(body, { error: "Meta lead processing failed." });
  assert.equal(JSON.stringify(body).includes(loggerSentinel), false);
});

test("does not emit a failure log on success", async () => {
  const logs: MetaProcessorFailureLog[] = [];
  const response = await handler({ logs })(request(secret, {}));
  assert.equal(response.status, 200);
  assert.deepEqual(logs, []);
});

test("sets no-store on every success and error response class", async () => {
  const responses = [
    await handler({ secret: undefined })(request(secret, {})),
    await handler()(request(null, {})),
    await handler()(request(secret, {}, "text/plain")),
    await handler()(requestWithAuthorization(`Bearer ${secret}`, "x".repeat(4097))),
    await handler()(request(secret, "{")),
    await handler({ execute: async () => { throw new Error("failure"); } })(request(secret, {})),
    await handler()(request(secret, {})),
  ];
  assert.deepEqual(responses.map(({ status }) => status), [503, 401, 415, 413, 400, 500, 200]);
  for (const response of responses) {
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("route is POST-only and delegates without claim or Graph logic", () => {
  const route = readFileSync("app/api/internal/meta/lead-processor/route.ts", "utf8");
  assert.match(route, /export async function POST/);
  assert.equal(route.includes("export async function GET"), false);
  assert.equal(route.includes("claim_lead_ingestion_events"), false);
  assert.equal(route.includes("fetchMetaLead"), false);
});

function handler(options: {
  execute?: (params: { batchSize: number; cycles: number }) => Promise<ReturnType<typeof summary>>;
  logFailure?: (entry: MetaProcessorFailureLog) => void;
  logs?: MetaProcessorFailureLog[];
  secret?: string;
} = {}) {
  return createMetaProcessorTriggerHttpHandlerForTesting({
    clock: () => new Date("2026-08-05T15:30:00.000Z"),
    createCorrelationId: () => "correlation-test",
    env: { META_LEAD_PROCESSOR_TRIGGER_SECRET: "secret" in options ? options.secret : secret },
    execute: options.execute ?? (async () => summary()),
    logFailure: options.logFailure ?? ((entry) => options.logs?.push(entry)),
  });
}

function request(
  bearer: string | null,
  body: unknown,
  contentType = "application/json",
) {
  return requestWithAuthorization(
    bearer === null ? null : `Bearer ${bearer}`,
    body,
    { "content-type": contentType },
  );
}

function requestWithRawAuthorization(authorization: string | null) {
  const base = request(null, {});
  return new Proxy(base, {
    get(target, property, receiver) {
      if (property === "headers") {
        return { get: (name: string) => name.toLowerCase() === "authorization" ? authorization : null };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function requestWithAuthorization(
  authorization: string | null,
  body: unknown,
  additionalHeaders: HeadersInit = {},
) {
  const headers = new Headers({ "content-type": "application/json", ...additionalHeaders });
  if (authorization !== null) headers.set("authorization", authorization);
  return new Request("http://localhost/api/internal/meta/lead-processor", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers,
    method: "POST",
  });
}

function summary() {
  return {
    claimed: 0,
    cyclesExecuted: 1,
    durationMs: 1,
    leaseLost: 0,
    materialized: 0,
    requestedBatchSize: 10,
    requestedCycles: 1,
    retryExhausted: 0,
    retryScheduled: 0,
    terminalFailed: 0,
    workerId: "worker-test",
  };
}
