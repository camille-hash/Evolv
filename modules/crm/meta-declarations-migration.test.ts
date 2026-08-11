import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260812120000_create_lead_meta_declarations_rpc.sql",
);
const sql = readFileSync(migrationPath, "utf8");

test("creates one typed, stable, security-definer projection", () => {
  assert.match(
    sql,
    /create function public\.get_lead_meta_declarations\(p_lead_id uuid\)/,
  );
  assert.match(
    sql,
    /returns table\s*\(\s*monthly_investment_capacity text,\s*declared_brazilian_and_cpf_status text\s*\)/,
  );
  assert.match(sql, /language sql\s+stable\s+security definer/);
  assert.match(sql, /set search_path = pg_catalog, public/);
  assert.equal(
    (sql.match(/create function public\.get_lead_meta_declarations/gi) ?? [])
      .length,
    1,
  );
});

test("uses one deterministic tenant-safe Meta event", () => {
  assert.match(sql, /profile\.id = auth\.uid\(\)/);
  assert.match(sql, /profile\.is_active = true/);
  assert.match(sql, /lead\.organization_id = profile\.organization_id/);
  assert.match(sql, /lead\.source_system = 'meta_lead_ads'/);
  assert.match(sql, /event\.crm_lead_id = context\.id/);
  assert.match(sql, /event\.organization_id = context\.organization_id/);
  assert.match(sql, /event\.source_system = 'meta_lead_ads'/);
  assert.match(sql, /event\.status = 'materialized'/);
  assert.match(
    sql,
    /order by\s+\(event\.id::text = nullif\(\s*context\.metadata ->> 'leadIngestionEventId',\s*''\s*\)\) desc,\s*event\.processed_at asc nulls last,\s*event\.received_at asc,\s*event\.id asc\s+limit 1/,
  );
  assert.doesNotMatch(
    sql,
    /order by\s+\(event\.id::text = nullif\(\s*context\.metadata ->> 'leadIngestionEventId',\s*''\s*\)\) desc,\s*event\.processed_at desc nulls last,\s*event\.received_at desc,\s*event\.id desc\s+limit 1/,
  );
  assert.match(sql, /limit 1/);
  assert.equal((sql.match(/selected_event as/gi) ?? []).length, 1);
  assert.equal((sql.match(/jsonb_array_elements/g) ?? []).length, 1);
});

test("uses the exact form and question allowlist", () => {
  assert.match(sql, /'1225439199692862'::text/);
  assert.match(
    sql,
    /'qual_é_a_sua_capacidade_de_investimento_mensal\?'::text/,
  );
  assert.match(
    sql,
    /'você_é_brasileiro_e_possui_cpf\?'::text/,
  );
  assert.doesNotMatch(sql, /\blike\b|\bilike\b/i);
  assert.doesNotMatch(sql, /p_(?:question|key|field)/i);
});

test("maps only the authorized compound answers and rejects conflicts", () => {
  assert.match(sql, /when 'sim' then 'yes'/);
  assert.match(sql, /when 'não' then 'no'/);
  for (const forbidden of ["nao", "yes", "true", "false"]) {
    assert.doesNotMatch(
      sql,
      new RegExp(`when '${forbidden}' then`, "i"),
    );
  }
  assert.match(sql, /count\(\*\) filter \(where normalized_value is null\) = 0/g);
  assert.match(sql, /count\(distinct normalized_value\) = 1/g);
  assert.match(
    sql,
    /jsonb_typeof\(answer\) is distinct from 'object'/g,
  );
});

test("returns exactly one final row with both authorized fields", () => {
  assert.match(
    sql,
    /select\s+monthly\.value as monthly_investment_capacity,\s*brazilian_and_cpf\.value as declared_brazilian_and_cpf_status\s+from monthly_projection monthly\s+cross join brazilian_and_cpf_projection brazilian_and_cpf;/,
  );
  assert.equal((sql.match(/returns table/gi) ?? []).length, 1);
});

test("keeps the inbox private and grants only authenticated execution", () => {
  assert.doesNotMatch(sql, /grant\s+select/i);
  assert.doesNotMatch(sql, /create\s+policy/i);
  assert.match(
    sql,
    /revoke all on function public\.get_lead_meta_declarations\(uuid\)\s+from public, anon, authenticated, service_role/,
  );
  assert.match(
    sql,
    /grant execute on function public\.get_lead_meta_declarations\(uuid\)\s+to authenticated/,
  );
  assert.equal(
    (sql.match(/has_function_privilege\(\s*'public'/g) ?? []).length,
    2,
  );
  assert.doesNotMatch(sql, /has_function_privilege\(\s*'PUBLIC'/);
});

test("asserts the installed contract and preserves the historical RPC", () => {
  assert.match(sql, /pg_get_function_result/);
  assert.match(sql, /procedure\.prosecdef = true/);
  assert.match(sql, /procedure\.provolatile = 's'/);
  assert.match(sql, /pg_get_userbyid\(procedure\.proowner\) = 'postgres'/);
  assert.match(
    sql,
    /to_regprocedure\(\s*'public\.get_lead_monthly_investment_capacity\(uuid\)'/,
  );
  assert.doesNotMatch(
    sql,
    /(?:drop|create or replace) function public\.get_lead_monthly_investment_capacity/i,
  );
  assert.doesNotMatch(sql, /\b(insert|update|delete|truncate)\b/i);
  assert.doesNotMatch(sql, /\bexecute\s+(?:format|v_|sql)/i);
});
