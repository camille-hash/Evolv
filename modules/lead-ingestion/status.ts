import type { LeadIngestionStatus } from "./types.ts";

const validLeadIngestionTransitions: Record<
  LeadIngestionStatus,
  readonly LeadIngestionStatus[]
> = {
  duplicate: [],
  fetch_failed: ["fetch_pending", "materialization_pending", "rejected", "retry_exhausted"],
  fetch_pending: ["fetch_failed", "materialization_pending", "rejected"],
  materialization_pending: ["duplicate", "materialized", "rejected", "retry_exhausted"],
  materialized: [],
  received: ["fetch_pending", "materialization_pending", "rejected"],
  rejected: ["fetch_pending", "materialization_pending", "retry_exhausted"],
  retry_exhausted: ["fetch_pending", "materialization_pending"],
};

export function canTransitionLeadIngestionStatus(
  from: LeadIngestionStatus,
  to: LeadIngestionStatus,
) {
  if (from === to) {
    return true;
  }

  return validLeadIngestionTransitions[from].includes(to);
}

export function assertLeadIngestionStatusTransition(
  from: LeadIngestionStatus,
  to: LeadIngestionStatus,
) {
  if (!canTransitionLeadIngestionStatus(from, to)) {
    throw new Error(`Transicao de ingestao invalida: ${from} -> ${to}.`);
  }
}

export function isLeadIngestionStatus(value: unknown): value is LeadIngestionStatus {
  return (
    value === "received" ||
    value === "fetch_pending" ||
    value === "fetch_failed" ||
    value === "materialization_pending" ||
    value === "materialized" ||
    value === "duplicate" ||
    value === "rejected" ||
    value === "retry_exhausted"
  );
}
