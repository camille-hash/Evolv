begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(57);

select has_table('public','contract_evidence_commands','command log exists');
select has_function('public','record_manual_contract_evidence_transaction',array['uuid','uuid','text','text','uuid','timestamp with time zone','text','text','text','text','text','bigint','jsonb'],'record RPC exists');
select has_function('public','validate_contract_evidence_transaction',array['uuid','uuid','text','uuid','text'],'validate RPC exists');
select has_function('public','invalidate_contract_evidence_transaction',array['uuid','uuid','text','text','uuid'],'invalidate RPC exists');
select has_function('public','supersede_contract_evidence_transaction',array['uuid','uuid','text','uuid','text','timestamp with time zone','text','text','text','text','text','bigint','jsonb'],'supersede RPC exists');
select ok((select not rolcanlogin and rolbypassrls from pg_roles where rolname='evolv_contract_evidence_owner'),'owner is NOLOGIN and BYPASSRLS');
select ok(not pg_has_role('service_role','evolv_contract_evidence_owner','MEMBER'),'service_role is not owner member');
select is((select r.rolname from pg_proc p join pg_roles r on r.oid=p.proowner
  where p.oid='public.record_manual_contract_evidence_transaction(uuid,uuid,text,text,uuid,timestamptz,text,text,text,text,text,bigint,jsonb)'::regprocedure),
  'evolv_contract_evidence_owner','RPC is owned by the dedicated role');
select ok(has_function_privilege('service_role','public.record_manual_contract_evidence_transaction(uuid,uuid,text,text,uuid,timestamptz,text,text,text,text,text,bigint,jsonb)','EXECUTE'),'service_role executes record');
select ok(has_function_privilege('service_role','public.validate_contract_evidence_transaction(uuid,uuid,text,uuid,text)','EXECUTE'),'service_role executes validate');
select ok(has_function_privilege('service_role','public.invalidate_contract_evidence_transaction(uuid,uuid,text,text,uuid)','EXECUTE'),'service_role executes invalidate');
select ok(has_function_privilege('service_role','public.supersede_contract_evidence_transaction(uuid,uuid,text,uuid,text,timestamptz,text,text,text,text,text,bigint,jsonb)','EXECUTE'),'service_role executes supersede');
select ok(not has_function_privilege('authenticated','public.record_manual_contract_evidence_transaction(uuid,uuid,text,text,uuid,timestamptz,text,text,text,text,text,bigint,jsonb)','EXECUTE'),'authenticated cannot execute commands');
select ok(not has_function_privilege('anon','public.record_manual_contract_evidence_transaction(uuid,uuid,text,text,uuid,timestamptz,text,text,text,text,text,bigint,jsonb)','EXECUTE'),'anon cannot execute commands');
select ok(not has_function_privilege('public','public.record_manual_contract_evidence_transaction(uuid,uuid,text,text,uuid,timestamptz,text,text,text,text,text,bigint,jsonb)','EXECUTE'),'PUBLIC cannot execute commands');
select ok(not has_function_privilege('service_role','public.contract_evidence_append_audit_event(uuid,uuid,uuid,text,uuid,text,text,text,text,uuid,uuid,text,jsonb)','EXECUTE'),'critical helper is not directly executable');
select ok(not has_table_privilege('service_role','public.contract_evidences','INSERT,UPDATE,DELETE'),'service_role has no direct evidence writes');
select ok(not has_table_privilege('service_role','public.contract_evidence_commands','INSERT,UPDATE,DELETE'),'service_role has no direct command-log writes');
select ok(has_table_privilege('authenticated','public.contract_evidence_commands','SELECT'),'authenticated retains tenant-aware command-log read');
select ok(not has_table_privilege('authenticated','public.contract_evidence_commands','INSERT,UPDATE,DELETE'),'authenticated cannot write command log');

insert into organizations(id,name,slug) values
 ('b8b00000-0000-4000-8000-000000000001','C8B One','c8b-one'),
 ('b8b00000-0000-4000-8000-000000000002','C8B Two','c8b-two');
insert into auth.users(id) values
 ('b8b10000-0000-4000-8000-000000000001'),('b8b10000-0000-4000-8000-000000000002'),
 ('b8b10000-0000-4000-8000-000000000003'),('b8b10000-0000-4000-8000-000000000004'),
 ('b8b10000-0000-4000-8000-000000000005');
insert into profiles(id,organization_id,name,email,role,is_active) values
 ('b8b10000-0000-4000-8000-000000000001','b8b00000-0000-4000-8000-000000000001','Master','master@c8b.test','master',true),
 ('b8b10000-0000-4000-8000-000000000002','b8b00000-0000-4000-8000-000000000001','Admin','admin@c8b.test','admin',true),
 ('b8b10000-0000-4000-8000-000000000003','b8b00000-0000-4000-8000-000000000001','SDR','sdr@c8b.test','sdr',true),
 ('b8b10000-0000-4000-8000-000000000004','b8b00000-0000-4000-8000-000000000001','Inactive','inactive@c8b.test','admin',false),
 ('b8b10000-0000-4000-8000-000000000005','b8b00000-0000-4000-8000-000000000002','Other','other@c8b.test','master',true);
