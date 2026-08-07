begin;

create extension if not exists pgtap with schema extensions;

select plan(52);

select has_function(
  'public',
  'reconcile_meta_tenant_unresolved_events',
  array['uuid', 'text', 'integer'],
  'late tenant reconciliation function exists'
);

select function_returns(
  'public',
  'reconcile_meta_tenant_unresolved_events',
  array['uuid', 'text', 'integer'],
  'setof record',
  'late tenant reconciliation returns safe aggregate counts'
);

select is(
  (
    select routine_definition is not null
    from information_schema.routines
    where routine_schema = 'public'
      and routine_name = 'reconcile_meta_tenant_unresolved_events'
  ),
  true,
  'late tenant reconciliation has an inspectable routine definition'
);

select is(
  (
    select prosecdef
    from pg_catalog.pg_proc
    where oid = 'public.reconcile_meta_tenant_unresolved_events(uuid,text,integer)'::regprocedure
  ),
  true,
  'late tenant reconciliation is SECURITY DEFINER'
);

select is(
  (
    select proconfig
    from pg_catalog.pg_proc
    where oid = 'public.reconcile_meta_tenant_unresolved_events(uuid,text,integer)'::regprocedure
  ),
  array['search_path=pg_catalog, public']::text[],
  'late tenant reconciliation has the hardened search_path'
);

select is(
  (
    select pg_catalog.pg_get_userbyid(proowner)
    from pg_catalog.pg_proc
    where oid = 'public.reconcile_meta_tenant_unresolved_events(uuid,text,integer)'::regprocedure
  ),
  'postgres',
  'late tenant reconciliation is owned by postgres'
);

select is(
  pg_catalog.has_function_privilege(
    'service_role',
    'public.reconcile_meta_tenant_unresolved_events(uuid,text,integer)',
    'EXECUTE'
  ),
  true,
  'service_role can execute late tenant reconciliation'
);

select is(
  pg_catalog.has_function_privilege(
    'anon',
    'public.reconcile_meta_tenant_unresolved_events(uuid,text,integer)',
    'EXECUTE'
  ),
  false,
  'anon cannot execute late tenant reconciliation'
);

select is(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.reconcile_meta_tenant_unresolved_events(uuid,text,integer)',
    'EXECUTE'
  ),
  false,
  'authenticated cannot execute late tenant reconciliation'
);

insert into public.organizations (id, name, slug)
values
  ('81000000-0000-4000-8000-000000000001', 'Reconciliation tenant A', 'reconciliation-tenant-a'),
  ('81000000-0000-4000-8000-000000000002', 'Reconciliation tenant B', 'reconciliation-tenant-b');

insert into public.lead_ingestion_integration_configs (
  id,
  organization_id,
  source_system,
  external_account_id,
  allowed_form_ids,
  status
)
values
  (
    '81000000-0000-4000-8000-000000000101',
    '81000000-0000-4000-8000-000000000001',
    'meta_lead_ads',
    'page-reconciliation-a',
    array['form-allowed'],
    'active'
  ),
  (
    '81000000-0000-4000-8000-000000000102',
    '81000000-0000-4000-8000-000000000001',
    'meta_lead_ads',
    'page-reconciliation-inactive',
    array['form-allowed'],
    'inactive'
  ),
  (
    '81000000-0000-4000-8000-000000000103',
    '81000000-0000-4000-8000-000000000001',
    'other_provider',
    'page-reconciliation-other-source',
    array['form-allowed'],
    'active'
  ),
  (
    '81000000-0000-4000-8000-000000000104',
    '81000000-0000-4000-8000-000000000002',
    'meta_lead_ads',
    'page-reconciliation-b',
    array['form-allowed'],
    'active'
  ),
  (
    '81000000-0000-4000-8000-000000000105',
    '81000000-0000-4000-8000-000000000001',
    'meta_lead_ads',
    'page-reconciliation-empty-allowlist',
    '{}'::text[],
    'active'
  );

insert into public.crm_leads (
  id,
  organization_id,
  source_system,
  external_id,
  nome,
  telefone,
  pipeline,
  etapa
)
values (
  '81000000-0000-4000-8000-000000000201',
  '81000000-0000-4000-8000-000000000001',
  'meta_lead_ads',
  'lead-already-materialized',
  'Already materialized',
  '+5500000000000',
  'prospecting',
  'novos'
);

