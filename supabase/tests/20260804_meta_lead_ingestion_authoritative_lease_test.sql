begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(78);

select has_function('public', 'claim_lead_ingestion_events',
  array['text', 'integer', 'integer'], 'database-clock claim RPC exists');
select hasnt_function('public', 'claim_lead_ingestion_events',
  array['text', 'integer', 'integer', 'timestamp with time zone'],
  'legacy caller-clock claim overload is absent');

select has_function('public', 'mark_meta_lead_ingestion_event_enriched',
  array['uuid', 'uuid', 'jsonb'], 'authoritative enrichment RPC exists');
select has_function('public', 'mark_meta_lead_ingestion_event_failed',
  array['uuid', 'uuid', 'text', 'text', 'boolean', 'text'],
  'authoritative failure RPC exists');
select has_function('public', 'retry_lead_ingestion_event',
  array['uuid', 'uuid', 'text'], 'claim-bound retry RPC exists');
select hasnt_function('public', 'retry_lead_ingestion_event',
  array['uuid', 'text', 'timestamp with time zone'], 'legacy retry overload is absent');

select ok(not has_function_privilege('anon',
  'public.mark_meta_lead_ingestion_event_enriched(uuid,uuid,jsonb)', 'EXECUTE'),
  'anonymous cannot enrich claimed events');
select ok(not has_function_privilege('authenticated',
  'public.mark_meta_lead_ingestion_event_failed(uuid,uuid,text,text,boolean,text)', 'EXECUTE'),
  'authenticated users cannot mark claimed events failed');
select ok(not has_function_privilege('authenticated',
  'public.retry_lead_ingestion_event(uuid,uuid,text)', 'EXECUTE'),
  'authenticated users cannot retry claimed events');
select ok(
  not has_function_privilege('public', 'public.claim_lead_ingestion_events(text,integer,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.claim_lead_ingestion_events(text,integer,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.claim_lead_ingestion_events(text,integer,integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.claim_lead_ingestion_events(text,integer,integer)', 'EXECUTE'),
  'claim privileges are restricted to service_role');
select ok(
  (select bool_and(proc.prosecdef and proc.proconfig = array['search_path=pg_catalog, public'])
   from pg_proc proc
   join pg_namespace namespace on namespace.oid = proc.pronamespace
   where namespace.nspname = 'public'
     and proc.proname in (
       'claim_lead_ingestion_events',
       'mark_meta_lead_ingestion_event_enriched',
       'mark_meta_lead_ingestion_event_failed',
       'retry_lead_ingestion_event',
       'materialize_lead_ingestion_event_transaction'
     )),
  'all claim mutation RPCs are security definer with hardened search_path');
select ok(
  not has_function_privilege('public', 'public.mark_meta_lead_ingestion_event_enriched(uuid,uuid,jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.mark_meta_lead_ingestion_event_enriched(uuid,uuid,jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.mark_meta_lead_ingestion_event_enriched(uuid,uuid,jsonb)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.mark_meta_lead_ingestion_event_enriched(uuid,uuid,jsonb)', 'EXECUTE'),
  'enrichment privileges are restricted to service_role');
select ok(
  not has_function_privilege('public', 'public.mark_meta_lead_ingestion_event_failed(uuid,uuid,text,text,boolean,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.mark_meta_lead_ingestion_event_failed(uuid,uuid,text,text,boolean,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.mark_meta_lead_ingestion_event_failed(uuid,uuid,text,text,boolean,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.mark_meta_lead_ingestion_event_failed(uuid,uuid,text,text,boolean,text)', 'EXECUTE'),
  'failure privileges are restricted to service_role');
select ok(
  not has_function_privilege('public', 'public.retry_lead_ingestion_event(uuid,uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.retry_lead_ingestion_event(uuid,uuid,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.retry_lead_ingestion_event(uuid,uuid,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.retry_lead_ingestion_event(uuid,uuid,text)', 'EXECUTE'),
  'retry privileges are restricted to service_role');