insert into administrators(id,organization_id,name,slug) values
 ('b8b20000-0000-4000-8000-000000000001','b8b00000-0000-4000-8000-000000000001','Administrator One','c8b-admin-one'),
 ('b8b20000-0000-4000-8000-000000000002','b8b00000-0000-4000-8000-000000000002','Administrator Two','c8b-admin-two');
insert into contracts(id,organization_id,administrator_id,status,credit_amount) values
 ('b8b30000-0000-4000-8000-000000000001','b8b00000-0000-4000-8000-000000000001','b8b20000-0000-4000-8000-000000000001','draft',0),
 ('b8b30000-0000-4000-8000-000000000002','b8b00000-0000-4000-8000-000000000002','b8b20000-0000-4000-8000-000000000002','draft',0);

select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok($$select record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001','b8b30000-0000-4000-8000-000000000001','signed_contract','c8b-auth-denied-1',
 'b8b40000-0000-4000-8000-000000000001',now(),'doc',null,null,null,null,null,'{}')$$,
 '42501','CE_ACTOR_FORBIDDEN','canonical auth role boundary denies non-service caller');

select set_config('request.jwt.claim.role','service_role',true);
select throws_ok($$select record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000003','b8b30000-0000-4000-8000-000000000001','signed_contract','c8b-sdr-denied-1',
 'b8b40000-0000-4000-8000-000000000002',now(),'doc',null,null,null,null,null,'{}')$$,
 '42501','CE_ACTOR_FORBIDDEN','SDR cannot command');
select throws_ok($$select record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000004','b8b30000-0000-4000-8000-000000000001','signed_contract','c8b-inactive-1',
 'b8b40000-0000-4000-8000-000000000003',now(),'doc',null,null,null,null,null,'{}')$$,
 '42501','CE_ACTOR_FORBIDDEN','inactive actor cannot command');
select throws_ok($$select record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001','b8b30000-0000-4000-8000-000000000002','signed_contract','c8b-cross-contract-1',
 'b8b40000-0000-4000-8000-000000000004',now(),'doc',null,null,null,null,null,'{}')$$,
 'P0001','CE_CONTRACT_NOT_FOUND','cross-tenant contract is hidden');

create temp table c8b_results(label text primary key,result jsonb);
insert into c8b_results values('signed',record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001','b8b30000-0000-4000-8000-000000000001','signed_contract','c8b-record-signed-1',
 'b8b40000-0000-4000-8000-000000000010','2026-08-21T12:00:00Z','signed-doc-1',null,null,null,null,null,
 '{"signatureMethod":"electronic","documentVersion":"1","providerName":"Provider","providerReference":"signed-doc-1","effectiveSignedAt":"2026-08-21T12:00:00Z","signatories":[{"name":"Signer"}]}'::jsonb));
select is((select result->>'outcome' from c8b_results where label='signed'),'completed','master records signed evidence');
select is((select evidence_type from contract_evidences where id=(select (result->>'evidenceId')::uuid from c8b_results where label='signed')),'signed_contract','signed envelope is typed');
select is((select count(*)::integer from contract_signed_evidence_details where evidence_id=(select (result->>'evidenceId')::uuid from c8b_results where label='signed')),1,'signed detail is atomic');
select is((record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001','b8b30000-0000-4000-8000-000000000001','signed_contract','c8b-record-signed-1',
 'b8b40000-0000-4000-8000-000000000010','2026-08-21T12:00:00Z','signed-doc-1',null,null,null,null,null,
 '{"signatureMethod":"electronic","documentVersion":"1","providerName":"Provider","providerReference":"signed-doc-1","effectiveSignedAt":"2026-08-21T12:00:00Z","signatories":[{"name":"Signer"}]}'::jsonb)->>'outcome'),'already_completed','record retry is stable');
select throws_ok($$select record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001','b8b30000-0000-4000-8000-000000000001','signed_contract','c8b-record-signed-1',
 'b8b40000-0000-4000-8000-000000000010','2026-08-21T12:00:00Z','changed-doc',null,null,null,null,null,
 '{"signatureMethod":"electronic","documentVersion":"1","providerName":"Provider","providerReference":"changed-doc","effectiveSignedAt":"2026-08-21T12:00:00Z","signatories":[{"name":"Signer"}]}'::jsonb)$$,
 'P0001','CE_IDEMPOTENCY_CONFLICT','same key with different payload conflicts');

