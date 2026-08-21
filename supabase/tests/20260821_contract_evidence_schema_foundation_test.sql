begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(46);

select has_table('public', 'contract_evidences', 'evidence envelope exists');
select has_table('public', 'contract_signed_evidence_details', 'signed detail exists');
select has_table('public', 'contract_first_installment_payment_evidence_details', 'first payment detail exists');
select has_table('public', 'contract_patrion_receipt_evidence_details', 'Patrion receipt detail exists');
select has_table('public', 'contract_evidence_audit_events', 'evidence audit exists');
select has_column('public', 'contract_evidences', 'content_sha256', 'binary SHA-256 column exists');
select ok(
  to_regclass('public.contract_evidences_current_validated_uidx') is not null
  and to_regclass('public.contract_evidences_idempotency_uidx') is not null
  and to_regclass('public.contract_evidences_supersedes_once_uidx') is not null,
  'evidence uniqueness indexes exist'
);
select ok((
  select bool_and(c.relrowsecurity)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in (
    'contract_evidences', 'contract_signed_evidence_details',
    'contract_first_installment_payment_evidence_details',
    'contract_patrion_receipt_evidence_details', 'contract_evidence_audit_events'
  )
), 'RLS is enabled on every C8A table');
select ok(
  has_table_privilege('authenticated', 'public.contract_evidences', 'SELECT')
  and has_table_privilege('authenticated', 'public.contract_signed_evidence_details', 'SELECT')
  and has_table_privilege('authenticated', 'public.contract_evidence_audit_events', 'SELECT'),
  'authenticated has read access'
);
select ok(
  not has_table_privilege('authenticated', 'public.contract_evidences', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.contract_signed_evidence_details', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.contract_evidence_audit_events', 'INSERT,UPDATE,DELETE'),
  'authenticated has no C8A write access'
);
select ok(
  not has_table_privilege('anon', 'public.contract_evidences', 'SELECT')
  and not has_table_privilege('public', 'public.contract_evidences', 'SELECT'),
  'anon and PUBLIC have no C8A read access'
);
select ok(
  not has_table_privilege('service_role', 'public.contract_evidences', 'INSERT,UPDATE,DELETE'),
  'service_role receives no additional C8A writes'
);

insert into organizations(id, name, slug) values
  ('c8a00000-0000-4000-8000-000000000001', 'C8A One', 'c8a-one'),
  ('c8a00000-0000-4000-8000-000000000002', 'C8A Two', 'c8a-two');
insert into auth.users(id) values
  ('c8a10000-0000-4000-8000-000000000001'),
  ('c8a10000-0000-4000-8000-000000000002'),
  ('c8a10000-0000-4000-8000-000000000003'),
  ('c8a10000-0000-4000-8000-000000000004'),
  ('c8a10000-0000-4000-8000-000000000005');
insert into profiles(id, organization_id, name, email, role, is_active) values
  ('c8a10000-0000-4000-8000-000000000001', 'c8a00000-0000-4000-8000-000000000001', 'Master', 'master@c8a.test', 'master', true),
  ('c8a10000-0000-4000-8000-000000000002', 'c8a00000-0000-4000-8000-000000000001', 'Admin', 'admin@c8a.test', 'admin', true),
  ('c8a10000-0000-4000-8000-000000000003', 'c8a00000-0000-4000-8000-000000000001', 'SDR', 'sdr@c8a.test', 'sdr', true),
  ('c8a10000-0000-4000-8000-000000000004', 'c8a00000-0000-4000-8000-000000000001', 'Inactive', 'inactive@c8a.test', 'admin', false),
  ('c8a10000-0000-4000-8000-000000000005', 'c8a00000-0000-4000-8000-000000000002', 'Other', 'other@c8a.test', 'master', true);
insert into administrators(id, organization_id, name, slug) values
  ('c8a20000-0000-4000-8000-000000000001', 'c8a00000-0000-4000-8000-000000000001', 'Administrator One', 'c8a-administrator-one'),
  ('c8a20000-0000-4000-8000-000000000002', 'c8a00000-0000-4000-8000-000000000002', 'Administrator Two', 'c8a-administrator-two');
