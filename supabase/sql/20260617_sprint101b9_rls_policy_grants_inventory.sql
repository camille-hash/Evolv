-- Sprint 101B.9
-- RLS / policies / grants inventory
-- Read-only only: SELECT / WITH / information_schema / pg_catalog / pg_policies

with relevant_tables as (
  select unnest(array[
    'crm_leads',
    'profiles',
    'crm_stage_events',
    'crm_green_flags'
  ]) as table_name
)
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join relevant_tables rt on rt.table_name = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('crm_leads', 'profiles', 'crm_stage_events', 'crm_green_flags')
order by tablename, policyname;

select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('crm_leads', 'profiles', 'crm_stage_events', 'crm_green_flags')
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;

select
  routine_schema,
  routine_name,
  routine_type,
  data_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('evolv_current_organization_id', 'evolv_current_role')
order by routine_name;

select
  p.specific_schema as routine_schema,
  p.specific_name,
  p.parameter_name,
  p.data_type,
  p.ordinal_position
from information_schema.parameters p
where p.specific_schema = 'public'
  and p.specific_name in (
    select specific_name
    from information_schema.routines
    where routine_schema = 'public'
      and routine_name in ('evolv_current_organization_id', 'evolv_current_role')
  )
order by p.specific_name, p.ordinal_position;
