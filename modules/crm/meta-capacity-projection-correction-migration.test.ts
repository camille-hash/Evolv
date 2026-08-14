import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260814160000_fix_meta_capacity_projection.sql",
);
const sql = readFileSync(migrationPath, "utf8");

const officialForms = ["1225439199692862", "3912872839009160"];
const canonicalMappings = new Map([
  ["de r$1.000,00 a r$2.000,00", "R$ 1.000 a R$ 2.000/mês"],
  ["de r$2.000,00 a r$3.000,00", "R$ 2.000 a R$ 3.000/mês"],
  ["de r$3.000,00 a r$5.000,00", "R$ 3.000 a R$ 5.000/mês"],
  ["acima de r$5.000,00", "Acima de R$ 5.000/mês"],
]);
const mappingsDeclaredInSql = new Map(
  [...sql.matchAll(/when '([^']+)' then '([^']+)'/g)]
    .map((match) => [match[1], match[2]] as const),
);

function projectFromMigration(value: string) {
  const normalized = value.trim().replace(/_+/g, " ").replace(/\s+/g, " ").toLowerCase();
  return mappingsDeclaredInSql.get(normalized) ?? null;
}

function projectAuthorizedSample(input: {
  eventStatus?: string;
  formId: string;
  hasEvent?: boolean;
  leadOrganization: string;
  eventOrganization: string;
  value: string;
}) {
  if (
    input.hasEvent === false ||
    input.eventStatus !== "materialized" ||
    input.leadOrganization !== input.eventOrganization ||
    !officialForms.includes(input.formId)
  ) return null;

  return projectFromMigration(input.value);
}

test("replaces both RPCs without changing their contracts", () => {
  assert.match(sql, /create or replace function public\.get_lead_monthly_investment_capacity\(p_lead_id uuid\)\s+returns text/);
  assert.match(sql, /create or replace function public\.get_lead_meta_declarations\(p_lead_id uuid\)\s+returns table\s*\(\s*monthly_investment_capacity text,\s*declared_brazilian_and_cpf_status text\s*\)/);
  assert.equal((sql.match(/stable\s+security definer\s+set search_path = pg_catalog, public/g) ?? []).length, 2);
  assert.equal((sql.match(/owner to postgres/g) ?? []).length, 2);
});

test("preserves tenant, auth, source, status, association, and event selection filters", () => {
  for (const pattern of [
    /auth\.uid\(\)/,
    /profile\.id = auth\.uid\(\)/,
    /profile\.is_active = true/,
    /lead\.organization_id = (?:v_organization_id|profile\.organization_id)/,
    /event\.organization_id = (?:v_organization_id|context\.organization_id)/,
    /event\.crm_lead_id = (?:lead\.id|context\.id)/,
    /event\.source_system = 'meta_lead_ads'/,
    /event\.status = 'materialized'/,
    /leadIngestionEventId/,
    /limit 1/,
  ]) assert.match(sql, pattern);
});

test("uses exactly the two forms already present in the ingestion allowlist contract", () => {
  for (const formId of officialForms) assert.match(sql, new RegExp(`'${formId}'::text`));
  const approvedForms = sql.match(/with approved_forms[\s\S]+?\), authorized_context as/)?.[0] ?? "";
  assert.equal(officialForms.filter((formId) => approvedForms.includes(formId)).length, 2);
  assert.match(sql, /join approved_forms form\s+on form\.form_id = event\.form_id/);
  assert.doesNotMatch(approvedForms, /\blike\b|\bilike\b/i);
});

test("maps the four observed Meta values explicitly in both RPCs", () => {
  for (const [input, output] of canonicalMappings) {
    const clause = `when '${input}' then '${output}'`;
    assert.equal(sql.split(clause).length - 1, 2);
  }
});

test("preserves the tested legacy variants and rejects broad or unknown matches", () => {
  for (const legacy of [
    "r$ 1.000 a r$ 2.000",
    "r$ 1.000 a r$ 2.000/mês",
    "r$ 2.000 a r$ 3.000",
    "r$ 2.000 a r$ 3.000/mês",
    "r$ 3.000 a r$ 5.000",
    "r$ 3.000 a r$ 5.000/mês",
    "acima de r$ 5.000",
    "acima de r$ 5.000/mês",
  ]) {
    assert.equal(sql.split(`when '${legacy}' then`).length - 1, 2);
    assert.notEqual(projectFromMigration(legacy), null);
  }
  assert.doesNotMatch(sql, /\blike\b|\bilike\b/gi);
  assert.equal((sql.match(/else null/g) ?? []).length >= 3, true);
  assert.equal(projectFromMigration("<test lead: dummy data>"), null);
  assert.equal(projectFromMigration("valor desconhecido"), null);
  assert.equal(projectFromMigration(""), null);
});

test("returns null for unauthorized forms, cross-tenant events, missing events, and non-materialized events", () => {
  const base = {
    eventStatus: "materialized",
    formId: officialForms[0],
    hasEvent: true,
    leadOrganization: "organization-a",
    eventOrganization: "organization-a",
    value: "de_r$1.000,00_a_r$2.000,00",
  };
  assert.notEqual(projectAuthorizedSample(base), null);
  assert.equal(projectAuthorizedSample({ ...base, formId: "unauthorized-form" }), null);
  assert.equal(projectAuthorizedSample({ ...base, eventOrganization: "organization-b" }), null);
  assert.equal(projectAuthorizedSample({ ...base, hasEvent: false }), null);
  assert.equal(projectAuthorizedSample({ ...base, eventStatus: "review_required" }), null);
});

test("projects 52 commercial samples and keeps two dummy samples null", () => {
  const observed = [
    ...Array(32).fill("de_r$1.000,00_a_r$2.000,00"),
    ...Array(6).fill("de_r$2.000,00_a_r$3.000,00"),
    ...Array(6).fill("de_r$3.000,00_a_r$5.000,00"),
    ...Array(8).fill("acima_de_r$5.000,00"),
    ...Array(2).fill("<test lead: dummy data for qual_é_a_sua_capacidade_de_investimento_mensal?>"),
  ];
  assert.equal(observed.filter((value) => projectFromMigration(value) !== null).length, 52);
  assert.equal(observed.filter((value) => projectFromMigration(value) === null).length, 2);
});

test("preserves grants and validates owner, volatility, security definer, and search path", () => {
  assert.equal((sql.match(/revoke all on function/g) ?? []).length, 2);
  assert.equal((sql.match(/grant execute on function/g) ?? []).length, 2);
  assert.match(sql, /to authenticated;/);
  for (const role of ["public", "anon", "service_role"]) {
    assert.match(sql, new RegExp(`has_function_privilege\\('${role}'`));
  }
  assert.match(sql, /procedure\.prosecdef = true/);
  assert.match(sql, /procedure\.provolatile = 's'/);
  assert.match(sql, /procedure\.proconfig = array\['search_path=pg_catalog, public'\]::text\[\]/);
  assert.match(sql, /pg_get_userbyid\(procedure\.proowner\) = 'postgres'/);
});

test("contains no persistent data mutation or ingestion configuration change", () => {
  assert.doesNotMatch(sql, /\b(?:insert|update|delete|truncate)\b/i);
  assert.doesNotMatch(sql, /alter table|lead_ingestion_integration_configs/i);
});
