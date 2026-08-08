import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createMetaClaimProcessorStore,
  createMetaClaimProcessorForTesting,
  type MetaClaimProcessorStore,
} from "./meta-claim-processor.ts";
import { MetaProcessorFailure } from "./meta-processor-failure.ts";
import type { MetaGraphLeadResult } from "./meta-graph/types.ts";
import type { LeadIngestionSupabaseClient } from "./types.ts";

const fixedNow = "2026-08-04T12:00:00.000Z";

test("returns an empty aggregate when no event is claimed", async () => {
  const fixture = createFixture([]);
  assert.deepEqual(await fixture.run(), { claimedCount: 0, failedCount: 0, materializedCount: 0, results: [] });
  assert.equal(fixture.calls.fetchCount, 0);
});

test("uses the lease minus the safety margin as the Graph timeout budget", async () => {
  const fixture = createFixture([claimedEvent()]);
  const result = await fixture.run();
  assert.equal(result.materializedCount, 1);
  assert.deepEqual(fixture.calls.fetchBudgets, [58_000]);
  assert.deepEqual(fixture.calls.sequence, ["claim", "fetch:lead-1", "enrich:event-1", "materialize:event-1"]);
});

for (const expiresAt of [fixedNow, "2026-08-04T12:00:02.000Z"]) {
  test(`does not call Graph without the required lease margin (${expiresAt})`, async () => {
    const fixture = createFixture([claimedEvent({ claimExpiresAt: expiresAt })]);
    const result = await fixture.run();
    assert.equal(result.results[0]?.outcome, "lease_lost");
    assert.equal(fixture.calls.fetchCount, 0);
    assert.deepEqual(fixture.calls.sequence, ["claim"]);
  });
}

test("does not mutate state when the lease expires while Graph is in flight", async () => {
  const fixture = createFixture([claimedEvent()], {
    fetchLead: async (id, _options, clock) => {
      clock.set("2026-08-04T12:01:00.000Z");
      return graphSuccess(id);
    },
  });
  const result = await fixture.run();
  assert.equal(result.results[0]?.outcome, "lease_lost");
  assert.deepEqual(fixture.calls.sequence, ["claim", "fetch:lead-1"]);
});

test("does not materialize when the lease is lost after enrichment", async () => {
  const fixture = createFixture([claimedEvent()], { advanceAfterEnrich: "2026-08-04T12:00:59.000Z" });
  const result = await fixture.run();
  assert.equal(result.results[0]?.outcome, "lease_lost");
  assert.deepEqual(fixture.calls.sequence, ["claim", "fetch:lead-1", "enrich:event-1"]);
});

test("a guarded enrichment rejected by another worker prevents materialization", async () => {
  const fixture = createFixture([claimedEvent()], { enrichSucceeds: false });
  const result = await fixture.run();
  assert.equal(result.results[0]?.outcome, "lease_lost");
  assert.equal(fixture.calls.sequence.includes("materialize:event-1"), false);
});

test("an authoritative failure refusal is reported as lease lost without retry", async () => {
  const fixture = createFixture([claimedEvent()], {
    failSucceeds: false,
    fetchLead: async () => graphFailure("graph_timeout", true),
  });
  const result = await fixture.run();
  assert.equal(result.results[0]?.outcome, "lease_lost");
  assert.deepEqual(fixture.calls.sequence, ["claim", "fetch:lead-1", "fail:graph_timeout"]);
});

test("an authoritative retry refusal is reported as lease lost", async () => {
  const fixture = createFixture([claimedEvent()], {
    fetchLead: async () => graphFailure("graph_timeout", true),
    retryOutcome: "lease_lost",
  });
  const result = await fixture.run();
  assert.equal(result.results[0]?.outcome, "lease_lost");
});

test("retry exhaustion is terminal and is not confused with lease loss", async () => {
  const fixture = createFixture([claimedEvent()], {
    fetchLead: async () => graphFailure("graph_timeout", true),
    retryOutcome: "retry_exhausted",
  });
  const result = await fixture.run();
  assert.equal(result.results[0]?.outcome, "retry_exhausted");
  assert.deepEqual(fixture.calls.sequence, ["claim", "fetch:lead-1", "fail:graph_timeout", "retry:graph_timeout"]);
  assert.equal(fixture.calls.sequence.some((call) => call.startsWith("materialize:")), false);
});

