import type { CommercialProposalSnapshotAuthority } from "../commercial-proposals/snapshot-v1";
import type { Contract } from "./types";

export type ContractMaterializationRow = {
  id: string; organization_id: string; source_root_proposal_id: string; source_proposal_version_id: string;
  source_proposal_number: string; source_proposal_version: number; source_simulation_id: string; lead_id: string; client_id: string;
  snapshot_schema_version: "commercial-proposal/v1"; snapshot_authority: Extract<CommercialProposalSnapshotAuthority,"server_derived"|"server_verified">;
  commercial_terms_hash: string; composition_hash: string; materialized_snapshot: Record<string,unknown>;
  item_count: number; total_credit_amount: number|string; idempotency_key: string|null; created_by: string; created_at: string;
};
export type ContractMaterialization = {
  id:string; organizationId:string; sourceRootProposalId:string; sourceProposalVersionId:string; sourceProposalNumber:string;
  sourceProposalVersion:number; sourceSimulationId:string; leadId:string; clientId:string; snapshotSchemaVersion:"commercial-proposal/v1";
  snapshotAuthority:"server_derived"|"server_verified"; commercialTermsHash:string; compositionHash:string;
  materializedSnapshot:Record<string,unknown>; itemCount:number; totalCreditAmount:number; idempotencyKey:string|null; createdBy:string; createdAt:string;
};
export type ContractMaterializationWithContracts = ContractMaterialization & { contracts: Contract[] };

export type MaterializationOutcome = "created" | "already_created";
export type ContractMaterializationResult = {
  outcome: MaterializationOutcome;
  materialization: ContractMaterializationRow;
  contracts: Array<Record<string, unknown>>;
};
export type MaterializationErrorCode =
  | "MAT_AUTH_REQUIRED" | "MAT_ACTOR_FORBIDDEN" | "MAT_PROPOSAL_NOT_FOUND"
  | "MAT_VERSION_NOT_CURRENT" | "MAT_PROPOSAL_NOT_APPROVED" | "MAT_APPROVAL_REVOKED"
  | "MAT_ALREADY_MATERIALIZED_CONFLICT" | "MAT_IDEMPOTENCY_CONFLICT"
  | "MAT_SIMULATION_REQUIRED" | "MAT_SIMULATION_MISMATCH"
  | "MAT_SNAPSHOT_SCHEMA_UNSUPPORTED" | "MAT_SNAPSHOT_AUTHORITY_INSUFFICIENT"
  | "MAT_SNAPSHOT_INVALID" | "MAT_SNAPSHOT_HASH_MISMATCH" | "MAT_COMPOSITION_INVALID"
  | "MAT_CLIENT_NOT_FOUND" | "MAT_CLIENT_INELIGIBLE"
  | "MAT_ADMINISTRATOR_REFERENCE_REQUIRED" | "MAT_ADMINISTRATOR_REFERENCE_INVALID"
  | "MAT_CONTRACT_FIELDS_INCOMPLETE" | "MAT_CHILD_COUNT_MISMATCH"
  | "MAT_CHILD_CREDIT_MISMATCH" | "MAT_EXISTING_MATERIALIZATION_INCONSISTENT"
  | "MAT_LINEAGE_LOCKED_BY_MATERIALIZATION" | "MAT_INTERNAL_ERROR";
