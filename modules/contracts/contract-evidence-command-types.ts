import type {
  ContractEvidenceFileReference,
  ContractEvidenceType,
  ContractFirstInstallmentPaymentEvidenceDetails,
  ContractPatrionReceiptEvidenceDetails,
  ContractSignedEvidenceDetails,
} from "./contract-evidence-types";

export type ContractEvidenceCommandType =
  | "record_manual_evidence"
  | "validate_evidence"
  | "invalidate_evidence"
  | "supersede_evidence";

export type ContractEvidenceCommandOutcome = "completed" | "already_completed";

export type ContractEvidenceCommandResult = {
  outcome: ContractEvidenceCommandOutcome;
  commandId: string;
  evidenceId: string;
  contractId: string;
  status: "recorded" | "validated" | "invalidated";
  auditEventId?: string;
  supersededEvidenceId?: string;
  supersededAuditEventId?: string;
  recordedAuditEventId?: string;
};

export type ContractEvidenceCommandErrorCode =
  | "CE_INVALID_PAYLOAD"
  | "CE_ACTOR_FORBIDDEN"
  | "CE_CONTRACT_NOT_FOUND"
  | "CE_EVIDENCE_NOT_FOUND"
  | "CE_CROSS_TENANT_REFERENCE"
  | "CE_EVIDENCE_TYPE_INVALID"
  | "CE_EVIDENCE_DETAIL_INVALID"
  | "CE_EVIDENCE_SOURCE_REFERENCE_REQUIRED"
  | "CE_EVIDENCE_ALREADY_VALIDATED"
  | "CE_EVIDENCE_NOT_VALIDATABLE"
  | "CE_EVIDENCE_NOT_INVALIDATABLE"
  | "CE_EVIDENCE_NOT_SUPERSEDABLE"
  | "CE_VALIDATED_EVIDENCE_CONFLICT"
  | "CE_IDEMPOTENCY_CONFLICT"
  | "CE_DUPLICATE_REFERENCE"
  | "CE_REASON_REQUIRED"
  | "CE_INTEGRITY_ERROR";

export const contractEvidenceCommandErrorHttpStatus: Record<
  ContractEvidenceCommandErrorCode,
  400 | 403 | 404 | 409 | 422
> = {
  CE_INVALID_PAYLOAD: 400,
  CE_ACTOR_FORBIDDEN: 403,
  CE_CONTRACT_NOT_FOUND: 404,
  CE_EVIDENCE_NOT_FOUND: 404,
  CE_CROSS_TENANT_REFERENCE: 422,
  CE_EVIDENCE_TYPE_INVALID: 400,
  CE_EVIDENCE_DETAIL_INVALID: 422,
  CE_EVIDENCE_SOURCE_REFERENCE_REQUIRED: 422,
  CE_EVIDENCE_ALREADY_VALIDATED: 409,
  CE_EVIDENCE_NOT_VALIDATABLE: 409,
  CE_EVIDENCE_NOT_INVALIDATABLE: 409,
  CE_EVIDENCE_NOT_SUPERSEDABLE: 409,
  CE_VALIDATED_EVIDENCE_CONFLICT: 409,
  CE_IDEMPOTENCY_CONFLICT: 409,
  CE_DUPLICATE_REFERENCE: 409,
  CE_REASON_REQUIRED: 422,
  CE_INTEGRITY_ERROR: 409,
};

type EvidenceDetailByType = {
  signed_contract: ContractSignedEvidenceDetails;
  first_installment_payment: ContractFirstInstallmentPaymentEvidenceDetails;
  patrion_commission_receipt: ContractPatrionReceiptEvidenceDetails;
};

export type RecordManualContractEvidenceCommand = {
  [Type in ContractEvidenceType]: {
    actorId: string;
    contractId: string;
    evidenceType: Type;
    idempotencyKey: string;
    correlationId: string;
    eventAt: string;
    externalReference: string | null;
    file: ContractEvidenceFileReference | null;
    detail: EvidenceDetailByType[Type];
  };
}[ContractEvidenceType];

export type ValidateContractEvidenceCommand = {
  actorId: string;
  evidenceId: string;
  idempotencyKey: string;
  correlationId: string;
  reason: string | null;
};

export type InvalidateContractEvidenceCommand = Omit<
  ValidateContractEvidenceCommand,
  "reason"
> & { reason: string };

export type SupersedeContractEvidenceCommand = Omit<
  RecordManualContractEvidenceCommand,
  "contractId" | "evidenceType"
> & {
  evidenceId: string;
  reason: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

export class ContractEvidenceCommandParseError extends Error {
  readonly code: ContractEvidenceCommandErrorCode;

  constructor(code: ContractEvidenceCommandErrorCode) {
    super(code);
    this.name = "ContractEvidenceCommandParseError";
    this.code = code;
  }
}

function requireObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractEvidenceCommandParseError("CE_INVALID_PAYLOAD");
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new ContractEvidenceCommandParseError("CE_INVALID_PAYLOAD");
  }
}

function requireUuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ContractEvidenceCommandParseError("CE_INVALID_PAYLOAD");
  }
  return value;
}

function requireIdempotencyKey(value: unknown): string {
  if (typeof value !== "string" || !IDEMPOTENCY_PATTERN.test(value)) {
    throw new ContractEvidenceCommandParseError("CE_INVALID_PAYLOAD");
  }
  return value;
}

function requireTimestamp(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || Number.isNaN(Date.parse(value))) {
    throw new ContractEvidenceCommandParseError("CE_INVALID_PAYLOAD");
  }
  return value;
}

function optionalTrimmedString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new ContractEvidenceCommandParseError("CE_INVALID_PAYLOAD");
  }
  return value.trim();
}

function requireReason(value: unknown): string {
  const reason = optionalTrimmedString(value);
  if (!reason || reason.length > 1000) {
    throw new ContractEvidenceCommandParseError("CE_REASON_REQUIRED");
  }
  return reason;
}

function parseFile(value: unknown): ContractEvidenceFileReference | null {
  if (value === null || value === undefined) return null;
  const file = requireObject(value);
  requireExactKeys(file, [
    "storageBucket",
    "storageObjectPath",
    "contentSha256",
    "mediaType",
    "fileSize",
  ]);
  const storageBucket = optionalTrimmedString(file.storageBucket);
  const storageObjectPath = optionalTrimmedString(file.storageObjectPath);
  const mediaType = optionalTrimmedString(file.mediaType);
  if (
    !storageBucket ||
    !storageObjectPath ||
    !mediaType ||
    typeof file.contentSha256 !== "string" ||
    !SHA256_PATTERN.test(file.contentSha256) ||
    typeof file.fileSize !== "number" ||
    !Number.isSafeInteger(file.fileSize) ||
    file.fileSize <= 0
  ) {
    throw new ContractEvidenceCommandParseError("CE_INVALID_PAYLOAD");
  }
  return {
    storageBucket,
    storageObjectPath,
    contentSha256: file.contentSha256.toLowerCase(),
    mediaType,
    fileSize: file.fileSize,
  };
}

function requirePositiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new ContractEvidenceCommandParseError("CE_EVIDENCE_DETAIL_INVALID");
  }
  return value;
}

function parseDetail(
  evidenceType: ContractEvidenceType,
  value: unknown,
): EvidenceDetailByType[ContractEvidenceType] {
  const detail = requireObject(value);
  if (evidenceType === "signed_contract") {
    requireExactKeys(detail, [
      "signatureMethod", "documentVersion", "providerName", "providerReference",
      "effectiveSignedAt", "signatories",
    ]);
    const signatureMethod = optionalTrimmedString(detail.signatureMethod);
    if (!signatureMethod || !Array.isArray(detail.signatories) || detail.signatories.length === 0
      || detail.signatories.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
      throw new ContractEvidenceCommandParseError("CE_EVIDENCE_DETAIL_INVALID");
    }
    return {
      signatureMethod,
      documentVersion: optionalTrimmedString(detail.documentVersion),
      providerName: optionalTrimmedString(detail.providerName),
      providerReference: optionalTrimmedString(detail.providerReference),
      effectiveSignedAt: requireTimestamp(detail.effectiveSignedAt),
      signatories: detail.signatories as Array<Record<string, unknown>>,
    };
  }
  if (evidenceType === "first_installment_payment") {
    requireExactKeys(detail, [
      "administratorId", "billingReference", "amountCents", "currency",
      "dueAt", "paidAt", "confirmationReference",
    ]);
    const billingReference = optionalTrimmedString(detail.billingReference);
    if (!billingReference || detail.currency !== "BRL") {
      throw new ContractEvidenceCommandParseError("CE_EVIDENCE_DETAIL_INVALID");
    }
    return {
      administratorId: requireUuid(detail.administratorId),
      billingReference,
      amountCents: requirePositiveInteger(detail.amountCents),
      currency: "BRL",
      dueAt: requireTimestamp(detail.dueAt),
      paidAt: requireTimestamp(detail.paidAt),
      confirmationReference: optionalTrimmedString(detail.confirmationReference),
    };
  }
  requireExactKeys(detail, [
    "expectedRevenueEntryId", "amountCents", "currency", "receivedAt",
    "receiptReference", "competenceDate", "attributableAmountCents",
  ]);
  if (detail.currency !== "BRL") {
    throw new ContractEvidenceCommandParseError("CE_EVIDENCE_DETAIL_INVALID");
  }
  return {
    expectedRevenueEntryId: detail.expectedRevenueEntryId === null
      ? null
      : requireUuid(detail.expectedRevenueEntryId),
    amountCents: requirePositiveInteger(detail.amountCents),
    currency: "BRL",
    receivedAt: requireTimestamp(detail.receivedAt),
    receiptReference: optionalTrimmedString(detail.receiptReference),
    competenceDate: requireTimestamp(`${String(detail.competenceDate)}T00:00:00Z`).slice(0, 10),
    attributableAmountCents: requirePositiveInteger(detail.attributableAmountCents),
  };
}