insert into contracts(id, organization_id, status, credit_amount) values
  ('c8a30000-0000-4000-8000-000000000001', 'c8a00000-0000-4000-8000-000000000001', 'draft', 0),
  ('c8a30000-0000-4000-8000-000000000002', 'c8a00000-0000-4000-8000-000000000002', 'draft', 0);

insert into contract_evidences(
  id, organization_id, contract_id, evidence_type, status, source, external_reference,
  event_at, recorded_by, validated_at, validated_by, idempotency_key
) values
  ('c8a40000-0000-4000-8000-000000000001', 'c8a00000-0000-4000-8000-000000000001', 'c8a30000-0000-4000-8000-000000000001',
   'signed_contract', 'validated', 'manual', null, now(), 'c8a10000-0000-4000-8000-000000000001', now(),
   'c8a10000-0000-4000-8000-000000000001', 'c8a-base-evidence-1'),
  ('c8a40000-0000-4000-8000-000000000002', 'c8a00000-0000-4000-8000-000000000002', 'c8a30000-0000-4000-8000-000000000002',
   'signed_contract', 'recorded', 'manual', null, now(), 'c8a10000-0000-4000-8000-000000000005', null,
   null, 'c8a-base-evidence-2');
insert into contract_signed_evidence_details(
  evidence_id, organization_id, contract_id, signature_method, effective_signed_at, signatories
) values
  ('c8a40000-0000-4000-8000-000000000001', 'c8a00000-0000-4000-8000-000000000001', 'c8a30000-0000-4000-8000-000000000001', 'manual', now(), '[{"name":"Signer"}]'),
  ('c8a40000-0000-4000-8000-000000000002', 'c8a00000-0000-4000-8000-000000000002', 'c8a30000-0000-4000-8000-000000000002', 'manual', now(), '[{"name":"Signer"}]');
set constraints all immediate;
set constraints all deferred;

create temp table c8a_rls_results(label text primary key, visible_count integer not null);
grant insert on c8a_rls_results to authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c8a10000-0000-4000-8000-000000000001', true);
set local role authenticated;
insert into c8a_rls_results values('master', (select count(*)::integer from contract_evidences));
reset role;
select set_config('request.jwt.claim.sub', 'c8a10000-0000-4000-8000-000000000002', true);
set local role authenticated;
insert into c8a_rls_results values('admin', (select count(*)::integer from contract_evidences));
reset role;
select set_config('request.jwt.claim.sub', 'c8a10000-0000-4000-8000-000000000003', true);
set local role authenticated;
insert into c8a_rls_results values
  ('sdr', (select count(*)::integer from contract_evidences)),
  ('sdr-cross', (select count(*)::integer from contract_evidences where organization_id = 'c8a00000-0000-4000-8000-000000000002'));
reset role;
select set_config('request.jwt.claim.sub', 'c8a10000-0000-4000-8000-000000000004', true);
set local role authenticated;
insert into c8a_rls_results values('inactive', (select count(*)::integer from contract_evidences));
reset role;
select is((select visible_count from c8a_rls_results where label='master'), 1, 'master reads own tenant only');
select is((select visible_count from c8a_rls_results where label='admin'), 1, 'admin reads own tenant only');
select is((select visible_count from c8a_rls_results where label='sdr'), 1, 'SDR reads own tenant');
select is((select visible_count from c8a_rls_results where label='sdr-cross'), 0, 'SDR cannot read cross-tenant evidence');
select is((select visible_count from c8a_rls_results where label='inactive'), 0, 'inactive profile cannot read evidence');

select throws_ok($sql$
  do $block$ begin
    insert into contract_evidences(id, organization_id, contract_id, evidence_type, source, event_at, recorded_by, idempotency_key)
    values('c8a41000-0000-4000-8000-000000000001','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000002','signed_contract','manual',now(),'c8a10000-0000-4000-8000-000000000001','c8a-cross-tenant-1');
    set constraints all immediate;
  end $block$
$sql$, '23503', null, 'cross-tenant contract is rejected');

