-- EVOLV Sprint 97.1.5 - Authenticated bridge diagnostics.
-- SELECT-only script for manual review.
-- Do not mutate schema, data, grants, RLS or policies.

-- 1. Total crm_leads.
select count(*) as crm_leads_total
from public.crm_leads;

-- 2. RLS state for crm_leads.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'crm_leads';

-- 3. Current crm_leads policies.
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

-- 4. Current crm_leads grants.
select
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'crm_leads'
order by grantee, privilege_type;

-- 5. Effective anon/authenticated table privileges.
select
  has_table_privilege('anon', 'public.crm_leads', 'select') as anon_can_select_crm_leads,
  has_table_privilege('anon', 'public.crm_leads', 'update') as anon_can_update_crm_leads,
  has_table_privilege('authenticated', 'public.crm_leads', 'select') as authenticated_can_select_crm_leads,
  has_table_privilege('authenticated', 'public.crm_leads', 'update') as authenticated_can_update_crm_leads;

-- 6. Existing admin profiles.
select
  p.id,
  p.organization_id,
  p.name,
  p.email,
  p.role,
  p.is_active,
  p.created_at,
  p.updated_at
from public.profiles p
where p.role = 'admin'
order by p.email;

-- 7. Existing auth.users snapshot.
select
  id,
  email,
  created_at,
  updated_at,
  last_sign_in_at
from auth.users
order by email;
