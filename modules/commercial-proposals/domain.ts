import type {
  CommercialProposalAssembly,
  CommercialProposalSnapshot,
  CommercialProposalStatus,
} from "./types";

const allowedTransitions: Record<CommercialProposalStatus, CommercialProposalStatus[]> = {
  approved: ["superseded"],
  draft: ["generated", "superseded"],
  expired: [],
  generated: ["presented", "approved", "rejected", "expired", "superseded"],
  presented: ["approved", "rejected", "expired", "superseded"],
  rejected: [],
  saved: ["generated", "presented", "approved", "rejected", "superseded"],
  superseded: [],
};

const immutableSnapshotStatuses: CommercialProposalStatus[] = [
  "approved",
  "rejected",
  "expired",
  "superseded",
];

export function assertCommercialProposalTransition(
  currentStatus: CommercialProposalStatus,
  nextStatus: CommercialProposalStatus,
) {
  if (currentStatus === nextStatus) {
    return;
  }

  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    throw new Error(
      `Transicao de proposta invalida: ${currentStatus} para ${nextStatus}.`,
    );
  }
}

export function assertCommercialProposalSnapshotIsMutable(
  status: CommercialProposalStatus,
) {
  if (immutableSnapshotStatuses.includes(status)) {
    throw new Error(
      "Snapshots de propostas historicas ou aprovadas nao podem ser alterados.",
    );
  }
}

export function assertCommercialProposalApprovalEligibility(
  status: CommercialProposalStatus,
) {
  if (status !== "generated" && status !== "presented" && status !== "saved") {
    throw new Error(
      `Proposta comercial nao pode ser aprovada a partir do status ${status}.`,
    );
  }
}

export function assertNoApprovedCommercialProposalVersion(input: {
  approvedVersionId: string | null;
}) {
  if (input.approvedVersionId) {
    throw new Error("A linhagem da proposta ja possui uma versao aprovada.");
  }
}

export function calculateNextCommercialProposalVersion(versions: number[]) {
  const latestVersion = versions.reduce((latest, version) => {
    if (!Number.isInteger(version) || version < 1) {
      return latest;
    }

    return Math.max(latest, version);
  }, 0);

  return latestVersion + 1;
}

export function buildCanonicalCommercialProposalRoot(proposalId: string) {
  if (!proposalId.trim()) {
    throw new Error("A proposta precisa de um identificador canonico.");
  }

  return {
    id: proposalId,
    rootProposalId: proposalId,
  };
}

export function requireCanonicalCommercialProposalRoot(input: {
  id: string;
  rootProposalId: string;
}) {
  if (!input.rootProposalId.trim()) {
    throw new Error("A proposta anterior nao possui raiz canonica.");
  }

  return input.rootProposalId;
}

export function shouldRequireCommercialProposalSimulationId(input: {
  metadata?: CommercialProposalSnapshot | null;
  status?: CommercialProposalStatus;
}) {
  const savedFrom = input.metadata?.savedFrom;

  return (
    savedFrom === "simulator_anchored_proposal" ||
    savedFrom === "commercial_proposal_editor" ||
    savedFrom === "multi_cotas"
  );
}

export function buildCommercialProposalStatusUpdatePayload(input: {
  actorId: string;
  nextStatus: CommercialProposalStatus;
  occurredAt: string;
}) {
  const payload: Record<string, unknown> = {
    status: input.nextStatus,
  };

  if (input.nextStatus === "presented") {
    payload.presented_at = input.occurredAt;
  }

  if (input.nextStatus === "approved") {
    payload.approved_at = input.occurredAt;
    payload.approved_by = input.actorId;
  }

  if (input.nextStatus === "rejected") {
    payload.rejected_at = input.occurredAt;
    payload.rejected_by = input.actorId;
  }

  if (input.nextStatus === "expired") {
    payload.expired_at = input.occurredAt;
  }

  if (input.nextStatus === "superseded") {
    payload.superseded_at = input.occurredAt;
    payload.superseded_by = input.actorId;
  }

  return payload;
}

export function calculateNextAssemblyDate(input: {
  dayOfMonth: number;
  referenceDate: Date;
}) {
  const year = input.referenceDate.getUTCFullYear();
  const month = input.referenceDate.getUTCMonth();
  const currentMonthDate = buildClampedUtcDate(year, month, input.dayOfMonth);
  const referenceDay = buildUtcDay(input.referenceDate);

  if (currentMonthDate.getTime() >= referenceDay.getTime()) {
    return toDateOnly(currentMonthDate);
  }

  return toDateOnly(buildClampedUtcDate(year, month + 1, input.dayOfMonth));
}

export function normalizeCommercialProposalAssembly(
  input: Partial<CommercialProposalAssembly> | null | undefined,
  referenceDate = new Date(),
): CommercialProposalAssembly {
  const dayOfMonth = normalizeAssemblyDay(input?.dayOfMonth);
  const suggestedNextAssemblyDate =
    normalizeDateOnly(input?.suggestedNextAssemblyDate) ??
    (dayOfMonth
      ? calculateNextAssemblyDate({ dayOfMonth, referenceDate })
      : null);
  const effectiveNextAssemblyDate =
    normalizeDateOnly(input?.effectiveNextAssemblyDate) ??
    suggestedNextAssemblyDate;

  return {
    dayOfMonth,
    effectiveNextAssemblyDate,
    source:
      input?.source === "manual" || input?.source === "calculated"
        ? input.source
        : dayOfMonth
          ? "calculated"
          : null,
    suggestedNextAssemblyDate,
  };
}

function normalizeAssemblyDay(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  if (value < 1 || value > 31) {
    return null;
  }

  return value;
}

function normalizeDateOnly(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function buildClampedUtcDate(year: number, month: number, dayOfMonth: number) {
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(dayOfMonth, lastDayOfMonth)));
}

function buildUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
