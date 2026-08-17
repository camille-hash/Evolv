import type { CommercialProposalSnapshot } from "./types.ts";

export type CommercialProposalCommand =
  | { action: "approve" | "expire" | "present" | "reject"; proposalId: string }
  | {
      action: "revise";
      basedOnVersionId: string;
      revisionReason?: string;
      rootProposalId: string;
      savedSnapshot: CommercialProposalSnapshot;
    }
  | { action: "revokeApproval"; proposalVersionId: string; reason: string };

const allowedKeys: Record<CommercialProposalCommand["action"], string[]> = {
  approve: ["action", "proposalId"],
  expire: ["action", "proposalId"],
  present: ["action", "proposalId"],
  reject: ["action", "proposalId"],
  revise: ["action", "basedOnVersionId", "revisionReason", "rootProposalId", "savedSnapshot"],
  revokeApproval: ["action", "proposalVersionId", "reason"],
};

export function parseCommercialProposalCommand(value: unknown): CommercialProposalCommand | null {
  if (!isPlainObject(value) || typeof value.action !== "string" || !(value.action in allowedKeys)) {
    return null;
  }
  const action = value.action as CommercialProposalCommand["action"];
  if (Object.keys(value).some((key) => !allowedKeys[action].includes(key))) return null;
  if (action === "revise") {
    if (
      typeof value.rootProposalId !== "string" || !value.rootProposalId.trim() ||
      typeof value.basedOnVersionId !== "string" || !value.basedOnVersionId.trim() ||
      !isPlainObject(value.savedSnapshot) ||
      (value.revisionReason !== undefined && typeof value.revisionReason !== "string")
    ) return null;
    return {
      action,
      basedOnVersionId: value.basedOnVersionId,
      revisionReason: value.revisionReason as string | undefined,
      rootProposalId: value.rootProposalId,
      savedSnapshot: value.savedSnapshot,
    };
  }
  if (action === "revokeApproval") {
    if (
      typeof value.proposalVersionId !== "string" || !value.proposalVersionId.trim() ||
      typeof value.reason !== "string" || !value.reason.trim()
    ) return null;
    return { action, proposalVersionId: value.proposalVersionId, reason: value.reason };
  }
  if (typeof value.proposalId !== "string" || !value.proposalId.trim()) return null;
  return { action, proposalId: value.proposalId };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

const commercialProposalCommandErrors: Record<string, { error: string; status: number }> = {
  CP_ACTOR_FORBIDDEN: { error: "Operacao nao autorizada.", status: 403 },
  CP_ALREADY_APPROVED: { error: "A proposta ja esta aprovada.", status: 409 },
  CP_APPROVAL_REVOKED: { error: "A aprovacao foi revogada.", status: 409 },
  CP_CROSS_TENANT_REFERENCE: { error: "Proposta nao encontrada.", status: 404 },
  CP_CURRENT_VERSION_NOT_FOUND: { error: "Proposta nao encontrada.", status: 404 },
  CP_INVALID_PAYLOAD: { error: "Payload de proposta invalido.", status: 400 },
  CP_LINEAGE_INTEGRITY_ERROR: { error: "Linhagem da proposta invalida.", status: 409 },
  CP_NOT_APPROVED: { error: "A proposta nao esta aprovada.", status: 409 },
  CP_REVISION_BASE_STALE: { error: "A proposta possui uma versao mais recente.", status: 409 },
  CP_REVISION_REASON_REQUIRED: { error: "Informe o motivo da revisao.", status: 400 },
  CP_REVOCATION_REASON_REQUIRED: { error: "Informe o motivo da revogacao.", status: 400 },
  CP_SNAPSHOT_INVALID: { error: "Snapshot comercial invalido.", status: 422 },
  CP_SNAPSHOT_SCHEMA_UNSUPPORTED: { error: "Versao do snapshot comercial nao suportada.", status: 422 },
  CP_SNAPSHOT_AUTHORITY_INSUFFICIENT: { error: "A origem do snapshot nao possui autoridade suficiente.", status: 422 },
  CP_SNAPSHOT_HASH_MISMATCH: { error: "Integridade do snapshot comercial divergente.", status: 409 },
  CP_COMPOSITION_INVALID: { error: "Composicao comercial invalida.", status: 422 },
  CP_COMPOSITION_ITEM_DUPLICATE: { error: "Item duplicado na composicao comercial.", status: 422 },
  CP_CREDIT_TOTAL_MISMATCH: { error: "Credito total divergente da composicao.", status: 422 },
  CP_INSTALLMENT_PHASES_INVALID: { error: "Fases de parcelas invalidas.", status: 422 },
  CP_INSTALLMENT_TOTAL_MISMATCH: { error: "Parcelas consolidadas divergentes.", status: 422 },
  CP_PRODUCT_REFERENCE_INVALID: { error: "Referencia de produto invalida.", status: 422 },
  CP_DISCLOSURE_INVALID: { error: "Ressalva comercial invalida.", status: 422 },
  CP_VERSION_NOT_APPROVABLE: { error: "A versao nao pode ser aprovada.", status: 409 },
  CP_VERSION_NOT_CURRENT: { error: "A versao nao e a versao corrente.", status: 409 },
  CP_VERSION_NOT_REVISABLE: { error: "A versao nao pode ser revisada.", status: 409 },
};

export function readCommercialProposalErrorCode(message: string) {
  return Object.keys(commercialProposalCommandErrors).find((code) => message.includes(code))
    ?? "CP_LINEAGE_INTEGRITY_ERROR";
}

export function mapCommercialProposalCommandError(code: string) {
  return commercialProposalCommandErrors[code]
    ?? commercialProposalCommandErrors.CP_LINEAGE_INTEGRITY_ERROR;
}