test("an authoritative materialization refusal cannot trigger another mutation", async () => {
  const fixture = createFixture([claimedEvent({ status: "materialization_pending" })], {
    failSucceeds: false,
    materializeSucceeds: false,
  });
  const result = await fixture.run();
  assert.equal(result.results[0]?.outcome, "lease_lost");
  assert.deepEqual(fixture.calls.sequence, ["claim", "materialize:event-1", "fail:materialization_failed"]);
});

test("processes the remainder of a batch after one terminal failure", async () => {
  const fixture = createFixture([
    claimedEvent({ externalId: "bad", id: "bad" }),
    claimedEvent({ externalId: "good", id: "good" }),
  ], { fetchLead: async (id) => id === "bad" ? graphFailure("graph_auth_failed", false) : graphSuccess(id) });
  const result = await fixture.run();
  assert.deepEqual(result.results.map((item) => item.outcome), ["terminal_failure", "materialized"]);
});

for (const category of ["graph_timeout", "graph_rate_limited", "graph_fetch_failed"] as const) {
  test(`${category} uses canonical retry while the lease remains safe`, async () => {
    const fixture = createFixture([claimedEvent()], { fetchLead: async () => graphFailure(category, true) });
    assert.equal((await fixture.run()).results[0]?.outcome, "retry_scheduled");
    assert.deepEqual(fixture.calls.sequence, ["claim", "fetch:lead-1", `fail:${category}`, `retry:${category}`]);
  });
}

for (const category of ["graph_auth_failed", "graph_permission_denied", "graph_lead_not_found"] as const) {
  test(`${category} remains terminal`, async () => {
    const fixture = createFixture([claimedEvent()], { fetchLead: async () => graphFailure(category, false) });
    assert.equal((await fixture.run()).results[0]?.outcome, "terminal_failure");
  });
}

test("a lead without a usable name fails normalization without materialization", async () => {
  const fixture = createFixture([claimedEvent()], { fetchLead: async () => ({
    lead: { fieldData: [{ name: "email", values: ["synthetic@example.test"] }], id: "lead-1" }, ok: true,
  }) });
  const result = await fixture.run();
  assert.equal(result.results[0]?.category, "normalization_failed");
  assert.equal(fixture.calls.sequence.some((call) => call.startsWith("materialize:")), false);
});

test("logs sanitized field data diagnostics only when a name is missing", async () => {
  const diagnostics: unknown[] = [];
  const fixture = createFixture([claimedEvent()], {
    diagnosticLogger: (entry) => diagnostics.push(entry),
    fetchLead: async () => ({
      lead: {
        fieldData: [
          { name: "nome_completo", values: ["SECRET_PERSON_NAME"] },
          { name: "email", values: ["secret@example.test"] },
          { name: "telefone", values: ["SECRET_PHONE_VALUE"] },
        ],
        fieldDataDiagnostic: {
          acceptedEntryCount: 3,
          discardedEntryCount: 0,
          discardedEntryReasons: {},
          fieldDataShape: [
            { name: "nome_completo", valueCount: 1 },
            { name: "email", valueCount: 1 },
            { name: "telefone", valueCount: 1 },
          ],
          receivedEntryCount: 3,
        },
        formId: "form-1",
        id: "lead-1",
      },
      ok: true,
    }),
  });

  const result = await fixture.run();

  assert.equal(result.results[0]?.category, "normalization_failed");
  assert.equal(diagnostics.length, 1);
  assert.deepEqual(diagnostics[0], {
    acceptedEntryCount: 3,
    category: "normalization_failed",
    discardedEntryCount: 0,
    discardedEntryReasons: {},
    externalId: "lead-1",
    fieldDataShape: [
      { name: "nome_completo", valueCount: 1 },
      { name: "email", valueCount: 1 },
      { name: "telefone", valueCount: 1 },
    ],
    formId: "form-1",
    receivedEntryCount: 3,
    stage: "normalization",
  });

  const serialized = JSON.stringify(diagnostics);
  assert.equal(serialized.includes("SECRET_PERSON_NAME"), false);
  assert.equal(serialized.includes("secret@example.test"), false);
  assert.equal(serialized.includes("SECRET_PHONE_VALUE"), false);
  assert.equal(serialized.includes("Authorization"), false);
  assert.equal(serialized.includes("Bearer"), false);
  assert.equal(serialized.includes("synthetic-test-token"), false);
});

