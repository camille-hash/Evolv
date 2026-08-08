import "server-only";
import { normalizeLeadIngestionPayload } from "./normalization.ts";
import { fetchMetaLead } from "./meta-graph/client.ts";
import { normalizeMetaGraphLead } from "./meta-graph/normalize.ts";
import type {
  MetaGraphFieldDataDiagnostic,
  MetaGraphLeadResult,
} from "./meta-graph/types.ts";
import type { LeadIngestionSupabaseClient } from "./types.ts";
import {
  MetaProcessorFailure,
  type MetaProcessorFailureStage,
} from "./meta-processor-failure.ts";

type ClaimedMetaLeadEvent = {
  claimExpiresAt: string;
  claimToken: string;
  externalId: string;
  id: string;
  normalizedPayload: Record<string, unknown>;
  sourcePayload: Record<string, unknown>;
  status: "fetch_pending" | "materialization_pending";
};

type ProcessorFailure = {
  category: string;
  message: string;
  retryable: boolean;
  stage: "graph_fetch" | "normalization" | "materialization";
};

const leaseSafetyMarginMs = 2_000;

type FetchClaimedMetaLead = (
  leadgenId: string,
  options: { timeoutMs: number },
) => Promise<MetaGraphLeadResult>;

type MetaClaimProcessorDependencies = {
  clock: () => Date;
  diagnosticLogger?: (entry: MetaNormalizationDiagnosticLogEntry) => void;
  fetchLead: FetchClaimedMetaLead;
  store: MetaClaimProcessorStore;
};

type RetryClaimedMetaLeadOutcome = "retried" | "lease_lost" | "retry_exhausted";

type MetaNormalizationDiagnosticLogEntry = {
  acceptedEntryCount: number;
  category: "normalization_failed";
  discardedEntryCount: number;
  discardedEntryReasons: Record<string, number>;
  externalId: string;
  fieldDataShape: MetaGraphFieldDataDiagnostic["fieldDataShape"];
  formId?: string;
  receivedEntryCount: number;
  stage: "normalization";
};

export type MetaClaimProcessorStore = {
  claim(params: {
    leaseSeconds: number;
    limit: number;
    workerId: string;
  }): Promise<ClaimedMetaLeadEvent[]>;
  materialize(event: ClaimedMetaLeadEvent, now: string): Promise<boolean>;
  markEnriched(event: ClaimedMetaLeadEvent, normalizedPayload: Record<string, unknown>, now: string): Promise<boolean>;
  markFailed(event: ClaimedMetaLeadEvent, failure: ProcessorFailure, now: string): Promise<boolean>;
  retry(event: ClaimedMetaLeadEvent, reason: string, now: string): Promise<RetryClaimedMetaLeadOutcome>;
};

export type ProcessClaimedMetaLeadEventsResult = {
  claimedCount: number;
  failedCount: number;
  materializedCount: number;
  results: Array<{
    category?: string;
    eventId: string;
    outcome: "materialized" | "retry_scheduled" | "retry_exhausted" | "terminal_failure" | "lease_lost";
  }>;
};

export async function processClaimedMetaLeadEvents(params: {
  leaseSeconds?: number;
  limit?: number;
  supabase: LeadIngestionSupabaseClient;
  workerId: string;
}): Promise<ProcessClaimedMetaLeadEventsResult> {
  return processClaimedMetaLeadEventsWithDependencies(params, {
    clock: () => new Date(),
    fetchLead: fetchMetaLead,
    store: createMetaClaimProcessorStore(params.supabase),
  });
}

export function createMetaClaimProcessorForTesting(
  dependencies: MetaClaimProcessorDependencies,
) {
  return (params: {
    leaseSeconds?: number;
    limit?: number;
    workerId: string;
  }) => processClaimedMetaLeadEventsWithDependencies(params, dependencies);
}

