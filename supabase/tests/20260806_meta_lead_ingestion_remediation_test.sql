begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(33);

insert into public.organizations (id, name, slug) values
  ('81000000-0000-4000-8000-000000000001', 'Remediation A', 'remediation-a'),
  ('81000000-0000-4000-8000-000000000002', 'Remediation B', 'remediation-b');

insert into auth.users (id) values
  ('81100000-0000-4000-8000-000000000001'),
  ('81100000-0000-4000-8000-000000000002'),
  ('81100000-0000-4000-8000-000000000003');

insert into public.profiles (id, organization_id, name, email, role) values
  ('81100000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'Master A', 'master-a@example.invalid', 'master'),
  ('81100000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', 'Admin A', 'admin-a@example.invalid', 'admin'),
  ('81100000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000001', 'SDR A', 'sdr-a@example.invalid', 'sdr');

insert into public.lead_ingestion_integration_configs (
  id, organization_id, source_system, external_account_id, status, allowed_form_ids
) values
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'remediation-meta-a', 'active', array['allowed-form']),
  ('82000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', 'another_source', 'remediation-other-a', 'active', array['allowed-form']),
  ('82000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000002', 'meta_lead_ads', 'remediation-meta-b', 'active', array['allowed-form']);

-- CR-001: a third expired claim is terminalized and cannot become a fourth claim.
insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload, attempt_count,
  claim_token, claimed_at, claim_expires_at, worker_id
) values (
  '83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'exhausted-third-claim',
  'leadgen', 'allowed-form', 'fetch_pending', '{}', '{"fullName":"Exhausted","formId":"allowed-form"}', 3,
  '84000000-0000-4000-8000-000000000001', clock_timestamp() - interval '2 minutes',
  clock_timestamp() - interval '1 minute', 'expired-third-worker'
);