insert into c8b_results values('payment',record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000002','b8b30000-0000-4000-8000-000000000001','first_installment_payment','c8b-record-payment-1',
 'b8b40000-0000-4000-8000-000000000011','2026-08-21T13:00:00Z',null,null,null,null,null,null,
 '{"administratorId":"b8b20000-0000-4000-8000-000000000001","billingReference":"bill-1","amountCents":10000,"currency":"BRL","dueAt":"2026-08-20T13:00:00Z","paidAt":"2026-08-21T13:00:00Z","confirmationReference":"payment-confirmation-1"}'::jsonb));
select is((select count(*)::integer from contract_first_installment_payment_evidence_details),1,'admin records first-payment detail');
insert into c8b_results values('receipt',record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001','b8b30000-0000-4000-8000-000000000001','patrion_commission_receipt','c8b-record-receipt-1',
 'b8b40000-0000-4000-8000-000000000012','2026-08-21T14:00:00Z',null,null,null,null,null,null,
 '{"expectedRevenueEntryId":null,"amountCents":5000,"currency":"BRL","receivedAt":"2026-08-21T14:00:00Z","receiptReference":"receipt-1","competenceDate":"2026-08-01","attributableAmountCents":5000}'::jsonb));
select is((select count(*)::integer from contract_patrion_receipt_evidence_details),1,'Patrion receipt is evidence only');
select throws_ok($$select record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001','b8b30000-0000-4000-8000-000000000001','signed_contract','c8b-no-reference-1',
 'b8b40000-0000-4000-8000-000000000013','2026-08-21T12:00:00Z',null,null,null,null,null,null,
 '{"signatureMethod":"electronic","documentVersion":"1","providerName":"Provider","providerReference":null,"effectiveSignedAt":"2026-08-21T12:00:00Z","signatories":[{"name":"Signer"}]}'::jsonb)$$,
 'P0001','CE_EVIDENCE_SOURCE_REFERENCE_REQUIRED','signed evidence needs stable reference or storage');
select throws_ok($$select record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001','b8b30000-0000-4000-8000-000000000001','signed_contract','c8b-bad-detail-1',
 'b8b40000-0000-4000-8000-000000000014','2026-08-21T12:00:00Z','doc-bad',null,null,null,null,null,'{"unexpected":true}')$$,
 'P0001','CE_EVIDENCE_DETAIL_INVALID','incompatible detail is rejected');

insert into c8b_results values('validate',validate_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000002',(select (result->>'evidenceId')::uuid from c8b_results where label='signed'),
 'c8b-validate-signed-1','b8b40000-0000-4000-8000-000000000020',null));
select is((select status from contract_evidences where id=(select (result->>'evidenceId')::uuid from c8b_results where label='signed')),'validated','recorded transitions to validated');
select ok((select validated_by='b8b10000-0000-4000-8000-000000000002' from contract_evidences where id=(select (result->>'evidenceId')::uuid from c8b_results where label='signed')),'validator is server-derived actor');
select is((validate_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000002',(select (result->>'evidenceId')::uuid from c8b_results where label='signed'),
 'c8b-validate-signed-1','b8b40000-0000-4000-8000-000000000020',null)->>'outcome'),'already_completed','validate retry is stable');
select throws_ok(format($$select validate_contract_evidence_transaction('b8b10000-0000-4000-8000-000000000002',%L,'c8b-validate-other-1','b8b40000-0000-4000-8000-000000000021',null)$$,
 (select result->>'evidenceId' from c8b_results where label='signed')),'P0001','CE_EVIDENCE_ALREADY_VALIDATED','different validation key sees already validated');

insert into c8b_results values('signed-two',record_manual_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001','b8b30000-0000-4000-8000-000000000001','signed_contract','c8b-record-signed-2',
 'b8b40000-0000-4000-8000-000000000022','2026-08-21T15:00:00Z','signed-doc-2',null,null,null,null,null,
 '{"signatureMethod":"electronic","documentVersion":"2","providerName":"Provider","providerReference":"signed-doc-2","effectiveSignedAt":"2026-08-21T15:00:00Z","signatories":[{"name":"Signer"}]}'::jsonb));
select throws_ok(format($$select validate_contract_evidence_transaction('b8b10000-0000-4000-8000-000000000001',%L,'c8b-validate-conflict-1','b8b40000-0000-4000-8000-000000000023',null)$$,
 (select result->>'evidenceId' from c8b_results where label='signed-two')),'P0001','CE_VALIDATED_EVIDENCE_CONFLICT','second current validated signature conflicts');
select throws_ok(format($$select invalidate_contract_evidence_transaction('b8b10000-0000-4000-8000-000000000001',%L,' ','c8b-invalidate-no-reason','b8b40000-0000-4000-8000-000000000024')$$,
 (select result->>'evidenceId' from c8b_results where label='signed')),'P0001','CE_REASON_REQUIRED','invalidation requires reason');
