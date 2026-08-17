begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(33);

select has_table('public','contract_materialization_audit_events','dedicated audit exists');
select has_function('public','materialize_approved_commercial_proposal_transaction',array['uuid','uuid','text'],'transaction RPC exists');
select ok(not has_function_privilege('public','public.materialize_approved_commercial_proposal_transaction(uuid,uuid,text)','EXECUTE'),'PUBLIC cannot execute');
select ok(not has_function_privilege('anon','public.materialize_approved_commercial_proposal_transaction(uuid,uuid,text)','EXECUTE'),'anon cannot execute');
select ok(has_function_privilege('authenticated','public.materialize_approved_commercial_proposal_transaction(uuid,uuid,text)','EXECUTE'),'authenticated can execute controlled RPC');
select ok(not has_table_privilege('authenticated','public.contract_materialization_audit_events','INSERT'),'authenticated cannot forge audit');

insert into public.organizations(id,name,slug) values
('c5100000-0000-4000-8000-000000000001','C5 A','c5-a'),
('c5100000-0000-4000-8000-000000000002','C5 B','c5-b');
insert into auth.users(id) values
('c5200000-0000-4000-8000-000000000001'),
('c5200000-0000-4000-8000-000000000002'),
('c5200000-0000-4000-8000-000000000003');
insert into public.profiles(id,organization_id,name,email,role) values
('c5200000-0000-4000-8000-000000000001','c5100000-0000-4000-8000-000000000001','Master','master@c5.test','master'),
('c5200000-0000-4000-8000-000000000002','c5100000-0000-4000-8000-000000000001','SDR','sdr@c5.test','sdr'),
('c5200000-0000-4000-8000-000000000003','c5100000-0000-4000-8000-000000000002','Other','other@c5.test','master');
insert into public.crm_leads(id,organization_id,nome) values
('c5300000-0000-4000-8000-000000000001','c5100000-0000-4000-8000-000000000001','Lead A'),
('c5300000-0000-4000-8000-000000000002','c5100000-0000-4000-8000-000000000002','Lead B');
insert into public.clients(id,organization_id,name,status) values
('c5400000-0000-4000-8000-000000000001','c5100000-0000-4000-8000-000000000001','Client A','active'),
('c5400000-0000-4000-8000-000000000002','c5100000-0000-4000-8000-000000000001','Inactive','inactive'),
('c5400000-0000-4000-8000-000000000003','c5100000-0000-4000-8000-000000000002','Other','active');
insert into public.administrators(id,organization_id,name,slug,status) values
('c5500000-0000-4000-8000-000000000001','c5100000-0000-4000-8000-000000000001','Rodobens','rodobens','active');

create function pg_temp.c5_snapshot(p_sim text,p_count integer default 3,p_admin text default 'c5500000-0000-4000-8000-000000000001')
returns jsonb language sql as $$
  select jsonb_build_object(
    'schemaVersion','commercial-proposal/v1','proposalKind','patrimonial_strategy',
    'provenance',jsonb_build_object('authority','server_derived','simulationId',p_sim,'calculationEngineKey','engine:reference-capital-exclusive-2227','calculationEngineVersion','1.0.0','financialProductKey','reference_capital_exclusive_2227','financialProductVersion','2227-v1'),
    'product',jsonb_build_object('productKey','reference_capital_exclusive_2227','productVersion','2227-v1','displayName','Grupo Exclusivo','administratorTechnicalId',p_admin,'administratorReferenceKey','rodobens','administratorDisplayName','Rodobens','groupCode','2227','termMonths',216),
    'strategy',jsonb_build_object('quotaCount',p_count,'totalCredit',jsonb_build_object('amountCents',p_count*20000000,'currency','BRL')),
    'composition',(select jsonb_agg(jsonb_build_object('itemKey','quota-'||lpad(i::text,3,'0'),'position',i,'commercialCatalogCode','29.09.55'||lpad(i::text,2,'0'),'credit',jsonb_build_object('amountCents',20000000,'currency','BRL'),'termMonths',216,'installmentPhases',jsonb_build_array(jsonb_build_object('phaseKey','phase-1','startInstallment',1,'endInstallment',216,'installmentAmount',jsonb_build_object('amountCents',91633,'currency','BRL'))),'insurance',jsonb_build_object('included',false),'adjustment',jsonb_build_object('index','INCC'),'contemplation',jsonb_build_object('isGuarantee',false)) order by i) from generate_series(1,p_count)i),
    'commercialTerms','{}'::jsonb,'disclosures','[]'::jsonb)
