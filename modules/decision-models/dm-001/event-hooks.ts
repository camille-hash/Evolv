import type {
  Dm001IgnoredRecalculationReason,
  Dm001RecalculationReason,
  RecalculateDm001ForLeadResult,
} from "./recalculation-pipeline.ts";
import { recalculateDm001ForLeadServerSide } from "./recalculation-pipeline.ts";

export type Dm001CrmRecalculationReason =
  | Dm001RecalculationReason
  | Dm001IgnoredRecalculationReason;

export type TriggerDm001RecalculationInput = {
  accessToken: string | null;
  leadId: string;
  reason: Dm001CrmRecalculationReason;
  requestedAt?: string;
};

export type TriggerDm001RecalculationRunner = (
  input: TriggerDm001RecalculationInput,
) => Promise<RecalculateDm001ForLeadResult>;

export async function triggerDm001RecalculationAfterCrmEvent(
  input: TriggerDm001RecalculationInput,
  runner: TriggerDm001RecalculationRunner = defaultDm001RecalculationRunner,
): Promise<void> {
  try {
    await runner(input);
  } catch (error) {
    console.warn("[DM-001] Recalculation failed after CRM event.", {
      leadId: input.leadId,
      reason: input.reason,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function defaultDm001RecalculationRunner(
  input: TriggerDm001RecalculationInput,
) {
  return recalculateDm001ForLeadServerSide(input.accessToken, input.leadId, {
    reason: input.reason,
    requestedAt: input.requestedAt,
  });
}
