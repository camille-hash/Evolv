import assert from "node:assert/strict";
import test from "node:test";
import { classifyContractIdentificationEdit as classify, getContractIdentificationInteraction, getContractIdentificationState } from "./contract-identification-edit.ts";

test("classifica identificação completa, parcial e pendente", () => {
  assert.equal(getContractIdentificationState("000123", "0007"), "complete");
  assert.equal(getContractIdentificationState("000123", null), "partial");
  assert.equal(getContractIdentificationState(null, "0007"), "partial");
  assert.equal(getContractIdentificationState(null, null), "pending");
});

test("SDR nunca recebe editor ou comando e master completo começa estável", () => {
  assert.deepEqual(getContractIdentificationInteraction(false, "complete", false), {showCorrectionAction:false,showEditor:false});
  assert.deepEqual(getContractIdentificationInteraction(false, "partial", true), {showCorrectionAction:false,showEditor:false});
  assert.deepEqual(getContractIdentificationInteraction(true, "complete", false), {showCorrectionAction:true,showEditor:false});
  assert.deepEqual(getContractIdentificationInteraction(true, "complete", true), {showCorrectionAction:false,showEditor:true});
});

test("preenche número vazio sem exigir correção", () => assert.deepEqual(classify({persistedNumber:null,persistedQuota:null,editedNumber:" 000123 ",editedQuota:""}), {kind:"completed",changes:{contractNumber:"000123"}}));
test("preenche cota vazia preservando zeros", () => assert.deepEqual(classify({persistedNumber:null,persistedQuota:null,editedNumber:"",editedQuota:" 0001234 "}), {kind:"completed",changes:{contractQuota:"0001234"}}));
test("número existente e cota nova é conclusão progressiva", () => assert.deepEqual(classify({persistedNumber:"000123",persistedQuota:null,editedNumber:"000123",editedQuota:"0001234"}), {kind:"completed",changes:{contractQuota:"0001234"}}));
test("cota existente e número novo é conclusão progressiva", () => assert.deepEqual(classify({persistedNumber:null,persistedQuota:"A-01",editedNumber:"N.002",editedQuota:"A-01"}), {kind:"completed",changes:{contractNumber:"N.002"}}));
test("campo existente mantido não é reenviado nem conta como correção", () => assert.deepEqual(classify({persistedNumber:"Ab-01",persistedQuota:null,editedNumber:" Ab-01 ",editedQuota:"Q-02"}), {kind:"completed",changes:{contractQuota:"Q-02"}}));
test("substituição do número é correção", () => assert.deepEqual(classify({persistedNumber:"000123",persistedQuota:"0001234",editedNumber:"000124",editedQuota:"0001234"}), {kind:"corrected",changes:{contractNumber:"000124"}}));
test("substituição da cota é correção", () => assert.deepEqual(classify({persistedNumber:"N-A",persistedQuota:"Q-A",editedNumber:"N-A",editedQuota:"q-a"}), {kind:"corrected",changes:{contractQuota:"q-a"}}));
test("correção prevalece quando outro campo é completado", () => assert.deepEqual(classify({persistedNumber:"N-A",persistedQuota:null,editedNumber:"N-B",editedQuota:"Q-A"}), {kind:"corrected",changes:{contractNumber:"N-B",contractQuota:"Q-A"}}));
test("remoção de valor persistido é bloqueada", () => assert.deepEqual(classify({persistedNumber:"000123",persistedQuota:null,editedNumber:" ",editedQuota:"Q"}), {kind:"removal_blocked",changes:{}}));
test("sem diferenças permanece unchanged", () => assert.deepEqual(classify({persistedNumber:"A.01",persistedQuota:null,editedNumber:" A.01 ",editedQuota:""}), {kind:"unchanged",changes:{}}));
