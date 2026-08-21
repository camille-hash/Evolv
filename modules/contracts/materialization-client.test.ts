import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "modules", "contracts", "materialization-client.ts"), "utf8");

test("cliente aceita respostas C5 created e already_created", () => {
  assert.match(source, /ContractMaterializationResult/);
  assert.match(source, /payload\?\.result/);
  assert.match(source, /return payload\.result/);
});

test("cliente preserva status HTTP e código seguro", () => {
  assert.match(source, /class MaterializationRequestError/);
  assert.match(source, /payload\?\.error \?\? "MAT_INTERNAL_ERROR"/);
  assert.match(source, /response\.status/);
});

test("chave C7 é vinculada à versão e à operação", () => {
  assert.match(source, /`c7:\$\{proposalVersionId\}:\$\{crypto\.randomUUID\(\)\}`/);
});