$$;
create function pg_temp.create_proposal(p_proposal uuid,p_sim uuid,p_count integer default 3,p_admin text default 'c5500000-0000-4000-8000-000000000001')
returns void language plpgsql as $$ declare s jsonb:=pg_temp.c5_snapshot(p_sim::text,p_count,p_admin); begin
  perform set_config('request.jwt.claim.role','service_role',true);
  perform public.create_server_derived_patrimonial_proposal_transaction(
    'c5100000-0000-4000-8000-000000000001','c5200000-0000-4000-8000-000000000001','c5300000-0000-4000-8000-000000000001',p_sim,p_proposal,
    'create-'||right(replace(p_proposal::text,'-',''),12),repeat('a',64),'{"intent":true}','{"result":true}',s,public.commercial_proposal_terms_hash(s));
end $$;

select pg_temp.create_proposal('c5600000-0000-4000-8000-000000000001','c5700000-0000-4000-8000-000000000001',3);
select pg_temp.create_proposal('c5610000-0000-4000-8000-000000000002','c5710000-0000-4000-8000-000000000002',1);
select pg_temp.create_proposal('c5620000-0000-4000-8000-000000000003','c5720000-0000-4000-8000-000000000003',1,null);
select pg_temp.create_proposal('c5630000-0000-4000-8000-000000000004','c5730000-0000-4000-8000-000000000004',1);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','c5200000-0000-4000-8000-000000000001',true);
select public.approve_commercial_proposal_transaction('c5600000-0000-4000-8000-000000000001');
select public.approve_commercial_proposal_transaction('c5620000-0000-4000-8000-000000000003');
select public.approve_commercial_proposal_transaction('c5630000-0000-4000-8000-000000000004');
set local role authenticated;

