import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildEvidenceObjectPath, buildInternalRecordCommand, canUseEvidenceEndpoint, EvidenceIngestionError, inspectEvidenceFile, parseEvidenceMultipart, sha256 } from "./contract-evidence-ingestion.ts";

const org="11111111-1111-4111-8111-111111111111"; const contract="22222222-2222-4222-8222-222222222222";
const correlation="33333333-3333-4333-8333-333333333333";
const pdf=new Uint8Array([...Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n"),...Buffer.from("%%EOF\n")]);
const png=new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0,0x49,0x45,0x4e,0x44]);
const jpeg=new Uint8Array([0xff,0xd8,0xff,0xe0,0,0,0xff,0xd9]);
function file(bytes:Uint8Array,type:string,name="unsafe/../name.pdf"){return new File([bytes.slice().buffer as ArrayBuffer],name,{type});}
function form(type:string,detail:object,document=file(pdf,"application/pdf")){const value=new FormData();value.set("evidenceType",type);value.set("idempotencyKey","evidence-key-001");value.set("correlationId",correlation);value.set("eventAt","2026-08-21T12:00:00Z");value.set("detail",JSON.stringify(detail));value.set("file",document);return value;}

test("accepts PDF JPEG and PNG by bytes and derives authoritative MIME",async()=>{
  assert.equal((await inspectEvidenceFile(file(pdf,"application/pdf"))).extension,"pdf");
  assert.equal((await inspectEvidenceFile(file(jpeg,"image/jpeg"))).mediaType,"image/jpeg");
  assert.equal((await inspectEvidenceFile(file(png,"image/png"))).extension,"png");
});
test("rejects empty unsupported false MIME and oversize",async()=>{
  await assert.rejects(()=>inspectEvidenceFile(file(new Uint8Array(),"application/pdf")),(e:unknown)=>e instanceof EvidenceIngestionError&&e.status===400);
  await assert.rejects(()=>inspectEvidenceFile(file(new Uint8Array([1,2,3]),"application/pdf")),(e:unknown)=>e instanceof EvidenceIngestionError&&e.status===415);
  await assert.rejects(()=>inspectEvidenceFile(file(pdf,"image/png")),(e:unknown)=>e instanceof EvidenceIngestionError&&e.code==="CE_FILE_MIME_MISMATCH");
  const huge={size:15*1024*1024+1,arrayBuffer:async()=>new ArrayBuffer(0)} as File;
  await assert.rejects(()=>inspectEvidenceFile(huge),(e:unknown)=>e instanceof EvidenceIngestionError&&e.status===413);
});
test("hash and object path are deterministic and ignore original name",async()=>{
  assert.equal(sha256("abc"),"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const inspected=await inspectEvidenceFile(file(pdf,"application/pdf"));
  const input={organizationId:org,contractId:contract,evidenceType:"signed_contract" as const,idempotencyKey:"evidence-key-001",contentSha256:inspected.contentSha256,extension:inspected.extension};
  const path=buildEvidenceObjectPath(input);assert.equal(path,buildEvidenceObjectPath(input));assert.doesNotMatch(path,/unsafe|\.\.|name/);assert.match(path,/^[0-9a-f-]+\/[0-9a-f-]+\/signed_contract\/[a-f0-9]{64}\/[a-f0-9]{64}\.pdf$/);
});
test("multipart rejects unknown authority and duplicate fields",()=>{
  const valid=form("signed_contract",{signatureMethod:"digital",documentVersion:"1",providerName:null,providerReference:null,effectiveSignedAt:"2026-08-21T12:00:00Z",signatories:[]});
  valid.set("actorId","forged");assert.throws(()=>parseEvidenceMultipart(valid),EvidenceIngestionError);
  const duplicate=form("signed_contract",{});duplicate.append("eventAt","2026-08-22T12:00:00Z");assert.throws(()=>parseEvidenceMultipart(duplicate),EvidenceIngestionError);
});
test("strictly builds all three public detail variants",async()=>{
  const inspected=await inspectEvidenceFile(file(pdf,"application/pdf"));const path=buildEvidenceObjectPath({organizationId:org,contractId:contract,evidenceType:"signed_contract",idempotencyKey:"evidence-key-001",contentSha256:inspected.contentSha256,extension:"pdf"});
  const cases=[
    ["signed_contract",{signatureMethod:"digital",documentVersion:"1",providerName:null,providerReference:null,effectiveSignedAt:"2026-08-21T12:00:00Z",signatories:[{name:"Test"}]}],
    ["first_installment_payment",{administratorId:"44444444-4444-4444-8444-444444444444",billingReference:"bill",amountCents:100,currency:"BRL",dueAt:"2026-08-20T12:00:00Z",paidAt:"2026-08-21T12:00:00Z",confirmationReference:"confirmation"}],
    ["patrion_commission_receipt",{expectedRevenueEntryId:null,amountCents:100,currency:"BRL",receivedAt:"2026-08-21T12:00:00Z",receiptReference:"receipt",competenceDate:"2026-08-01",attributableAmountCents:100}],
  ] as const;
  for(const [type,detail] of cases){const intent=parseEvidenceMultipart(form(type,detail));assert.equal(buildInternalRecordCommand(intent,inspected,org,contract,path).evidenceType,type);}
});
test("server boundary and route do not expose storage identity",()=>{
  const server=readFileSync(new URL("./contract-evidence-ingestion-server.ts",import.meta.url),"utf8");
  const route=readFileSync(new URL("../../app/api/contracts/[id]/evidences/route.ts",import.meta.url),"utf8");
  assert.match(server,/import "server-only"/);assert.match(route,/runtime = "nodejs"/);assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY|storageObjectPath|contentSha256/);
  assert.doesNotMatch(server,/createSignedUrl|getPublicUrl/);
});
test("master and admin write while SDR remains read-only",()=>{
  assert.equal(canUseEvidenceEndpoint("master",true),true);assert.equal(canUseEvidenceEndpoint("admin",true),true);
  assert.equal(canUseEvidenceEndpoint("sdr",true),false);assert.equal(canUseEvidenceEndpoint("sdr",false),true);
  assert.equal(canUseEvidenceEndpoint("inactive",false),false);
});
test("server source preserves cleanup and ambiguous reconciliation semantics",()=>{
  const server=readFileSync(new URL("./contract-evidence-ingestion-server.ts",import.meta.url),"utf8");
  assert.match(server,/remove\(\[path\]\)/);assert.match(server,/cleanup_pending/);assert.match(server,/outcome_unknown/);
  assert.match(server,/if\(!created\)return fail/);
  assert.match(server,/createdObject=false/);
  assert.match(server,/record_manual_contract_evidence_transaction/);assert.doesNotMatch(server,/validate_contract_evidence_transaction|invalidate_contract_evidence_transaction|supersede_contract_evidence_transaction/);
  assert.match(server,/context\.reader\.from\("contract_evidences"\)/);
});
