import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildEvidenceObjectPath,
  buildInternalRecordCommand,
  buildSupersedeObjectPath,
  canUseEvidenceEndpoint,
  EvidenceIngestionError,
  inspectEvidenceFile,
  parseEvidenceLifecycleJson,
  parseEvidenceMultipart,
  parseEvidenceSupersedeMultipart,
  sha256,
} from "./contract-evidence-ingestion";
import { parseSupersedeContractEvidenceCommand } from "./contract-evidence-command-types";
import type { ContractEvidenceType } from "./contract-evidence-types";
import type { ContractEvidenceReadModel } from "./contract-evidence-read-model";

type Result<T> =
  | ({ ok: true } & T)
  | { ok: false; status: number; code: string; message: string };
type Profile = {
  id: string;
  organization_id: string;
  role: "master" | "admin" | "sdr";
  is_active: boolean;
};
type Row = Record<string, unknown>;
const bucket = "contract-evidences";

export async function ingestContractEvidence(
  token: string | null,
  contractId: string,
  form: FormData,
): Promise<Result<{ status: 200 | 201 | 202; result: unknown }>> {
  const context = await resolve(token, contractId, false);
  if (!context.ok) return context;
  let intent;
  let file;
  try {
    intent = parseEvidenceMultipart(form);
    file = await inspectEvidenceFile(intent.file);
  } catch (error) {
    return mapLocal(error);
  }
  let command;
  const path = buildEvidenceObjectPath({
    organizationId: context.profile.organization_id,
    contractId,
    evidenceType: intent.evidenceType,
    idempotencyKey: intent.idempotencyKey,
    contentSha256: file.contentSha256,
    extension: file.extension,
  });
  try {
    command = buildInternalRecordCommand(
      intent,
      file,
      context.profile.id,
      contractId,
      path,
    );
  } catch (error) {
    return mapLocal(error);
  }
  const keyHash = sha256(intent.idempotencyKey);
  const prepared = await context.internal.rpc(
    "prepare_contract_evidence_upload_attempt",
    {
      p_actor_id: context.profile.id,
      p_contract_id: contractId,
      p_evidence_type: intent.evidenceType,
      p_idempotency_key_hash: keyHash,
      p_object_path: path,
      p_content_sha256: file.contentSha256,
      p_file_size: file.fileSize,
    },
  );
  if (prepared.error) return mapInternal(prepared.error);
  const attempt = prepared.data as {
    attemptId: string;
    state: string;
    evidenceId?: string | null;
  };
  if (attempt.state === "cleaned" || attempt.state === "cleanup_pending")
    return fail(
      409,
      "CE_UPLOAD_STATE_CONFLICT",
      "O envio anterior requer reconciliacao.",
    );
  let createdObject = false;
  if (attempt.state === "linked") {
    const existing = await context.internal.storage.from(bucket).download(path);
    if (existing.error || !existing.data)
      return {
        ok: true,
        status: 202,
        result: {
          outcome: "outcome_unknown",
          message: "O registro existe, mas o documento aguarda reconciliacao.",
        },
      };
    const existingBytes = new Uint8Array(await existing.data.arrayBuffer());
    if (
      existingBytes.length !== file.fileSize ||
      sha256(existingBytes) !== file.contentSha256
    )
      return fail(
        409,
        "CE_UPLOAD_CONFLICT",
        "O documento armazenado nao corresponde a operacao.",
      );
  } else {
    const upload = await context.internal.storage
      .from(bucket)
      .upload(path, file.bytes, {
        contentType: file.mediaType,
        upsert: false,
        cacheControl: "3600",
      });
    if (upload.error) {
      const existing = await context.internal.storage
        .from(bucket)
        .download(path);
      if (existing.error || !existing.data)
        return {
          ok: true,
          status: 202,
          result: {
            outcome: "outcome_unknown",
            message:
              "Nao foi possivel confirmar o armazenamento. Repita com a mesma chave de idempotencia.",
          },
        };
      const existingBytes = new Uint8Array(await existing.data.arrayBuffer());
      if (
        existingBytes.length !== file.fileSize ||
        sha256(existingBytes) !== file.contentSha256
      )
        return fail(
          409,
          "CE_UPLOAD_CONFLICT",
          "Ja existe outro documento para esta operacao.",
        );
      // The object predates this request. It must never be removed while handling
      // an error from the idempotent PostgreSQL command below.
      createdObject = false;
    } else createdObject = true;
  }
  const rpc = await context.internal.rpc(
    "record_manual_contract_evidence_transaction",
    {
      p_actor_id: command.actorId,
      p_contract_id: command.contractId,
      p_evidence_type: command.evidenceType,
      p_idempotency_key: command.idempotencyKey,
      p_correlation_id: command.correlationId,
      p_event_at: command.eventAt,
      p_external_reference: command.externalReference,
      p_storage_bucket: command.file?.storageBucket,
      p_storage_object_path: command.file?.storageObjectPath,
      p_content_sha256: command.file?.contentSha256,
      p_media_type: command.file?.mediaType,
      p_file_size: command.file?.fileSize,
      p_detail: command.detail,
    },
  );
  if (rpc.error) {
    const code = readCode(rpc.error);
    if (code)
      return cleanup(
        context.internal,
        context.profile.id,
        attempt.attemptId,
        path,
        createdObject,
        code,
        http(code),
        message(code),
      );
    return {
      ok: true,
      status: 202,
      result: {
        outcome: "outcome_unknown",
        message:
          "Nao foi possivel confirmar o registro. Repita com a mesma chave de idempotencia.",
      },
    };
  }
  const result = rpc.data as {
    evidenceId: string;
    outcome: "completed" | "already_completed";
  };
  const linked = await context.internal.rpc(
    "finish_contract_evidence_upload_attempt",
    {
      p_actor_id: context.profile.id,
      p_attempt_id: attempt.attemptId,
      p_state: "linked",
      p_evidence_id: result.evidenceId,
      p_error_code: null,
    },
  );
  if (linked.error)
    return {
      ok: true,
      status: 202,
      result: {
        outcome: "outcome_unknown",
        message:
          "A evidencia foi registrada e aguarda reconciliacao de leitura.",
      },
    };
  return {
    ok: true,
    status: result.outcome === "completed" ? 201 : 200,
    result: {
      evidenceId: result.evidenceId,
      outcome: result.outcome,
      status: "recorded",
      hasDocument: true,
    },
  };
}