select ok(
  not has_function_privilege('public', 'public.materialize_lead_ingestion_event_transaction(uuid,uuid,uuid,timestamp with time zone)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.materialize_lead_ingestion_event_transaction(uuid,uuid,uuid,timestamp with time zone)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.materialize_lead_ingestion_event_transaction(uuid,uuid,uuid,timestamp with time zone)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.materialize_lead_ingestion_event_transaction(uuid,uuid,uuid,timestamp with time zone)', 'EXECUTE'),
  'materialization privileges are restricted to service_role');

insert into public.organizations (id, name, slug)
values
  ('71000000-0000-4000-8000-000000000001', 'Lease Test A', 'lease-test-a'),
  ('71000000-0000-4000-8000-000000000002', 'Lease Test B', 'lease-test-b');

insert into public.lead_ingestion_integration_configs (
  id, organization_id, source_system, external_account_id, status, allowed_form_ids
) values (
  '72000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  'meta_lead_ads', 'lease-page-a', 'active', array['lease-form-a']
);

insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload,
  claim_token, claimed_at, claim_expires_at, worker_id
) values
  ('73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'lease-enrich-valid',
   'leadgen', 'lease-form-a', 'fetch_pending', '{}', '{}',
   '74000000-0000-4000-8000-000000000001', clock_timestamp(),
   clock_timestamp() + interval '10 minutes', 'worker-a'),
  ('73000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'lease-enrich-expired',
   'leadgen', 'lease-form-a', 'fetch_pending', '{}', '{}',
   '74000000-0000-4000-8000-000000000002', clock_timestamp() - interval '2 minutes',
   clock_timestamp() - interval '1 minute', 'worker-old'),
  ('73000000-0000-4000-8000-000000000003', '72000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'lease-failure-expired',
   'leadgen', 'lease-form-a', 'fetch_pending', '{}', '{}',
   '74000000-0000-4000-8000-000000000003', clock_timestamp() - interval '2 minutes',
   clock_timestamp() - interval '1 minute', 'worker-old'),
  ('73000000-0000-4000-8000-000000000004', '72000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'lease-retry-valid',
   'leadgen', 'lease-form-a', 'processing_failed', '{}', '{}',
   '74000000-0000-4000-8000-000000000004', clock_timestamp(),
   clock_timestamp() + interval '10 minutes', 'worker-a'),
  ('73000000-0000-4000-8000-000000000005', '72000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'lease-retry-expired',
   'leadgen', 'lease-form-a', 'processing_failed', '{}', '{}',
   '74000000-0000-4000-8000-000000000005', clock_timestamp() - interval '2 minutes',
   clock_timestamp() - interval '1 minute', 'worker-old'),
  ('73000000-0000-4000-8000-000000000006', '72000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'lease-reclaimed',
   'leadgen', 'lease-form-a', 'processing_failed', '{}', '{}',
   '74000000-0000-4000-8000-000000000099', clock_timestamp(),
   clock_timestamp() + interval '10 minutes', 'worker-new'),
  ('73000000-0000-4000-8000-000000000007', '72000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'lease-materialize-expired',
   'leadgen', 'lease-form-a', 'materialization_pending', '{}',
   '{"fullName":"Expired Lead","formId":"lease-form-a"}',
   '74000000-0000-4000-8000-000000000007', clock_timestamp() - interval '2 minutes',
   clock_timestamp() - interval '1 minute', 'worker-old'),
  ('73000000-0000-4000-8000-000000000008', '72000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'lease-materialize-valid',
   'leadgen', 'lease-form-a', 'materialization_pending', '{}',
   '{"fullName":"Canonical Lease Lead","formId":"lease-form-a"}',
   '74000000-0000-4000-8000-000000000008', clock_timestamp(),
   clock_timestamp() + interval '10 minutes', 'worker-a'),
  ('73000000-0000-4000-8000-000000000009', '72000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'lease-terminal',
   'leadgen', 'lease-form-a', 'fetch_pending', '{}', '{}',
   '74000000-0000-4000-8000-000000000009', clock_timestamp(),
   clock_timestamp() + interval '10 minutes', 'worker-a');

update public.lead_ingestion_events
set failed_stage = 'graph_fetch', retryable = true
where id in (
  '73000000-0000-4000-8000-000000000004',
  '73000000-0000-4000-8000-000000000005',
  '73000000-0000-4000-8000-000000000006'
);