select throws_ok($sql$
  do $block$ begin
    insert into contract_evidences(id, organization_id, contract_id, evidence_type, source, event_at, recorded_by, idempotency_key)
    values('c8a41000-0000-4000-8000-000000000002','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','signed_contract','manual',now(),'c8a10000-0000-4000-8000-000000000001','c8a-wrong-detail-1');
    insert into contract_patrion_receipt_evidence_details(evidence_id,organization_id,contract_id,amount_cents,received_at,competence_date,attributable_amount_cents)
    values('c8a41000-0000-4000-8000-000000000002','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001',100,now(),current_date,100);
    set constraints all immediate;
  end $block$
$sql$, '23514', 'C8A_EVIDENCE_DETAIL_CARDINALITY_INVALID', 'incompatible detail type is rejected');

select throws_ok($sql$
  do $block$ begin
    insert into contract_evidences(id, organization_id, contract_id, evidence_type, source, event_at, recorded_by, idempotency_key)
    values('c8a41000-0000-4000-8000-000000000003','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','signed_contract','manual',now(),'c8a10000-0000-4000-8000-000000000001','c8a-missing-detail-1');
    set constraints all immediate;
  end $block$
$sql$, '23514', 'C8A_EVIDENCE_DETAIL_CARDINALITY_INVALID', 'missing detail is rejected when constraints settle');

select throws_ok($sql$
  do $block$ begin
    insert into contract_evidences(id, organization_id, contract_id, evidence_type, source, event_at, recorded_by, idempotency_key)
    values('c8a41000-0000-4000-8000-000000000004','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','signed_contract','manual',now(),'c8a10000-0000-4000-8000-000000000001','c8a-multiple-detail-1');
    insert into contract_signed_evidence_details(evidence_id,organization_id,contract_id,signature_method,effective_signed_at,signatories)
    values('c8a41000-0000-4000-8000-000000000004','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','manual',now(),'[{"name":"Signer"}]');
    insert into contract_patrion_receipt_evidence_details(evidence_id,organization_id,contract_id,evidence_type,amount_cents,received_at,competence_date,attributable_amount_cents)
    values('c8a41000-0000-4000-8000-000000000004','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','signed_contract',100,now(),current_date,100);
    set constraints all immediate;
  end $block$
$sql$, '23514', null, 'multiple detail rows are rejected');

select throws_ok($sql$
  insert into contract_evidences(organization_id,contract_id,evidence_type,source,event_at,recorded_by,idempotency_key,storage_bucket)
  values('c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','signed_contract','manual',now(),'c8a10000-0000-4000-8000-000000000001','c8a-storage-partial','private')
$sql$, '23514', null, 'partial storage identity is rejected');
select throws_ok($sql$
  insert into contract_evidences(organization_id,contract_id,evidence_type,source,event_at,recorded_by,idempotency_key,storage_bucket,storage_object_path,content_sha256,media_type,file_size)
  values('c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','signed_contract','manual',now(),'c8a10000-0000-4000-8000-000000000001','c8a-storage-hash','private','object',decode('aa','hex'),'application/pdf',1)
$sql$, '23514', null, 'non SHA-256 hash is rejected');
select throws_ok($sql$
  insert into contract_first_installment_payment_evidence_details(evidence_id,organization_id,contract_id,administrator_id,billing_reference,amount_cents,due_at,paid_at)
  values(gen_random_uuid(),'c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','c8a20000-0000-4000-8000-000000000001','bill',0,now(),now())
$sql$, '23514', null, 'non-positive money is rejected');
select throws_ok($sql$
  insert into contract_patrion_receipt_evidence_details(evidence_id,organization_id,contract_id,amount_cents,currency,received_at,competence_date,attributable_amount_cents)
  values(gen_random_uuid(),'c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001',100,'USD',now(),current_date,100)
$sql$, '23514', null, 'currency other than BRL is rejected');

