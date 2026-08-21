import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "components", "contracts", "proposal-materialization-panel.tsx"), "utf8");

test("confirmação informa integralmente a operação e a quantidade dinâmica", () => {
  for (const label of ["Proposta e versão", "Cliente selecionado", "Produto", "Administradora", "Grupo", "Quantidade", "Crédito por contrato", "Crédito total", "Status inicial", "Número contratual", "Cota operacional"]) assert.match(source, new RegExp(label));
  assert.match(source, /Esta ação criará um contrato em rascunho para cada cota/);
  assert.match(source, /`Gerar \$\{count\} contratos`/);
  assert.doesNotMatch(source, />Confirmar</);
});

test("preserva a chave e reconcilia o read model após erro", () => {
  assert.match(source, /setIdempotencyKey\(\(current\) => current \?\? createMaterializationIdempotencyKey/);
  assert.match(source, /proposalVersionId: proposalId, idempotencyKey/);
  assert.match(source, /const authoritative = await reload\(\)/);
  assert.match(source, /authoritative\.materializationId/);
  assert.match(source, /already_created/);
});

test("mapeia o bloqueio real da administradora sem fallback genérico", () => {
  assert.match(source, /MAT_ADMINISTRATOR_REFERENCE_INVALID/);
  assert.match(source, /administradora da proposta não corresponde a um cadastro ativo/);
  assert.doesNotMatch(source, /Atualize os dados e tente novamente/);
});

test("identificação usa diferenças por campo e não mostra chave técnica", () => {
  assert.match(source, /classifyContractIdentificationEdit/);
  assert.match(source, /\.\.\.edit\.changes/);
  assert.match(source, /edit\.kind === "corrected"/);
  assert.match(source, /Você pode completar o identificador pendente sem alterar o valor já registrado/);
  assert.match(source, /Altere ao menos um dos campos/);
  assert.doesNotMatch(source, /sourceCompositionItemKey/);
  assert.doesNotMatch(source, /item \{contract/);
});

test("SDR recebe identificadores e estados somente leitura", () => {
  assert.match(source, /IdentificationReadOnly contract=\{contract\} state=\{identificationState\}/);
  assert.match(source, /contract\.contractNumber \?\? "Não informado"/);
  assert.match(source, /contract\.quota \?\? "Não informada"/);
  assert.match(source, /complete: "Identificação completa"/);
  assert.match(source, /partial: "Identificação parcial"/);
  assert.match(source, /pending: "Identificação pendente"/);
  assert.match(source, /interaction\.showEditor \?/);
});

test("identificação completa é estável e correção é uma ação explícita cancelável", () => {
  assert.match(source, /useState\(identificationState !== "complete"\)/);
  assert.match(source, /interaction\.showCorrectionAction/);
  assert.match(source, /setEditing\(true\)/);
  assert.match(source, /function cancel\(\)/);
  assert.match(source, /setNumber\(contract\.contractNumber \?\? ""\)/);
  assert.match(source, />Cancelar</);
  assert.match(source, /correction && !reason\.trim\(\)/);
  assert.match(source, /correction \? \{reason:reason\.trim\(\)\} : \{\}/);
  assert.match(source, /identificationState === "complete" \|\| correction \? "Corrigir identificação" : "Completar identificação"/);
});
