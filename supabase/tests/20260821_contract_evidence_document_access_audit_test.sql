begin;
select plan(30);
select has_table('public','contract_evidence_document_access_events','access audit table exists');
select has_function('public','record_contract_evidence_document_access_transaction',array['uuid','uuid','uuid','text','text','bigint','uuid','text'],'access RPC exists');
select ok((select relrowsecurity from pg_class where oid='public.contract_evidence_document_access_events'::regclass),'audit RLS enabled');
select is((select count(*)::integer from pg_trigger where tgrelid='public.contract_evidence_document_access_events'::regclass and tgname='contract_evidence_document_access_events_append_only'),1,'append-only trigger exists');
select ok(has_table_privilege('authenticated','public.contract_evidence_document_access_events','SELECT'),'authenticated can read audit through RLS');
select ok(not has_table_privilege('authenticated','public.contract_evidence_document_access_events','INSERT,UPDATE,DELETE'),'authenticated cannot write audit');
select ok(not has_table_privilege('anon','public.contract_evidence_document_access_events','SELECT,INSERT,UPDATE,DELETE'),'anon has no audit access');
select ok(not has_table_privilege('service_role','public.contract_evidence_document_access_events','INSERT,UPDATE,DELETE'),'service role cannot write audit directly');
select ok(has_function_privilege('service_role','public.record_contract_evidence_document_access_transaction(uuid,uuid,uuid,text,text,bigint,uuid,text)','EXECUTE'),'service role executes audit RPC');
select ok(not has_function_privilege('authenticated','public.record_contract_evidence_document_access_transaction(uuid,uuid,uuid,text,text,bigint,uuid,text)','EXECUTE'),'authenticated cannot execute audit RPC');
select ok(not has_function_privilege('anon','public.record_contract_evidence_document_access_transaction(uuid,uuid,uuid,text,text,bigint,uuid,text)','EXECUTE'),'anon cannot execute audit RPC');
select is((select prosecdef from pg_proc where oid='public.record_contract_evidence_document_access_transaction(uuid,uuid,uuid,text,text,bigint,uuid,text)'::regprocedure),true,'RPC is security definer');
select is((select pg_get_userbyid(proowner) from pg_proc where oid='public.record_contract_evidence_document_access_transaction(uuid,uuid,uuid,text,text,bigint,uuid,text)'::regprocedure),'evolv_contract_evidence_owner','RPC has dedicated owner');
select ok(position('storage_' in pg_get_functiondef('public.record_contract_evidence_document_access_transaction(uuid,uuid,uuid,text,text,bigint,uuid,text)'::regprocedure))=0,'RPC stores no storage identity');

insert into organizations(id,name,slug) values
('c8d00000-0000-4000-8000-000000000001','C8C3 One','c8c3-one'),('c8d00000-0000-4000-8000-000000000002','C8C3 Two','c8c3-two');
insert into auth.users(id) values
('c8d10000-0000-4000-8000-000000000001'),('c8d10000-0000-4000-8000-000000000002'),('c8d10000-0000-4000-8000-000000000003'),('c8d10000-0000-4000-8000-000000000004');
insert into profiles(id,organization_id,name,email,role) values
('c8d10000-0000-4000-8000-000000000001','c8d00000-0000-4000-8000-000000000001','Master','master@c8c3.test','master'),
('c8d10000-0000-4000-8000-000000000002','c8d00000-0000-4000-8000-000000000001','Admin','admin@c8c3.test','admin'),
('c8d10000-0000-4000-8000-000000000003','c8d00000-0000-4000-8000-000000000001','SDR','sdr@c8c3.test','sdr'),
('c8d10000-0000-4000-8000-000000000004','c8d00000-0000-4000-8000-000000000002','Other','other@c8c3.test','master');
insert into administrators(id,organization_id,name,slug) values('c8d20000-0000-4000-8000-000000000001','c8d00000-0000-4000-8000-000000000001','Admin','c8c3-admin');
insert into contracts(id,organization_id,administrator_id,status,credit_amount) values('c8d30000-0000-4000-8000-000000000001','c8d00000-0000-4000-8000-000000000001','c8d20000-0000-4000-8000-000000000001','draft',0);
select set_config('request.jwt.claim.role','service_role',true);
select record_manual_contract_evidence_transaction(
 'c8d10000-0000-4000-8000-000000000001','c8d30000-0000-4000-8000-000000000001','signed_contract','c8c3-record-001','c8d40000-0000-4000-8000-000000000001','2026-08-21T12:00:00Z',null,
 'contract-evidences','c8d00000-0000-4000-8000-000000000001/c8d30000-0000-4000-8000-000000000001/signed_contract/'||repeat('a',64)||'/'||repeat('b',64)||'.pdf',repeat('b',64),'application/pdf',100,
 '{"signatureMethod":"digital","documentVersion":"1","providerName":null,"providerReference":null,"effectiveSignedAt":"2026-08-21T12:00:00Z","signatories":[{"name":"Test"}]}'::jsonb);

