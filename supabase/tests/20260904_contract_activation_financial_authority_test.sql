begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(39);

select has_column('public','contracts','financial_authority','authority is persisted');
select has_table('public','contract_activation_intents','activation intent ledger exists');
select has_function('public','begin_contract_activation_intent',array['uuid','text','text','text'],'begin command exists');
select has_function('public','finish_contract_activation_intent',array['uuid','text','text','text'],'finish command exists');
select has_trigger('public','contracts','contracts_activation_boundary','generic lifecycle trigger exists');
select ok((select relrowsecurity from pg_class where oid='public.contract_activation_intents'::regclass),'intent RLS enabled');
select ok(has_table_privilege('authenticated','public.contract_activation_intents','SELECT'),'authenticated can read tenant intents');
select ok(not has_table_privilege('authenticated','public.contract_activation_intents','INSERT,UPDATE,DELETE'),'authenticated cannot write intents directly');
select ok(has_function_privilege('authenticated','public.begin_contract_activation_intent(uuid,text,text,text)','EXECUTE'),'authenticated can invoke guarded command');
select ok(not has_function_privilege('anon','public.begin_contract_activation_intent(uuid,text,text,text)','EXECUTE'),'anon cannot invoke command');
select ok((select prosecdef from pg_proc where oid='public.begin_contract_activation_intent(uuid,text,text,text)'::regprocedure),'begin command is security definer');
select is((select proconfig[1] from pg_proc where oid='public.begin_contract_activation_intent(uuid,text,text,text)'::regprocedure),'search_path=public, pg_temp','privileged function fixes search_path');
select ok(to_regclass('public.contract_activation_intents_idempotency_key') is not null,'tenant-contract-key uniqueness exists');
select has_trigger('public','contracts','contracts_materialized_operational_guard','C6 guard coexists');

insert into organizations(id,name,slug) values('c9a00000-0000-4000-8000-000000000001','C9A Test','c9a-test');
insert into auth.users(id) values('c9a10000-0000-4000-8000-000000000001'),('c9a10000-0000-4000-8000-000000000002');
insert into profiles(id,organization_id,name,email,role,is_active) values
 ('c9a10000-0000-4000-8000-000000000001','c9a00000-0000-4000-8000-000000000001','Master','master@c9a.test','master',true),
 ('c9a10000-0000-4000-8000-000000000002','c9a00000-0000-4000-8000-000000000001','SDR','sdr@c9a.test','sdr',true);
insert into contracts(id,organization_id,status,credit_amount) values
 ('c9a20000-0000-4000-8000-000000000001','c9a00000-0000-4000-8000-000000000001','draft',0),
 ('c9a20000-0000-4000-8000-000000000002','c9a00000-0000-4000-8000-000000000001','draft',1000),
 ('c9a20000-0000-4000-8000-000000000003','c9a00000-0000-4000-8000-000000000001','draft',1000),
 ('c9a20000-0000-4000-8000-000000000004','c9a00000-0000-4000-8000-000000000001','draft',1000);
insert into revenue_entries(organization_id,contract_id,expected_amount) values
 ('c9a00000-0000-4000-8000-000000000001','c9a20000-0000-4000-8000-000000000002',10),
 ('c9a00000-0000-4000-8000-000000000001','c9a20000-0000-4000-8000-000000000004',10);
insert into contract_commission_snapshots(id,organization_id,contract_id) values
 ('c9a30000-0000-4000-8000-000000000003','c9a00000-0000-4000-8000-000000000001','c9a20000-0000-4000-8000-000000000003'),
 ('c9a30000-0000-4000-8000-000000000004','c9a00000-0000-4000-8000-000000000001','c9a20000-0000-4000-8000-000000000004');
insert into contract_commission_snapshot_items(id,organization_id,snapshot_id,event_type,percentage) values
 ('c9a40000-0000-4000-8000-000000000003','c9a00000-0000-4000-8000-000000000001','c9a30000-0000-4000-8000-000000000003','contract_signed',1),
 ('c9a40000-0000-4000-8000-000000000004','c9a00000-0000-4000-8000-000000000001','c9a30000-0000-4000-8000-000000000004','contract_signed',1);
insert into contract_commission_schedule_items(organization_id,contract_id,snapshot_id,snapshot_item_id,event_type,percentage) values
 ('c9a00000-0000-4000-8000-000000000001','c9a20000-0000-4000-8000-000000000003','c9a30000-0000-4000-8000-000000000003','c9a40000-0000-4000-8000-000000000003','contract_signed',1),
 ('c9a00000-0000-4000-8000-000000000001','c9a20000-0000-4000-8000-000000000004','c9a30000-0000-4000-8000-000000000004','c9a40000-0000-4000-8000-000000000004','contract_signed',1);

