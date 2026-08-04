import type { LeadIngestionStatus } from "./types.ts";

const validLeadIngestionTransitions: Record<
  LeadIngestionStatus,
  readonly LeadIngestionStatus[]
> = {
  fetch_pending: ["processing", "materialization_pending", "review_required", "processing_failed", "rejected", "integrity_conflict"],
  integrity_conflict: [],
  materialization_pending: ["processing", "materialized", "processing_failed", "integrity_conflict"],
  materialized: [],
  processing: ["fetch_pending", "materialization_pending", "review_required", "processing_failed", "rejected", "integrity_conflict", "materialized"],
  processing_failed: ["fetch_pending", "materialization_pending", "retry_exhausted"],
  received: ["tenant_unresolved", "fetch_pending", "rejected", "integrity_conflict"],
  rejected: [],
  review_required: ["materialization_pending", "rejected", "integrity_conflict"],
  retry_exhausted: ["fetch_pending", "materialization_pending"],
  tenant_unresolved: ["fetch_pending", "integrity_conflict"],
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
    value === "tenant_unresolved" ||
    value === "fetch_pending" ||
    value === "processing" ||
    value === "materialization_pending" ||
    value === "review_required" ||
    value === "processing_failed" ||
    value === "integrity_conflict" ||
    value === "materialized" ||
    value === "rejected" ||
    value === "retry_exhausted"
  );
}