select throws_ok($sql$
  do $block$ begin
    insert into contract_evidences(id,organization_id,contract_id,evidence_type,source,event_at,recorded_by,idempotency_key,supersedes_evidence_id)
    values('c8a41000-0000-4000-8000-000000000005','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','first_installment_payment','manual',now(),'c8a10000-0000-4000-8000-000000000001','c8a-bad-super-1','c8a40000-0000-4000-8000-000000000001');
    set constraints all immediate;
  end $block$
$sql$, '23503', null, 'supersedes must match tenant, contract and type');

select throws_ok($sql$
  do $block$ begin
    insert into contract_evidences(id,organization_id,contract_id,evidence_type,source,event_at,recorded_by,idempotency_key,supersedes_evidence_id) values
    ('c8a41000-0000-4000-8000-000000000006','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','signed_contract','manual',now(),'c8a10000-0000-4000-8000-000000000001','c8a-cycle-a','c8a41000-0000-4000-8000-000000000007'),
    ('c8a41000-0000-4000-8000-000000000007','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','signed_contract','manual',now(),'c8a10000-0000-4000-8000-000000000001','c8a-cycle-b','c8a41000-0000-4000-8000-000000000006');
    insert into contract_signed_evidence_details(evidence_id,organization_id,contract_id,signature_method,effective_signed_at,signatories) values
    ('c8a41000-0000-4000-8000-000000000006','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','manual',now(),'[{"name":"A"}]'),
    ('c8a41000-0000-4000-8000-000000000007','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','manual',now(),'[{"name":"B"}]');
    set constraints all immediate;
  end $block$
$sql$, '23514', 'C8A_EVIDENCE_SUPERSESSION_CYCLE', 'supersession cycle is rejected');

select throws_ok($sql$
  insert into contract_evidences(organization_id,contract_id,evidence_type,source,event_at,recorded_by,idempotency_key)
  values('c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','signed_contract','manual',now(),'c8a10000-0000-4000-8000-000000000001','c8a-base-evidence-1')
$sql$, '23505', null, 'idempotency key is unique per tenant, type and source');

insert into contract_evidences(id,organization_id,contract_id,evidence_type,source,external_reference,event_at,idempotency_key)
values('c8a41000-0000-4000-8000-000000000008','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','patrion_commission_receipt','webhook','receipt-ext-1',now(),'c8a-ext-reference-1');
insert into contract_patrion_receipt_evidence_details(evidence_id,organization_id,contract_id,amount_cents,received_at,receipt_reference,competence_date,attributable_amount_cents)
values('c8a41000-0000-4000-8000-000000000008','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001',100,now(),'receipt-1',current_date,100);
set constraints all immediate;
set constraints all deferred;
select throws_ok($sql$
  insert into contract_evidences(organization_id,contract_id,evidence_type,source,external_reference,event_at,idempotency_key)
  values('c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','patrion_commission_receipt','webhook','receipt-ext-1',now(),'c8a-ext-reference-2')
$sql$, '23505', null, 'external reference is unique for integration origin');

select throws_ok($sql$
  insert into contract_evidences(organization_id,contract_id,evidence_type,status,source,event_at,recorded_by,validated_at,validated_by,idempotency_key)
  values('c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','signed_contract','validated','manual',now(),'c8a10000-0000-4000-8000-000000000001',now(),'c8a10000-0000-4000-8000-000000000001','c8a-second-current')
$sql$, '23505', null, 'only one current validated signature is allowed');