test("does not emit field data diagnostics for successfully normalized leads", async () => {
  const diagnostics: unknown[] = [];
  const fixture = createFixture([claimedEvent()], {
    diagnosticLogger: (entry) => diagnostics.push(entry),
    fetchLead: async () => ({
      lead: {
        fieldData: [{ name: "full_name", values: ["Synthetic Lead"] }],
        fieldDataDiagnostic: {
          acceptedEntryCount: 1,
          discardedEntryCount: 0,
          discardedEntryReasons: {},
          fieldDataShape: [{ name: "full_name", valueCount: 1 }],
          receivedEntryCount: 1,
        },
        formId: "form-1",
        id: "lead-1",
      },
      ok: true,
    }),
  });

  const result = await fixture.run();

  assert.equal(result.materializedCount, 1);
  assert.equal(diagnostics.length, 0);
});

test("diagnostic logger failures do not change canonical normalization failure handling", async () => {
  const fixture = createFixture([claimedEvent()], {
    diagnosticLogger: () => {
      throw new Error("LOGGER_SECRET_SENTINEL");
    },
    fetchLead: async () => ({
      lead: {
        fieldData: [{ name: "nome", values: ["SECRET_PERSON_NAME"] }],
        fieldDataDiagnostic: {
          acceptedEntryCount: 1,
          discardedEntryCount: 0,
          discardedEntryReasons: {},
          fieldDataShape: [{ name: "nome", valueCount: 1 }],
          receivedEntryCount: 1,
        },
        id: "lead-1",
      },
      ok: true,
    }),
  });

  const result = await fixture.run();

  assert.equal(result.results[0]?.category, "normalization_failed");
  assert.equal(result.results[0]?.outcome, "terminal_failure");
  assert.deepEqual(fixture.calls.sequence, ["claim", "fetch:lead-1", "fail:normalization_failed"]);
});

test("an already enriched event skips Graph and uses canonical materialization", async () => {
  const fixture = createFixture([claimedEvent({ status: "materialization_pending" })]);
  assert.equal((await fixture.run()).materializedCount, 1);
  assert.equal(fixture.calls.fetchCount, 0);
});

test("worker and claim bounds are defensive", async () => {
  const fixture = createFixture([]);
  await fixture.run({ leaseSeconds: 9999, limit: 9999 });
  assert.deepEqual(fixture.calls.claimParams, { leaseSeconds: 900, limit: 100, workerId: "worker-1" });
  await assert.rejects(() => fixture.processor({ workerId: " " }));
});

