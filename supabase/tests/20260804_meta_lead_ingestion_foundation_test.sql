begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(26);

select has_column('public', 'lead_ingestion_integration_configs', 'allowed_form_ids',
  'integration config has an explicit form allowlist');
select has_column('public', 'lead_ingestion_events', 'failed_stage',
  'events persist the failed stage');
select has_column('public', 'lead_ingestion_events', 'claim_token',
  'events persist an exclusive claim token');
select has_column('public', 'lead_ingestion_events', 'claim_expires_at',
  'events persist lease expiration');
select has_function('public', 'claim_lead_ingestion_events', array['text', 'integer', 'integer'],
  'claim RPC exists');
select has_function('public', 'retry_lead_ingestion_event', array['uuid', 'uuid', 'text'],
  'deterministic retry RPC exists');
select has_function('public', 'materialize_lead_ingestion_event_transaction',
  array['uuid', 'uuid', 'uuid', 'timestamp with time zone'],
  'tenant-safe materialization RPC exists');

select ok(
  not has_table_privilege('anon', 'public.lead_ingestion_integration_configs', 'SELECT'),
  'anonymous cannot read integration configuration'
);
select ok(
  not has_table_privilege('authenticated', 'public.lead_ingestion_integration_configs', 'SELECT'),
  'authenticated users cannot read integration configuration directly'
);
select ok(
  not has_function_privilege('anon',
    'public.claim_lead_ingestion_events(text,integer,integer)', 'EXECUTE'),
  'anonymous cannot claim events'
);
select ok(
  not has_function_privilege('authenticated',
    'public.retry_lead_ingestion_event(uuid,uuid,text)', 'EXECUTE'),
  'authenticated users cannot retry events directly'
);
select ok(
  not has_function_privilege('authenticated',
    'public.materialize_lead_ingestion_event_transaction(uuid,uuid,uuid,timestamp with time zone)', 'EXECUTE'),
  'authenticated users cannot materialize events directly'
);

insert into public.organizations (id, name, slug)
values
  ('10000000-0000-4000-8000-000000000001', 'Meta Test A', 'meta-test-a'),
  ('10000000-0000-4000-8000-000000000002', 'Meta Test B', 'meta-test-b');

insert into public.lead_ingestion_integration_configs (
  id, organization_id, source_system, external_account_id, allowed_form_ids
) values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'meta_lead_ads', 'page-test-a', array['form-allowed']
);

select throws_ok(
  $$insert into public.lead_ingestion_integration_configs
      (organization_id, source_system, external_account_id, allowed_form_ids)
    values
      ('10000000-0000-4000-8000-000000000002', 'meta_lead_ads', 'page-test-a', array['other-form'])$$,
  '23505', null,
  'a Meta page cannot be shared by organizations in V1'
);

insert into public.lead_ingestion_events (
  id, source_system, external_id, event_type, status,
  source_payload, normalized_payload, failed_stage, error_category
) values (
  '30000000-0000-4000-8000-000000000001',
  'meta_lead_ads', 'lead-unresolved', 'leadgen', 'tenant_unresolved',
  '{"pageId":"unknown"}', '{"externalId":"lead-unresolved"}',
  'tenant_resolution', 'tenant_unresolved'
);

select is(
  (select organization_id from public.lead_ingestion_events
    where id = '30000000-0000-4000-8000-000000000001'),
  null::uuid,
  'tenant unresolved is preserved without an organization'
);

select is_empty(
  $$select * from public.claim_lead_ingestion_events('worker-a', 10, 60)
    where id = '30000000-0000-4000-8000-000000000001'$$,
  'tenant unresolved cannot be claimed'
);

insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload
) values (
  '30000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'meta_lead_ads', 'lead-claim', 'leadgen', 'form-allowed', 'fetch_pending',
  '{}', '{"fullName":"Lead Claim","formId":"form-allowed"}'
);

select is(
  (select count(*)::integer from public.claim_lead_ingestion_events(
    'worker-a', 10, 60)),
  1,
  'eligible event receives one claim'
);

