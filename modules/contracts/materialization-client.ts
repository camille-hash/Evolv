import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type { MaterializeApprovedCommercialProposalInput } from "./materialization-command";
import type { ContractMaterializationResult } from "./materialization-types";

export class MaterializationRequestError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
    this.name = "MaterializationRequestError";
  }
}

export function createMaterializationIdempotencyKey(proposalVersionId: string) {
  return `c7:${proposalVersionId}:${crypto.randomUUID()}`;
}

export async function materializeApprovedCommercialProposal(
  accessToken: string | null | undefined,
  input: MaterializeApprovedCommercialProposalInput,
): Promise<ContractMaterializationResult> {
  const token = accessToken ?? await requireSupabaseAccessToken("Sessao invalida para materializar contratos.");
  const response = await fetch("/api/contracts/materialize-approved-proposal", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => null) as { result?: ContractMaterializationResult; error?: string } | null;
  if (!response.ok || !payload?.result) {
    throw new MaterializationRequestError(
      payload?.error ?? "MAT_INTERNAL_ERROR",
      response.status,
    );
  }
  return payload.result;
}
