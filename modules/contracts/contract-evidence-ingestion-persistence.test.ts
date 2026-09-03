import assert from "node:assert/strict";
import { mock, test } from "node:test";

const calls = { finish: 0, prepare: 0, register: 0, storage: 0, supersede: 0 };
const actorId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";
const contractId = "33333333-3333-4333-8333-333333333333";
const evidenceId = "44444444-4444-4444-8444-444444444444";

function query(table: string) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => {
      if (table === "profiles") return { data: { id: actorId, organization_id: organizationId, role: "master", is_active: true }, error: null };
      if (table === "contracts") return { data: { id: contractId }, error: null };
      if (table === "contract_evidences") return { data: { id: evidenceId, evidence_type: "signed_contract" }, error: null };
      return { data: null, error: null };
    },
  };
  return chain;
}

const authClient = {
  auth: { getUser: async () => ({ data: { user: { id: actorId } }, error: null }) },
  from: (table: string) => query(table),
};
const internalClient = {
  rpc: async (name: string) => {
    if (name.startsWith("prepare_")) calls.prepare++;
    else if (name.startsWith("finish_")) calls.finish++;
    else if (name.startsWith("record_")) calls.register++;
    else if (name.startsWith("supersede_")) calls.supersede++;
    return { data: null, error: null };
  },
  storage: { from: () => { calls.storage++; return {}; } },
};

mock.module("@supabase/supabase-js", {
  exports: {
    createClient: (_url: string, key: string) => key === "public-key" ? authClient : internalClient,
  },
});

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

const { ingestContractEvidence, supersedeContractEvidence } = await import("./contract-evidence-ingestion-server.ts");

function malformedFile() {
  return new File([Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n")], "invalid.pdf", { type: "application/pdf" });
}

function uploadForm() {
  const form = new FormData();
  form.set("evidenceType", "signed_contract");
  form.set("idempotencyKey", "invalid-pdf-upload-001");
  form.set("correlationId", "55555555-5555-4555-8555-555555555555");
  form.set("eventAt", "2026-09-02T12:00:00Z");
  form.set("detail", JSON.stringify({ signatureMethod: "digital", documentVersion: "1", providerName: null, providerReference: null, effectiveSignedAt: "2026-09-02T12:00:00Z", signatories: [] }));
  form.set("file", malformedFile());
  return form;
}

function supersedeForm() {
  const form = new FormData();
  form.set("idempotencyKey", "invalid-pdf-supersede-001");
  form.set("correlationId", "66666666-6666-4666-8666-666666666666");
  form.set("reason", "Documento inválido");
  form.set("eventAt", "2026-09-02T12:00:00Z");
  form.set("detail", JSON.stringify({ signatureMethod: "digital" }));
  form.set("file", malformedFile());
  return form;
}

function assertNoPersistence() {
  assert.deepEqual(calls, { finish: 0, prepare: 0, register: 0, storage: 0, supersede: 0 });
}

test("invalid PDF reaches no persistence during initial ingestion", async () => {
  const result = await ingestContractEvidence("token", contractId, uploadForm());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "CE_PDF_STRUCTURE_INVALID");
  assertNoPersistence();
});

test("invalid PDF reaches no persistence during supersession", async () => {
  const result = await supersedeContractEvidence("token", contractId, evidenceId, supersedeForm());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "CE_PDF_STRUCTURE_INVALID");
  assertNoPersistence();
});