select lives_ok($$select record_contract_evidence_document_access_transaction('c8d10000-0000-4000-8000-000000000001','c8d30000-0000-4000-8000-000000000001',(select id from contract_evidences),'downloaded','application/pdf',100,'c8d40000-0000-4000-8000-000000000010',null)$$,'master audit accepted');
select lives_ok($$select record_contract_evidence_document_access_transaction('c8d10000-0000-4000-8000-000000000002','c8d30000-0000-4000-8000-000000000001',(select id from contract_evidences),'integrity_failed',null,null,'c8d40000-0000-4000-8000-000000000011','CED_DOCUMENT_INTEGRITY_FAILED')$$,'admin audit accepted');
select lives_ok($$select record_contract_evidence_document_access_transaction('c8d10000-0000-4000-8000-000000000003','c8d30000-0000-4000-8000-000000000001',(select id from contract_evidences),'object_missing',null,null,'c8d40000-0000-4000-8000-000000000012','CED_OBJECT_MISSING')$$,'SDR audit accepted');
select is((select count(*)::integer from contract_evidence_document_access_events),3,'one row per access');
select is((select count(distinct actor_role)::integer from contract_evidence_document_access_events),3,'all read roles derived');
select is((select count(*)::integer from contract_evidence_document_access_events where failure_code is null),1,'only downloaded has no failure');
select throws_ok($$select record_contract_evidence_document_access_transaction('c8d10000-0000-4000-8000-000000000004','c8d30000-0000-4000-8000-000000000001',(select id from contract_evidences),'object_missing',null,null,'c8d40000-0000-4000-8000-000000000013','CED_OBJECT_MISSING')$$,'P0001','CED_DOCUMENT_NOT_FOUND','cross tenant rejected');
select throws_ok($$select record_contract_evidence_document_access_transaction('c8d10000-0000-4000-8000-000000000001','c8d30000-0000-4000-8000-000000000001',(select id from contract_evidences),'downloaded','image/png',100,'c8d40000-0000-4000-8000-000000000014',null)$$,'P0001','CED_INVALID_PAYLOAD','metadata mismatch rejected');
select throws_ok($$update contract_evidence_document_access_events set outcome='downloaded'$$,'42501','CED_AUDIT_APPEND_ONLY','audit update blocked');
select throws_ok($$delete from contract_evidence_document_access_events$$,'42501','CED_AUDIT_APPEND_ONLY','audit delete blocked');
select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok($$select record_contract_evidence_document_access_transaction('c8d10000-0000-4000-8000-000000000001','c8d30000-0000-4000-8000-000000000001',(select id from contract_evidences),'object_missing',null,null,'c8d40000-0000-4000-8000-000000000015','CED_OBJECT_MISSING')$$,'42501',null,'authenticated RPC boundary rejected');
select set_config('request.jwt.claims','{"sub":"c8d10000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*)::integer from contract_evidence_document_access_events),3,'SDR reads tenant audit through RLS');
select is((select status from contracts where id='c8d30000-0000-4000-8000-000000000001'),'draft','contract status unchanged');
select is((select count(*)::integer from contract_commission_snapshots),0,'no commission created');
select is((select count(*)::integer from expected_revenue_entries)+(select count(*)::integer from recognized_revenue_entries)+(select count(*)::integer from revenue_entries),0,'no revenue created');
select is((select status from contract_evidences limit 1),'recorded','audit does not alter evidence');
select * from finish();
rollback;
