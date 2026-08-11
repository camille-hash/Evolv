import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260811120000_create_lead_monthly_investment_capacity_rpc.sql",
);
const sql = readFileSync(migrationPath, "utf8");

test("creates one stable security-definer RPC with a safe search path", () => {
  assert.match(
    sql,
    /create function public\.get_lead_monthly_investment_capacity\(p_lead_id uuid\)/,
  );
  assert.match(sql, /returns text/);
  assert.match(sql, /stable\s+security definer/);
  assert.match(sql, /set search_path = pg_catalog, public/);
  assert.equal((sql.match(/create function/gi) ?? []).length, 1);
});

test("validates auth, active profile, organization, and lead ownership", () => {
  assert.match(sql, /auth\.uid\(\) is null/);
  assert.match(sql, /profile\.id = auth\.uid\(\)/);
  assert.match(sql, /profile\.is_active = true/);
  assert.match(sql, /lead\.organization_id = v_organization_id/);
  assert.match(sql, /event\.organization_id = v_organization_id/);
  assert.match(sql, /event\.crm_lead_id = lead\.id/);
});

test("keeps the ingestion table private and grants only RPC execution", () => {
  assert.doesNotMatch(sql, /grant\s+select/i);
  assert.doesNotMatch(sql, /create\s+policy/i);
  assert.match(
    sql,
    /revoke all on function[\s\S]*from public, anon, authenticated, service_role/,
  );
  assert.match(
    sql,
    /grant execute on function[\s\S]*to authenticated/,
  );
  assert.doesNotMatch(sql, /to service_role/);
});

test("selects one deterministic Meta event and never combines events", () => {
  assert.match(sql, /event\.source_system = 'meta_lead_ads'/);
  assert.match(sql, /event\.status = 'materialized'/);
  assert.match(sql, /leadIngestionEventId/);
  assert.match(sql, /processed_at asc nulls last/);
  assert.match(sql, /received_at asc/);
  assert.match(sql, /limit 1/);
  assert.equal((sql.match(/jsonb_array_elements/g) ?? []).length, 1);
});

test("extracts only the authorized key and rejects empty or ambiguous answers", () => {
  assert.match(
    sql,
    /answer ->> 'key' = 'qual_é_a_sua_capacidade_de_investimento_mensal\?'/,
  );
  assert.match(sql, /count\(distinct value\) = 1/);
  assert.match(sql, /else null/);
  assert.doesNotMatch(sql, /\binsert\b|\bupdate\b|\bdelete\b/i);
});

test("returns only the four approved presentation values", () => {
  for (const value of [
    "R$ 1.000 a R$ 2.000/mês",
    "R$ 2.000 a R$ 3.000/mês",
    "R$ 3.000 a R$ 5.000/mês",
    "Acima de R$ 5.000/mês",
  ]) {
    assert.match(sql, new RegExp(value.replace(/[.$]/g, "\\$&")));
  }
});