export async function listContractEvidences(
  token: string | null,
  contractId: string,
): Promise<Result<{ evidences: ContractEvidenceReadModel[] }>> {
  const context = await resolve(token, contractId, true);
  if (!context.ok) return context;
  const evidence = await context.reader
    .from("contract_evidences")
    .select(
      "id,evidence_type,status,source,external_reference,event_at,recorded_at,validated_at,media_type,file_size,supersedes_evidence_id",
    )
    .eq("organization_id", context.profile.organization_id)
    .eq("contract_id", contractId)
    .order("recorded_at", { ascending: false });
  if (evidence.error)
    return fail(
      500,
      "CE_INTERNAL_UNAVAILABLE",
      "Nao foi possivel carregar as evidencias.",
    );
  const rows = (evidence.data ?? []) as Row[];
  const ids = rows.map((row) => String(row.id));
  if (!ids.length) return { ok: true, evidences: [] };
  const [signed, payment, receipt, audit] = await Promise.all([
    context.reader
      .from("contract_signed_evidence_details")
      .select(
        "evidence_id,signature_method,document_version,provider_name,provider_reference,effective_signed_at,signatories",
      )
      .in("evidence_id", ids),
    context.reader
      .from("contract_first_installment_payment_evidence_details")
      .select(
        "evidence_id,administrator_id,billing_reference,amount_cents,currency,due_at,paid_at,confirmation_reference",
      )
      .in("evidence_id", ids),
    context.reader
      .from("contract_patrion_receipt_evidence_details")
      .select(
        "evidence_id,expected_revenue_entry_id,amount_cents,currency,received_at,receipt_reference,competence_date,attributable_amount_cents",
      )
      .in("evidence_id", ids),
    context.reader
      .from("contract_evidence_audit_events")
      .select("evidence_id,event_type,actor_id,reason,occurred_at")
      .eq("organization_id", context.profile.organization_id)
      .eq("contract_id", contractId)
      .in("evidence_id", ids)
      .order("occurred_at", { ascending: true }),
  ]);
  if (signed.error || payment.error || receipt.error || audit.error)
    return fail(
      500,
      "CE_INTERNAL_UNAVAILABLE",
      "Nao foi possivel carregar os detalhes.",
    );
  const detailMap = new Map<string, Row>();
  for (const item of [
    ...(signed.data ?? []),
    ...(payment.data ?? []),
    ...(receipt.data ?? []),
  ] as Row[])
    detailMap.set(String(item.evidence_id), item);
  const auditRows=(audit.data??[]) as Row[];
  const actorIds=[...new Set(auditRows.map(item=>String(item.actor_id??"")).filter(Boolean))];
  const actors=actorIds.length?await context.reader.from("profiles").select("id,name").eq("organization_id",context.profile.organization_id).in("id",actorIds):{data:[],error:null};
  if(actors.error)return fail(500,"CE_INTERNAL_UNAVAILABLE","Nao foi possivel carregar os atores das evidencias.");
  const actorNames=new Map(((actors.data??[]) as Row[]).map(item=>[String(item.id),typeof item.name==="string"&&item.name.trim()?item.name.trim():"Usuário da equipe"]));
  const lifecycle=new Map<string,Map<string,Row>>();
  for(const item of auditRows){const evidenceId=String(item.evidence_id),eventType=String(item.event_type);const events=lifecycle.get(evidenceId)??new Map<string,Row>();events.set(eventType,item);lifecycle.set(evidenceId,events);}
  const supersededBy=new Map(rows.filter(row=>row.supersedes_evidence_id).map(row=>[String(row.supersedes_evidence_id),String(row.id)]));
  const displayName=(event:Row|undefined)=>event?.actor_id?actorNames.get(String(event.actor_id))??"Usuário da equipe":null;
  const reason=(event:Row|undefined)=>typeof event?.reason==="string"?event.reason:null;
  const occurredAt=(event:Row|undefined)=>typeof event?.occurred_at==="string"?event.occurred_at:null;
  return {
    ok: true,
    evidences: rows.map((row) => {
      const events=lifecycle.get(String(row.id));const recorded=events?.get("evidence_recorded"),validated=events?.get("evidence_validated"),invalidated=events?.get("evidence_invalidated"),superseded=events?.get("evidence_superseded");
      return ({
      evidenceId: row.id,
      type: row.evidence_type,
      status: row.status,
      source: row.source,
      eventAt: row.event_at,
      recordedAt: row.recorded_at,
      validatedAt: row.validated_at,
      reference: row.external_reference,
      hasDocument: Boolean(row.media_type),
      canDownloadDocument: Boolean(row.media_type),
      documentDownloadPath: row.media_type?`/api/contracts/${contractId}/evidences/${row.id}/document`:null,
      mediaType: row.media_type,
      fileSize: row.file_size,
      supersedesEvidenceId: row.supersedes_evidence_id,
      supersededByEvidenceId: supersededBy.get(String(row.id))??null,
      isCurrent: row.status === "recorded" || row.status === "validated",
      isValidated: row.status === "validated",
      detail: safeDetail(detailMap.get(String(row.id)) ?? {}),
      recordedByDisplayName:displayName(recorded),validatedByDisplayName:displayName(validated),invalidatedByDisplayName:displayName(invalidated),supersededByDisplayName:displayName(superseded),
      invalidationReason:reason(invalidated),supersessionReason:reason(superseded),invalidatedAt:occurredAt(invalidated),supersededAt:occurredAt(superseded),
    }) as ContractEvidenceReadModel}),
  };
}

