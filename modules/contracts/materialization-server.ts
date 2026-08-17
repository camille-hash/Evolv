import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { MaterializeApprovedCommercialProposalInput } from "./materialization-command";
import type { ContractMaterializationResult, MaterializationErrorCode } from "./materialization-types";

const statuses: Record<MaterializationErrorCode, number> = {
  MAT_AUTH_REQUIRED: 401, MAT_ACTOR_FORBIDDEN: 403, MAT_PROPOSAL_NOT_FOUND: 404,
  MAT_CLIENT_NOT_FOUND: 404, MAT_VERSION_NOT_CURRENT: 409, MAT_PROPOSAL_NOT_APPROVED: 409,
  MAT_APPROVAL_REVOKED: 409, MAT_ALREADY_MATERIALIZED_CONFLICT: 409,
  MAT_IDEMPOTENCY_CONFLICT: 409, MAT_SIMULATION_REQUIRED: 422,
  MAT_SIMULATION_MISMATCH: 422, MAT_SNAPSHOT_SCHEMA_UNSUPPORTED: 422,
  MAT_SNAPSHOT_AUTHORITY_INSUFFICIENT: 422, MAT_SNAPSHOT_INVALID: 422,
  MAT_SNAPSHOT_HASH_MISMATCH: 422, MAT_COMPOSITION_INVALID: 422,
  MAT_CLIENT_INELIGIBLE: 422, MAT_ADMINISTRATOR_REFERENCE_REQUIRED: 422,
  MAT_ADMINISTRATOR_REFERENCE_INVALID: 422, MAT_CONTRACT_FIELDS_INCOMPLETE: 422,
  MAT_CHILD_COUNT_MISMATCH: 500, MAT_CHILD_CREDIT_MISMATCH: 500,
  MAT_EXISTING_MATERIALIZATION_INCONSISTENT: 409,
  MAT_LINEAGE_LOCKED_BY_MATERIALIZATION: 409, MAT_INTERNAL_ERROR: 500,
};

export async function materializeApprovedCommercialProposal(
  accessToken: string | null,
  input: MaterializeApprovedCommercialProposalInput,
) {
  if (!accessToken) return failure("MAT_AUTH_REQUIRED");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return failure("MAT_INTERNAL_ERROR");
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await supabase.rpc("materialize_approved_commercial_proposal_transaction", {
    p_client_id: input.clientId,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_proposal_version_id: input.proposalVersionId,
  });
  if (error) return failure(readCode(error.message));
  return { ok: true as const, result: data as ContractMaterializationResult };
}

function readCode(message: string): MaterializationErrorCode {
  return (Object.keys(statuses) as MaterializationErrorCode[]).find((code) => message.includes(code)) ?? "MAT_INTERNAL_ERROR";
}
function failure(code: MaterializationErrorCode) {
  return { ok: false as const, code, error: code, status: statuses[code] };
}
