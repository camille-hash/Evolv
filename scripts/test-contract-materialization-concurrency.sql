begin;
create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
set search_path=public,extensions;
select plan(12);

insert into public.organizations(id,name,slug) values('d5100000-0000-4000-8000-000000000001','C5 concurrency','c5-concurrency');
insert into auth.users(id) values('d5200000-0000-4000-8000-000000000001');
insert into public.profiles(id,organization_id,name,email,role) values('d5200000-0000-4000-8000-000000000001','d5100000-0000-4000-8000-000000000001','Master','master@c5-concurrency.test','master');
insert into public.crm_leads(id,organization_id,nome) values('d5300000-0000-4000-8000-000000000001','d5100000-0000-4000-8000-000000000001','Lead');
insert into public.clients(id,organization_id,name) values('d5400000-0000-4000-8000-000000000001','d5100000-0000-4000-8000-000000000001','Client');
insert into public.administrators(id,organization_id,name,slug,status) values('d5500000-0000-4000-8000-000000000001','d5100000-0000-4000-8000-000000000001','Rodobens','rodobens','active');

create function pg_temp.c5c_snapshot(p_sim text) returns jsonb language sql as $$select jsonb_build_object(
 'schemaVersion','commercial-proposal/v1','proposalKind','patrimonial_strategy',
 'provenance',jsonb_build_object('authority','server_derived','simulationId',p_sim,'calculationEngineKey','engine','calculationEngineVersion','1','financialProductKey','reference_capital_exclusive_2227','financialProductVersion','1'),
 'product',jsonb_build_object('productKey','reference_capital_exclusive_2227','productVersion','1','displayName','Product','administratorTechnicalId','d5500000-0000-4000-8000-000000000001','administratorReferenceKey','rodobens','administratorDisplayName','Rodobens','groupCode','2227','termMonths',216),
 'strategy',jsonb_build_object('quotaCount',2,'totalCredit',jsonb_build_object('amountCents',40000000,'currency','BRL')),
 'composition',jsonb_build_array(
  jsonb_build_object('itemKey','quota-001','position',1,'commercialCatalogCode','CAT-1','credit',jsonb_build_object('amountCents',20000000,'currency','BRL'),'termMonths',216,'installmentPhases',jsonb_build_array(jsonb_build_object('phaseKey','p','startInstallment',1,'endInstallment',216,'installmentAmount',jsonb_build_object('amountCents',90000,'currency','BRL')))),
  jsonb_build_object('itemKey','quota-002','position',2,'commercialCatalogCode','CAT-2','credit',jsonb_build_object('amountCents',20000000,'currency','BRL'),'termMonths',216,'installmentPhases',jsonb_build_array(jsonb_build_object('phaseKey','p','startInstallment',1,'endInstallment',216,'installmentAmount',jsonb_build_object('amountCents',90000,'currency','BRL'))))),
 'commercialTerms','{}'::jsonb,'disclosures','[]'::jsonb)$$;
create function pg_temp.c5c_create(p_prop uuid,p_sim uuid,p_key text) returns void language plpgsql as $$declare s jsonb:=pg_temp.c5c_snapshot(p_sim::text); begin
 perform set_config('request.jwt.claim.role','service_role',true);
 perform public.create_server_derived_patrimonial_proposal_transaction('d5100000-0000-4000-8000-000000000001','d5200000-0000-4000-8000-000000000001','d5300000-0000-4000-8000-000000000001',p_sim,p_prop,p_key,repeat('a',64),'{"intent":true}','{"result":true}',s,public.commercial_proposal_terms_hash(s));
 perform set_config('request.jwt.claim.sub','d5200000-0000-4000-8000-000000000001',true);
 perform public.approve_commercial_proposal_transaction(p_prop);
end $$;
select pg_temp.c5c_create('d5600000-0000-4000-8000-000000000001','d5700000-0000-4000-8000-000000000001','c5-concurrency-1');
select pg_temp.c5c_create('d5610000-0000-4000-8000-000000000002','d5710000-0000-4000-8000-000000000002','c5-concurrency-2');
select pg_temp.c5c_create('d5620000-0000-4000-8000-000000000003','d5720000-0000-4000-8000-000000000003','c5-concurrency-3');
commit;
begin;
create function pg_temp.consume(p_connection text) returns text language plpgsql as $$begin
 return (select value from extensions.dblink_get_result(p_connection) as result(value text));
exception when others then return sqlerrm; end $$;
create temp table race_results(race text,value text);