select ok(public.mark_meta_lead_ingestion_event_enriched(
  '73000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000001',
  '{"fullName":"Enriched Lead","formId":"lease-form-a"}'),
  'enrichment accepts the current token while the database lease is valid');
select is((select status from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000001'),
  'materialization_pending', 'valid enrichment performs the canonical transition');

select ok(not public.mark_meta_lead_ingestion_event_enriched(
  '73000000-0000-4000-8000-000000000002',
  '74000000-0000-4000-8000-000000000002', '{"fullName":"Too Late"}'),
  'enrichment is refused when the lease expired before SQL execution');
select is((select status from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000002'),
  'fetch_pending', 'refused enrichment does not change state');

select ok(not public.mark_meta_lead_ingestion_event_failed(
  '73000000-0000-4000-8000-000000000003',
  '74000000-0000-4000-8000-000000000003',
  'graph_timeout', 'Safe failure.', true, 'graph_fetch'),
  'failure mutation is refused after database lease expiration');
select is((select status from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000003'),
  'fetch_pending', 'refused failure does not change state');

select is(public.retry_lead_ingestion_event(
  '73000000-0000-4000-8000-000000000004',
  '74000000-0000-4000-8000-000000000004', 'graph_timeout'),
  'retried', 'retry accepts the current token and a valid database lease');
select is((select status from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000004'),
  'fetch_pending', 'valid retry preserves canonical retry policy');

select is(public.retry_lead_ingestion_event(
  '73000000-0000-4000-8000-000000000005',
  '74000000-0000-4000-8000-000000000005', 'graph_timeout'),
  'lease_lost', 'retry is refused after database lease expiration');
select is((select status from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000005'),
  'processing_failed', 'refused retry does not change state');
select is((select attempt_count from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000005'), 0,
  'expired lease does not consume an attempt');
select is((select claim_token from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000005'),
  '74000000-0000-4000-8000-000000000005'::uuid,
  'expired lease preserves the existing claim');

select is(public.retry_lead_ingestion_event(
  '73000000-0000-4000-8000-000000000006',
  '74000000-0000-4000-8000-000000000006', 'graph_timeout'),
  'lease_lost', 'retry is refused with an old token after another worker claims the event');
select is((select worker_id from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000006'),
  'worker-new', 'the new worker is not mutated by the old worker');
select is((select attempt_count from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000006'), 0,
  'old token does not consume an attempt');
select is((select claim_token from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000006'),
  '74000000-0000-4000-8000-000000000099'::uuid,
  'old token preserves the replacement claim');

select is_empty($$select * from public.materialize_lead_ingestion_event_transaction(
  '73000000-0000-4000-8000-000000000007',
  '74000000-0000-4000-8000-000000000007', null,
  clock_timestamp() - interval '1 hour')$$,
  'materialization ignores a historical worker timestamp and refuses an expired database lease');
select is((select status from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000007'),
  'materialization_pending', 'refused materialization does not change event state');
select is((select count(*)::integer from public.crm_leads
  where external_id = 'lease-materialize-expired'), 0,
  'refused materialization creates no CRM lead');

select is_empty($$select * from public.materialize_lead_ingestion_event_transaction(
  '73000000-0000-4000-8000-000000000008',
  '74000000-0000-4000-8000-000000000099', null, clock_timestamp())$$,
  'materialization is refused with an old or foreign claim token');

select lives_ok($$select * from public.materialize_lead_ingestion_event_transaction(
  '73000000-0000-4000-8000-000000000008',
  '74000000-0000-4000-8000-000000000008', null, clock_timestamp())$$,
  'materialization accepts the current token and valid database lease');
select lives_ok($$select * from public.materialize_lead_ingestion_event_transaction(
  '73000000-0000-4000-8000-000000000008',
  '74000000-0000-4000-8000-000000000008', null, clock_timestamp())$$,
  'repeated materialization returns the persisted idempotent result');
select is((select pipeline || '/' || etapa from public.crm_leads
  where external_id = 'lease-materialize-valid'), 'prospecting/novos',
  'valid Meta lead remains in canonical prospecting Novos');
select isnt((select etapa from public.crm_leads
  where external_id = 'lease-materialize-valid'), 'perdidos',
  'authoritative lease enforcement introduces no path to Perdidos');
select is((select organization_id from public.crm_leads
  where external_id = 'lease-materialize-valid'),
  '71000000-0000-4000-8000-000000000001'::uuid,
  'materialization preserves integration-config tenancy');
select is((select count(*)::integer from public.crm_leads
  where external_id = 'lease-materialize-valid'), 1,
  'materialization remains idempotent for the external identity');
select is((select materialization_result from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000008'),
  'created', 'repeated materialization preserves the original result');
select is((select crm_lead_id from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000008'),
  (select id from public.crm_leads where external_id = 'lease-materialize-valid'),
  'repeated materialization preserves the original CRM link');

select ok(public.mark_meta_lead_ingestion_event_failed(
  '73000000-0000-4000-8000-000000000009',
  '74000000-0000-4000-8000-000000000009',
  'graph_auth_failed', 'Safe terminal failure.', false, 'graph_fetch'),
  'terminal failure accepts the valid current claim');
select is((select status from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000009'),
  'review_required', 'terminal failure remains terminal without retry loop');

-- Bounded retry: attempt_count is the number of claims already granted.
update public.lead_ingestion_events
set status = 'processing_failed', failed_stage = 'graph_fetch', retryable = true,
    attempt_count = 2,
    claim_token = '74000000-0000-4000-8000-000000000010',
    claimed_at = clock_timestamp(), claim_expires_at = clock_timestamp() + interval '10 minutes',
    worker_id = 'worker-last-opportunity'
where id = '73000000-0000-4000-8000-000000000002';

select is(public.retry_lead_ingestion_event(
  '73000000-0000-4000-8000-000000000002',
  '74000000-0000-4000-8000-000000000010', 'last opportunity'),
  'retried', 'attempt two may open the third and final processing opportunity');
select is((select status from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000002'),
  'fetch_pending', 'last valid retry returns to the fetch state');

select is((select count(*)::integer from public.claim_lead_ingestion_events(
  'worker-final-attempt', 1, 600)
  where id = '73000000-0000-4000-8000-000000000002'), 1,
  'the final processing opportunity is claimed');
select is((select attempt_count from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000002'), 3,
  'the third claim records the finite attempt ceiling');
select ok(public.mark_meta_lead_ingestion_event_failed(
  '73000000-0000-4000-8000-000000000002',
  (select claim_token from public.lead_ingestion_events where id = '73000000-0000-4000-8000-000000000002'),
  'graph_timeout', 'Safe bounded failure.', true, 'graph_fetch'),
  'the final attempt records its retryable failure before exhaustion');
select is(public.retry_lead_ingestion_event(
  '73000000-0000-4000-8000-000000000002',
  (select claim_token from public.lead_ingestion_events where id = '73000000-0000-4000-8000-000000000002'),
  'bounded exhaustion'), 'retry_exhausted',
  'retry after the third failed claim transitions to retry_exhausted');
select is((select status from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000002'),
  'retry_exhausted', 'exhaustion is terminal');
select is((select retryable from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000002'), false,
  'exhaustion clears retryable');
select is((select claim_token from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000002'), null::uuid,
  'exhaustion clears the claim token');
select is((select worker_id from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000002'), null::text,
  'exhaustion clears the claimed worker');
select is((select claimed_at from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000002'), null::timestamptz,
  'exhaustion clears claimed_at');
select is((select claim_expires_at from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000002'), null::timestamptz,
  'exhaustion clears claim expiration');
select is_empty($$select * from public.claim_lead_ingestion_events(
  'worker-after-exhaustion', 100, 60)
  where id = '73000000-0000-4000-8000-000000000002'$$,
  'retry_exhausted cannot be claimed again');
select is(public.retry_lead_ingestion_event(
  '73000000-0000-4000-8000-000000000002',
  '74000000-0000-4000-8000-000000000010', 'must remain terminal'),
  'lease_lost', 'retry_exhausted cannot be retried again');
select is((select count(*)::integer from public.crm_leads
  where external_id = 'lease-enrich-expired'), 0,
  'retry exhaustion creates no CRM lead');

-- Incompatible states refuse without consuming attempts or changing claims.
create temporary table incompatible_material_snapshot as
select status, attempt_count, claim_token
from public.lead_ingestion_events
where id = '73000000-0000-4000-8000-000000000003';
select is(public.retry_lead_ingestion_event(
  '73000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000001', 'wrong state'),
  'lease_lost', 'retry refuses an incompatible state');
select ok(not public.mark_meta_lead_ingestion_event_enriched(
  '73000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000001', '{"fullName":"Wrong State"}'),
  'enrichment refuses an incompatible state');
select ok(not public.mark_meta_lead_ingestion_event_failed(
  '73000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000001',
  'graph_timeout', 'Wrong state.', true, 'graph_fetch'),
  'failure refuses an incompatible state/stage pair');
select is_empty($$select * from public.materialize_lead_ingestion_event_transaction(
  '73000000-0000-4000-8000-000000000003',
  '74000000-0000-4000-8000-000000000003', null, clock_timestamp())$$,
  'materialization refuses an incompatible state');
select is((select attempt_count from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000001'), 0,
  'incompatible operations do not consume an attempt');
select is((select claim_token from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000001'),
  '74000000-0000-4000-8000-000000000001'::uuid,
  'incompatible operations preserve the current claim');
select is((select status from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000001'),
  'materialization_pending', 'incompatible enrichment, failure and retry preserve state');
select is((select count(*)::integer from public.crm_leads
  where external_id = 'lease-enrich-valid'), 0,
  'incompatible enrichment, failure and retry create no lead');
select is((select status from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000003'),
  (select status from incompatible_material_snapshot),
  'incompatible materialization preserves state');
select is((select attempt_count from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000003'),
  (select attempt_count from incompatible_material_snapshot),
  'incompatible materialization does not consume an attempt');
select is((select claim_token from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000003'),
  (select claim_token from incompatible_material_snapshot),
  'incompatible materialization preserves the claim');
select is((select count(*)::integer from public.crm_leads
  where external_id = 'lease-failure-expired'), 0,
  'incompatible materialization creates no lead');

-- Real claim/reclaim proves the previous worker cannot mutate the replacement claim.
insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload, received_at
) values (
  '73000000-0000-4000-8000-000000000014', '72000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'lease-real-reclaim',
  'leadgen', 'lease-form-a', 'fetch_pending', '{}', '{}', clock_timestamp() - interval '1 day'
);
create temporary table old_claim_evidence as
select id, claim_token
from public.claim_lead_ingestion_events('worker-old-real', 1, 60)
where id = '73000000-0000-4000-8000-000000000014';
select is_empty($$select * from public.claim_lead_ingestion_events('worker-early-real', 1, 600)
  where id = '73000000-0000-4000-8000-000000000014'$$,
  'a valid lease cannot be anticipated by a caller-supplied timestamp');
-- Fixture-only expiration: this direct update prepares an expired lease; it is
-- not a production reclaim operation or a caller-controlled clock contract.
update public.lead_ingestion_events
set
  claimed_at = clock_timestamp() - interval '2 minutes',
  claim_expires_at = clock_timestamp() - interval '1 minute'
where id = '73000000-0000-4000-8000-000000000014';
create temporary table new_claim_evidence as
select id, claim_token
from public.claim_lead_ingestion_events('worker-new-real', 1, 600)
where id = '73000000-0000-4000-8000-000000000014';
select isnt((select claim_token from old_claim_evidence),
  (select claim_token from new_claim_evidence), 'real reclaim replaces the claim token');
select ok(not public.mark_meta_lead_ingestion_event_failed(
  '73000000-0000-4000-8000-000000000014',
  (select claim_token from old_claim_evidence),
  'graph_timeout', 'Old worker.', true, 'graph_fetch'),
  'the previous worker cannot mutate the replacement claim');
select is((select worker_id from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000014'),
  'worker-new-real', 'the replacement worker remains unchanged');
select is((select attempt_count from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000014'), 2,
  'the refused old worker does not consume another attempt');
select is((select claim_token from public.lead_ingestion_events
  where id = '73000000-0000-4000-8000-000000000014'),
  (select claim_token from new_claim_evidence),
  'the refused old worker preserves the real replacement claim');

select * from finish();
rollback;
