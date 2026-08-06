import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrationDirectory = join(process.cwd(), "supabase", "migrations");
const archiveDirectory = join(
  process.cwd(),
  "docs",
  "database",
  "migration-archive",
  "meta-ads-001",
);
const crmMigrationName =
  "20260805120000_compensate_crm_leads_canonical_gap.sql";
const finalMigrationName =
  "20260806120000_finalize_meta_lead_ingestion_foundation.sql";
const archivedMigrationNames = [
  "20260803130000_assert_canonical_foundations.sql",
  "20260803140000_harden_public_table_structural_privileges.sql",
  "20260804120000_harden_meta_lead_ingestion_foundation.sql",
  "20260804130000_authoritative_meta_claim_lease_enforcement.sql",
  "20260805130000_create_compensatory_lead_ingestion_final_foundation.sql",
] as const;

const crmSql = readFileSync(join(migrationDirectory, crmMigrationName), "utf8");
const finalSql = readFileSync(
  join(migrationDirectory, finalMigrationName),
  "utf8",
);

test("keeps the historical baseline and archives superseded migrations outside the executable chain", () => {
  assert.ok(
    existsSync(
      join(
        migrationDirectory,
        "20260803120000_create_lead_ingestion_foundation.sql",
      ),
    ),
  );
  assert.ok(crmMigrationName < finalMigrationName);

  for (const migrationName of archivedMigrationNames) {
    assert.equal(existsSync(join(migrationDirectory, migrationName)), false);
    assert.equal(existsSync(join(archiveDirectory, migrationName)), true);
  }
});

test("limits the CRM compensation to the three canonical columns", () => {
  assert.match(crmSql, /add column assigned_profile_id uuid null/);
  assert.match(crmSql, /add column source_system text null/);
  assert.match(crmSql, /alter column source_system set default 'evolv'/);
  assert.match(crmSql, /add column metadata jsonb not null default '\{\}'::jsonb/);
  assert.match(crmSql, /references public\.profiles\(id\)[\s\S]*on delete set null/);
  assert.doesNotMatch(
    crmSql,
    /\b(?:insert|update|delete|merge)\s+(?:into\s+|from\s+)?public\.crm_leads\b/i,
  );
  assert.doesNotMatch(crmSql, /drop\s+(?:column|index|constraint)/i);
  assert.doesNotMatch(crmSql, /crm_leads_source_external_id_unique_idx/i);
});

test("evolves rather than recreates the historical ingestion tables", () => {
  assert.doesNotMatch(finalSql, /create table/i);
  assert.match(
    finalSql,
    /alter table public\.lead_ingestion_integration_configs[\s\S]*add column allowed_form_ids/,
  );
  assert.match(
    finalSql,
    /alter table public\.lead_ingestion_events[\s\S]*add column form_id/,
  );
});

test("defines exactly the five authoritative RPC contracts", () => {
  const createdFunctions = [
    ...finalSql.matchAll(
      /create (?:or replace )?function public\.([a-z_]+)\s*\(([^)]*)\)/g,
    ),
  ].map((match) => `${match[1]}(${match[2].replace(/\s+/g, " ").trim()})`);

  assert.equal(createdFunctions.length, 5);
  assert.deepEqual(createdFunctions.map((signature) => signature.split("(")[0]), [
    "claim_lead_ingestion_events",
    "mark_meta_lead_ingestion_event_enriched",
    "mark_meta_lead_ingestion_event_failed",
    "retry_lead_ingestion_event",
    "materialize_lead_ingestion_event_transaction",
  ]);

  assert.match(finalSql, /claim_lead_ingestion_events\(text, integer, integer\)/);
  assert.match(finalSql, /mark_meta_lead_ingestion_event_enriched\(uuid, uuid, jsonb\)/);
  assert.match(finalSql, /mark_meta_lead_ingestion_event_failed\(uuid, uuid, text, text, boolean, text\)/);
  assert.match(finalSql, /retry_lead_ingestion_event\(uuid, uuid, text\)/);
  assert.match(finalSql, /materialize_lead_ingestion_event_transaction\(uuid, uuid, uuid, timestamptz\)/);
});

test("removes incompatible overloads and uses the PostgreSQL clock", () => {
  assert.match(
    finalSql,
    /drop function public\.materialize_lead_ingestion_event_transaction\(uuid, timestamptz\)/,
  );
  assert.match(
    finalSql,
    /drop function if exists public\.claim_lead_ingestion_events\(text, integer, integer, timestamptz\)/,
  );
  assert.match(
    finalSql,
    /drop function if exists public\.retry_lead_ingestion_event\(uuid, text, timestamptz\)/,
  );
  assert.doesNotMatch(
    finalSql,
    /create (?:or replace )?function public\.claim_lead_ingestion_events\([\s\S]{0,250}p_now timestamptz/,
  );
  assert.match(finalSql, /clock_timestamp\(\)/);
  assert.match(finalSql, /v_max_attempts constant integer := 3/);
  assert.match(finalSql, /attempt_count >= v_max_attempts/);
  assert.match(finalSql, /for update skip locked/);
  assert.match(finalSql, /event\.source_system = 'meta_lead_ads'[\s\S]*event\.attempt_count < 3/);
  assert.match(finalSql, /event\.attempt_count >= 3[\s\S]*set status = 'retry_exhausted'/);
});

test("enforces the final table, policy, and function privilege boundaries", () => {
  assert.match(finalSql, /enable row level security/g);
  assert.match(
    finalSql,
    /revoke all on table public\.lead_ingestion_events\s+from public, anon, authenticated, service_role/,
  );
  assert.match(
    finalSql,
    /grant select, insert, update on table public\.lead_ingestion_events\s+to service_role/,
  );
  assert.match(
    finalSql,
    /grant select, insert, update on table public\.lead_ingestion_integration_configs\s+to authenticated, service_role/,
  );
  assert.match(finalSql, /organization_id = public\.evolv_current_organization_id\(\)/);
  assert.match(finalSql, /public\.evolv_current_role\(\) in \('master', 'admin'\)/);
  assert.match(finalSql, /from public, anon, authenticated, service_role;/g);
  assert.match(finalSql, /to service_role;/g);
  assert.match(finalSql, /has_table_privilege\('authenticated',[\s\S]*'MAINTAIN'\)/);
});

test("preserves observed forms without authorizing them and contains no external material", () => {
  assert.match(finalSql, /set form_id = nullif/);
  assert.doesNotMatch(finalSql, /observed_forms/);
  assert.doesNotMatch(finalSql, /set allowed_form_ids =/);
  assert.doesNotMatch(finalSql, /https?:\/\//i);
  assert.doesNotMatch(
    finalSql,
    /(?:access[_ ]?token|service_role_key|client_secret|bearer\s)/i,
  );
  assert.match(finalSql, /Historical ingestion event has an incompatible tenant\/status shape/);
  assert.match(finalSql, /v_event\.source_system <> 'meta_lead_ads'/);
  assert.match(finalSql, /when unique_violation then[\s\S]*source_system = v_event\.source_system[\s\S]*external_id = v_event\.external_id/);
});