insert into public.lead_ingestion_events (
  id,
  organization_id,
  integration_config_id,
  source_system,
  event_type,
  external_event_id,
  external_id,
  form_id,
  source_payload,
  normalized_payload,
  status,
  failed_stage,
  error_category,
  last_error_code,
  last_error_message,
  retryable,
  crm_lead_id,
  materialization_result,
  processed_at,
  claim_token,
  claimed_at,
  worker_id,
  claim_expires_at
)
values
  (
    '81000000-0000-4000-8000-000000000301', null, null,
    'meta_lead_ads', 'leadgen', 'event-happy', 'lead-happy', 'form-allowed',
    '{}'::jsonb, '{"externalAccountId":"page-reconciliation-a"}'::jsonb,
    'tenant_unresolved', 'tenant_resolution', 'tenant_unresolved',
    'INTEGRATION_NOT_FOUND', 'No active integration was found.', false,
    null, null, null, null, null, null, null
  ),
  (
    '81000000-0000-4000-8000-000000000308', null, null,
    'meta_lead_ads', 'leadgen', 'event-empty-allowlist', 'lead-empty-allowlist', 'form-allowed',
    '{}'::jsonb, '{"externalAccountId":"page-reconciliation-empty-allowlist"}'::jsonb,
    'tenant_unresolved', 'tenant_resolution', 'tenant_unresolved',
    'INTEGRATION_NOT_FOUND', 'No active integration was found.', false,
    null, null, null, null, null, null, null
  ),
  (
    '81000000-0000-4000-8000-000000000302', null, null,
    'meta_lead_ads', 'leadgen', 'event-blocked-form', 'lead-blocked-form', 'form-blocked',
    '{}'::jsonb, '{"externalAccountId":"page-reconciliation-a"}'::jsonb,
    'tenant_unresolved', 'tenant_resolution', 'tenant_unresolved',
    'INTEGRATION_NOT_FOUND', 'No active integration was found.', false,
    null, null, null, null, null, null, null
  ),
  (
    '81000000-0000-4000-8000-000000000303', null, null,
    'meta_lead_ads', 'leadgen', 'event-page-mismatch', 'lead-page-mismatch', 'form-allowed',
    '{}'::jsonb, '{"externalAccountId":"page-does-not-match"}'::jsonb,
    'tenant_unresolved', 'tenant_resolution', 'tenant_unresolved',
    'INTEGRATION_NOT_FOUND', 'No active integration was found.', false,
    null, null, null, null, null, null, null
  ),
  (
    '81000000-0000-4000-8000-000000000304', null, null,
    'other_provider', 'leadgen', 'event-source-mismatch', 'lead-source-mismatch', 'form-allowed',
    '{}'::jsonb, '{"externalAccountId":"page-reconciliation-a"}'::jsonb,
    'tenant_unresolved', 'tenant_resolution', 'tenant_unresolved',
    'INTEGRATION_NOT_FOUND', 'No active integration was found.', false,
    null, null, null, null, null, null, null
  ),
  (
    '81000000-0000-4000-8000-000000000305',
    '81000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000101',
    'meta_lead_ads', 'leadgen', 'event-materialized', 'lead-already-materialized', 'form-allowed',
    '{}'::jsonb, '{"externalAccountId":"page-reconciliation-a"}'::jsonb,
    'materialized', null, null, null, null, false,
    '81000000-0000-4000-8000-000000000201', 'created', pg_catalog.clock_timestamp(),
    null, null, null, null
  ),
  (
    '81000000-0000-4000-8000-000000000306',
    '81000000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000104',
    'meta_lead_ads', 'leadgen', 'event-other-tenant', 'lead-other-tenant', 'form-allowed',
    '{}'::jsonb, '{"externalAccountId":"page-reconciliation-b"}'::jsonb,
    'fetch_pending', null, null, null, null, false,
    null, null, null, null, null, null, null
  ),
  (
    '81000000-0000-4000-8000-000000000307', null, null,
    'meta_lead_ads', 'leadgen', 'event-with-lease', 'lead-with-lease', 'form-allowed',
    '{}'::jsonb, '{"externalAccountId":"page-reconciliation-a"}'::jsonb,
    'tenant_unresolved', 'tenant_resolution', 'tenant_unresolved',
    'INTEGRATION_NOT_FOUND', 'No active integration was found.', false,
    null, null, null,
    '81000000-0000-4000-8000-000000000999',
    pg_catalog.clock_timestamp(),
    'lease-owner',
    pg_catalog.clock_timestamp() + interval '5 minutes'
  );

update public.lead_ingestion_events
set reconciliation_decision = '{"priorEvidence":"preserved"}'::jsonb
where id = '81000000-0000-4000-8000-000000000301';

create temporary table reconciliation_event_snapshots on commit drop as
select event.id, pg_catalog.to_jsonb(event) as event_state
from public.lead_ingestion_events as event
where event.id in (
  '81000000-0000-4000-8000-000000000302',
  '81000000-0000-4000-8000-000000000303',
  '81000000-0000-4000-8000-000000000304',
  '81000000-0000-4000-8000-000000000305',
  '81000000-0000-4000-8000-000000000306',
  '81000000-0000-4000-8000-000000000307',
  '81000000-0000-4000-8000-000000000308'
);

