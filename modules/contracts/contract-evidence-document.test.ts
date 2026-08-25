import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const server=readFileSync(new URL("./contract-evidence-document-server.ts",import.meta.url),"utf8");
const route=readFileSync(new URL("../../app/api/contracts/[id]/evidences/[evidenceId]/document/route.ts",import.meta.url),"utf8");
const readModel=readFileSync(new URL("./contract-evidence-ingestion-server.ts",import.meta.url),"utf8");

test("document boundary is Node-only and never creates a Storage URL",()=>{
  assert.match(server,/import "server-only"/);assert.match(route,/runtime="nodejs"/);
  assert.doesNotMatch(server,/createSignedUrl|getPublicUrl/);assert.doesNotMatch(route,/redirect/);
});
test("download authenticates before resolving internal storage identity",()=>{
  const auth=server.indexOf("reader.auth.getUser"),visible=server.indexOf('reader.from("contract_evidences")'),internal=server.indexOf('internal.from("contract_evidences")'),download=server.indexOf(".download(evidence.storage_object_path)");
  assert(auth>=0&&auth<visible&&visible<internal&&internal<download);
  assert.match(server,/\.eq\("contract_id",contractId\)/);assert.match(server,/\.eq\("organization_id",profile\.organization_id\)/);
});
test("integrity, bounded buffering and fail-closed audit precede response",()=>{
  assert.match(server,/maxBytes=15\*1024\*1024/);assert.match(server,/new Uint8Array\(await downloaded\.data\.arrayBuffer\(\)\)/);
  assert(server.indexOf("downloaded.data.size>maxBytes")<server.indexOf("downloaded.data.arrayBuffer()"));
  assert.match(server,/createHash\("sha256"\)/);assert.match(server,/bytes\.length!==evidence\.file_size/);
  assert.match(server,/if\(!audited\)return fail\(503,"CED_AUDIT_FAILED"/);
});
test("response headers force a private inert attachment with a derived name",()=>{
  for(const header of ["Content-Type","Content-Length","Content-Disposition","X-Content-Type-Options","Cache-Control","Pragma","Content-Security-Policy"])assert.match(server,new RegExp(header));
  assert.match(server,/attachment; filename=/);assert.match(server,/private, no-store/);assert.match(server,/default-src 'none'; sandbox/);
  assert.doesNotMatch(server,/originalName|file\.name/);
});
test("read model exposes only an API-relative capability",()=>{
  assert.match(readModel,/canDownloadDocument/);assert.match(readModel,/documentDownloadPath/);
  assert.doesNotMatch(readModel,/createSignedUrl|getPublicUrl/);
});
test("browser-controlled storage and authority fields are absent",()=>{
  assert.doesNotMatch(route,/storageBucket|storageObjectPath|contentSha256|organizationId|actorId|service_role/);
  assert.doesNotMatch(server,/searchParams|request\.json|formData/);
});
