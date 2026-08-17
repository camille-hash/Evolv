begin;
create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
set search_path = public, extensions;
select plan(6);

insert into public.organizations (id,name,slug)
values ('f1000000-0000-4000-8000-000000000001','C2 Concurrency','c2-concurrency');
insert into auth.users (id) values ('f2000000-0000-4000-8000-000000000001');
insert into public.profiles (id,organization_id,name,email,role)
values ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','Master','master@concurrency.test','master');
insert into public.crm_leads (id,organization_id,nome)
values ('f3000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','Concurrent Lead');
insert into public.crm_lead_commercial_proposals(
 id,organization_id,lead_id,title,source_suggestion,status,proposal_number,
 root_proposal_id,version,original_snapshot,saved_snapshot,summary,metadata
) values
 ('f4000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','Concurrent revision','recommended','generated','PROP-CONCURRENT-REVISION','f4000000-0000-4000-8000-000000000001',1,'{}','{}','{}','{}'),
 ('f4000000-0000-4000-8000-000000000010','f1000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','Concurrent approval','recommended','generated','PROP-CONCURRENT-APPROVAL','f4000000-0000-4000-8000-000000000010',1,'{}','{}','{}','{}');

-- Independent sessions must observe the fixtures before racing.
commit;
begin;

create function pg_temp.consume_dblink(p_connection text)
returns text language plpgsql as $$
begin
  perform * from extensions.dblink_get_result(p_connection) as result(value text);
  return 'OK';
exception when others then
  return sqlerrm;
end $$;

select extensions.dblink_connect('revision_a','dbname=postgres user=supabase_admin');
select extensions.dblink_connect('revision_b','dbname=postgres user=supabase_admin');
select ok(extensions.dblink_send_query('revision_a',$q$
 with actor as (select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',false))
 select public.revise_commercial_proposal_transaction(
  'f4000000-0000-4000-8000-000000000001','f4000000-0000-4000-8000-000000000001','{"winner":"a"}','concurrent a') from actor$q$)=1,'first revision dispatched asynchronously');
select ok(extensions.dblink_send_query('revision_b',$q$
 with actor as (select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',false))
 select public.revise_commercial_proposal_transaction(
  'f4000000-0000-4000-8000-000000000001','f4000000-0000-4000-8000-000000000001','{"winner":"b"}','concurrent b') from actor$q$)=1,'second revision dispatched asynchronously');

create temp table concurrency_results(value text);
insert into concurrency_results values (pg_temp.consume_dblink('revision_a')),(pg_temp.consume_dblink('revision_b'));
select is((select count(*)::integer from concurrency_results where value='OK'),1,'exactly one concurrent revision succeeds');
select is((select count(*)::integer from concurrency_results where value like '%CP_REVISION_BASE_STALE%'),1,'losing revision receives stable stale-base conflict');
select is((select count(*)::integer from public.crm_lead_commercial_proposals where root_proposal_id='f4000000-0000-4000-8000-000000000001'),2,'concurrent revisions create no branch');

select extensions.dblink_disconnect('revision_a');
select extensions.dblink_disconnect('revision_b');
truncate concurrency_results;
select extensions.dblink_connect('revision_c','dbname=postgres user=supabase_admin');
select extensions.dblink_connect('approval_c','dbname=postgres user=supabase_admin');
select extensions.dblink_send_query('revision_c',$q$
 with actor as (select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',false))
 select public.revise_commercial_proposal_transaction(
  'f4000000-0000-4000-8000-000000000010','f4000000-0000-4000-8000-000000000010','{"revision":true}','serialized revision') from actor$q$);
select extensions.dblink_send_query('approval_c',$q$
 with actor as (select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',false))
 select public.approve_commercial_proposal_transaction('f4000000-0000-4000-8000-000000000010') from actor$q$);
insert into concurrency_results values (pg_temp.consume_dblink('revision_c')),(pg_temp.consume_dblink('approval_c'));
select ok(
 (select count(*)=2 and max(version)=2 and count(*) filter (where status='generated')=1 and count(*) filter (where status='superseded')=1
  from public.crm_lead_commercial_proposals where root_proposal_id='f4000000-0000-4000-8000-000000000010'),
 'revision versus approval is serialized without contradictory final state'
);
select extensions.dblink_disconnect('revision_c');
select extensions.dblink_disconnect('approval_c');

select * from finish();
rollback;
