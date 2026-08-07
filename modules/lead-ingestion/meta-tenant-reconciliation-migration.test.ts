import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260807120000_reconcile_meta_tenant_unresolved_events.sql",
);
const migration = readFileSync(migrationPath, "utf8");

test("late tenant reconciliation derives authority from the locked configuration", () => {
  assert.match(migration, /p_integration_config_id uuid/);
  assert.match(
    migration,
    /from public\.lead_ingestion_integration_configs[\s\S]*where integration_config\.id = p_integration_config_id[\s\S]*for share;/,
  );
  assert.match(migration, /if v_config\.status <> 'active'/);
  assert.match(migration, /if v_config\.source_system <> 'meta_lead_ads'/);
  assert.doesNotMatch(migration, /p_organization_id|p_external_account_id|p_source_system/);
});

test("late tenant reconciliation locks and limits only matching unresolved events", () => {
  assert.match(migration, /event\.status = 'tenant_unresolved'/);
  assert.match(migration, /event\.source_system = v_config\.source_system/);
  assert.match(
    migration,
    /event\.normalized_payload ->> 'externalAccountId' = v_config\.external_account_id/,
  );
  assert.match(migration, /event\.last_error_code = 'INTEGRATION_NOT_FOUND'/);
  assert.match(migration, /for update of event skip locked/);
  assert.match(migration, /limit p_limit/);
  assert.match(migration, /event\.claim_token is null/);
  assert.match(migration, /event\.claim_expires_at is null/);
  assert.match(migration, /event\.worker_id is null/);
});

test("allowlist semantics keep blocked events recoverable and only eligible events become fetch_pending", () => {
  assert.match(
    migration,
    /event\.form_id is not null[\s\S]*event\.form_id = any\(v_config\.allowed_form_ids\)/,
  );
  assert.match(
    migration,
    /status = 'fetch_pending'/,
  );
  assert.match(migration, /and candidates\.form_is_allowed/);
  assert.doesNotMatch(migration, /status = 'rejected'|FORM_NOT_ALLOWED/);
  assert.doesNotMatch(migration, /graph\.facebook\.com|materialize_lead_ingestion_event_transaction\s*\(/i);
});

test("the operation exposes only safe counts and is service-role-only", () => {
  assert.match(
    migration,
    /returns table \([\s\S]*examined_count integer,[\s\S]*reconciled_count integer,[\s\S]*blocked_count integer[\s\S]*\)/,
  );
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = pg_catalog, public/);
  assert.match(
    migration,
    /revoke all on function public\.reconcile_meta_tenant_unresolved_events\(uuid, text, integer\)[\s\S]*from public;/,
  );
  assert.match(
    migration,
    /grant execute on function public\.reconcile_meta_tenant_unresolved_events\(uuid, text, integer\)[\s\S]*to service_role;/,
  );
  assert.match(migration, /examined_count excludes rows skipped/);
});
