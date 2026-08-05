import "server-only";

import { randomUUID } from "node:crypto";
import {
  processClaimedMetaLeadEvents,
  type ProcessClaimedMetaLeadEventsResult,
} from "./meta-claim-processor.ts";
import { createMetaWebhookServiceRoleClient } from "./meta-webhook/service.ts";
import type { LeadIngestionSupabaseClient } from "./types.ts";
import { MetaProcessorFailure } from "./meta-processor-failure.ts";

export const metaProcessorTriggerLimits = {
  defaultBatchSize: 10,
  defaultCycles: 1,
  leaseSeconds: 60,
  maximumBatchSize: 25,
  maximumCycles: 5,
} as const;

type ProcessCycle = (params: {
  leaseSeconds: number;
  limit: number;
  supabase: LeadIngestionSupabaseClient;
  workerId: string;
}) => Promise<ProcessClaimedMetaLeadEventsResult>;

type TriggerDependencies = {
  clock: () => number;
  createServiceRoleClient: () => LeadIngestionSupabaseClient | null;
  createWorkerId: () => string;
  processCycle: ProcessCycle;
};

export type MetaProcessorTriggerSummary = {
  claimed: number;
  cyclesExecuted: number;
  durationMs: number;
  leaseLost: number;
  materialized: number;
  requestedBatchSize: number;
  requestedCycles: number;
  retryExhausted: number;
  retryScheduled: number;
  terminalFailed: number;
  workerId: string;
};

export async function runMetaProcessorTrigger(params: {
  batchSize: number;
  cycles: number;
}): Promise<MetaProcessorTriggerSummary> {
  return runMetaProcessorTriggerWithDependencies(params, {
    clock: Date.now,
    createServiceRoleClient: createMetaWebhookServiceRoleClient,
    createWorkerId: () => `meta-trigger-${randomUUID()}`,
    processCycle: processClaimedMetaLeadEvents,
  });
}

export function createMetaProcessorTriggerForTesting(
  dependencies: TriggerDependencies,
) {
  return (params: { batchSize: number; cycles: number }) =>
    runMetaProcessorTriggerWithDependencies(params, dependencies);
}

async function runMetaProcessorTriggerWithDependencies(
  params: { batchSize: number; cycles: number },
  dependencies: TriggerDependencies,
): Promise<MetaProcessorTriggerSummary> {
  assertBoundedInteger(
    params.batchSize,
    1,
    metaProcessorTriggerLimits.maximumBatchSize,
    "batchSize",
  );
  assertBoundedInteger(
    params.cycles,
    1,
    metaProcessorTriggerLimits.maximumCycles,
    "cycles",
  );

  let supabase: LeadIngestionSupabaseClient | null;
  try {
    supabase = dependencies.createServiceRoleClient();
  } catch {
    throw new MetaProcessorFailure(
      "processor_client_initialization_failed",
      "client_initialization",
      false,
    );
  }
  if (!supabase) {
    throw new MetaProcessorFailure(
      "processor_persistence_not_configured",
      "configuration",
      false,
    );
  }

  const workerId = dependencies.createWorkerId().trim();
  if (!workerId || workerId.length > 200) {
    throw new Error("Meta processor worker configuration is invalid.");
  }

  const startedAt = dependencies.clock();
  const summary: MetaProcessorTriggerSummary = {
    claimed: 0,
    cyclesExecuted: 0,
    durationMs: 0,
    leaseLost: 0,
    materialized: 0,
    requestedBatchSize: params.batchSize,
    requestedCycles: params.cycles,
    retryExhausted: 0,
    retryScheduled: 0,
    terminalFailed: 0,
    workerId,
  };

  for (let cycle = 0; cycle < params.cycles; cycle += 1) {
    const result = await dependencies.processCycle({
      leaseSeconds: metaProcessorTriggerLimits.leaseSeconds,
      limit: params.batchSize,
      supabase,
      workerId,
    });
    summary.cyclesExecuted += 1;
    summary.claimed += result.claimedCount;
    summary.materialized += result.materializedCount;

    for (const item of result.results) {
      if (item.outcome === "retry_scheduled") summary.retryScheduled += 1;
      if (item.outcome === "retry_exhausted") summary.retryExhausted += 1;
      if (item.outcome === "terminal_failure") summary.terminalFailed += 1;
      if (item.outcome === "lease_lost") summary.leaseLost += 1;
    }

    if (result.claimedCount < params.batchSize) break;
  }

  summary.durationMs = Math.max(0, Math.round(dependencies.clock() - startedAt));
  return summary;
}

function assertBoundedInteger(
  value: number,
  minimum: number,
  maximum: number,
  name: string,
) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} is outside the supported range.`);
  }
}
