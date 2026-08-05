import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import {
  createMetaClaimProcessorForTesting,
  createMetaClaimProcessorStore,
} from "./meta-claim-processor.ts";
import { createMetaProcessorTriggerHttpHandlerForTesting } from "./meta-processor-trigger-http.ts";
import { createMetaProcessorTriggerForTesting } from "./meta-processor-trigger.ts";

const eventId = "7a000000-0000-4000-8000-000000000003";

test("protected trigger materializes one synthetic Meta lead and remains idempotent", async () => {
  const url = requiredEnv("LOCAL_SUPABASE_URL");
  const key = requiredEnv("LOCAL_SUPABASE_SERVICE_ROLE_KEY");
  const secret = requiredEnv("LOCAL_META_TRIGGER_SECRET");
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const processor = createMetaClaimProcessorForTesting({
    clock: () => new Date(),
    fetchLead: async (leadgenId) => ({
      lead: {
        fieldData: [
          { name: "full_name", values: ["Synthetic Meta Lead"] },
          { name: "email", values: ["synthetic@example.invalid"] },
        ],
        formId: "meta-trigger-form",
        id: leadgenId,
      },
      ok: true,
    }),
    store: createMetaClaimProcessorStore(supabase),
  });
  const trigger = createMetaProcessorTriggerForTesting({
    clock: (() => { let value = 1_000; return () => value += 5; })(),
    createServiceRoleClient: () => supabase,
    createWorkerId: () => "meta-trigger-e2e-worker",
    processCycle: (params) => processor(params),
  });
  const handler = createMetaProcessorTriggerHttpHandlerForTesting({
    env: { META_LEAD_PROCESSOR_TRIGGER_SECRET: secret },
    execute: trigger,
  });

  const first = await handler(triggerRequest(secret));
  assert.equal(first.status, 200);
  assert.deepEqual(pickMetrics(await first.json()), { claimed: 1, materialized: 1 });

  const { data: event, error: eventError } = await supabase
    .from("lead_ingestion_events")
    .select("id,status,crm_lead_id")
    .eq("id", eventId)
    .single();
  assert.equal(eventError, null);
  assert.equal(event?.status, "materialized");
  assert.ok(event?.crm_lead_id);

  const second = await handler(triggerRequest(secret));
  assert.equal(second.status, 200);
  assert.deepEqual(pickMetrics(await second.json()), { claimed: 0, materialized: 0 });
});

function triggerRequest(secret: string) {
  return new Request("http://localhost/api/internal/meta/lead-processor", {
    body: JSON.stringify({ batchSize: 1, cycles: 1 }),
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
}

function pickMetrics(value: unknown) {
  assert.ok(value && typeof value === "object");
  const summary = value as Record<string, unknown>;
  return { claimed: summary.claimed, materialized: summary.materialized };
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the controlled local integration test.`);
  return value;
}
