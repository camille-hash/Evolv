import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrationDirectory = join(process.cwd(), "supabase", "migrations");
const crmMigrationName =
  "20260805120000_compensate_crm_leads_canonical_gap.sql";
const ingestionMigrationName =
  "20260805130000_create_compensatory_lead_ingestion_final_foundation.sql";

const crmSql = readFileSync(join(migrationDirectory, crmMigrationName), "utf8");
const ingestionSql = readFileSync(
  join(migrationDirectory, ingestionMigrationName),
  "utf8",
);

test("orders the two compensatory migrations after the historical chain", () => {
  assert.ok(crmMigrationName < ingestionMigrationName);
  assert.ok(crmMigrationName > "20260804130000_authoritative_meta_claim_lease_enforcement.sql");
});

test("limits the CRM compensation to the three canonical columns", () => {
  assert.match(crmSql, /add column assigned_profile_id uuid null/);
  assert.match(crmSql, /add column source_system text null/);
  assert.match(crmSql, /alter column source_system set default 'evolv'/);
  assert.match(crmSql, /add column metadata jsonb not null default '\{\}'::jsonb/);
  assert.match(crmSql, /references public\.profiles\(id\)[\s\S]*on delete set null/);
  assert.doesNotMatch(crmSql, /\b(?:insert|update|delete|merge)\s+(?:into\s+|from\s+)?public\.crm_leads\b/i);
  assert.doesNotMatch(crmSql, /drop\s+(?:column|index|constraint)/i);
  assert.doesNotMatch(crmSql, /crm_leads_source_external_id_unique_idx/i);
});

test("defines only the final ingestion tables and five authoritative RPCs", () => {
  assert.match(ingestionSql, /create table public\.lead_ingestion_integration_configs/);
  assert.match(ingestionSql, /create table public\.lead_ingestion_events/);

  const createdFunctions = [...ingestionSql.matchAll(
    /create or replace function public\.([a-z_]+)\s*\(([^)]*)\)/g,
  )].map((match) => `${match[1]}(${match[2].replace(/\s+/g, " ").trim()})`);

  assert.equal(createdFunctions.length, 5);
  assert.deepEqual(createdFunctions.map((signature) => signature.split("(")[0]), [
    "claim_lead_ingestion_events",
    "mark_meta_lead_ingestion_event_enriched",
    "mark_meta_lead_ingestion_event_failed",
    "retry_lead_ingestion_event",
    "materialize_lead_ingestion_event_transaction",
  ]);

  assert.match(ingestionSql, /claim_lead_ingestion_events\(text, integer, integer\)/);
  assert.match(ingestionSql, /mark_meta_lead_ingestion_event_enriched\(uuid, uuid, jsonb\)/);
  assert.match(ingestionSql, /mark_meta_lead_ingestion_event_failed\(uuid, uuid, text, text, boolean, text\)/);
  assert.match(ingestionSql, /retry_lead_ingestion_event\(uuid, uuid, text\)/);
  assert.match(ingestionSql, /materialize_lead_ingestion_event_transaction\(uuid, uuid, uuid, timestamptz\)/);
});

test("removes incompatible historical overloads and does not recreate them", () => {
  assert.match(ingestionSql, /drop function if exists public\.claim_lead_ingestion_events\(text, integer, integer, timestamptz\)/);
  assert.match(ingestionSql, /drop function if exists public\.retry_lead_ingestion_event\(uuid, text, timestamptz\)/);
  assert.match(ingestionSql, /drop function if exists public\.materialize_lead_ingestion_event_transaction\(uuid, timestamptz\)/);
  assert.doesNotMatch(ingestionSql, /create or replace function public\.claim_lead_ingestion_events\([\s\S]{0,250}p_now timestamptz/);
});

test("contains no application-time backfill, external call, or credential material", () => {
  const prefixBeforeFunctions = ingestionSql.slice(
    0,
    ingestionSql.indexOf("create or replace function public.claim_lead_ingestion_events"),
  );
  assert.doesNotMatch(prefixBeforeFunctions, /^\s*(?:insert|update|delete|merge|call)\b/im);
  assert.doesNotMatch(ingestionSql, /https?:\/\//i);
  assert.doesNotMatch(ingestionSql, /(?:access[_ ]?token|service_role_key|client_secret|bearer\s)/i);
  assert.doesNotMatch(ingestionSql, /insert into public\.lead_ingestion_(?:events|integration_configs)/i);
});

test("enforces final RLS, grants, indexes, constraints, and transactional semantics", () => {
  assert.match(ingestionSql, /enable row level security/g);
  assert.match(ingestionSql, /revoke all on table public\.lead_ingestion_integration_configs from public, anon, authenticated/);
  assert.match(ingestionSql, /grant select, insert, update on table public\.lead_ingestion_events to service_role/);
  assert.match(ingestionSql, /lead_ingestion_events_source_external_unique unique \(source_system, external_id\)/);
  assert.match(ingestionSql, /lead_ingestion_events_claim_shape_check/);
  assert.match(ingestionSql, /lead_ingestion_events_retry_schedule_idx/);
  assert.match(ingestionSql, /lead_ingestion_events_claim_expiration_idx/);
  assert.match(ingestionSql, /for update skip locked/);
  assert.match(ingestionSql, /clock_timestamp\(\)/);
  assert.match(ingestionSql, /'prospecting', 'novos'/);
});