test("processor source uses canonical RPCs and the public webhook remains isolated", () => {
  const source = readFileSync("modules/lead-ingestion/meta-claim-processor.ts", "utf8");
  const route = readFileSync("app/api/integrations/meta/webhook/route.ts", "utf8");
  assert.match(source, /\.rpc\("claim_lead_ingestion_events"/);
  assert.match(source, /\.rpc\("retry_lead_ingestion_event"/);
  assert.match(source, /"mark_meta_lead_ingestion_event_enriched"/);
  assert.match(source, /"mark_meta_lead_ingestion_event_failed"/);
  assert.match(source, /"materialize_lead_ingestion_event_transaction"/);
  assert.equal(source.includes('.from("lead_ingestion_events").update'), false);
  assert.equal(source.includes('.from("crm_leads")'), false);
  assert.equal(route.includes("meta-claim-processor"), false);
  assert.equal(route.includes("fetchMetaLead"), false);
});

test("production store sends no worker timestamps to authoritative claim or mutation RPCs", async () => {
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
  const supabase = {
    async rpc(name: string, params: Record<string, unknown>) {
      calls.push({ name, params });
      return {
        data: name === "materialize_lead_ingestion_event_transaction"
          ? [{}]
          : name === "retry_lead_ingestion_event" ? "retried" : true,
        error: null,
      };
    },
  } as unknown as LeadIngestionSupabaseClient;
  const store = createMetaClaimProcessorStore(supabase);
  const event = claimedEvent();

  await store.claim({ leaseSeconds: 60, limit: 10, workerId: "worker-1" });
  await store.markEnriched(event, { fullName: "Synthetic Lead" }, fixedNow);
  await store.markFailed(event, {
    category: "graph_timeout",
    message: "Safe failure.",
    retryable: true,
    stage: "graph_fetch",
  }, fixedNow);
  await store.retry(event, "graph_timeout", fixedNow);
  await store.materialize(event, fixedNow);

  assert.deepEqual(calls.map((call) => call.name), [
    "claim_lead_ingestion_events",
    "mark_meta_lead_ingestion_event_enriched",
    "mark_meta_lead_ingestion_event_failed",
    "retry_lead_ingestion_event",
    "materialize_lead_ingestion_event_transaction",
  ]);
  assert.deepEqual(calls[0]?.params, {
    p_lease_seconds: 60,
    p_limit: 10,
    p_worker_id: "worker-1",
  });
  for (const call of calls.slice(1)) {
    assert.equal(call.params.p_event_id, event.id);
    assert.equal(call.params.p_claim_token, event.claimToken);
    assert.equal("p_now" in call.params, false);
    assert.equal("p_processed_at" in call.params, false);
  }
  assert.equal(calls.some((call) => "p_now" in call.params), false);
});

test("classifies a claim RPC error without retaining the external error", async () => {
  const supabase = {
    async rpc() {
      return {
        data: null,
        error: { message: "EXTERNAL_ERROR_SENTINEL SECRET_SENTINEL" },
      };
    },
  } as unknown as LeadIngestionSupabaseClient;
  const store = createMetaClaimProcessorStore(supabase);
  await assert.rejects(
    () => store.claim({ leaseSeconds: 60, limit: 10, workerId: "worker-1" }),
    (error: unknown) => error instanceof MetaProcessorFailure &&
      error.code === "processor_claim_rpc_failed" &&
      error.stage === "claim" &&
      error.retryable === false &&
      error.message === "processor_claim_rpc_failed",
  );
});

test("classifies a rejected Supabase request as a sanitized transport failure", async () => {
  const supabase = {
    async rpc() {
      throw new Error("URL_SENTINEL TOKEN_SENTINEL EXTERNAL_ERROR_SENTINEL");
    },
  } as unknown as LeadIngestionSupabaseClient;
  const store = createMetaClaimProcessorStore(supabase);
  await assert.rejects(
    () => store.claim({ leaseSeconds: 60, limit: 10, workerId: "worker-1" }),
    (error: unknown) => error instanceof MetaProcessorFailure &&
      error.code === "processor_supabase_transport_failed" &&
      error.stage === "claim" &&
      error.retryable === true &&
      error.message === "processor_supabase_transport_failed",
  );
});

test("classifies a propagated materialization exception at its boundary", async () => {
  const fixture = createFixture([claimedEvent({ status: "materialization_pending" })], {
    failError: new Error("TOKEN_SENTINEL"),
    materializeError: new Error("EMAIL_SENTINEL PHONE_SENTINEL EXTERNAL_ERROR_SENTINEL"),
  });
  await assert.rejects(
    () => fixture.run(),
    (error: unknown) => error instanceof MetaProcessorFailure &&
      error.code === "processor_materialization_failed" &&
      error.stage === "materialization" &&
      error.message === "processor_materialization_failed",
  );
});

test("preserves canonical failure handling when a materialization exception is recoverable", async () => {
  const fixture = createFixture([claimedEvent({ status: "materialization_pending" })], {
    materializeError: new Error("EXTERNAL_ERROR_SENTINEL"),
  });
  const result = await fixture.run();
  assert.equal(result.results[0]?.outcome, "retry_scheduled");
  assert.deepEqual(fixture.calls.sequence, [
    "claim",
    "materialize:event-1",
    "fail:processor_internal_failure",
    "retry:processor_internal_failure",
  ]);
});

function createFixture(
  events: ReturnType<typeof claimedEvent>[],
  options: {
    advanceAfterEnrich?: string;
    diagnosticLogger?: (entry: unknown) => void;
    enrichSucceeds?: boolean;
    failError?: Error;
    failSucceeds?: boolean;
    fetchLead?: (id: string, options: { timeoutMs: number }, clock: ReturnType<typeof createClock>) => Promise<MetaGraphLeadResult>;
    materializeSucceeds?: boolean;
    materializeError?: Error;
    retryOutcome?: "retried" | "lease_lost" | "retry_exhausted";
  } = {},
) {
  const clock = createClock(fixedNow);
  const calls = {
    claimParams: null as unknown,
    enriched: [] as Record<string, unknown>[],
    fetchBudgets: [] as number[],
    fetchCount: 0,
    sequence: [] as string[],
  };
  const store: MetaClaimProcessorStore = {
    async claim(params) { calls.claimParams = params; calls.sequence.push("claim"); return events; },
    async markEnriched(event, payload) {
      calls.enriched.push(payload); calls.sequence.push(`enrich:${event.id}`);
      if (options.advanceAfterEnrich) clock.set(options.advanceAfterEnrich);
      return options.enrichSucceeds ?? true;
    },
    async markFailed(_event, failure) {
      calls.sequence.push(`fail:${failure.category}`);
      if (options.failError) throw options.failError;
      return options.failSucceeds ?? true;
    },
    async materialize(event) {
      calls.sequence.push(`materialize:${event.id}`);
      if (options.materializeError) throw options.materializeError;
      return options.materializeSucceeds ?? true;
    },
    async retry(_event, reason) { calls.sequence.push(`retry:${reason}`); return options.retryOutcome ?? "retried"; },
  };
  const fetchLead = async (id: string, fetchOptions: { timeoutMs: number }) => {
    calls.fetchCount += 1; calls.fetchBudgets.push(fetchOptions.timeoutMs); calls.sequence.push(`fetch:${id}`);
    return options.fetchLead?.(id, fetchOptions, clock) ?? graphSuccess(id);
  };
  const processor = createMetaClaimProcessorForTesting({
    clock,
    diagnosticLogger: options.diagnosticLogger ?? (() => undefined),
    fetchLead,
    store,
  });
  return {
    calls,
    processor,
    run: (params: { leaseSeconds?: number; limit?: number } = {}) => processor({ ...params, workerId: "worker-1" }),
  };
}

function createClock(initial: string) {
  let current = new Date(initial);
  const clock = () => new Date(current);
  clock.set = (value: string) => { current = new Date(value); };
  return clock;
}

function claimedEvent(overrides: Partial<{
  claimExpiresAt: string; externalId: string; id: string; status: "fetch_pending" | "materialization_pending";
}> = {}) {
  return {
    claimExpiresAt: overrides.claimExpiresAt ?? "2026-08-04T12:01:00.000Z",
    claimToken: "00000000-0000-4000-8000-000000000001",
    externalId: overrides.externalId ?? "lead-1",
    id: overrides.id ?? "event-1",
    normalizedPayload: {},
    sourcePayload: { formId: "form-1", pageId: "page-1" },
    status: overrides.status ?? "fetch_pending",
  };
}

function graphSuccess(id: string): MetaGraphLeadResult {
  return { lead: { fieldData: [{ name: "full_name", values: ["Synthetic Lead"] }], formId: "form-1", id }, ok: true };
}

function graphFailure(
  category: "graph_timeout" | "graph_rate_limited" | "graph_fetch_failed" | "graph_auth_failed" | "graph_permission_denied" | "graph_lead_not_found",
  retryable: boolean,
): MetaGraphLeadResult {
  return { category, message: "Safe failure.", ok: false, retryable };
}