select is_empty(
  $$select * from public.claim_lead_ingestion_events('fourth-worker', 10, 60)
    where id = '83000000-0000-4000-8000-000000000001'$$,
  'an expired third claim is not granted a fourth processing opportunity'
);
select is((select status from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000001'),
  'retry_exhausted', 'an expired third claim transitions deterministically to retry_exhausted');
select is((select attempt_count from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000001'),
  3, 'terminalization does not consume a fourth attempt');
select is((select claim_token from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000001'),
  null::uuid, 'terminalization clears the expired claim');

-- CR-002: the Meta RPCs refuse events from every other source system.
insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload
) values (
  '83000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000001', 'another_source', 'other-source-fetch',
  'leadgen', 'allowed-form', 'fetch_pending', '{}', '{"fullName":"Other Source","formId":"allowed-form"}'
);
select is_empty(
  $$select * from public.claim_lead_ingestion_events('meta-worker', 10, 60)
    where id = '83000000-0000-4000-8000-000000000002'$$,
  'the Meta claim RPC does not claim another source system'
);
select is((select status from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000002'),
  'fetch_pending', 'a non-Meta event remains unchanged after claim');
select is((select attempt_count from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000002'),
  0, 'a non-Meta event consumes no claim attempt');

insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload,
  claim_token, claimed_at, claim_expires_at, worker_id
) values (
  '83000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000001', 'another_source', 'other-source-materialize',
  'leadgen', 'allowed-form', 'materialization_pending', '{}', '{"fullName":"Other Materialize","formId":"allowed-form"}',
  '84000000-0000-4000-8000-000000000003', clock_timestamp(), clock_timestamp() + interval '10 minutes', 'other-worker'
);
select is_empty(
  $$select * from public.materialize_lead_ingestion_event_transaction(
    '83000000-0000-4000-8000-000000000003', '84000000-0000-4000-8000-000000000003', null, clock_timestamp())$$,
  'the Meta materialization RPC refuses another source system'
);
select is((select status from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000003'),
  'materialization_pending', 'refused non-Meta materialization preserves event state');
select is((select count(*)::integer from public.crm_leads where external_id = 'other-source-materialize'),
  0, 'refused non-Meta materialization creates no lead');

-- CR-003: canonical identity is reused only inside the event tenant.
insert into public.crm_leads (id, organization_id, nome, source_system, external_id) values
  ('85000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'Existing A', 'meta_lead_ads', 'existing-same-tenant');
insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload,
  claim_token, claimed_at, claim_expires_at, worker_id
) values (
  '83000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'existing-same-tenant',
  'leadgen', 'allowed-form', 'materialization_pending', '{}', '{"fullName":"Existing A","formId":"allowed-form"}',
  '84000000-0000-4000-8000-000000000004', clock_timestamp(), clock_timestamp() + interval '10 minutes', 'same-tenant-worker'
);
select is(
  (select (crm_lead ->> 'id')::uuid from public.materialize_lead_ingestion_event_transaction(
    '83000000-0000-4000-8000-000000000004', '84000000-0000-4000-8000-000000000004', null, clock_timestamp())),
  '85000000-0000-4000-8000-000000000001'::uuid, 'same-tenant canonical identity reuses the existing lead'
);
select is((select materialization_result from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000004'),
  'linked_existing', 'same-tenant reuse is classified as linked_existing');
select is((select count(*)::integer from public.crm_leads where source_system = 'meta_lead_ads' and external_id = 'existing-same-tenant'),
  1, 'same-tenant reuse remains idempotent');

insert into public.crm_leads (id, organization_id, nome, source_system, external_id) values
  ('85000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000002', 'Existing B', 'meta_lead_ads', 'existing-other-tenant');
insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload,
  claim_token, claimed_at, claim_expires_at, worker_id
) values (
  '83000000-0000-4000-8000-000000000005', '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'existing-other-tenant',
  'leadgen', 'allowed-form', 'materialization_pending', '{}', '{"fullName":"Cross Tenant","formId":"allowed-form"}',
  '84000000-0000-4000-8000-000000000005', clock_timestamp(), clock_timestamp() + interval '10 minutes', 'cross-tenant-worker'
);
select throws_ok(
  $$select * from public.materialize_lead_ingestion_event_transaction(
    '83000000-0000-4000-8000-000000000005', '84000000-0000-4000-8000-000000000005', null, clock_timestamp())$$,
  'P0001', 'Identidade de lead existente pertence a outro tenant.',
  'an existing canonical identity in another tenant is rejected'
);
select is((select status from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000005'),
  'materialization_pending', 'cross-tenant identity rejection rolls back the event');
select is((select count(*)::integer from public.crm_leads where external_id = 'existing-other-tenant'),
  1, 'cross-tenant identity rejection creates no duplicate');

insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload,
  claim_token, claimed_at, claim_expires_at, worker_id
) values (
  '83000000-0000-4000-8000-000000000006', '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'new-idempotent-lead',
  'leadgen', 'allowed-form', 'materialization_pending', '{}', '{"fullName":"New Lead","formId":"allowed-form"}',
  '84000000-0000-4000-8000-000000000006', clock_timestamp(), clock_timestamp() + interval '10 minutes', 'new-worker'
);
select lives_ok(
  $$select * from public.materialize_lead_ingestion_event_transaction(
    '83000000-0000-4000-8000-000000000006', '84000000-0000-4000-8000-000000000006', null, clock_timestamp())$$,
  'a missing canonical identity creates one lead'
);
select is((select materialization_result from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000006'),
  'created', 'new canonical identity is classified as created');
select is((select count(*)::integer from public.crm_leads where external_id = 'new-idempotent-lead'),
  1, 'new canonical identity creates exactly one lead');
select is(
  (select (crm_lead ->> 'id')::uuid from public.materialize_lead_ingestion_event_transaction(
    '83000000-0000-4000-8000-000000000006', '84000000-0000-4000-8000-000000000006', null, clock_timestamp())),
  (select crm_lead_id from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000006'),
  'repeated materialization returns the same persisted lead'
);

insert into public.crm_leads (id, organization_id, nome, source_system, external_id) values
  ('85000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000001', 'Explicit Target', 'evolv', 'explicit-target');
insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload,
  claim_token, claimed_at, claim_expires_at, worker_id
) values (
  '83000000-0000-4000-8000-000000000007', '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'explicit-event-identity',
  'leadgen', 'allowed-form', 'materialization_pending', '{}', '{"fullName":"Explicit Event","formId":"allowed-form"}',
  '84000000-0000-4000-8000-000000000007', clock_timestamp(), clock_timestamp() + interval '10 minutes', 'explicit-worker'
);
select is(
  (select (crm_lead ->> 'id')::uuid from public.materialize_lead_ingestion_event_transaction(
    '83000000-0000-4000-8000-000000000007', '84000000-0000-4000-8000-000000000007',
    '85000000-0000-4000-8000-000000000003', clock_timestamp())),
  '85000000-0000-4000-8000-000000000003'::uuid, 'an explicit same-tenant target remains supported'
);
select is((select materialization_result from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000007'),
  'linked_existing', 'an explicit target is classified as linked_existing');
select is((select count(*)::integer from public.crm_leads where external_id = 'explicit-event-identity'),
  0, 'an explicit target creates no second lead for the event identity');

insert into public.crm_leads (id, organization_id, nome, source_system, external_id) values
  ('85000000-0000-4000-8000-000000000004', '81000000-0000-4000-8000-000000000002', 'Unrelated Unique', 'evolv', 'global-unique-conflict');
create unique index remediation_global_external_unique_fixture
  on public.crm_leads (external_id);
insert into public.lead_ingestion_events (
  id, integration_config_id, organization_id, source_system, external_id,
  event_type, form_id, status, source_payload, normalized_payload,
  claim_token, claimed_at, claim_expires_at, worker_id
) values (
  '83000000-0000-4000-8000-000000000008', '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'global-unique-conflict',
  'leadgen', 'allowed-form', 'materialization_pending', '{}', '{"fullName":"Unique Conflict","formId":"allowed-form"}',
  '84000000-0000-4000-8000-000000000008', clock_timestamp(), clock_timestamp() + interval '10 minutes', 'conflict-worker'
);
select throws_ok(
  $$select * from public.materialize_lead_ingestion_event_transaction(
    '83000000-0000-4000-8000-000000000008', '84000000-0000-4000-8000-000000000008', null, clock_timestamp())$$,
  '23505', null, 'an unrelated uniqueness violation is not masked as canonical reuse'
);
select is((select status from public.lead_ingestion_events where id = '83000000-0000-4000-8000-000000000008'),
  'materialization_pending', 'unrelated uniqueness failure rolls back the event');
select is((select count(*)::integer from public.crm_leads where external_id = 'global-unique-conflict'),
  1, 'unrelated uniqueness failure creates no duplicate');

-- CR-007: exercise RLS as authenticated users with synthetic auth.uid context.
create function pg_temp.update_integration_config(p_id uuid, p_status text)
returns integer
language plpgsql
security invoker
as $$
declare v_count integer;
begin
  update public.lead_ingestion_integration_configs
  set status = p_status
  where id = p_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81100000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.lead_ingestion_integration_configs where organization_id = '81000000-0000-4000-8000-000000000002'),
  0, 'organization A cannot read organization B configuration');
select throws_ok(
  $$insert into public.lead_ingestion_integration_configs (organization_id, source_system, external_account_id)
    values ('81000000-0000-4000-8000-000000000002', 'meta_lead_ads', 'master-cross-tenant')$$,
  '42501', null, 'master A cannot insert organization B configuration');
select lives_ok(
  $$insert into public.lead_ingestion_integration_configs (organization_id, source_system, external_account_id)
    values ('81000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'master-own-tenant')$$,
  'master A can insert organization A configuration');

select set_config('request.jwt.claim.sub', '81100000-0000-4000-8000-000000000002', true);
select is(pg_temp.update_integration_config(
    '82000000-0000-4000-8000-000000000003', 'inactive'), 0,
  'admin A cannot update organization B configuration');
select is(pg_temp.update_integration_config(
    '82000000-0000-4000-8000-000000000001', 'inactive'), 1,
  'admin A can update organization A configuration');

select set_config('request.jwt.claim.sub', '81100000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$insert into public.lead_ingestion_integration_configs (organization_id, source_system, external_account_id)
    values ('81000000-0000-4000-8000-000000000001', 'meta_lead_ads', 'sdr-own-tenant')$$,
  '42501', null, 'non-admin user cannot insert configuration');
select is(pg_temp.update_integration_config(
    '82000000-0000-4000-8000-000000000001', 'active'), 0,
  'non-admin user cannot update configuration');

reset role;
select * from finish();
rollback;
