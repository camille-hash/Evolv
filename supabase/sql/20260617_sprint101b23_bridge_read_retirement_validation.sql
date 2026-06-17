-- Sprint 101B.23
-- Bridge read retirement validation
-- Read-only validation. Manual execution only.

select
  current_timestamp as validated_at,
  current_database() as database_name,
  current_user as execution_user;

with expected_policies as (
  select *
  from (
    values
      ('Allow public read crm_leads', true),
      ('Allow public update crm_leads', true),
      ('Authenticated bridge read crm_leads', false),
      ('Authenticated bridge update crm_leads', true),
      ('crm_leads authenticated read same organization', true),
      ('crm_leads authenticated update same organization', true)
  ) as items(policyname, should_exist_after_apply)
)
select
  ep.policyname,
  ep.should_exist_after_apply,
  pp.roles,
  pp.cmd,
  pp.qual,
  pp.with_check,
  pp.policyname is not null as exists_in_database
from expected_policies ep
left join pg_policies pp
  on pp.schemaname = 'public'
 and pp.tablename = 'crm_leads'
 and pp.policyname = ep.policyname
order by ep.policyname;

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'crm_leads';

select
  count(*) as crm_leads_total,
  count(*) filter (where organization_id is null) as crm_leads_organization_id_nulls
from public.crm_leads;