select throws_ok($$update contracts set status='active' where id='c9a20000-0000-4000-8000-000000000001'$$,'P0001','ACTIVATION_GENERIC_LIFECYCLE_BYPASS','direct lifecycle update blocked');
select throws_ok($$update contracts set financial_authority='legacy_revenue' where id='c9a20000-0000-4000-8000-000000000001'$$,'P0001','ACTIVATION_AUTHORITY_IMMUTABLE','direct authority update blocked');
select lives_ok($$update contracts set product_type='legitimate profile update' where id='c9a20000-0000-4000-8000-000000000001'$$,'unrelated update remains allowed');

select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','c9a10000-0000-4000-8000-000000000001',true);
select is((public.begin_contract_activation_intent('c9a20000-0000-4000-8000-000000000001','activate','c9a-selection-1',null)->>'resolution_outcome'),'selection_required','absence remains unresolved and requests selection');
select is((public.begin_contract_activation_intent('c9a20000-0000-4000-8000-000000000001','activate','c9a-selection-1',null)->>'id')::uuid,(select id from contract_activation_intents where idempotency_key='c9a-selection-1'),'same key reuses intent');
select is((select count(*)::integer from contract_activation_intents where idempotency_key='c9a-selection-1'),1,'retry creates exactly one intent');
select is((public.begin_contract_activation_intent('c9a20000-0000-4000-8000-000000000001','activate','c9a-selection-1','not_applicable')->>'financial_outcome'),'not_applicable','explicit N/A completes without adapter');
select is((select financial_authority from contracts where id='c9a20000-0000-4000-8000-000000000001'),'not_applicable','manual authority is persisted');
select is((select status from contracts where id='c9a20000-0000-4000-8000-000000000001'),'active','canonical command applies lifecycle');
select is((public.begin_contract_activation_intent('c9a20000-0000-4000-8000-000000000002','activate','c9a-auto-legacy',null)->>'financial_authority'),'legacy_revenue','legacy-only history resolves legacy');
select is((select financial_authority_resolution_source from contracts where id='c9a20000-0000-4000-8000-000000000002'),'automatic_legacy_history','legacy resolution source is audited');
select is((public.begin_contract_activation_intent('c9a20000-0000-4000-8000-000000000003','activate','c9a-auto-engine',null)->>'financial_authority'),'commission_engine','CE-only history resolves CE');
select is((select financial_authority_resolution_source from contracts where id='c9a20000-0000-4000-8000-000000000003'),'automatic_ce_history','CE resolution source is audited');
select is((public.begin_contract_activation_intent('c9a20000-0000-4000-8000-000000000004','activate','c9a-reconcile',null)->>'resolution_outcome'),'reconciliation_required','mixed history requires reconciliation');
select is((public.begin_contract_activation_intent('c9a20000-0000-4000-8000-000000000004','activate','c9a-reconcile',null)->>'resolution_outcome'),'reconciliation_required','reconciliation retry without selection remains idempotent');
select throws_ok($$select public.begin_contract_activation_intent('c9a20000-0000-4000-8000-000000000004','activate','c9a-reconcile','not_applicable')$$,'P0001','ACTIVATION_AUTHORITY_RECONCILIATION_REQUIRED','reconciliation rejects manual N/A');
select throws_ok($$select public.begin_contract_activation_intent('c9a20000-0000-4000-8000-000000000004','activate','c9a-reconcile','commission_engine')$$,'P0001','ACTIVATION_AUTHORITY_RECONCILIATION_REQUIRED','reconciliation rejects manual CE');
select throws_ok($$select public.begin_contract_activation_intent('c9a20000-0000-4000-8000-000000000004','activate','c9a-reconcile','legacy_revenue')$$,'P0001','ACTIVATION_AUTHORITY_RECONCILIATION_REQUIRED','reconciliation rejects manual legacy');
select is((select financial_authority from contracts where id='c9a20000-0000-4000-8000-000000000004'),null,'reconciliation chooses no authority');
select is((select status from contracts where id='c9a20000-0000-4000-8000-000000000004'),'draft','reconciliation performs no lifecycle transition');
select is((select resolution_outcome from contract_activation_intents where idempotency_key='c9a-reconcile'),'reconciliation_required','rejected selections preserve original reconciliation intent');
select is((select count(*)::integer from contract_activation_intents where idempotency_key='c9a-reconcile'),1,'reconciliation retries create no duplicate intent');
select is((select count(*)::integer from expected_revenue_entries where contract_id='c9a20000-0000-4000-8000-000000000004'),0,'rejected reconciliation selections create no financial effect');
select is((select count(*)::integer from recognized_revenue_entries),0,'resolution creates no recognized revenue');

select set_config('request.jwt.claim.sub','c9a10000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.begin_contract_activation_intent('c9a20000-0000-4000-8000-000000000001','deactivate','c9a-sdr-denied',null)$$,'P0001','ACTIVATION_FORBIDDEN','SDR cannot operate lifecycle');

select * from finish();
rollback;