select throws_ok(
  $$select * from public.reconcile_meta_tenant_unresolved_events(
    '81000000-0000-4000-8000-000000000199', 'test', 100
  )$$,
  'P0002',
  'integration configuration was not found',
  'a nonexistent configuration is rejected'
);

select throws_ok(
  $$select * from public.reconcile_meta_tenant_unresolved_events(
    '81000000-0000-4000-8000-000000000102', 'test', 100
  )$$,
  '55000',
  'integration configuration is not active',
  'an inactive configuration is rejected'
);

select throws_ok(
  $$select * from public.reconcile_meta_tenant_unresolved_events(
    '81000000-0000-4000-8000-000000000103', 'test', 100
  )$$,
  '22023',
  'integration configuration is not a Meta lead ads configuration',
  'a different source system is rejected'
);

select throws_ok(
  $$select * from public.reconcile_meta_tenant_unresolved_events(
    '81000000-0000-4000-8000-000000000101', '   ', 100
  )$$,
  '22023',
  'reconciliation reason is required',
  'a whitespace-only reason is rejected'
);

select throws_ok(
  $$select * from public.reconcile_meta_tenant_unresolved_events(
    '81000000-0000-4000-8000-000000000101', repeat('x', 501), 100
  )$$,
  '22023',
  'reconciliation reason must contain at most 500 characters',
  'an excessive reason is rejected'
);

select throws_ok(
  $$select * from public.reconcile_meta_tenant_unresolved_events(
    '81000000-0000-4000-8000-000000000101', 'test', 0
  )$$,
  '22023',
  'reconciliation limit must be between 1 and 1000',
  'an invalid limit is rejected'
);

select results_eq(
  $$select examined_count, reconciled_count, blocked_count
    from public.reconcile_meta_tenant_unresolved_events(
      '81000000-0000-4000-8000-000000000101',
      'late configuration test',
      100
    )$$,
  $$values (2, 1, 1)$$,
  'matching unlocked events are examined according to the allowlist'
);