export async function changeContractEvidenceStatus(
  token: string | null,
  contractId: string,
  evidenceId: string,
  input: unknown,
  action: "validate" | "invalidate",
): Promise<Result<{ status: 200; result: unknown }>> {
  const context = await resolveEvidence(token, contractId, evidenceId);
  if (!context.ok) return context;
  let intent;
  try {
    intent = parseEvidenceLifecycleJson(input, action === "invalidate");
  } catch (error) {
    return mapLocal(error);
  }
  const name =
    action === "validate"
      ? "validate_contract_evidence_transaction"
      : "invalidate_contract_evidence_transaction";
  const args =
    action === "validate"
      ? {
          p_actor_id: context.profile.id,
          p_evidence_id: evidenceId,
          p_idempotency_key: intent.idempotencyKey,
          p_correlation_id: intent.correlationId,
          p_reason: intent.reason,
        }
      : {
          p_actor_id: context.profile.id,
          p_evidence_id: evidenceId,
          p_reason: intent.reason,
          p_idempotency_key: intent.idempotencyKey,
          p_correlation_id: intent.correlationId,
        };
  const rpc = await context.internal.rpc(name, args);
  if (rpc.error) {
    const code = readCode(rpc.error);
    return code
      ? fail(http(code), code, message(code))
      : fail(503, "CE_INTERNAL_UNAVAILABLE", "Servico interno indisponivel.");
  }
  const result = rpc.data as {
    outcome: string;
    evidenceId: string;
    status: string;
  };
  const row = await context.reader
    .from("contract_evidences")
    .select("id,status,validated_at,validated_by")
    .eq("id", evidenceId)
    .single();
  if (row.error)
    return fail(
      503,
      "CE_INTERNAL_UNAVAILABLE",
      "A operacao foi concluida, mas a leitura esta indisponivel.",
    );
  return {
    ok: true,
    status: 200,
    result: {
      outcome: result.outcome,
      evidence: {
        id: row.data.id,
        status: row.data.status,
        validatedAt: row.data.validated_at,
        validatedBy: row.data.validated_by,
      },
    },
  };
}

