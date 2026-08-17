export type MaterializeApprovedCommercialProposalInput = {
  proposalVersionId: string;
  clientId: string;
  idempotencyKey?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,128}$/;

export function parseMaterializeApprovedCommercialProposalInput(
  value: unknown,
): MaterializeApprovedCommercialProposalInput | null {
  if (!isObject(value)) return null;
  const allowed = ["proposalVersionId", "clientId", "idempotencyKey"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return null;
  if (typeof value.proposalVersionId !== "string" || !UUID.test(value.proposalVersionId)) return null;
  if (typeof value.clientId !== "string" || !UUID.test(value.clientId)) return null;
  if (value.idempotencyKey !== undefined &&
    (typeof value.idempotencyKey !== "string" || !IDEMPOTENCY_KEY.test(value.idempotencyKey))) return null;
  return {
    proposalVersionId: value.proposalVersionId,
    clientId: value.clientId,
    ...(value.idempotencyKey === undefined ? {} : { idempotencyKey: value.idempotencyKey }),
  };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