select is(
  (select count(*)::integer from public.claim_lead_ingestion_events(
    'worker-b', 10, 60)),
  0,
  'a valid lease blocks a second worker'
);

-- Fixture-only expiration: production reclaim always compares with the database clock.
update public.lead_ingestion_events
set claim_expires_at = clock_timestamp() - interval '1 second'
where id = '30000000-0000-4000-8000-000000000002';

select is(
  (select count(*)::integer from public.claim_lead_ingestion_events(
    'worker-b', 10, 60)),
  1,
  'an expired lease can be recovered'
);

update public.lead_ingestion_events
set status = 'processing_failed', failed_stage = 'materialization',
    retryable = true, next_attempt_at = now(),
    claim_token = '40000000-0000-4000-8000-000000000010',
    claimed_at = clock_timestamp(), claim_expires_at = clock_timestamp() + interval '10 minutes',
    worker_id = 'worker-retry'
where id = '30000000-0000-4000-8000-000000000002';

select is(
  (public.retry_lead_ingestion_event(
    '30000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000010', 'test retry')),
  'retried',
  'materialization failure resumes at materialization pending'
);

update public.lead_ingestion_events
set status = 'processing_failed', failed_stage = 'graph_fetch', retryable = true,
    claim_token = '40000000-0000-4000-8000-000000000011',
    claimed_at = clock_timestamp(), claim_expires_at = clock_timestamp() + interval '10 minutes',
    worker_id = 'worker-retry'
where id = '30000000-0000-4000-8000-000000000002';

select is(
  (public.retry_lead_ingestion_event(
    '30000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000011', 'test graph retry')),
  'retried',
  'Graph failure resumes at fetch pending'
);

update public.lead_ingestion_events
set status = 'materialization_pending',
    claim_token = '40000000-0000-4000-8000-000000000001',
    claimed_at = clock_timestamp(),
    claim_expires_at = clock_timestamp() + interval '10 minutes',
    worker_id = 'worker-materialize',
    normalized_payload = '{"fullName":"Somente Nome","formId":"form-allowed"}'
where id = '30000000-0000-4000-8000-000000000002';

select lives_ok(
  $$select * from public.materialize_lead_ingestion_event_transaction(
    '30000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001', null,
    '2026-08-04T12:01:00Z')$$,
  'a valid lead with only a name can be materialized'
);

select is(
  (select pipeline || '/' || etapa from public.crm_leads
    where external_id = 'lead-claim'),
  'prospecting/novos',
  'a Meta lead is created in canonical Novos'
);

select isnt(
  (select etapa from public.crm_leads where external_id = 'lead-claim'),
  'perdidos',
  'ingestion never creates a lead in Perdidos'
);

select is(
  (select status from public.lead_ingestion_events
    where id = '30000000-0000-4000-8000-000000000002'),
  'materialized',
  'event and lead are committed together'
);

select is(
  (select count(*)::integer from public.crm_leads
    where source_system = 'meta_lead_ads' and external_id = 'lead-claim'),
  1,
  'repeated technical identity has only one CRM lead'
);

insert into public.crm_leads (id, organization_id, nome, source_system, external_id)
values (
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'Lead de Outro Tenant', 'evolv', 'other-tenant-lead'
);

insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload,
  claim_token, claimed_at, claim_expires_at, worker_id
) values (
  '30000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'meta_lead_ads', 'cross-tenant-attempt', 'leadgen', 'form-allowed',
  'materialization_pending', '{}',
  '{"fullName":"Tentativa Cross Tenant","formId":"form-allowed"}',
  '40000000-0000-4000-8000-000000000002',
  clock_timestamp(), clock_timestamp() + interval '10 minutes', 'worker-cross'
);

select throws_ok(
  $$select * from public.materialize_lead_ingestion_event_transaction(
    '30000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000001',
    '2026-08-04T12:01:00Z')$$,
  'P0001', null,
  'a target lead from another tenant is refused'
);

select * from finish();
rollback;
