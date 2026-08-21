import assert from "node:assert/strict";
import test from "node:test";

import {
  ContractEvidenceCommandParseError,
  contractEvidenceCommandErrorHttpStatus,
  parseInvalidateContractEvidenceCommand,
  parseRecordManualContractEvidenceCommand,
  parseSupersedeContractEvidenceCommand,
  parseValidateContractEvidenceCommand,
} from "./contract-evidence-command-types.ts";

const actorId = "c8b10000-0000-4000-8000-000000000001";
const contractId = "c8b20000-0000-4000-8000-000000000001";
const evidenceId = "c8b30000-0000-4000-8000-000000000001";
const correlationId = "c8b40000-0000-4000-8000-000000000001";
const eventAt = "2026-08-21T12:00:00.000Z";

const signedRecord = {
  actorId,
  contractId,
  evidenceType: "signed_contract",
  idempotencyKey: "c8b-record-signed-1",
  correlationId,
  eventAt,
  externalReference: "provider-document-1",
  file: null,
  detail: {
    signatureMethod: "electronic",
    documentVersion: "1",
    providerName: "Provider",
    providerReference: "provider-document-1",
    effectiveSignedAt: eventAt,
    signatories: [{ name: "Signer" }],
  },
};

test("parses the strict signed evidence command without authority fields", () => {
  const parsed = parseRecordManualContractEvidenceCommand(signedRecord);
  assert.equal(parsed.evidenceType, "signed_contract");
  assert.equal(parsed.externalReference, "provider-document-1");
  assert.equal("organizationId" in parsed, false);
  assert.equal("status" in parsed, false);
});

test("requires a stable reference or complete private file identity", () => {
  assert.throws(
    () => parseRecordManualContractEvidenceCommand({ ...signedRecord, externalReference: null }),
    (error) => error instanceof ContractEvidenceCommandParseError
      && error.code === "CE_EVIDENCE_SOURCE_REFERENCE_REQUIRED",
  );
  const parsed = parseRecordManualContractEvidenceCommand({
    ...signedRecord,
    externalReference: null,
    file: {
      storageBucket: "private-contract-evidence",
      storageObjectPath: "tenant/contract/evidence.pdf",
      contentSha256: "a".repeat(64),
      mediaType: "application/pdf",
      fileSize: 10,
    },
  });
  assert.equal(parsed.file?.contentSha256, "a".repeat(64));
});

test("rejects unknown fields, incompatible detail and mismatched event time", () => {
  assert.throws(() => parseRecordManualContractEvidenceCommand({ ...signedRecord, status: "validated" }));
  assert.throws(() => parseRecordManualContractEvidenceCommand({ ...signedRecord, detail: {} }));
  assert.throws(() => parseRecordManualContractEvidenceCommand({
    ...signedRecord,
    detail: { ...signedRecord.detail, effectiveSignedAt: "2026-08-22T12:00:00Z" },
  }));
});

test("parses validate and requires a reason for invalidate and supersede", () => {
  assert.equal(parseValidateContractEvidenceCommand({
    actorId, evidenceId, idempotencyKey: "c8b-validate-1", correlationId, reason: null,
  }).reason, null);
  assert.throws(() => parseInvalidateContractEvidenceCommand({
    actorId, evidenceId, idempotencyKey: "c8b-invalidate-1", correlationId, reason: " ",
  }));
  assert.throws(() => parseSupersedeContractEvidenceCommand({
    actorId,
    evidenceId,
    idempotencyKey: "c8b-supersede-1",
    correlationId,
    reason: "",
    eventAt,
    externalReference: "provider-document-2",
    file: null,
    detail: signedRecord.detail,
  }, "signed_contract"));
});

test("maps the stable domain catalog to future HTTP semantics", () => {
  assert.equal(contractEvidenceCommandErrorHttpStatus.CE_ACTOR_FORBIDDEN, 403);
  assert.equal(contractEvidenceCommandErrorHttpStatus.CE_EVIDENCE_NOT_FOUND, 404);
  assert.equal(contractEvidenceCommandErrorHttpStatus.CE_IDEMPOTENCY_CONFLICT, 409);
  assert.equal(contractEvidenceCommandErrorHttpStatus.CE_EVIDENCE_DETAIL_INVALID, 422);
  assert.equal(contractEvidenceCommandErrorHttpStatus.CE_INVALID_PAYLOAD, 400);
});
