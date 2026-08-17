begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(20);

select col_not_null(
  'public', 'crm_lead_commercial_proposals', 'root_proposal_id',
  'canonical root is mandatory'
);
select has_index(
  'public', 'crm_lead_commercial_proposals',
  'crm_lead_commercial_proposals_root_version_uidx',
  'lineage version uniqueness exists'
);
select has_index(
  'public', 'crm_lead_commercial_proposals',
  'crm_lead_commercial_proposals_root_current_idx',
  'current version lookup index exists'
);
select has_trigger(
  'public', 'crm_lead_commercial_proposals',
  'crm_lead_commercial_proposals_lineage_integrity',
  'lineage integrity trigger exists'
);

insert into public.organizations (id, name, slug) values
  ('c1000000-0000-4000-8000-000000000001', 'C1 Test A', 'c1-test-a'),
  ('c1000000-0000-4000-8000-000000000002', 'C1 Test B', 'c1-test-b');

insert into auth.users (id)
values ('c1500000-0000-4000-8000-000000000001');
insert into public.profiles (id, organization_id, name, email, role)
values (
  'c1500000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  'C1 Master', 'c1-master@test.local', 'master'
);

insert into public.crm_leads (id, organization_id, nome) values
  ('c2000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Lead A'),
  ('c2000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', 'Lead B');

insert into public.crm_lead_commercial_proposals (
  id, organization_id, lead_id, title, source_suggestion, status,
  proposal_number, root_proposal_id, previous_version_id, version
) values (
  'c3000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001',
  'Root A', 'recommended', 'generated', 'PROP-C1-A',
  'c3000000-0000-4000-8000-000000000001', null, 1
);

select is(
  (select root_proposal_id from public.crm_lead_commercial_proposals
   where id = 'c3000000-0000-4000-8000-000000000001'),
  'c3000000-0000-4000-8000-000000000001'::uuid,
  'root points to itself'
);

insert into public.crm_lead_commercial_proposals (
  id, organization_id, lead_id, title, source_suggestion, status,
  proposal_number, root_proposal_id, previous_version_id, version
) values (
  'c3000000-0000-4000-8000-000000000002',
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001',
  'Version A2', 'recommended', 'generated', 'PROP-C1-A',
  'c3000000-0000-4000-8000-000000000001',
  'c3000000-0000-4000-8000-000000000001', 2
);

select is(
  (select root_proposal_id from public.crm_lead_commercial_proposals
   where id = 'c3000000-0000-4000-8000-000000000002'),
  'c3000000-0000-4000-8000-000000000001'::uuid,
  'descendant points to the canonical root'
);

select throws_ok(
  $$insert into public.crm_lead_commercial_proposals
    (organization_id, lead_id, title, source_suggestion, status,
     proposal_number, root_proposal_id, version)
    values ('c1000000-0000-4000-8000-000000000001',
      'c2000000-0000-4000-8000-000000000001', 'Null root', 'recommended',
      'generated', 'PROP-NULL', null, 1)$$,
  'P0001', 'Commercial proposal canonical root is required',
  'null root is rejected explicitly before constraint evaluation'
);

select throws_ok(
  $$insert into public.crm_lead_commercial_proposals
    (organization_id, lead_id, title, source_suggestion, status,
     proposal_number, root_proposal_id, previous_version_id, version)
    values ('c1000000-0000-4000-8000-000000000002',
      'c2000000-0000-4000-8000-000000000002', 'Cross tenant', 'recommended',
      'generated', 'PROP-C1-A', 'c3000000-0000-4000-8000-000000000001',
      'c3000000-0000-4000-8000-000000000001', 3)$$,
  'P0001', 'Commercial proposal canonical root is invalid',
  'a root from another organization is rejected'
);

select throws_ok(
  $$update public.crm_lead_commercial_proposals
    set root_proposal_id = id
    where id = 'c3000000-0000-4000-8000-000000000002'$$,
  'P0001', 'Commercial proposal lineage identity is immutable',
  'root identity cannot be changed'
);

select throws_ok(
  $$delete from public.crm_lead_commercial_proposals
    where id = 'c3000000-0000-4000-8000-000000000001'$$,
  '23503', null, 'a root with descendants cannot be deleted'
);

