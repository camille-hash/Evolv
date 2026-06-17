-- Sprint 101B.15
-- CRM Leads RLS hardening validation
-- Read-only validation. Manual execution only.

select
  current_timestamp as validated_at,
  current_database() as database_name,
  current_user as execution_user;

select
  count(*) as crm_leads_total,
  count(*) filter (where organization_id is null) as crm_leads_organization_id_nulls
from public.crm_leads;

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('crm_leads', 'profiles')
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
  and tablename = 'crm_leads'
order by policyname;

select
  case
    when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'crm_leads'
        and policyname = 'crm_leads authenticated read same organization'
    ) then true
    else false
  end as has_org_scoped_select_policy,
  case
    when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'crm_leads'
        and policyname = 'crm_leads authenticated update same organization'
    ) then true
    else false
  end as has_org_scoped_update_policy;

select
  case
    when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'crm_leads'
        and policyname = 'Allow public read crm_leads'
    ) then true
    else false
  end as bridge_anon_read_still_present,
  case
    when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'crm_leads'
        and policyname = 'Allow public update crm_leads'
    ) then true
    else false
  end as bridge_anon_update_still_present,
  case
    when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'crm_leads'
        and policyname = 'Authenticated bridge read crm_leads'
    ) then true
    else false
  end as bridge_authenticated_read_still_present,
  case
    when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'crm_leads'
        and policyname = 'Authenticated bridge update crm_leads'
    ) then true
    else false
  end as bridge_authenticated_update_still_present;
