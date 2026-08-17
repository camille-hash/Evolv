begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(10);

select has_function('public','create_server_derived_patrimonial_proposal_transaction',array['uuid','uuid','uuid','uuid','uuid','text','text','jsonb','jsonb','jsonb','text'],'signature preserved');
select is((select prosecdef from pg_proc where oid='public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text)'::regprocedure),true,'SECURITY DEFINER preserved');
select ok((select proconfig::text like '%search_path=public, extensions, pg_temp%' from pg_proc where oid='public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text)'::regprocedure),'fixed search_path preserved');
select ok(has_function_privilege('service_role','public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text)','EXECUTE'),'service_role executes');
select ok(not has_function_privilege('authenticated','public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text)','EXECUTE'),'authenticated cannot execute');
select ok(not has_function_privilege('anon','public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text)','EXECUTE'),'anon cannot execute');
select ok(not has_function_privilege('public','public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text)','EXECUTE'),'PUBLIC cannot execute');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select is(auth.role(),'service_role','canonical service-role claim resolves');
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001"}',true);
select is(auth.role(),'authenticated','canonical authenticated claim resolves');
select throws_ok($$select create_server_derived_patrimonial_proposal_transaction(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'boundary-test',repeat('a',64),'{}','{}','{}',repeat('b',64))$$,'42501','CP_INTERNAL_BOUNDARY_REQUIRED','authenticated canonical role fails internal boundary');
select * from finish();
rollback;
