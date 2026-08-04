begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(20);

insert into public.organizations (id, name, slug)
values ('61000000-0000-4000-8000-000000000001', 'Meta Security Review', 'meta-security-review');

insert into public.lead_ingestion_integration_configs (
  id, organization_id, source_system, external_account_id, status, allowed_form_ids
) values
  ('62000000-0000-4000-8000-000000000001',
   '61000000-0000-4000-8000-000000000001',
   'meta_lead_ads', 'page-empty-allowlist', 'active', '{}'),
  ('62000000-0000-4000-8000-000000000002',
   '61000000-0000-4000-8000-000000000001',
   'meta_lead_ads', 'page-inactive', 'inactive', array['form-authorized']);

insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload,
  failed_stage, error_category, retryable, last_error_code
) values
  ('63000000-0000-4000-8000-000000000001',
   '62000000-0000-4000-8000-000000000001',
   '61000000-0000-4000-8000-000000000001',
   'meta_lead_ads', 'historically-observed-form', 'leadgen', 'form-observed-only',
   'rejected', '{}', '{"formId":"form-observed-only"}',
   'authorization', 'form_not_allowed', false, 'FORM_NOT_ALLOWED'),
  ('63000000-0000-4000-8000-000000000002',
   '62000000-0000-4000-8000-000000000002',
   '61000000-0000-4000-8000-000000000001',
   'meta_lead_ads', 'inactive-integration-event', 'leadgen', 'form-authorized',
   'rejected', '{}', '{"formId":"form-authorized"}',
   'authorization', 'integration_inactive', false, 'INTEGRATION_INACTIVE');

select is(
  cardinality((select allowed_form_ids from public.lead_ingestion_integration_configs
    where id = '62000000-0000-4000-8000-000000000001')),
  0,
  'an observed form does not populate an empty allowlist'
);
select is(
  (select form_id from public.lead_ingestion_events
    where id = '63000000-0000-4000-8000-000000000001'),
  'form-observed-only',
  'historical form evidence remains on the event'
);
select is(
  (select error_category from public.lead_ingestion_events
    where id = '63000000-0000-4000-8000-000000000001'),
  'form_not_allowed',
  'known page with an unauthorized form has canonical authorization diagnostic'
);
select is_empty(
  $$select * from public.claim_lead_ingestion_events('security-review', 10, 60)
    where id = '63000000-0000-4000-8000-000000000001'$$,
  'unauthorized form event cannot be claimed'
);

select is(
  (select status from public.lead_ingestion_events
    where id = '63000000-0000-4000-8000-000000000002'),
  'rejected', 'inactive integration is terminally rejected'
);
select is(
  (select failed_stage from public.lead_ingestion_events
    where id = '63000000-0000-4000-8000-000000000002'),
  'authorization', 'inactive integration fails during authorization'
);
select is(
  (select error_category from public.lead_ingestion_events
    where id = '63000000-0000-4000-8000-000000000002'),
  'integration_inactive', 'inactive integration has its own error category'
);
select is(
  (select retryable from public.lead_ingestion_events
    where id = '63000000-0000-4000-8000-000000000002'),
  false, 'inactive integration is not automatically retryable'
);

update public.lead_ingestion_integration_configs
set status = 'active'
where id = '62000000-0000-4000-8000-000000000002';

select is(
  (select status || '/' || error_category from public.lead_ingestion_events
    where id = '63000000-0000-4000-8000-000000000002'),
  'rejected/integration_inactive',
  'reactivation does not silently reprocess an old event'
);

select ok(not has_schema_privilege('anon', 'public', 'CREATE'),
  'anon cannot create objects in public');
select ok(not has_schema_privilege('authenticated', 'public', 'CREATE'),
  'authenticated cannot create objects in public');
select ok(not has_schema_privilege('public', 'public', 'CREATE'),
  'PUBLIC cannot create objects in public');

select ok(has_table_privilege('service_role', 'public.lead_ingestion_events', 'SELECT,INSERT,UPDATE'),
  'service role has the event DML required by webhook and worker');
select ok(has_table_privilege('service_role', 'public.lead_ingestion_integration_configs', 'SELECT,INSERT,UPDATE'),
  'service role has the configuration DML required by the resolver');

select ok(not has_function_privilege('public',
  'public.claim_lead_ingestion_events(text,integer,integer,timestamp with time zone)', 'EXECUTE'),
  'PUBLIC cannot execute claim');
select ok(not has_function_privilege('public',
  'public.retry_lead_ingestion_event(uuid,text,timestamp with time zone)', 'EXECUTE'),
  'PUBLIC cannot execute retry');
select ok(not has_function_privilege('public',
  'public.materialize_lead_ingestion_event_transaction(uuid,uuid,uuid,timestamp with time zone)', 'EXECUTE'),
  'PUBLIC cannot execute materialization');

select is(
  (select proconfig::text from pg_proc where oid =
    'public.claim_lead_ingestion_events(text,integer,integer,timestamp with time zone)'::regprocedure),
  '{"search_path=pg_catalog, public"}', 'claim has a hardened search path'
);
select is(
  (select proconfig::text from pg_proc where oid =
    'public.retry_lead_ingestion_event(uuid,text,timestamp with time zone)'::regprocedure),
  '{"search_path=pg_catalog, public"}', 'retry has a hardened search path'
);
select is(
  (select proconfig::text from pg_proc where oid =
    'public.materialize_lead_ingestion_event_transaction(uuid,uuid,uuid,timestamp with time zone)'::regprocedure),
  '{"search_path=pg_catalog, public"}', 'materialization has a hardened search path'
);

select * from finish();
rollback;
