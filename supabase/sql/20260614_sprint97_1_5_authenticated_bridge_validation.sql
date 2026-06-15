-- EVOLV Sprint 97.1.5 - Authenticated bridge validation.
-- SELECT-only script for manual review after approved bridge execution.
-- Do not mutate schema, data, grants, RLS or policies.

-- 1. Effective authenticated privileges.
select
  has_table_privilege('authenticated', 'public.crm_leads', 'select') as authenticated_can_select_crm_leads,
  has_table_privilege('authenticated', 'public.crm_leads', 'update') as authenticated_can_update_crm_leads;

-- 2. Authenticated bridge policies.
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
  and policyname in (
    'Authenticated bridge read crm_leads',
    'Authenticated bridge update crm_leads'
  )
order by policyname;

-- 3. Anon policies must still exist.
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
  and policyname in (
    'Allow public read crm_leads',
    'Allow public update crm_leads'
  )
order by policyname;

-- 4. RLS must remain active and unchanged from diagnostics.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'crm_leads';

-- 5. Total leads must remain stable.
select count(*) as crm_leads_total
from public.crm_leads;

-- 6. Full grants snapshot for comparison.
select
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'crm_leads'
order by grantee, privilege_type;