export async function supersedeContractEvidence(
  token: string | null,
  contractId: string,
  evidenceId: string,
  form: FormData,
): Promise<Result<{ status: 200 | 201 | 202; result: unknown }>> {
  const context = await resolveEvidence(token, contractId, evidenceId);
  if (!context.ok) return context;
  let intent, file, command;
  try {
    intent = parseEvidenceSupersedeMultipart(form);
    file = await inspectEvidenceFile(intent.file);
    const derivedKey = `supersede:${evidenceId}:${intent.idempotencyKey}`;
    const path = buildSupersedeObjectPath({
      organizationId: context.profile.organization_id,
      contractId,
      evidenceType: context.evidence.evidence_type,
      idempotencyKey: derivedKey,
      contentSha256: file.contentSha256,
      extension: file.extension,
    });
    command = parseSupersedeContractEvidenceCommand({
      actorId: context.profile.id,
      evidenceId,
      idempotencyKey: intent.idempotencyKey,
      correlationId: intent.correlationId,
      reason: intent.reason,
      eventAt: intent.eventAt,
      externalReference: intent.externalReference ?? null,
      file: {
        storageBucket: bucket,
        storageObjectPath: path,
        contentSha256: file.contentSha256,
        mediaType: file.mediaType,
        fileSize: file.fileSize,
      },
      detail: intent.detail,
    }, context.evidence.evidence_type);
    const prepared = await context.internal.rpc(
      "prepare_contract_evidence_supersede_upload_attempt",
      {
        p_actor_id: context.profile.id,
        p_contract_id: contractId,
        p_previous_evidence_id: evidenceId,
        p_evidence_type: context.evidence.evidence_type,
        p_idempotency_key_hash: sha256(derivedKey),
        p_object_path: path,
        p_content_sha256: file.contentSha256,
        p_file_size: file.fileSize,
      },
    );
    if (prepared.error) return mapInternal(prepared.error);
    const attempt = prepared.data as { attemptId: string; state: string };
    if (["cleaned", "cleanup_pending"].includes(attempt.state))
      return fail(
        409,
        "CE_UPLOAD_STATE_CONFLICT",
        "O envio anterior requer reconciliacao.",
      );
    let created = false;
    const upload = await context.internal.storage
      .from(bucket)
      .upload(path, file.bytes, {
        contentType: file.mediaType,
        upsert: false,
        cacheControl: "3600",
      });
    if (upload.error) {
      const existing = await context.internal.storage
        .from(bucket)
        .download(path);
      if (existing.error || !existing.data)
        return {
          ok: true,
          status: 202,
          result: {
            outcome: "outcome_unknown",
            message:
              "Nao foi possivel confirmar o armazenamento. Repita com a mesma chave.",
          },
        };
      const bytes = new Uint8Array(await existing.data.arrayBuffer());
      if (
        bytes.length !== file.fileSize ||
        sha256(bytes) !== file.contentSha256
      )
        return fail(
          409,
          "CE_UPLOAD_CONFLICT",
          "O documento armazenado diverge da operacao.",
        );
    } else created = true;
    const rpc = await context.internal.rpc(
      "supersede_contract_evidence_transaction",
      {
        p_actor_id: command.actorId,
        p_evidence_id: command.evidenceId,
        p_idempotency_key: command.idempotencyKey,
        p_correlation_id: command.correlationId,
        p_reason: command.reason,
        p_event_at: command.eventAt,
        p_external_reference: command.externalReference,
        p_storage_bucket: command.file?.storageBucket,
        p_storage_object_path: command.file?.storageObjectPath,
        p_content_sha256: command.file?.contentSha256,
        p_media_type: command.file?.mediaType,
        p_file_size: command.file?.fileSize,
        p_detail: command.detail,
      },
    );
    if (rpc.error) {
      const code = readCode(rpc.error);
      if (code)
        return cleanup(
          context.internal,
          context.profile.id,
          attempt.attemptId,
          path,
          created,
          code,
          http(code),
          message(code),
        );
      return {
        ok: true,
        status: 202,
        result: {
          outcome: "outcome_unknown",
          message:
            "A substituicao pode ter sido concluida. Repita com a mesma chave.",
        },
      };
    }
    const result = rpc.data as {
      outcome: "completed" | "already_completed";
      evidenceId: string;
      supersededEvidenceId: string;
    };
    const linked = await context.internal.rpc(
      "finish_contract_evidence_upload_attempt",
      {
        p_actor_id: context.profile.id,
        p_attempt_id: attempt.attemptId,
        p_state: "linked",
        p_evidence_id: result.evidenceId,
        p_error_code: null,
      },
    );
    if (linked.error)
      return {
        ok: true,
        status: 202,
        result: {
          outcome: "outcome_unknown",
          message: "A substituicao foi registrada e aguarda reconciliacao.",
        },
      };
    return {
      ok: true,
      status: result.outcome === "completed" ? 201 : 200,
      result: {
        outcome: result.outcome,
        evidence: {
          id: result.evidenceId,
          status: "recorded",
          hasDocument: true,
        },
        supersededEvidenceId: result.supersededEvidenceId,
      },
    };
  } catch (error) {
    return mapLocal(error);
  }
}

