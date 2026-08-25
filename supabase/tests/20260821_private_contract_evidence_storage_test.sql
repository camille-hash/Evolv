begin;
select plan(36);

select is((select public from storage.buckets where id='contract-evidences'),false,'bucket is private');
select is((select file_size_limit from storage.buckets where id='contract-evidences'),15728640::bigint,'bucket has 15 MB limit');
select is((select allowed_mime_types from storage.buckets where id='contract-evidences'),array['application/pdf','image/jpeg','image/png']::text[],'bucket has strict MIME allow-list');
select is((select count(*)::integer from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'contract evidence%'),0,'bucket has no application policy');
select has_table('public','contract_evidence_upload_attempts','upload attempts exist');
select ok((select relrowsecurity from pg_class where oid='public.contract_evidence_upload_attempts'::regclass),'attempt RLS enabled');
select ok(not has_table_privilege('authenticated','public.contract_evidence_upload_attempts','SELECT'),'authenticated cannot read attempts');
select ok(not has_table_privilege('authenticated','public.contract_evidence_upload_attempts','INSERT,UPDATE,DELETE'),'authenticated cannot write attempts');
select ok(not has_table_privilege('service_role','public.contract_evidence_upload_attempts','INSERT,UPDATE,DELETE'),'service role cannot write attempts directly');
select ok(has_function_privilege('service_role','public.prepare_contract_evidence_upload_attempt(uuid,uuid,text,text,text,text,bigint)','EXECUTE'),'service role executes prepare');
select ok(has_function_privilege('service_role','public.finish_contract_evidence_upload_attempt(uuid,uuid,text,uuid,text)','EXECUTE'),'service role executes finish');
select ok(not has_function_privilege('authenticated','public.prepare_contract_evidence_upload_attempt(uuid,uuid,text,text,text,text,bigint)','EXECUTE'),'authenticated cannot prepare');
select ok(not has_function_privilege('anon','public.finish_contract_evidence_upload_attempt(uuid,uuid,text,uuid,text)','EXECUTE'),'anon cannot finish');
select is((select prosecdef from pg_proc where oid='public.prepare_contract_evidence_upload_attempt(uuid,uuid,text,text,text,text,bigint)'::regprocedure),true,'prepare is security definer');
select is((select rolname from pg_roles where oid=(select proowner from pg_proc where oid='public.prepare_contract_evidence_upload_attempt(uuid,uuid,text,text,text,text,bigint)'::regprocedure)),'evolv_contract_evidence_owner','prepare has dedicated owner');
select ok(position('auth.role()' in pg_get_functiondef('public.contract_evidence_require_internal_actor(uuid)'::regprocedure))=0,'service boundary does not depend on mutable auth schema ACL');
select ok((select prosecdef and pg_get_userbyid(proowner)='evolv_contract_evidence_owner' from pg_proc where oid='public.validate_contract_evidence_detail_cardinality()'::regprocedure),'deferred cardinality trigger retains dedicated boundary at commit');
select ok((select prosecdef and pg_get_userbyid(proowner)='evolv_contract_evidence_owner' from pg_proc where oid='public.validate_contract_evidence_supersession()'::regprocedure),'deferred supersession trigger retains dedicated boundary at commit');

insert into organizations(id,name,slug) values('c8c10000-0000-4000-8000-000000000001','C8C1','c8c1');
insert into auth.users(id) values('c8c11000-0000-4000-8000-000000000001'),('c8c11000-0000-4000-8000-000000000002');
insert into profiles(id,organization_id,name,email,role,is_active) values
('c8c11000-0000-4000-8000-000000000001','c8c10000-0000-4000-8000-000000000001','Master','master@c8c1.test','master',true),
('c8c11000-0000-4000-8000-000000000002','c8c10000-0000-4000-8000-000000000001','SDR','sdr@c8c1.test','sdr',true);
insert into administrators(id,organization_id,name,slug) values('c8c12000-0000-4000-8000-000000000001','c8c10000-0000-4000-8000-000000000001','Admin','c8c1-admin');
insert into contracts(id,organization_id,administrator_id,status,credit_amount)
values('c8c14000-0000-4000-8000-000000000001','c8c10000-0000-4000-8000-000000000001','c8c12000-0000-4000-8000-000000000001','draft',1000);

