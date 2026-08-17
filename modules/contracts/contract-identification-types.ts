import type { Contract } from "./types";
export type ContractIdentificationOutcome="completed"|"corrected"|"unchanged";
export type CompleteDraftContractIdentificationResult={outcome:ContractIdentificationOutcome;contract:Contract;auditEventId:string|null};
export type ContractIdentificationErrorCode="CID_AUTH_REQUIRED"|"CID_ACTOR_FORBIDDEN"|"CID_CONTRACT_NOT_FOUND"|"CID_NOT_MATERIALIZED"|"CID_INVALID_PAYLOAD"|"CID_NO_FIELDS"|"CID_NUMBER_INVALID"|"CID_QUOTA_INVALID"|"CID_REASON_REQUIRED"|"CID_STATUS_NOT_ALLOWED"|"CID_NUMBER_CONFLICT"|"CID_QUOTA_CONFLICT"|"CID_CROSS_TENANT_REFERENCE"|"CID_MATERIALIZATION_INCONSISTENT"|"CID_INTERNAL_ERROR";