export function parseRecordManualContractEvidenceCommand(
  input: unknown,
): RecordManualContractEvidenceCommand {
  const value = requireObject(input);
  requireExactKeys(value, [
    "actorId", "contractId", "evidenceType", "idempotencyKey", "correlationId",
    "eventAt", "externalReference", "file", "detail",
  ]);
  if (![
    "signed_contract", "first_installment_payment", "patrion_commission_receipt",
  ].includes(String(value.evidenceType))) {
    throw new ContractEvidenceCommandParseError("CE_EVIDENCE_TYPE_INVALID");
  }
  const evidenceType = value.evidenceType as ContractEvidenceType;
  const eventAt = requireTimestamp(value.eventAt);
  const file = parseFile(value.file);
  const externalReference = optionalTrimmedString(value.externalReference);
  const detail = parseDetail(evidenceType, value.detail);
  if (evidenceType === "signed_contract" && !externalReference && !file) {
    throw new ContractEvidenceCommandParseError("CE_EVIDENCE_SOURCE_REFERENCE_REQUIRED");
  }
  if (Date.parse(detailDate(evidenceType, detail)) !== Date.parse(eventAt)) {
    throw new ContractEvidenceCommandParseError("CE_EVIDENCE_DETAIL_INVALID");
  }
  return {
    actorId: requireUuid(value.actorId),
    contractId: requireUuid(value.contractId),
    evidenceType,
    idempotencyKey: requireIdempotencyKey(value.idempotencyKey),
    correlationId: requireUuid(value.correlationId),
    eventAt,
    externalReference,
    file,
    detail,
  } as RecordManualContractEvidenceCommand;
}

function detailDate(
  evidenceType: ContractEvidenceType,
  detail: EvidenceDetailByType[ContractEvidenceType],
): string {
  if (evidenceType === "signed_contract") {
    return (detail as ContractSignedEvidenceDetails).effectiveSignedAt;
  }
  if (evidenceType === "first_installment_payment") {
    return (detail as ContractFirstInstallmentPaymentEvidenceDetails).paidAt;
  }
  return (detail as ContractPatrionReceiptEvidenceDetails).receivedAt;
}

export function parseValidateContractEvidenceCommand(
  input: unknown,
): ValidateContractEvidenceCommand {
  const value = requireObject(input);
  requireExactKeys(value, ["actorId", "evidenceId", "idempotencyKey", "correlationId", "reason"]);
  const reason = optionalTrimmedString(value.reason);
  if (reason && reason.length > 1000) {
    throw new ContractEvidenceCommandParseError("CE_INVALID_PAYLOAD");
  }
  return {
    actorId: requireUuid(value.actorId),
    evidenceId: requireUuid(value.evidenceId),
    idempotencyKey: requireIdempotencyKey(value.idempotencyKey),
    correlationId: requireUuid(value.correlationId),
    reason,
  };
}

export function parseInvalidateContractEvidenceCommand(
  input: unknown,
): InvalidateContractEvidenceCommand {
  const value = requireObject(input);
  requireExactKeys(value, ["actorId", "evidenceId", "idempotencyKey", "correlationId", "reason"]);
  return {
    actorId: requireUuid(value.actorId),
    evidenceId: requireUuid(value.evidenceId),
    idempotencyKey: requireIdempotencyKey(value.idempotencyKey),
    correlationId: requireUuid(value.correlationId),
    reason: requireReason(value.reason),
  };
}

export function parseSupersedeContractEvidenceCommand(
  input: unknown,
  evidenceType: ContractEvidenceType,
): SupersedeContractEvidenceCommand {
  const value = requireObject(input);
  requireExactKeys(value, [
    "actorId", "evidenceId", "idempotencyKey", "correlationId", "reason",
    "eventAt", "externalReference", "file", "detail",
  ]);
  const record = parseRecordManualContractEvidenceCommand({
    ...value,
    contractId: "00000000-0000-4000-8000-000000000000",
    evidenceType,
  });
  const { contractId: _contractId, evidenceType: _evidenceType, ...newEvidence } = record;
  void _contractId;
  void _evidenceType;
  return {
    ...newEvidence,
    evidenceId: requireUuid(value.evidenceId),
    reason: requireReason(value.reason),
  };
}
