-- EVOLV Sprint 96.1 - Passive diagnostics for CRM security legacy.
-- SELECT-only script.
-- Do not mutate schema, data, grants, RLS or policies.

-- ============================================================================
-- 1. crm_leads grants
-- ============================================================================

select
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'crm_leads'
order by grantee, privilege_type;

-- ============================================================================
-- 2. crm_leads policies
-- ============================================================================

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

-- ============================================================================
-- 3. RLS state for crm_leads and profiles
-- ============================================================================

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('crm_leads', 'profiles')
order by c.relname;

-- ============================================================================
-- 4. Core counts
-- ============================================================================

select count(*) as crm_leads_total
from public.crm_leads;

select count(*) as profiles_total
from public.profiles;

select count(*) as auth_users_total
from auth.users;

-- ============================================================================
-- 5. Profile to auth.users links
-- ============================================================================

select
  count(*) filter (where au.id is not null) as profiles_matching_auth_users,
  count(*) filter (where au.id is null) as profiles_without_auth_user
from public.profiles p
left join auth.users au on au.id = p.id;

select
  p.id,
  p.email,
  p.role,
  p.is_active,
  p.organization_id,
  case
    when au.id is null then 'missing auth user'
    else 'ok'
  end as auth_link_status
from public.profiles p
left join auth.users au on au.id = p.id
order by p.email;

-- ============================================================================
-- 6. crm_leads columns
-- ============================================================================

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
order by ordinal_position;

-- ============================================================================
-- 7. Public/anon access posture snapshot
-- ============================================================================

select
  has_table_privilege('anon', 'public.crm_leads', 'select') as anon_can_select_crm_leads,
  has_table_privilege('anon', 'public.crm_leads', 'insert') as anon_can_insert_crm_leads,
  has_table_privilege('anon', 'public.crm_leads', 'update') as anon_can_update_crm_leads,
  has_table_privilege('anon', 'public.crm_leads', 'delete') as anon_can_delete_crm_leads,
  has_table_privilege('authenticated', 'public.crm_leads', 'select') as authenticated_can_select_crm_leads,
  has_table_privilege('authenticated', 'public.crm_leads', 'insert') as authenticated_can_insert_crm_leads,
  has_table_privilege('authenticated', 'public.crm_leads', 'update') as authenticated_can_update_crm_leads,
  has_table_privilege('authenticated', 'public.crm_leads', 'delete') as authenticated_can_delete_crm_leads;

-- ============================================================================
-- 8. Existing policy names expected from current production context
-- ============================================================================

select
  policyname,
  cmd,
  roles,
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

