import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createMetaProcessorTriggerForTesting } from "./meta-processor-trigger.ts";
import type { LeadIngestionSupabaseClient } from "./types.ts";

const client = {} as LeadIngestionSupabaseClient;

test("returns a bounded empty operational summary", async () => {
  const trigger = buildTrigger([result(0)]);
  assert.deepEqual(await trigger({ batchSize: 10, cycles: 3 }), {
    claimed: 0,
    cyclesExecuted: 1,
    durationMs: 25,
    leaseLost: 0,
    materialized: 0,
    requestedBatchSize: 10,
    requestedCycles: 3,
    retryExhausted: 0,
    retryScheduled: 0,
    terminalFailed: 0,
    workerId: "worker-test",
  });
});

test("aggregates outcomes across bounded cycles", async () => {
  const trigger = buildTrigger([
    result(2, ["materialized", "retry_scheduled"]),
    result(2, ["terminal_failure", "retry_exhausted"]),
  ]);
  const summary = await trigger({ batchSize: 2, cycles: 2 });
  assert.equal(summary.cyclesExecuted, 2);
  assert.equal(summary.claimed, 4);
  assert.equal(summary.materialized, 1);
  assert.equal(summary.retryScheduled, 1);
  assert.equal(summary.retryExhausted, 1);
  assert.equal(summary.terminalFailed, 1);
});

test("stops when a partial batch proves the current queue is drained", async () => {
  let calls = 0;
  const trigger = buildTrigger([result(1), result(1)], () => calls += 1);
  const summary = await trigger({ batchSize: 2, cycles: 5 });
  assert.equal(summary.cyclesExecuted, 1);
  assert.equal(calls, 1);
});

test("executes exactly five full cycles and aggregates every result", async () => {
  let calls = 0;
  const trigger = buildTrigger(
    Array.from({ length: 5 }, () => result(1, ["materialized"])),
    () => calls += 1,
  );
  const summary = await trigger({ batchSize: 1, cycles: 5 });
  assert.equal(calls, 5);
  assert.equal(summary.cyclesExecuted, 5);
  assert.equal(summary.claimed, 5);
  assert.equal(summary.materialized, 5);
});

test("passes fixed lease, bounded batch and generated worker to the processor", async () => {
  let received: Record<string, unknown> | undefined;
  const trigger = createMetaProcessorTriggerForTesting({
    clock: sequenceClock(),
    createServiceRoleClient: () => client,
    createWorkerId: () => "worker-fixed",
    processCycle: async (params) => {
      received = params;
      return result(0);
    },
  });
  await trigger({ batchSize: 7, cycles: 1 });
  assert.equal(received?.leaseSeconds, 60);
  assert.equal(received?.limit, 7);
  assert.equal(received?.workerId, "worker-fixed");
  assert.equal(received?.supabase, client);
});

test("rejects invalid batch and cycle bounds", async () => {
  const trigger = buildTrigger([]);
  await assert.rejects(() => trigger({ batchSize: 0, cycles: 1 }), RangeError);
  await assert.rejects(() => trigger({ batchSize: 26, cycles: 1 }), RangeError);
  await assert.rejects(() => trigger({ batchSize: 1, cycles: 0 }), RangeError);
  await assert.rejects(() => trigger({ batchSize: 1, cycles: 6 }), RangeError);
});

test("fails closed when service-role persistence is unavailable", async () => {
  const trigger = createMetaProcessorTriggerForTesting({
    clock: sequenceClock(),
    createServiceRoleClient: () => null,
    createWorkerId: () => "worker-test",
    processCycle: async () => result(0),
  });
  await assert.rejects(() => trigger({ batchSize: 1, cycles: 1 }), /not configured/);
});

test("does not duplicate claim or materialization logic", () => {
  const source = readFileSync(
    "modules/lead-ingestion/meta-processor-trigger.ts",
    "utf8",
  );
  assert.match(source, /processClaimedMetaLeadEvents/);
  assert.equal(source.includes("claim_lead_ingestion_events"), false);
  assert.equal(source.includes("materialize_lead_ingestion_event_transaction"), false);
  assert.equal(source.includes("lead_ingestion_events").valueOf(), false);
});

function buildTrigger(
  results: ReturnType<typeof result>[],
  onCall: () => void = () => undefined,
) {
  let index = 0;
  return createMetaProcessorTriggerForTesting({
    clock: sequenceClock(),
    createServiceRoleClient: () => client,
    createWorkerId: () => "worker-test",
    processCycle: async () => {
      onCall();
      return results[index++] ?? result(0);
    },
  });
}

function result(
  claimedCount: number,
  outcomes: Array<"materialized" | "retry_scheduled" | "retry_exhausted" | "terminal_failure" | "lease_lost"> = [],
) {
  return {
    claimedCount,
    failedCount: outcomes.filter((outcome) => outcome !== "materialized").length,
    materializedCount: outcomes.filter((outcome) => outcome === "materialized").length,
    results: outcomes.map((outcome, index) => ({ eventId: `event-${index}`, outcome })),
  };
}

function sequenceClock() {
  let value = 1_000;
  return () => {
    const current = value;
    value += 25;
    return current;
  };
}