select throws_ok(
  $$insert into public.crm_lead_commercial_proposals
    (organization_id, lead_id, title, source_suggestion, status,
     proposal_number, root_proposal_id, previous_version_id, version)
    values ('c1000000-0000-4000-8000-000000000001',
      'c2000000-0000-4000-8000-000000000001', 'Duplicate version', 'recommended',
      'generated', 'PROP-C1-A', 'c3000000-0000-4000-8000-000000000001',
      'c3000000-0000-4000-8000-000000000001', 2)$$,
  '23505', null, 'duplicate version in one lineage is rejected'
);

update public.crm_lead_commercial_proposals set status = 'approved'
where id = 'c3000000-0000-4000-8000-000000000001';
select throws_ok(
  $$update public.crm_lead_commercial_proposals set status = 'approved'
    where id = 'c3000000-0000-4000-8000-000000000002'$$,
  '23505', null, 'two approved versions in one lineage are rejected'
);

insert into public.crm_lead_commercial_proposals (
  id, organization_id, lead_id, title, source_suggestion, status,
  proposal_number, root_proposal_id, version
) values (
  'c3000000-0000-4000-8000-000000000010',
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001', 'Root B', 'recommended',
  'generated', 'PROP-C1-B', 'c3000000-0000-4000-8000-000000000010', 1
);
select is(
  (select count(*)::integer from public.crm_lead_commercial_proposals
   where version = 1 and id in (
     'c3000000-0000-4000-8000-000000000001',
     'c3000000-0000-4000-8000-000000000010')),
  2, 'distinct lineages may use the same version number'
);

select throws_ok(
  $$insert into public.crm_lead_commercial_proposals
    (organization_id, lead_id, title, source_suggestion, status,
     proposal_number, root_proposal_id, previous_version_id, version)
    values ('c1000000-0000-4000-8000-000000000001',
      'c2000000-0000-4000-8000-000000000001', 'Wrong number', 'recommended',
      'generated', 'PROP-WRONG', 'c3000000-0000-4000-8000-000000000010',
      'c3000000-0000-4000-8000-000000000010', 2)$$,
  'P0001', 'Commercial proposal canonical root is invalid',
  'ambiguous lineage data is rejected'
);

select lives_ok(
  $$insert into public.crm_lead_commercial_proposals
    (id, organization_id, lead_id, title, source_suggestion, status,
     proposal_number, root_proposal_id, previous_version_id, version)
    values ('c3000000-0000-4000-8000-000000000011',
      'c1000000-0000-4000-8000-000000000001',
      'c2000000-0000-4000-8000-000000000001', 'Valid history', 'recommended',
      'generated', 'PROP-C1-B', 'c3000000-0000-4000-8000-000000000010',
      'c3000000-0000-4000-8000-000000000010', 2)$$,
  'a valid historical chain is accepted'
);

insert into public.crm_lead_commercial_proposals (
  id, organization_id, lead_id, title, source_suggestion, status,
  proposal_number, root_proposal_id, version
) values (
  'c3000000-0000-4000-8000-000000000020',
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001', 'Disposable root', 'recommended',
  'generated', 'PROP-C1-DISPOSABLE',
  'c3000000-0000-4000-8000-000000000020', 1
);
select lives_ok(
  $$delete from public.crm_lead_commercial_proposals
    where id = 'c3000000-0000-4000-8000-000000000020'$$,
  'self-referencing RESTRICT allows deleting a root without descendants'
);

select lives_ok(
  $$update public.crm_lead_commercial_proposals set status = 'rejected'
    where id = 'c3000000-0000-4000-8000-000000000010'$$,
  'lineage trigger does not interfere with rejection'
);
select lives_ok(
  $$update public.crm_lead_commercial_proposals set status = 'expired'
    where id = 'c3000000-0000-4000-8000-000000000010'$$,
  'lineage trigger does not interfere with expiration'
);
select lives_ok(
  $$update public.crm_lead_commercial_proposals set status = 'superseded'
    where id = 'c3000000-0000-4000-8000-000000000010'$$,
  'lineage trigger does not interfere with superseding'
);

insert into public.crm_lead_commercial_proposals (
  id, organization_id, lead_id, title, source_suggestion, status,
  proposal_number, root_proposal_id, version
) values (
  'c3000000-0000-4000-8000-000000000030',
  'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001', 'RPC approval root', 'recommended',
  'generated', 'PROP-C1-RPC', 'c3000000-0000-4000-8000-000000000030', 1
);
select set_config(
  'request.jwt.claim.sub',
  'c1500000-0000-4000-8000-000000000001', true
);
select lives_ok(
  $$select public.approve_commercial_proposal_transaction(
    'c3000000-0000-4000-8000-000000000030')$$,
  'normal approval through the RPC remains functional'
);

select * from finish();
rollback;