async function resolveEvidence(
  token: string | null,
  contractId: string,
  evidenceId: string,
): Promise<
  Result<{
    profile: Profile;
    reader: SupabaseClient;
    internal: SupabaseClient;
    evidence: { id: string; evidence_type: ContractEvidenceType };
  }>
> {
  const context = await resolve(token, contractId, false);
  if (!context.ok) return context;
  if (!/^[0-9a-f-]{36}$/i.test(evidenceId))
    return fail(404, "CE_EVIDENCE_NOT_FOUND", "Evidencia nao encontrada.");
  const evidence = await context.reader
    .from("contract_evidences")
    .select("id,evidence_type")
    .eq("id", evidenceId)
    .eq("contract_id", contractId)
    .eq("organization_id", context.profile.organization_id)
    .maybeSingle();
  if (evidence.error || !evidence.data)
    return fail(404, "CE_EVIDENCE_NOT_FOUND", "Evidencia nao encontrada.");
  return {
    ...context,
    evidence: evidence.data as {
      id: string;
      evidence_type: ContractEvidenceType;
    },
  };
}

async function resolve(
  token: string | null,
  contractId: string,
  allowSdr: boolean,
): Promise<
  Result<{ profile: Profile; reader: SupabaseClient; internal: SupabaseClient }>
