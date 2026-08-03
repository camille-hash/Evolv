import { createHmac, timingSafeEqual } from "node:crypto";

export type MetaWebhookSignatureValidationResult =
  | { ok: true }
  | {
      code:
        | "SIGNATURE_INVALID"
        | "SIGNATURE_MALFORMED"
        | "SIGNATURE_MISSING"
        | "SIGNATURE_UNSUPPORTED";
      ok: false;
      status: number;
    };

const signaturePrefix = "sha256=";
const hexDigestPattern = /^[a-f0-9]{64}$/i;

export function createMetaWebhookSignature(params: {
  appSecret: string;
  rawBodyBytes: Uint8Array;
}) {
  return `${signaturePrefix}${createHmac("sha256", params.appSecret)
    .update(params.rawBodyBytes)
    .digest("hex")}`;
}

export function validateMetaWebhookSignature(params: {
  appSecret: string;
  rawBodyBytes: Uint8Array;
  signatureHeader: string | null;
}): MetaWebhookSignatureValidationResult {
  const signatureHeader = params.signatureHeader?.trim();

  if (!signatureHeader) {
    return { code: "SIGNATURE_MISSING", ok: false, status: 401 };
  }

  if (!signatureHeader.includes("=")) {
    return { code: "SIGNATURE_MALFORMED", ok: false, status: 401 };
  }

  if (!signatureHeader.toLowerCase().startsWith(signaturePrefix)) {
    return { code: "SIGNATURE_UNSUPPORTED", ok: false, status: 401 };
  }

  const receivedDigest = signatureHeader.slice(signaturePrefix.length);

  if (!hexDigestPattern.test(receivedDigest)) {
    return { code: "SIGNATURE_MALFORMED", ok: false, status: 401 };
  }

  const expectedDigest = createMetaWebhookSignature({
    appSecret: params.appSecret,
    rawBodyBytes: params.rawBodyBytes,
  }).slice(signaturePrefix.length);

  const receivedBuffer = Buffer.from(receivedDigest, "hex");
  const expectedBuffer = Buffer.from(expectedDigest, "hex");

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return { code: "SIGNATURE_INVALID", ok: false, status: 401 };
  }

  return { ok: true };
}
