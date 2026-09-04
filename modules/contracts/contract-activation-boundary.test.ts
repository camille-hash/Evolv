import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("generic status endpoint is a deterministic canonical-boundary rejection", () => {
  const source = read("app/api/contracts/[id]/status/route.ts");
  assert.match(source, /ACTIVATION_GENERIC_LIFECYCLE_BYPASS/);
  assert.doesNotMatch(source, /updateContractStatus/);
});

test("canonical command selects one adapter and never falls back", () => {
  const source = read("modules/contracts/contract-activation-server.ts");
  assert.match(source, /financial_authority==="legacy_revenue"/);
  assert.match(source, /financial_authority!=="commission_engine"/);
  assert.doesNotMatch(source, /catch[^]*generateRevenueForContract/);
});

test("manual legacy revenue and CE backfill are authority guarded", () => {
  const revenue = read("modules/revenue/server.ts");
  const commission = read("modules/commission-engine/server.ts");
  assert.equal((revenue.match(/financialAuthority !== "legacy_revenue"/g) ?? []).length, 2);
  assert.match(commission, /financial_authority/);
  assert.match(commission, /!== "commission_engine"/);
});

test("C9A does not use evidence, Patrion, or recognized revenue as an activation gate", () => {
  const source = read("modules/contracts/contract-activation-server.ts");
  assert.doesNotMatch(source, /evidence|patrion|recognized_revenue/i);
});

test("reconciliation manual selection maps to a safe HTTP 409 contract", () => {
  const migration = read("supabase/migrations/20260904120000_contract_activation_financial_authority.sql");
  const server = read("modules/contracts/contract-activation-server.ts");
  assert.match(migration, /resolution_outcome='reconciliation_required'[\s\S]*ACTIVATION_AUTHORITY_RECONCILIATION_REQUIRED/);
  assert.match(server, /ACTIVATION_AUTHORITY_RECONCILIATION_REQUIRED[^]*\?409/);
  assert.match(server, /nao pode ser escolhida enquanto houver registros que exigem reconciliacao/);
});

test("thrown adapter failure is normalized before the intent is finished", () => {
  const source = read("modules/contracts/contract-activation-server.ts");
  const normalization = source.indexOf("executeContractFinancialEffect(");
  const finish = source.indexOf('rpc("finish_contract_activation_intent"');
  assert.ok(normalization >= 0 && finish > normalization);
  const failureBoundary = read("modules/contracts/contract-activation-failure.ts");
  assert.match(failureBoundary, /catch \{/);
  assert.match(failureBoundary, /O processamento financeiro encontrou uma falha inesperada\./);
  assert.match(source, /p_financial_outcome:result\.ok\?"completed":"failed"/);
  assert.match(source, /p_failure_code:result\.ok\?null:"ACTIVATION_FINANCIAL_EFFECT_FAILED"/);
});
