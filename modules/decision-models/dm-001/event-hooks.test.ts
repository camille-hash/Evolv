import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  Dm001CrmRecalculationReason,
  TriggerDm001RecalculationInput,
} from "./event-hooks.ts";
import { triggerDm001RecalculationAfterCrmEvent } from "./event-hooks.ts";

function createRunner(calls: TriggerDm001RecalculationInput[]) {
  return async (input: TriggerDm001RecalculationInput) => {
    calls.push(input);

    return {
      ok: true as const,
      recalculation: {
        reason: input.reason,
        requestedAt: input.requestedAt ?? "2026-06-29T12:00:00.000Z",
      },
      skipped: true as const,
    };
  };
}

async function assertHookCall(reason: Dm001CrmRecalculationReason) {
  const calls: TriggerDm001RecalculationInput[] = [];

  await triggerDm001RecalculationAfterCrmEvent(
    {
      accessToken: "token",
      leadId: "lead-1",
      reason,
      requestedAt: "2026-06-29T12:00:00.000Z",
    },
    createRunner(calls),
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.leadId, "lead-1");
  assert.equal(calls[0]?.reason, reason);
}

describe("DM-001 CRM event hooks", () => {
  it("calls the recalculation pipeline after note creation", async () => {
    await assertHookCall("note_created");
  });

  it("calls the recalculation pipeline after task updates and completion", async () => {
    await assertHookCall("task_updated");
    await assertHookCall("task_completed");
  });

  it("calls the recalculation pipeline after simulation creation", async () => {
    await assertHookCall("simulation_created");
  });

  it("passes decision_model_output_created to the pipeline as an ignored loop event", async () => {
    await assertHookCall("decision_model_output_created");
  });

  it("does not throw when recalculation fails", async () => {
    const warnings: unknown[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };

    try {
      await triggerDm001RecalculationAfterCrmEvent(
        {
          accessToken: "token",
          leadId: "lead-1",
          reason: "lead_updated",
        },
        async () => {
          throw new Error("boom");
        },
      );
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(warnings.length, 1);
  });
});