select is((public.materialize_approved_commercial_proposal_transaction('c5600000-0000-4000-8000-000000000001','c5400000-0000-4000-8000-000000000001','materialize-001')->>'outcome'),'created','three-item proposal materializes');
select is((select count(*)::integer from public.contract_materializations where source_root_proposal_id='c5600000-0000-4000-8000-000000000001'),1,'one root is created');
select is((select count(*)::integer from public.contracts where contract_materialization_id is not null),3,'one contract per composition item');
select is((select sum(credit_amount) from public.contracts where contract_materialization_id is not null),600000::numeric,'child credit total is exact');
select is((select count(*)::integer from public.contracts where status='draft' and contract_number is null and contract_quota is null and commission_plan_id is null),3,'contracts are draft without operational ids or commission plan');
select is((select array_agg(source_composition_item_key order by source_composition_item_key) from public.contracts where contract_materialization_id is not null),array['quota-001','quota-002','quota-003'],'item keys are exact');
select is((select array_agg(commercial_catalog_code order by source_composition_item_key) from public.contracts where contract_materialization_id is not null),array['29.09.5501','29.09.5502','29.09.5503'],'catalog values are frozen and not quotas');
select is((select count(*)::integer from public.contract_materialization_audit_events),1,'one success audit is recorded');
select is((public.materialize_approved_commercial_proposal_transaction('c5600000-0000-4000-8000-000000000001','c5400000-0000-4000-8000-000000000001','materialize-001')->>'outcome'),'already_created','coherent retry returns existing result');
select is((select count(*)::integer from public.contract_materialization_audit_events),1,'retry does not duplicate audit');
select throws_ok($$select public.materialize_approved_commercial_proposal_transaction('c5600000-0000-4000-8000-000000000001','c5400000-0000-4000-8000-000000000002','materialize-001')$$,'P0001','MAT_ALREADY_MATERIALIZED_CONFLICT','client conflict is rejected');
select throws_ok($$select public.materialize_approved_commercial_proposal_transaction('c5610000-0000-4000-8000-000000000002','c5400000-0000-4000-8000-000000000001','materialize-002')$$,'P0001','MAT_PROPOSAL_NOT_APPROVED','unapproved proposal is rejected');
select public.approve_commercial_proposal_transaction('c5610000-0000-4000-8000-000000000002');
select is((public.materialize_approved_commercial_proposal_transaction('c5610000-0000-4000-8000-000000000002','c5400000-0000-4000-8000-000000000001','materialize-002')->>'outcome'),'created','one-item proposal materializes');
select is((select count(*)::integer from public.contracts c join public.contract_materializations m on m.id=c.contract_materialization_id where m.source_root_proposal_id='c5610000-0000-4000-8000-000000000002'),1,'one-item proposal creates exactly one contract');
select throws_ok($$select public.materialize_approved_commercial_proposal_transaction('c5620000-0000-4000-8000-000000000003','c5400000-0000-4000-8000-000000000001','materialize-003')$$,'P0001','MAT_ADMINISTRATOR_REFERENCE_REQUIRED','missing administrator is rejected');
update public.administrators set status='inactive' where id='c5500000-0000-4000-8000-000000000001';
select throws_ok($$select public.materialize_approved_commercial_proposal_transaction('c5630000-0000-4000-8000-000000000004','c5400000-0000-4000-8000-000000000001','materialize-inactive-admin')$$,'P0001','MAT_ADMINISTRATOR_REFERENCE_INVALID','inactive administrator is rejected');
update public.administrators set status='active' where id='c5500000-0000-4000-8000-000000000001';
select throws_ok($$select public.revise_commercial_proposal_transaction('c5600000-0000-4000-8000-000000000001','c5600000-0000-4000-8000-000000000001','{}','change')$$,'P0001','MAT_LINEAGE_LOCKED_BY_MATERIALIZATION','revision is blocked after materialization');
select throws_ok($$select public.revoke_commercial_proposal_approval_transaction('c5600000-0000-4000-8000-000000000001','reason')$$,'P0001','MAT_LINEAGE_LOCKED_BY_MATERIALIZATION','revocation is blocked after materialization');
select is((select count(*)::integer from public.contract_commission_snapshots),0,'no commission snapshot is created');
select is((select count(*)::integer from public.contract_commission_schedule_items),0,'no commission schedule is created');
select is((select count(*)::integer from public.revenue_entries),0,'no legacy revenue is created');
select is((select count(*)::integer from public.expected_revenue_entries),0,'no expected revenue is created');
select is((select count(*)::integer from public.recognized_revenue_entries),0,'no recognized revenue is created');
reset role;
select lives_ok($$insert into public.contracts(organization_id,client_id,status,credit_amount) values('c5100000-0000-4000-8000-000000000001','c5400000-0000-4000-8000-000000000001','draft',100)$$,'legacy direct creation remains operational');
select ok((select contract_materialization_id is null and source_composition_item_key is null from public.contracts where credit_amount=100),'legacy creation cannot imply materialization');
set local role authenticated;
select throws_ok($$select public.materialize_approved_commercial_proposal_transaction('c5620000-0000-4000-8000-000000000003','c5400000-0000-4000-8000-000000000003','materialize-004')$$,'P0001','MAT_CLIENT_NOT_FOUND','cross-tenant client is not revealed');
reset role;
select set_config('request.jwt.claim.sub','c5200000-0000-4000-8000-000000000002',true);
set local role authenticated;
select throws_ok($$select public.materialize_approved_commercial_proposal_transaction('c5610000-0000-4000-8000-000000000002','c5400000-0000-4000-8000-000000000001','materialize-005')$$,'P0001','MAT_ACTOR_FORBIDDEN','sdr cannot materialize');
select * from finish();
rollback;