async function processClaimedMetaLeadEventsWithDependencies(params: {
  leaseSeconds?: number;
  limit?: number;
  workerId: string;
}, dependencies: MetaClaimProcessorDependencies): Promise<ProcessClaimedMetaLeadEventsResult> {
  const workerId = params.workerId.trim();
  const limit = clampInteger(params.limit ?? 10, 1, 100);
  const leaseSeconds = clampInteger(params.leaseSeconds ?? 60, 10, 900);
  if (!workerId || workerId.length > 200) {
    throw new Error("A valid worker identifier is required.");
  }

  const claimed = await dependencies.store.claim({
    leaseSeconds,
    limit,
    workerId,
  });
  const results: ProcessClaimedMetaLeadEventsResult["results"] = [];

  for (const event of claimed) {
    try {
      if (event.status === "materialization_pending") {
        results.push(await materializeClaimedEvent(
          dependencies.store,
          event,
          dependencies.clock,
        ));
        continue;
      }

      const fetchLease = readLeaseSnapshot(event, dependencies.clock);

      if (!fetchLease) {
        results.push({ eventId: event.id, outcome: "lease_lost" });
        continue;
      }

      const graphResult = await dependencies.fetchLead(event.externalId, {
        timeoutMs: fetchLease.budgetMs,
      });

      if (!graphResult.ok) {
        results.push(await handleFailure(dependencies.store, event, {
          category: graphResult.category,
          message: graphResult.message,
          retryable: graphResult.retryable,
          stage: "graph_fetch",
        }, dependencies.clock));
        continue;
      }

      const enrichedInput = normalizeMetaGraphLead(graphResult.lead, event.sourcePayload);
      const normalizedPayload = normalizeLeadIngestionPayload(enrichedInput);

      if (!normalizedPayload.fullName) {
        emitNormalizationDiagnostic(
          dependencies.diagnosticLogger,
          event,
          graphResult.lead.fieldDataDiagnostic,
          graphResult.lead.formId,
        );
        results.push(await handleFailure(dependencies.store, event, {
          category: "normalization_failed",
          message: "Meta lead does not contain a valid name.",
          retryable: false,
          stage: "normalization",
        }, dependencies.clock));
        continue;
      }

      const transitionNow = readSafeLeaseTime(event, dependencies.clock);

      if (!transitionNow) {
        results.push({ eventId: event.id, outcome: "lease_lost" });
        continue;
      }

      const enriched = await dependencies.store.markEnriched(
        event,
        normalizedPayload,
        transitionNow,
      );

      if (!enriched) {
        results.push({ eventId: event.id, outcome: "lease_lost" });
        continue;
      }

      results.push(await materializeClaimedEvent(dependencies.store, {
        ...event,
        normalizedPayload,
        status: "materialization_pending",
      }, dependencies.clock));
    } catch (error) {
      try {
        results.push(await handleFailure(dependencies.store, event, {
          category: "processor_internal_failure",
          message: "Meta lead processing failed.",
          retryable: true,
          stage: event.status === "materialization_pending" ? "materialization" : "graph_fetch",
        }, dependencies.clock));
      } catch (handlingError) {
        if (handlingError instanceof MetaProcessorFailure) throw handlingError;
        if (error instanceof MetaProcessorFailure) throw error;
        throw handlingError;
      }
    }
  }

  return {
    claimedCount: claimed.length,
    failedCount: results.filter((result) => result.outcome !== "materialized").length,
    materializedCount: results.filter((result) => result.outcome === "materialized").length,
    results,
  };
}

export function createMetaClaimProcessorStore(
  supabase: LeadIngestionSupabaseClient,
): MetaClaimProcessorStore {
  return {
    async claim(params) {
      const { data, error } = await callSupabaseRpc(
        () => supabase.rpc("claim_lead_ingestion_events", {
          p_lease_seconds: params.leaseSeconds,
          p_limit: params.limit,
          p_worker_id: params.workerId,
        }),
        "claim",
      );

      if (error) {
        throw new MetaProcessorFailure(
          "processor_claim_rpc_failed",
          "claim",
          false,
        );
      }
      return Array.isArray(data) ? data.flatMap(mapClaimedEvent) : [];
    },

    async markEnriched(event, normalizedPayload) {
      const { data, error } = await callSupabaseRpc(
        () => supabase.rpc(
          "mark_meta_lead_ingestion_event_enriched",
          {
            p_claim_token: event.claimToken,
            p_event_id: event.id,
            p_normalized_payload: normalizedPayload,
          },
        ),
        "enrichment",
      );
      return !error && data === true;
    },

    async materialize(event) {
      const { data, error } = await callSupabaseRpc(
        () => supabase.rpc(
          "materialize_lead_ingestion_event_transaction",
          {
            p_claim_token: event.claimToken,
            p_event_id: event.id,
            p_target_lead_id: null,
          },
        ),
        "materialization",
      );
      return !error && Array.isArray(data) && data.length > 0;
    },

    async markFailed(event, failure) {
      const { data, error } = await callSupabaseRpc(
        () => supabase.rpc(
          "mark_meta_lead_ingestion_event_failed",
          {
            p_category: failure.category,
            p_claim_token: event.claimToken,
            p_event_id: event.id,
            p_message: failure.message,
            p_retryable: failure.retryable,
            p_stage: failure.stage,
          },
        ),
        "failure_recording",
      );
      return !error && data === true;
    },

    async retry(event, reason) {
      const { data, error } = await callSupabaseRpc(
        () => supabase.rpc("retry_lead_ingestion_event", {
          p_claim_token: event.claimToken,
          p_event_id: event.id,
          p_reason: reason,
        }),
        "retry",
      );
      if (error) return "lease_lost";
      return data === "retried" || data === "retry_exhausted"
        ? data
        : "lease_lost";
    },
  };
}

