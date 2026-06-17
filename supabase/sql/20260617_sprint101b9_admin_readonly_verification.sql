-- Sprint 101B.9
-- Administrative read-only verification script
-- Read-only only: SELECT / WITH / information_schema / pg_catalog / pg_policies

select
  current_timestamp as audited_at;

select
  current_database() as database_name,
  current_user as execution_user,
  current_schema() as current_schema_name;

select
  count(*) as crm_leads_total,
  count(*) filter (where organization_id is null) as crm_leads_organization_id_nulls
from public.crm_leads;

select
  organization_id,
  count(*) as total
from public.crm_leads
group by organization_id
order by total desc, organization_id;

select
  count(*) as profiles_total,
  count(*) filter (where organization_id is null) as profiles_organization_id_nulls
from public.profiles;

select
  organization_id,
  count(*) as total
from public.profiles
group by organization_id
order by total desc, organization_id;

select
  role,
  count(*) as total
from public.profiles
group by role
order by total desc, role;

select
  is_active,
  count(*) as total
from public.profiles
group by is_active
order by is_active desc;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  l.lanname as language_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
  and p.proname in ('evolv_current_organization_id', 'evolv_current_role')
order by p.proname;

select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('crm_stage_events', 'crm_green_flags', 'crm_leads', 'profiles')
order by table_name;

select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('crm_leads', 'profiles', 'crm_stage_events', 'crm_green_flags')
order by table_name, ordinal_position;
