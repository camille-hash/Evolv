import assert from "node:assert/strict";
import test from "node:test";
import { parseServerDerivedPatrimonialProposalInput } from "./server-derived-patrimonial-command.ts";
const valid=()=>({idempotencyKey:"request-0001",leadId:"lead-1",intent:{quotas:[{creditAmountCents:20000000},{creditAmountCents:20000000,contemplationScenarioMonth:48}]}});
test("accepts only legitimate intent inputs",()=>assert.deepEqual(parseServerDerivedPatrimonialProposalInput(valid()),valid()));
test("rejects one quota because the official product minimum is two",()=>{const v=valid();v.intent.quotas.pop();assert.equal(parseServerDerivedPatrimonialProposalInput(v),null)});
test("rejects unsupported credit and unknown calculated fields",()=>{const v=valid();v.intent.quotas[0].creditAmountCents=123;assert.equal(parseServerDerivedPatrimonialProposalInput(v),null);assert.equal(parseServerDerivedPatrimonialProposalInput({...valid(),snapshotAuthority:"server_derived"}),null);assert.equal(parseServerDerivedPatrimonialProposalInput({...valid(),savedSnapshot:{}}),null)});
test("does not accept authority, catalog, installments or product metadata inside intent",()=>{const fields=["authority","commercialCatalogCode","installments","product","calculationResult"];for(const field of fields){const v=valid() as ReturnType<typeof valid>&{intent:Record<string,unknown>};v.intent[field]={};assert.equal(parseServerDerivedPatrimonialProposalInput(v),null)}});