select extensions.dblink_connect_u('mat_a','dbname=postgres user=supabase_admin');
select extensions.dblink_connect_u('mat_b','dbname=postgres user=supabase_admin');
select ok(extensions.dblink_send_query('mat_a',$q$with a as(select set_config('request.jwt.claim.sub','d5200000-0000-4000-8000-000000000001',false)) select public.materialize_approved_commercial_proposal_transaction('d5600000-0000-4000-8000-000000000001','d5400000-0000-4000-8000-000000000001','concurrent-materialize-1')::text from a$q$)=1,'first materialization dispatched');
select ok(extensions.dblink_send_query('mat_b',$q$with a as(select set_config('request.jwt.claim.sub','d5200000-0000-4000-8000-000000000001',false)) select public.materialize_approved_commercial_proposal_transaction('d5600000-0000-4000-8000-000000000001','d5400000-0000-4000-8000-000000000001','concurrent-materialize-1')::text from a$q$)=1,'second materialization dispatched');
insert into race_results values('double',pg_temp.consume('mat_a')),('double',pg_temp.consume('mat_b'));
select is((select count(*)::integer from race_results where race='double' and value like '%"created"%'),1,'one caller creates');
select is((select count(*)::integer from race_results where race='double' and value like '%"already_created"%'),1,'other caller receives same materialization');
select is((select count(*)::integer from public.contract_materializations where source_root_proposal_id='d5600000-0000-4000-8000-000000000001'),1,'double call creates one root');
select is((select count(*)::integer from public.contracts c join public.contract_materializations m on m.id=c.contract_materialization_id where m.source_root_proposal_id='d5600000-0000-4000-8000-000000000001'),2,'double call creates one child set');
select extensions.dblink_disconnect('mat_a'); select extensions.dblink_disconnect('mat_b');

select extensions.dblink_connect_u('mat_revision','dbname=postgres user=supabase_admin');
select extensions.dblink_connect_u('revision','dbname=postgres user=supabase_admin');
select extensions.dblink_send_query('mat_revision',$q$with a as(select set_config('request.jwt.claim.sub','d5200000-0000-4000-8000-000000000001',false)) select public.materialize_approved_commercial_proposal_transaction('d5610000-0000-4000-8000-000000000002','d5400000-0000-4000-8000-000000000001','concurrent-materialize-2')::text from a$q$);
select extensions.dblink_send_query('revision',$q$with a as(select set_config('request.jwt.claim.sub','d5200000-0000-4000-8000-000000000001',false)) select public.revise_commercial_proposal_transaction('d5610000-0000-4000-8000-000000000002','d5610000-0000-4000-8000-000000000002','{"new":true}','race')::text from a$q$);
insert into race_results values('revision',pg_temp.consume('mat_revision')),('revision',pg_temp.consume('revision'));
select ok((select count(*)=1 from public.contract_materializations where source_root_proposal_id='d5610000-0000-4000-8000-000000000002') <> (select count(*)=2 from public.crm_lead_commercial_proposals where root_proposal_id='d5610000-0000-4000-8000-000000000002'),'materialization versus revision has exactly one winner');
select extensions.dblink_disconnect('mat_revision'); select extensions.dblink_disconnect('revision');

select extensions.dblink_connect_u('mat_revoke','dbname=postgres user=supabase_admin');
select extensions.dblink_connect_u('revoke','dbname=postgres user=supabase_admin');
select extensions.dblink_send_query('mat_revoke',$q$with a as(select set_config('request.jwt.claim.sub','d5200000-0000-4000-8000-000000000001',false)) select public.materialize_approved_commercial_proposal_transaction('d5620000-0000-4000-8000-000000000003','d5400000-0000-4000-8000-000000000001','concurrent-materialize-3')::text from a$q$);
select extensions.dblink_send_query('revoke',$q$with a as(select set_config('request.jwt.claim.sub','d5200000-0000-4000-8000-000000000001',false)) select public.revoke_commercial_proposal_approval_transaction('d5620000-0000-4000-8000-000000000003','race')::text from a$q$);
insert into race_results values('revoke',pg_temp.consume('mat_revoke')),('revoke',pg_temp.consume('revoke'));
select ok((select count(*)=1 from public.contract_materializations where source_root_proposal_id='d5620000-0000-4000-8000-000000000003') <> (select status='approval_revoked' from public.crm_lead_commercial_proposals where id='d5620000-0000-4000-8000-000000000003'),'materialization versus revocation has exactly one winner');
select extensions.dblink_disconnect('mat_revoke'); select extensions.dblink_disconnect('revoke');

select set_config('request.jwt.claim.sub','d5200000-0000-4000-8000-000000000001',true);
select is((public.materialize_approved_commercial_proposal_transaction('d5600000-0000-4000-8000-000000000001','d5400000-0000-4000-8000-000000000001','concurrent-materialize-1')->>'outcome'),'already_created','retry after commit is idempotent');
select is((select count(*)::integer from public.contract_materialization_audit_events where source_root_proposal_id='d5600000-0000-4000-8000-000000000001'),1,'retry after commit keeps one audit');
select is((select count(*)::integer from public.contract_commission_snapshots),0,'concurrent materialization has no commission effect');
select is((select count(*)::integer from public.expected_revenue_entries),0,'concurrent materialization has no revenue effect');
select * from finish();
rollback;
