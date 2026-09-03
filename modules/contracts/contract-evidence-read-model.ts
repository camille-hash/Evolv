import type { ContractEvidenceSource, ContractEvidenceStatus, ContractEvidenceType } from "./contract-evidence-types";

export type { ContractEvidenceSource, ContractEvidenceStatus, ContractEvidenceType };

export type ContractEvidenceActorSummary={displayName:string};
export type ContractEvidenceLifecycleSummary={actor:ContractEvidenceActorSummary|null;at:string|null;reason:string|null};
export type ContractSignedEvidenceReadDetail={signatureMethod:string;documentVersion:string|null;providerName:string|null;providerReference:string|null;effectiveSignedAt:string;signatories:ReadonlyArray<Record<string,unknown>>};
export type ContractFirstInstallmentReadDetail={administratorId:string;billingReference:string;amountCents:number;currency:"BRL";dueAt:string;paidAt:string;confirmationReference:string|null};
export type ContractPatrionReceiptReadDetail={expectedRevenueEntryId:string|null;amountCents:number;currency:"BRL";receivedAt:string;receiptReference:string|null;competenceDate:string;attributableAmountCents:number};

type ContractEvidenceReadBase={evidenceId:string;status:ContractEvidenceStatus;source:ContractEvidenceSource;eventAt:string;recordedAt:string;validatedAt:string|null;reference:string|null;hasDocument:boolean;canDownloadDocument:boolean;documentDownloadPath:string|null;mediaType:string|null;fileSize:number|null;supersedesEvidenceId:string|null;supersededByEvidenceId:string|null;isCurrent:boolean;isValidated:boolean;recordedByDisplayName:string|null;validatedByDisplayName:string|null;invalidatedByDisplayName:string|null;supersededByDisplayName:string|null;invalidationReason:string|null;supersessionReason:string|null;invalidatedAt:string|null;supersededAt:string|null};
export type ContractEvidenceReadModel=
  | (ContractEvidenceReadBase&{type:"signed_contract";detail:ContractSignedEvidenceReadDetail})
  | (ContractEvidenceReadBase&{type:"first_installment_payment";detail:ContractFirstInstallmentReadDetail})
  | (ContractEvidenceReadBase&{type:"patrion_commission_receipt";detail:ContractPatrionReceiptReadDetail});

export type ContractEvidenceVisualState="pending"|"awaiting_validation"|"validated"|"invalidated"|"superseded"|"reserved";
export type ContractEvidenceVersion=ContractEvidenceReadModel;
export type ContractEvidenceLineage={current:ContractEvidenceVersion|null;history:ContractEvidenceVersion[];versions:ContractEvidenceVersion[]};
export type ContractEvidenceRequirement={type:ContractEvidenceType;label:string;description:string;state:ContractEvidenceVisualState;lineage:ContractEvidenceLineage;reserved:boolean};
export type ContractEvidenceCapabilities={canWriteEvidence:boolean};
export type ContractEvidenceListResponse={evidences:ContractEvidenceReadModel[];capabilities:ContractEvidenceCapabilities};