insert into contract_evidences(id,organization_id,contract_id,evidence_type,status,source,event_at,recorded_by,validated_at,validated_by,idempotency_key) values
('c8a41000-0000-4000-8000-000000000009','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','patrion_commission_receipt','validated','manual',now(),'c8a10000-0000-4000-8000-000000000001',now(),'c8a10000-0000-4000-8000-000000000001','c8a-receipt-two'),
('c8a41000-0000-4000-8000-000000000010','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001','patrion_commission_receipt','validated','manual',now(),'c8a10000-0000-4000-8000-000000000001',now(),'c8a10000-0000-4000-8000-000000000001','c8a-receipt-three');
insert into contract_patrion_receipt_evidence_details(evidence_id,organization_id,contract_id,amount_cents,received_at,receipt_reference,competence_date,attributable_amount_cents) values
('c8a41000-0000-4000-8000-000000000009','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001',200,now(),'receipt-2',current_date,200),
('c8a41000-0000-4000-8000-000000000010','c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001',300,now(),'receipt-3',current_date,250);
set constraints all immediate;
set constraints all deferred;
select is((select count(*)::integer from contract_evidences where evidence_type='patrion_commission_receipt' and status='validated'), 2, 'multiple validated Patrion receipts are allowed');
select throws_ok($sql$
  insert into contract_patrion_receipt_evidence_details(evidence_id,organization_id,contract_id,amount_cents,received_at,receipt_reference,competence_date,attributable_amount_cents)
  values(gen_random_uuid(),'c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001',100,now(),'receipt-3',current_date,100)
$sql$, '23505', null, 'duplicate Patrion receipt reference is rejected');

insert into contract_evidence_audit_events(
  organization_id,contract_id,evidence_id,event_type,actor_id,actor_role,origin,
  after_status,correlation_id,idempotency_key,occurred_at
) values(
  'c8a00000-0000-4000-8000-000000000001','c8a30000-0000-4000-8000-000000000001',
  'c8a40000-0000-4000-8000-000000000001','evidence_recorded','c8a10000-0000-4000-8000-000000000001',
  'master','manual','recorded',gen_random_uuid(),'c8a-audit-event-1',now()
);
select is((select octet_length(event_hash) from contract_evidence_audit_events limit 1), 32, 'audit receives deterministic individual SHA-256');
select throws_ok($$update contract_evidence_audit_events set reason='rewrite'$$, 'P0001', 'C8A_CONTRACT_EVIDENCE_IMMUTABLE', 'audit update is blocked');
select throws_ok($$delete from contract_evidence_audit_events$$, 'P0001', 'C8A_CONTRACT_EVIDENCE_IMMUTABLE', 'audit delete is blocked');
select throws_ok($$update contract_evidences set metadata='{"rewrite":true}'$$, 'P0001', 'C8A_CONTRACT_EVIDENCE_IMMUTABLE', 'evidence update is blocked');
select throws_ok($$delete from contract_evidences$$, 'P0001', 'C8A_CONTRACT_EVIDENCE_IMMUTABLE', 'evidence delete is blocked');
select throws_ok($$update contract_signed_evidence_details set signature_method='rewrite'$$, 'P0001', 'C8A_CONTRACT_EVIDENCE_IMMUTABLE', 'typed detail update is blocked');
select has_function('public', 'materialize_approved_commercial_proposal_transaction', array['uuid','uuid','text'], 'C5 remains present');
select has_function('public', 'complete_materialized_contract_identification_transaction', array['uuid','boolean','text','boolean','text','text'], 'C6 remains present');
select has_trigger('public', 'contracts', 'contracts_materialized_operational_guard', 'C6 contract guard remains present');
select is((select count(*)::integer from contract_commission_snapshots), 0, 'C8A creates no commission snapshot');
select is((select count(*)::integer from expected_revenue_entries), 0, 'C8A creates no expected revenue');
select is((select count(*)::integer from recognized_revenue_entries), 0, 'C8A creates no recognized revenue');
select is((select count(*)::integer from revenue_entries), 0, 'C8A creates no legacy revenue');
select ok((
  select count(*) = 5
  from contract_evidences e
  where (
    (e.evidence_type='signed_contract' and (select count(*) from contract_signed_evidence_details d where d.evidence_id=e.id)=1)
    or (e.evidence_type='patrion_commission_receipt' and (select count(*) from contract_patrion_receipt_evidence_details d where d.evidence_id=e.id)=1)
  )
), 'every persisted test envelope has exactly one compatible detail');

select * from finish();
rollback;