select is(
  (select status from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000301'),
  'fetch_pending',
  'an allowed form becomes fetch_pending'
);

select is(
  (select organization_id from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000301'),
  '81000000-0000-4000-8000-000000000001'::uuid,
  'organization is derived from the authoritative configuration'
);

select is(
  (select integration_config_id from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000301'),
  '81000000-0000-4000-8000-000000000101'::uuid,
  'integration config is associated authoritatively'
);

select is(
  (select last_error_code from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000301'),
  null,
  'the pertinent integration-not-found error is cleared'
);

select is(
  (select status from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000302'),
  'tenant_unresolved',
  'a disallowed form remains recoverable as tenant_unresolved'
);

select is(
  (select last_error_code from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000302'),
  'INTEGRATION_NOT_FOUND',
  'a disallowed form preserves its original tenant-resolution error'
);

select is(
  (select organization_id from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000302'),
  null,
  'a disallowed form remains entirely unassociated'
);

select results_eq(
  $$select examined_count, reconciled_count, blocked_count
    from public.reconcile_meta_tenant_unresolved_events(
      '81000000-0000-4000-8000-000000000101',
      'repeat test',
      100
    )$$,
  $$values (1, 0, 1)$$,
  'repeated reconciliation is mutation-idempotent and reports the remaining blocked event'
);

select results_eq(
  $$select examined_count, reconciled_count, blocked_count
    from public.reconcile_meta_tenant_unresolved_events(
      '81000000-0000-4000-8000-000000000105',
      'empty allowlist test',
      100
    )$$,
  $$values (1, 0, 1)$$,
  'an empty allowlist authorizes no event'
);

select is(
  (select row_to_json(event)::jsonb from public.lead_ingestion_events event where id = '81000000-0000-4000-8000-000000000308'),
  (select event_state from reconciliation_event_snapshots where id = '81000000-0000-4000-8000-000000000308'),
  'the empty-allowlist event remains structurally available for later reconciliation'
);

select is(
  (select pg_catalog.to_jsonb(event) from public.lead_ingestion_events event where id = '81000000-0000-4000-8000-000000000303'),
  (select event_state from reconciliation_event_snapshots where id = '81000000-0000-4000-8000-000000000303'),
  'a Page ID mismatch remains entirely unchanged'
);

select is(
  (select pg_catalog.to_jsonb(event) from public.lead_ingestion_events event where id = '81000000-0000-4000-8000-000000000304'),
  (select event_state from reconciliation_event_snapshots where id = '81000000-0000-4000-8000-000000000304'),
  'a source-system mismatch remains entirely unchanged'
);

select is(
  (select status from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000305'),
  'materialized',
  'an already materialized event remains unchanged'
);

select is(
  (select crm_lead_id from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000305'),
  '81000000-0000-4000-8000-000000000201'::uuid,
  'external materialization identity is preserved'
);

select is(
  (select pg_catalog.to_jsonb(event) from public.lead_ingestion_events event where id = '81000000-0000-4000-8000-000000000306'),
  (select event_state from reconciliation_event_snapshots where id = '81000000-0000-4000-8000-000000000306'),
  'an event belonging to another tenant/config remains entirely unchanged'
);

select is(
  (select status from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000307'),
  'tenant_unresolved',
  'an event carrying a lease is not reconciled'
);

select is(
  (select pg_catalog.to_jsonb(event) from public.lead_ingestion_events event where id = '81000000-0000-4000-8000-000000000307'),
  (select event_state from reconciliation_event_snapshots where id = '81000000-0000-4000-8000-000000000307'),
  'an event carrying a lease remains entirely unchanged'
);

create temporary table reconciliation_claim_result on commit drop as
select *
from public.claim_lead_ingestion_events('reconciliation-worker', 1, 300);

select is(
  (
    select pg_catalog.count(*)::integer
    from reconciliation_claim_result
    where id = '81000000-0000-4000-8000-000000000301'
  ),
  1,
  'a reconciled event is eligible for the authoritative claim operation'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from reconciliation_claim_result
    where id in (
      '81000000-0000-4000-8000-000000000302',
      '81000000-0000-4000-8000-000000000303',
      '81000000-0000-4000-8000-000000000304',
      '81000000-0000-4000-8000-000000000307'
    )
  ),
  0,
  'rejected, mismatched, unresolved, and leased events are not claimed'
);

select is(
  (select pg_catalog.count(*)::integer from public.crm_leads where external_id = 'lead-already-materialized'),
  1,
  'reconciliation does not duplicate an existing external lead identity'
);

select is(
  (select pg_catalog.count(*)::integer from public.crm_leads),
  1,
  'reconciliation never materializes a lead'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from information_schema.parameters
    where specific_schema = 'public'
      and specific_name like 'reconcile_meta_tenant_unresolved_events_%'
      and parameter_mode = 'OUT'
  ),
  3,
  'the result exposes exactly three aggregate fields'
);

select is(
  (
    select pg_catalog.bool_and(parameter_name in (
      'examined_count',
      'reconciled_count',
      'blocked_count'
    ))
    from information_schema.parameters
    where specific_schema = 'public'
      and specific_name like 'reconcile_meta_tenant_unresolved_events_%'
      and parameter_mode = 'OUT'
  ),
  true,
  'the result does not expose payloads or external identifiers'
);

select is(
  (select attempt_count from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000302'),
  0,
  'reconciliation does not consume a processing attempt for a blocked form'
);

select is(
  (select manual_reprocess_reason from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000301'),
  'late configuration test',
  'reconciliation records the bounded operational reason'
);

select is(
  (select reconciliation_decision #>> '{lateTenantResolution,result}' from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000301'),
  'fetch_pending',
  'reconciliation records a safe decision marker'
);

select is(
  (select reconciliation_decision ? 'externalAccountId' from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000301'),
  false,
  'reconciliation audit metadata excludes external account identifiers'
);

select is(
  (select reconciliation_decision ? 'leadgenId' from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000301'),
  false,
  'reconciliation audit metadata excludes lead identifiers'
);

select is(
  (select retryable from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000301'),
  false,
  'reconciliation does not alter processing retry policy'
);

select is(
  (select next_attempt_at from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000301'),
  null,
  'a reconciled event is immediately eligible rather than delayed'
);

select is(
  (
    select not exists (
      select 1
      from pg_catalog.aclexplode(
        coalesce(
          procedure.proacl,
          pg_catalog.acldefault('f', procedure.proowner)
        )
      ) as privilege
      where privilege.grantee = 0
        and privilege.privilege_type = 'EXECUTE'
    )
    from pg_catalog.pg_proc as procedure
    where procedure.oid = 'public.reconcile_meta_tenant_unresolved_events(uuid,text,integer)'::regprocedure
  ),
  true,
  'PUBLIC cannot execute late tenant reconciliation'
);

select is(
  (select failed_stage from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000302'),
  'tenant_resolution',
  'a blocked event preserves its failed stage'
);

select is(
  (select integration_config_id from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000302'),
  null,
  'a blocked event preserves its null integration association'
);

select is(
  (select manual_reprocess_reason from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000302'),
  null,
  'a blocked event receives no misleading reconciliation audit reason'
);

select is(
  (select reconciliation_decision ->> 'priorEvidence' from public.lead_ingestion_events where id = '81000000-0000-4000-8000-000000000301'),
  'preserved',
  'late reconciliation preserves preexisting reconciliation evidence'
);

select is(
  (
    select is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lead_ingestion_integration_configs'
      and column_name = 'allowed_form_ids'
  ),
  'NO',
  'the canonical allowlist cannot be NULL'
);

select * from finish();

rollback;
