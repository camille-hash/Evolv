export type ContractEvidenceType =
  | "signed_contract"
  | "first_installment_payment"
  | "patrion_commission_receipt";

export type ContractEvidenceStatus =
  | "recorded"
  | "validated"
  | "invalidated"
  | "superseded";

export type ContractEvidenceSource =
  | "manual"
  | "rpa"
  | "administrator_integration"
  | "webhook";

export type ContractEvidenceValidity =
  | "awaiting_validation"
  | "current"
  | "invalidated"
  | "superseded";

export type ContractEvidenceFileReference = {
  storageBucket: string;
  storageObjectPath: string;
  contentSha256: string;
  mediaType: string;
  fileSize: number;
};

export type ContractEvidence = {
  id: string;
  organizationId: string;
  contractId: string;
  evidenceType: ContractEvidenceType;
  status: ContractEvidenceStatus;
  source: ContractEvidenceSource;
  externalReference: string | null;
  eventAt: string;
  recordedAt: string;
  recordedBy: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  file: ContractEvidenceFileReference | null;
  correlationId: string;
  idempotencyKey: string;
  schemaVersion: 1;
  supersedesEvidenceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ContractSignedEvidenceDetails = {
  signatureMethod: string;
  documentVersion: string | null;
  providerName: string | null;
  providerReference: string | null;
  effectiveSignedAt: string;
  signatories: ReadonlyArray<Record<string, unknown>>;
};

export type ContractFirstInstallmentPaymentEvidenceDetails = {
  administratorId: string;
  billingReference: string;
  amountCents: number;
  currency: "BRL";
  dueAt: string;
  paidAt: string;
  confirmationReference: string | null;
};

export type ContractPatrionReceiptEvidenceDetails = {
  expectedRevenueEntryId: string | null;
  amountCents: number;
  currency: "BRL";
  receivedAt: string;
  receiptReference: string | null;
  competenceDate: string;
  attributableAmountCents: number;
};

export type ContractEvidenceView =
  | (ContractEvidence & {
      evidenceType: "signed_contract";
      details: ContractSignedEvidenceDetails;
    })
  | (ContractEvidence & {
      evidenceType: "first_installment_payment";
      details: ContractFirstInstallmentPaymentEvidenceDetails;
    })
  | (ContractEvidence & {
      evidenceType: "patrion_commission_receipt";
      details: ContractPatrionReceiptEvidenceDetails;
    });

export function getContractEvidenceValidity(
  status: ContractEvidenceStatus,
): ContractEvidenceValidity {
  switch (status) {
    case "recorded":
      return "awaiting_validation";
    case "validated":
      return "current";
    case "invalidated":
      return "invalidated";
    case "superseded":
      return "superseded";
  }
}
