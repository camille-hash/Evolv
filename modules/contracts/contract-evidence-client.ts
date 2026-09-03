import { requireSupabaseAccessToken } from "../access/supabase-session-token.ts";
import type { ContractEvidenceListResponse, ContractFirstInstallmentReadDetail, ContractSignedEvidenceReadDetail } from "./contract-evidence-read-model";

export type EvidenceUploadInput =
  | { evidenceType: "signed_contract"; eventAt: string; detail: ContractSignedEvidenceReadDetail; file: File }
  | { evidenceType: "first_installment_payment"; eventAt: string; detail: ContractFirstInstallmentReadDetail; file: File };
export type EvidenceMutationResult =
  | { kind: "confirmed"; httpStatus: 200 | 201; evidenceId: string; status: string; outcome: string }
  | { kind: "outcome_unknown"; httpStatus: 202; message: string };

export class ContractEvidenceClientError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 0) { super(message); this.code = code; this.status = status; this.name = "ContractEvidenceClientError"; }
}

export function createEvidenceIntentKey() { return `evidence-ui:${crypto.randomUUID()}`; }
export function buildEvidenceUploadForm(input: EvidenceUploadInput, idempotencyKey: string) {
  const form = new FormData();
  form.set("evidenceType", input.evidenceType);
  form.set("idempotencyKey", idempotencyKey);
  form.set("eventAt", input.eventAt);
  form.set("detail", JSON.stringify(input.detail));
  form.set("file", input.file);
  return form;
}
export async function fetchContractEvidences(contractId: string) {
  const token = await requireSupabaseAccessToken("Sessão inválida para consultar documentos.");
  const response = await fetch(`/api/contracts/${encodeURIComponent(contractId)}/evidences`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const payload = await safeJson(response);
  if (!response.ok || !payload || !Array.isArray(payload.evidences) || typeof payload.capabilities?.canWriteEvidence !== "boolean") throw clientError(payload, "Não foi possível carregar os documentos.", response.status);
  return payload as ContractEvidenceListResponse;
}
export async function uploadContractEvidence(contractId: string, input: EvidenceUploadInput, idempotencyKey: string) { return mutate(`/api/contracts/${encodeURIComponent(contractId)}/evidences`, buildEvidenceUploadForm(input, idempotencyKey)); }
export async function validateContractEvidence(contractId: string, evidenceId: string, idempotencyKey: string) { return mutate(lifecyclePath(contractId, evidenceId, "validate"), { idempotencyKey, reason: null }); }
export async function invalidateContractEvidence(contractId: string, evidenceId: string, reason: string, idempotencyKey: string) { return mutate(lifecyclePath(contractId, evidenceId, "invalidate"), { idempotencyKey, reason }); }
export async function downloadContractEvidence(path: string) {
  if (!isRelativeDocumentPath(path)) throw new ContractEvidenceClientError("CED_DOCUMENT_NOT_FOUND", "Documento não encontrado.");
  const token = await requireSupabaseAccessToken("Sessão inválida para baixar o documento.");
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw clientError(await safeJson(response), "Não foi possível baixar o documento.", response.status);
  return saveEvidenceDownload(response);
}
async function mutate(path: string, body: FormData | Record<string, unknown>): Promise<EvidenceMutationResult> {
  const token = await requireSupabaseAccessToken("Sessão inválida para alterar documentos.");
  const multipart = body instanceof FormData;
  const response = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}`, ...(!multipart ? { "Content-Type": "application/json" } : {}) }, body: multipart ? body : JSON.stringify(body) });
  return interpretEvidenceMutationResponse(response);
}
export async function interpretEvidenceMutationResponse(response: Response): Promise<EvidenceMutationResult> {
  const payload = await safeJson(response);
  if (response.status === 202) return { kind: "outcome_unknown", httpStatus: 202, message: "O processamento precisa ser verificado. A lista foi atualizada sem confirmar uma nova gravação." };
  if (!response.ok) throw clientError(payload, "Não foi possível concluir a operação documental.", response.status);
  const result = (payload?.result ?? payload) as Record<string, unknown>;
  return { kind: "confirmed", httpStatus: response.status as 200 | 201, evidenceId: String(result.evidenceId ?? ""), status: String(result.status ?? ""), outcome: String(result.outcome ?? "completed") };
}
function lifecyclePath(contractId: string, evidenceId: string, action: "validate" | "invalidate") { return `/api/contracts/${encodeURIComponent(contractId)}/evidences/${encodeURIComponent(evidenceId)}/${action}`; }
export async function saveEvidenceDownload(response: Response, environment: { document: Pick<Document, "createElement" | "body">; URL: Pick<typeof URL, "createObjectURL" | "revokeObjectURL"> } = { document, URL }) { const blob = await response.blob(); const filename = sanitizeDownloadFilename(readFilename(response.headers.get("content-disposition"))); const url = environment.URL.createObjectURL(blob); const anchor = environment.document.createElement("a"); try { anchor.href = url; anchor.download = filename; anchor.hidden = true; environment.document.body.append(anchor); anchor.click(); } finally { anchor.remove(); environment.URL.revokeObjectURL(url); } return filename; }
export function sanitizeDownloadFilename(value: string | null) { const cleaned = (value ?? "documento-evidencia").normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "-").replace(/\.+$/g, "").trim().slice(0, 180); return cleaned || "documento-evidencia"; }
export function isRelativeDocumentPath(value: string) { return /^\/api\/contracts\/[0-9a-f-]+\/evidences\/[0-9a-f-]+\/document$/i.test(value); }
function readFilename(value: string | null) { if (!value) return null; const encoded = /filename\*=UTF-8''([^;]+)/i.exec(value)?.[1]; if (encoded) { try { return decodeURIComponent(encoded); } catch { return null; } } return /filename="([^"]+)"/i.exec(value)?.[1] ?? null; }
type JsonPayload = { code?: string; error?: string; message?: string; evidences?: unknown[]; capabilities?: { canWriteEvidence?: unknown }; result?: Record<string, unknown> };
async function safeJson(response: Response) { return response.json().catch(() => null) as Promise<JsonPayload | null>; }
function clientError(payload: JsonPayload | null, fallback: string, status = 0) {
  const code = payload?.error ?? payload?.code ?? "CE_REQUEST_FAILED";
  const messages: Record<string, string> = { CED_SESSION_REQUIRED: "Sessão obrigatória.", CED_ACTOR_FORBIDDEN: "Seu perfil não pode acessar este documento.", CED_DOCUMENT_NOT_FOUND: "Documento não encontrado.", CED_DOCUMENT_INTEGRITY_FAILED: "A integridade do documento não pôde ser confirmada.", CED_AUDIT_FAILED: "O acesso não pôde ser auditado.", CE_ACTOR_FORBIDDEN: "Seu perfil não pode alterar documentos.", CE_PDF_STRUCTURE_INVALID: "O PDF não possui uma estrutura válida.", CE_PDF_PASSWORD_PROTECTED: "PDF protegido por senha não é aceito.", CE_FILE_MIME_MISMATCH: "O conteúdo do arquivo não corresponde ao tipo informado.", CE_FILE_TOO_LARGE: "O arquivo excede o limite permitido.", CE_FILE_EMPTY: "O arquivo está vazio.", CE_FILE_TYPE_UNSUPPORTED: "Tipo de arquivo não aceito.", CE_REASON_REQUIRED: "Informe o motivo da invalidação.", CE_EVIDENCE_NOT_VALIDATABLE: "A evidência não está mais disponível para validação.", CE_EVIDENCE_NOT_INVALIDATABLE: "A evidência não está mais disponível para invalidação.", CE_EVIDENCE_ALREADY_VALIDATED: "A evidência já foi validada.", CE_VALIDATED_EVIDENCE_CONFLICT: "Outra evidência validada já ocupa este requisito.", CE_IDEMPOTENCY_CONFLICT: "A intenção informada conflita com uma operação anterior.", CE_INTERNAL_UNAVAILABLE: "Serviço documental indisponível." };
  return new ContractEvidenceClientError(code, messages[code] ?? fallback, status);
}