async function materializeClaimedEvent(
  store: MetaClaimProcessorStore,
  event: ClaimedMetaLeadEvent,
  clock: () => Date,
) {
  const now = readSafeLeaseTime(event, clock);
  if (!now) return { eventId: event.id, outcome: "lease_lost" as const };
  let materialized: boolean;
  try {
    materialized = await store.materialize(event, now);
  } catch (error) {
    if (error instanceof MetaProcessorFailure) throw error;
    throw new MetaProcessorFailure(
      "processor_materialization_failed",
      "materialization",
      true,
    );
  }
  if (materialized) return { eventId: event.id, outcome: "materialized" as const };
  return handleFailure(store, event, {
    category: "materialization_failed",
    message: "Meta lead materialization failed.",
    retryable: true,
    stage: "materialization",
  }, clock);
}

async function callSupabaseRpc<T>(
  operation: () => PromiseLike<{ data: T; error: unknown }>,
  stage: Exclude<MetaProcessorFailureStage, "configuration" | "client_initialization" | "unexpected">,
) {
  try {
    return await operation();
  } catch {
    throw new MetaProcessorFailure(
      "processor_supabase_transport_failed",
      stage,
      true,
    );
  }
}

async function handleFailure(
  store: MetaClaimProcessorStore,
  event: ClaimedMetaLeadEvent,
  failure: ProcessorFailure,
  clock: () => Date,
) {
  const now = readSafeLeaseTime(event, clock);
  if (!now) return { category: failure.category, eventId: event.id, outcome: "lease_lost" as const };
  const marked = await store.markFailed(event, failure, now);
  if (!marked) return { category: failure.category, eventId: event.id, outcome: "lease_lost" as const };

  if (failure.retryable) {
    const retryNow = readSafeLeaseTime(event, clock);
    if (!retryNow) return { category: failure.category, eventId: event.id, outcome: "lease_lost" as const };
    const retryOutcome = await store.retry(event, failure.category, retryNow);
    return {
      category: failure.category,
      eventId: event.id,
      outcome: retryOutcome === "retried"
        ? "retry_scheduled" as const
        : retryOutcome,
    };
  }

  return { category: failure.category, eventId: event.id, outcome: "terminal_failure" as const };
}

function emitNormalizationDiagnostic(
  logger: MetaClaimProcessorDependencies["diagnosticLogger"],
  event: ClaimedMetaLeadEvent,
  diagnostic: MetaGraphFieldDataDiagnostic | undefined,
  graphFormId: string | undefined,
) {
  const entry: MetaNormalizationDiagnosticLogEntry = {
    acceptedEntryCount: diagnostic?.acceptedEntryCount ?? 0,
    category: "normalization_failed",
    discardedEntryCount: diagnostic?.discardedEntryCount ?? 0,
    discardedEntryReasons: diagnostic?.discardedEntryReasons ?? {},
    externalId: event.externalId,
    fieldDataShape: diagnostic?.fieldDataShape ?? [],
    formId: graphFormId ?? normalizeText(event.sourcePayload.formId),
    receivedEntryCount: diagnostic?.receivedEntryCount ?? 0,
    stage: "normalization",
  };

  try {
    if (logger) {
      logger(entry);
      return;
    }

    console.info("[EVOLV meta lead ingestion]", entry);
  } catch {
    // Diagnostic logging must never change claim, retry or failure semantics.
  }
}

function mapClaimedEvent(value: unknown): ClaimedMetaLeadEvent[] {
  if (!isRecord(value)) return [];
  const status = value.status;
  const id = normalizeText(value.id);
  const externalId = normalizeText(value.external_id);
  const claimToken = normalizeText(value.claim_token);
  const claimExpiresAt = normalizeText(value.claim_expires_at);
  if ((status !== "fetch_pending" && status !== "materialization_pending") ||
    !id || !externalId || !claimToken || !claimExpiresAt) return [];
  return [{
    claimExpiresAt,
    claimToken,
    externalId,
    id,
    normalizedPayload: isRecord(value.normalized_payload) ? value.normalized_payload : {},
    sourcePayload: isRecord(value.source_payload) ? value.source_payload : {},
    status,
  }];
}

function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}

function readLeaseSnapshot(event: ClaimedMetaLeadEvent, clock: () => Date) {
  const now = clock();
  if (Number.isNaN(now.getTime())) throw new Error("A valid processing clock is required.");
  const remainingMs = new Date(event.claimExpiresAt).getTime() - now.getTime();
  const budgetMs = Math.floor(remainingMs - leaseSafetyMarginMs);
  return Number.isFinite(budgetMs) && budgetMs > 0
    ? { budgetMs, now: now.toISOString() }
    : null;
}

function readSafeLeaseTime(event: ClaimedMetaLeadEvent, clock: () => Date) {
  return readLeaseSnapshot(event, clock)?.now ?? null;
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