select set_config('request.jwt.claim.role','service_role',true);
select lives_ok($$select prepare_contract_evidence_upload_attempt('c8c11000-0000-4000-8000-000000000001','c8c14000-0000-4000-8000-000000000001','signed_contract',repeat('a',64),'c8c10000-0000-4000-8000-000000000001/c8c14000-0000-4000-8000-000000000001/signed_contract/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf',repeat('b',64),100)$$,'master prepares upload');
select is((select state from contract_evidence_upload_attempts),'uploaded','attempt starts uploaded');
select is((select encode(idempotency_key_hash,'hex') from contract_evidence_upload_attempts),repeat('a',64),'key stored only as hash');
select is((select encode(content_sha256,'hex') from contract_evidence_upload_attempts),repeat('b',64),'content hash preserved');
select lives_ok($$select prepare_contract_evidence_upload_attempt('c8c11000-0000-4000-8000-000000000001','c8c14000-0000-4000-8000-000000000001','signed_contract',repeat('a',64),'c8c10000-0000-4000-8000-000000000001/c8c14000-0000-4000-8000-000000000001/signed_contract/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf',repeat('b',64),100)$$,'same upload is idempotent');
select is((select count(*)::integer from contract_evidence_upload_attempts),1,'retry does not duplicate');
select throws_ok($$select prepare_contract_evidence_upload_attempt('c8c11000-0000-4000-8000-000000000001','c8c14000-0000-4000-8000-000000000001','signed_contract',repeat('a',64),'c8c10000-0000-4000-8000-000000000001/c8c14000-0000-4000-8000-000000000001/signed_contract/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.pdf',repeat('c',64),100)$$,'P0001','CE_IDEMPOTENCY_CONFLICT','changed file conflicts');
select throws_ok($$select prepare_contract_evidence_upload_attempt('c8c11000-0000-4000-8000-000000000002','c8c14000-0000-4000-8000-000000000001','signed_contract',repeat('d',64),'c8c10000-0000-4000-8000-000000000001/c8c14000-0000-4000-8000-000000000001/signed_contract/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf',repeat('b',64),100)$$,'42501','CE_ACTOR_FORBIDDEN','SDR cannot prepare');
select throws_ok($$update contract_evidence_upload_attempts set object_path='changed'$$,'P0001','CE_UPLOAD_ATTEMPT_IMMUTABLE','identity immutable');
select throws_ok($$delete from contract_evidence_upload_attempts$$,'P0001','CE_UPLOAD_ATTEMPT_IMMUTABLE','attempt cannot be deleted');
select lives_ok($$select finish_contract_evidence_upload_attempt('c8c11000-0000-4000-8000-000000000001',(select id from contract_evidence_upload_attempts),'cleanup_pending',null,'CE_TEST')$$,'cleanup can be marked pending');
select is((select state from contract_evidence_upload_attempts),'cleanup_pending','cleanup pending persisted');
select lives_ok($$select finish_contract_evidence_upload_attempt('c8c11000-0000-4000-8000-000000000001',(select id from contract_evidence_upload_attempts),'cleaned',null,'CE_TEST')$$,'cleanup can complete');
select is((select state from contract_evidence_upload_attempts),'cleaned','cleaned persisted');
select lives_ok($$select finish_contract_evidence_upload_attempt('c8c11000-0000-4000-8000-000000000001',(select id from contract_evidence_upload_attempts),'cleaned',null,'CE_TEST')$$,'cleaned finish is idempotent');
select is((select status from contracts where id='c8c14000-0000-4000-8000-000000000001'),'draft','contract status unchanged');
select is((select count(*)::integer from contract_commission_snapshots),0,'no commission created');
select is((select count(*)::integer from expected_revenue_entries)+(select count(*)::integer from recognized_revenue_entries)+(select count(*)::integer from revenue_entries),0,'no revenue created');

select * from finish();
rollback;
