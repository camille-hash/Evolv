import type {
  CrmLeadDualPipelineSource,
  RevenueRecognitionSnapshot,
} from "./types";

export function buildRevenueRecognitionSnapshot(
  lead: CrmLeadDualPipelineSource,
) {
  const firstInvoicePaid = lead.firstInvoicePaid === true;
  const firstInvoicePaidAt = lead.firstInvoicePaidAt ?? null;
  const salesClosedAt = lead.salesClosedAt ?? null;
  const legacyClosedAt = lead.closedAt ?? null;
  const legacyMarkedAsWon =
    lead.status === "ganha" || Boolean(legacyClosedAt) || Boolean(salesClosedAt);

  return {
    leadId: lead.id,
    status: resolveRevenueRecognitionStatus({
      firstInvoicePaid,
      firstInvoicePaidAt,
      legacyMarkedAsWon,
    }),
    firstInvoicePaid,
    firstInvoicePaidAt,
    salesClosedAt,
    legacyClosedAt,
    requiresExplicitConfirmation: !firstInvoicePaid && legacyMarkedAsWon,
  } satisfies RevenueRecognitionSnapshot;
}

function resolveRevenueRecognitionStatus(input: {
  firstInvoicePaid: boolean;
  firstInvoicePaidAt: string | null;
  legacyMarkedAsWon: boolean;
}): RevenueRecognitionSnapshot["status"] {
  if (input.firstInvoicePaid || input.firstInvoicePaidAt) {
    return "recognized";
  }

  if (input.legacyMarkedAsWon) {
    return "legacy_closed_without_invoice_confirmation";
  }

  return "not_started";
}
