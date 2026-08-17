begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(24);

select ok(has_table_privilege('authenticated','public.profiles','SELECT'),'authenticated reads profiles');
select ok(has_table_privilege('authenticated','public.crm_leads','SELECT'),'authenticated reads leads');
select ok(not has_table_privilege('anon','public.profiles','SELECT'),'anon cannot read profiles');
select ok(not has_table_privilege('anon','public.crm_leads','SELECT'),'anon cannot read leads');
select ok(not has_table_privilege('public','public.profiles','SELECT'),'PUBLIC cannot read profiles');
select ok(not has_table_privilege('public','public.crm_leads','SELECT'),'PUBLIC cannot read leads');
select ok(not has_table_privilege('authenticated','public.profiles','INSERT'),'no profile INSERT added');
select ok(not has_table_privilege('authenticated','public.profiles','UPDATE'),'no profile UPDATE added');
select ok(not has_table_privilege('authenticated','public.profiles','DELETE'),'no profile DELETE added');
select ok(has_table_privilege('authenticated','public.crm_leads','INSERT'),'existing lead INSERT is preserved');
select ok(not has_table_privilege('authenticated','public.crm_leads','UPDATE'),'no lead UPDATE added');
select ok(not has_table_privilege('authenticated','public.crm_leads','DELETE'),'no lead DELETE added');
select ok((select relrowsecurity from pg_class where oid='public.profiles'::regclass),'profile RLS remains enabled');
select ok((select relrowsecurity from pg_class where oid='public.crm_leads'::regclass),'lead RLS remains enabled');

insert into organizations(id,name,slug) values
 ('c32a0000-0000-4000-8000-000000000001','C32R A','c32r-a'),
 ('c32a0000-0000-4000-8000-000000000002','C32R B','c32r-b');
insert into auth.users(id) values
 ('c32b0000-0000-4000-8000-000000000001'),('c32b0000-0000-4000-8000-000000000002'),
 ('c32b0000-0000-4000-8000-000000000003'),('c32b0000-0000-4000-8000-000000000004'),
 ('c32b0000-0000-4000-8000-000000000005');
insert into profiles(id,organization_id,name,email,role,is_active) values
 ('c32b0000-0000-4000-8000-000000000001','c32a0000-0000-4000-8000-000000000001','Master A','master-a@c32r.test','master',true),
 ('c32b0000-0000-4000-8000-000000000002','c32a0000-0000-4000-8000-000000000001','Admin A','admin-a@c32r.test','admin',true),
 ('c32b0000-0000-4000-8000-000000000003','c32a0000-0000-4000-8000-000000000001','SDR A','sdr-a@c32r.test','sdr',true),
 ('c32b0000-0000-4000-8000-000000000004','c32a0000-0000-4000-8000-000000000002','Master B','master-b@c32r.test','master',true),
 ('c32b0000-0000-4000-8000-000000000005','c32a0000-0000-4000-8000-000000000001','Inactive A','inactive-a@c32r.test','sdr',false);
insert into crm_leads(id,organization_id,nome) values
 ('c32c0000-0000-4000-8000-000000000001','c32a0000-0000-4000-8000-000000000001','Lead A'),
 ('c32c0000-0000-4000-8000-000000000002','c32a0000-0000-4000-8000-000000000002','Lead B');

set local role authenticated;
select set_config('request.jwt.claim.sub','c32b0000-0000-4000-8000-000000000001',true);
select is((select count(*)::integer from profiles),1,'master reads own profile only');
select is((select count(*)::integer from crm_leads),1,'master reads own tenant leads');
select is((select count(*)::integer from crm_leads where organization_id='c32a0000-0000-4000-8000-000000000002'),0,'master cannot read tenant B');
select is((select role from profiles where id=auth.uid()),'master','C3.1 resolves master role');

select set_config('request.jwt.claim.sub','c32b0000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from profiles),4,'admin reads profiles from own tenant only');
select is((select count(*)::integer from profiles where organization_id='c32a0000-0000-4000-8000-000000000002'),0,'admin cannot read tenant B profile');

select set_config('request.jwt.claim.sub','c32b0000-0000-4000-8000-000000000003',true);
select is((select count(*)::integer from profiles),1,'SDR reads own profile only');
select is((select count(*)::integer from crm_leads),1,'SDR reads own tenant leads as existing policy permits');

select set_config('request.jwt.claim.sub','c32b0000-0000-4000-8000-000000000005',true);
select is((select count(*)::integer from crm_leads),0,'inactive user resolves no tenant leads');

select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from profiles)+(select count(*)::integer from crm_leads),0,'missing session reads nothing');
reset role;
select * from finish();
rollback;
