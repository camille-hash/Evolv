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