insert into c8b_results values('invalidate',invalidate_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001',(select (result->>'evidenceId')::uuid from c8b_results where label='signed'),
 'Invalid signature','c8b-invalidate-signed-1','b8b40000-0000-4000-8000-000000000025'));
select is((select status from contract_evidences where id=(select (result->>'evidenceId')::uuid from c8b_results where label='signed')),'invalidated','validated evidence becomes invalidated');
select is((invalidate_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001',(select (result->>'evidenceId')::uuid from c8b_results where label='signed'),
 'Invalid signature','c8b-invalidate-signed-1','b8b40000-0000-4000-8000-000000000025')->>'outcome'),'already_completed','invalidate retry is stable');
select is((validate_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000001',(select (result->>'evidenceId')::uuid from c8b_results where label='signed-two'),
 'c8b-validate-signed-2','b8b40000-0000-4000-8000-000000000026',null)->>'outcome'),'completed','new signature validates after current is invalidated');

insert into c8b_results values('supersede',supersede_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000002',(select (result->>'evidenceId')::uuid from c8b_results where label='payment'),
 'c8b-supersede-payment-1','b8b40000-0000-4000-8000-000000000030','Correct payment reference','2026-08-21T16:00:00Z',
 null,null,null,null,null,null,
 '{"administratorId":"b8b20000-0000-4000-8000-000000000001","billingReference":"bill-2","amountCents":10000,"currency":"BRL","dueAt":"2026-08-20T13:00:00Z","paidAt":"2026-08-21T16:00:00Z","confirmationReference":"payment-confirmation-2"}'::jsonb));
select is((select status from contract_evidences where id=(select (result->>'evidenceId')::uuid from c8b_results where label='payment')),'superseded','previous evidence becomes superseded');
select is((select status from contract_evidences where id=(select (result->>'evidenceId')::uuid from c8b_results where label='supersede')),'recorded','successor starts recorded');
select ok((select supersedes_evidence_id=(select (result->>'evidenceId')::uuid from c8b_results where label='payment') from contract_evidences where id=(select (result->>'evidenceId')::uuid from c8b_results where label='supersede')),'successor links previous evidence');
select is((supersede_contract_evidence_transaction(
 'b8b10000-0000-4000-8000-000000000002',(select (result->>'evidenceId')::uuid from c8b_results where label='payment'),
 'c8b-supersede-payment-1','b8b40000-0000-4000-8000-000000000030','Correct payment reference','2026-08-21T16:00:00Z',
 null,null,null,null,null,null,
 '{"administratorId":"b8b20000-0000-4000-8000-000000000001","billingReference":"bill-2","amountCents":10000,"currency":"BRL","dueAt":"2026-08-20T13:00:00Z","paidAt":"2026-08-21T16:00:00Z","confirmationReference":"payment-confirmation-2"}'::jsonb)->>'outcome'),'already_completed','supersede retry is stable');
select is((select count(*)::integer from contract_evidence_audit_events where evidence_id=(select (result->>'evidenceId')::uuid from c8b_results where label='payment')),2,'superseded evidence has serialized history');
select ok((select later.previous_event_hash=earlier.event_hash from
 (select * from contract_evidence_audit_events where evidence_id=(select (result->>'evidenceId')::uuid from c8b_results where label='payment') order by occurred_at,recorded_at,id limit 1) earlier,
 (select * from contract_evidence_audit_events where evidence_id=(select (result->>'evidenceId')::uuid from c8b_results where label='payment') order by occurred_at desc,recorded_at desc,id desc limit 1) later),'audit hash chain links previous event');

select throws_ok(format('update contract_evidences set status=%L where id=%L','recorded',(select result->>'evidenceId' from c8b_results where label='signed-two')),
 'P0001','C8A_CONTRACT_EVIDENCE_IMMUTABLE','direct privileged evidence update remains blocked');
select throws_ok($$update contract_evidence_commands set outcome='already_completed'$$,
 'P0001','C8A_CONTRACT_EVIDENCE_IMMUTABLE','command log is immutable');
select is((select count(*)::integer from contract_evidence_commands),8,'only completed commands persist once');
select ok((select bool_and(outcome='completed' and completed_at>=started_at) from contract_evidence_commands),'command results are complete and coherent');
select is((select status from contracts where id='b8b30000-0000-4000-8000-000000000001'),'draft','evidence commands do not alter contract status');
select is((select count(*)::integer from contract_commission_snapshots),0,'no commission created');
select is((select count(*)::integer from expected_revenue_entries),0,'no expected revenue created');
select is((select count(*)::integer from recognized_revenue_entries),0,'no recognized revenue created');
select is((select count(*)::integer from revenue_entries),0,'no legacy revenue created');

select * from finish();
rollback;