> {
  if (!token) return fail(401, "CE_SESSION_REQUIRED", "Sessao obrigatoria.");
  if (!/^[0-9a-f-]{36}$/i.test(contractId))
    return fail(404, "CE_CONTRACT_NOT_FOUND", "Contrato nao encontrado.");
  const config = configuration();
  if (!config)
    return fail(
      503,
      "CE_INTERNAL_UNAVAILABLE",
      "Servico interno indisponivel.",
    );
  const auth = createClient(config.url, config.publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const user = await auth.auth.getUser(token);
  if (user.error || !user.data.user)
    return fail(401, "CE_SESSION_REQUIRED", "Sessao invalida.");
  const profileResult = await auth
    .from("profiles")
    .select("id,organization_id,role,is_active")
    .eq("id", user.data.user.id)
    .maybeSingle<Profile>();
  if (
    profileResult.error ||
    !profileResult.data ||
    !profileResult.data.is_active
  )
    return fail(
      403,
      "CE_ACTOR_FORBIDDEN",
      "Usuario sem permissao para esta operacao.",
    );
  if (!canUseEvidenceEndpoint(profileResult.data.role, !allowSdr))
    return fail(
      403,
      "CE_ACTOR_FORBIDDEN",
      "Usuario sem permissao para esta operacao.",
    );
  const contract = await auth
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .eq("organization_id", profileResult.data.organization_id)
    .maybeSingle();
  if (contract.error || !contract.data)
    return fail(404, "CE_CONTRACT_NOT_FOUND", "Contrato nao encontrado.");
  return {
    ok: true,
    profile: profileResult.data,
    reader: auth,
    internal: createClient(config.url, config.serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}
function configuration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && publicKey && serviceKey ? { url, publicKey, serviceKey } : null;
}
async function cleanup(
  client: SupabaseClient,
  actorId: string,
  attemptId: string,
  path: string,
  created: boolean,
  code: string,
  status: number,
  msg: string,
): Promise<Result<never>> {
  // Only compensate an object proven to have been created by this request.
  // An existing object can belong to a completed or outcome-unknown retry.
  if (!created) return fail(status, code, msg);
  const removed = await client.storage.from(bucket).remove([path]);
  const state = removed.error ? "cleanup_pending" : "cleaned";
  const tracked = await client.rpc("finish_contract_evidence_upload_attempt", {
    p_actor_id: actorId,
    p_attempt_id: attemptId,
    p_state: state,
    p_evidence_id: null,
    p_error_code: code,
  });
  if (tracked.error)
    return fail(
      503,
      "CE_RECONCILIATION_UNAVAILABLE",
      "A operacao requer reconciliacao interna.",
    );
  return fail(status, code, msg);
}
function readCode(error: unknown) {
  const raw =
    error && typeof error === "object"
      ? String((error as Row).message ?? "")
      : "";
  return /^CE_[A-Z0-9_]+$/.test(raw) ? raw : null;
}
function http(code: string) {
  if (
    code.includes("CONFLICT") ||
    code.includes("DUPLICATE") ||
    code.includes("ALREADY") ||
    code.includes("NOT_VALIDATABLE") ||
    code.includes("NOT_INVALIDATABLE") ||
    code.includes("NOT_SUPERSEDABLE") ||
    code.includes("INTEGRITY")
  )
    return 409;
  if (code.includes("FORBIDDEN")) return 403;
  if (code.includes("NOT_FOUND")) return 404;
  if (code.includes("DETAIL") || code.includes("REFERENCE")) return 422;
  return 400;
}
function message(code: string) {
  const messages: Record<string, string> = {
    CE_IDEMPOTENCY_CONFLICT:
      "A chave de idempotencia ja foi usada com outros dados.",
    CE_VALIDATED_EVIDENCE_CONFLICT:
      "Ja existe outra evidencia validada vigente.",
    CE_EVIDENCE_NOT_VALIDATABLE:
      "A evidencia nao pode ser validada neste estado.",
    CE_EVIDENCE_ALREADY_VALIDATED:
      "A evidencia ja foi validada por outra operacao.",
    CE_EVIDENCE_NOT_INVALIDATABLE:
      "A evidencia nao pode ser invalidada neste estado.",
    CE_EVIDENCE_NOT_SUPERSEDABLE:
      "A evidencia nao pode ser substituida neste estado.",
    CE_REASON_REQUIRED: "Informe o motivo da operacao.",
  };
  return messages[code] ?? "Nao foi possivel concluir a operacao de evidencia.";
}
function mapInternal(error: unknown): Result<never> {
  const code = readCode(error);
  return code
    ? fail(http(code), code, message(code))
    : fail(503, "CE_INTERNAL_UNAVAILABLE", "Servico interno indisponivel.");
}
function mapLocal(error: unknown): Result<never> {
  return error instanceof EvidenceIngestionError
    ? fail(error.status, error.code, error.message)
    : fail(400, "CE_INVALID_PAYLOAD", "Dados invalidos.");
}
function fail(status: number, code: string, message: string): Result<never> {
  return { ok: false, status, code, message };
}
function safeDetail(row: Row) {
  const copy = { ...row };
  delete copy.evidence_id;
  return Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      value,
    ]),
  );
}
