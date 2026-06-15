-- EVOLV Sprint 94.2 - Preflight validation after safe profiles foundation.
-- This file contains SELECT statements only.
-- It must not mutate schema or data.
-- Production note: public.crm_leads.source_system does not exist in the
-- current production database, so the aggregate by source_system was removed.

-- ============================================================================
-- 1. TABLE EXISTENCE
-- ============================================================================

select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'organizations',
    'profiles',
    'crm_leads',
    'crm_notes',
    'crm_activities',
    'crm_stage_changes',
    'crm_goals',
    'crm_import_batches'
  )
order by table_name;

-- ============================================================================
-- 2. PROFILES STRUCTURE
-- ============================================================================

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
order by ordinal_position;

select
  c.conname as constraint_name,
  c.contype as constraint_type,
  pg_get_constraintdef(c.oid) as constraint_definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'profiles'
order by c.conname;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'profiles'
order by indexname;

-- ============================================================================
-- 3. RLS STATE - OBSERVATION ONLY
-- ============================================================================

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'crm_leads')
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
  and tablename in ('profiles', 'crm_leads')
order by tablename, policyname;

-- ============================================================================
-- 4. CRM LEADS SAFETY CHECKS - OBSERVATION ONLY
-- ============================================================================

select count(*) as crm_leads_total
from public.crm_leads;

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
  and column_name in (
    'organization_id',
    'assigned_profile_id',
    'company_id',
    'assigned_user_id',
    'external_id',
    'source_system'
  )
order by column_name;

-- ============================================================================
-- 5. AUTH USERS AND PROFILES COUNTS
-- ============================================================================

select count(*) as auth_users_total
from auth.users;

select count(*) as profiles_total
from public.profiles;

select
  count(*) filter (where au.id is not null) as profiles_matching_auth_users,
  count(*) filter (where au.id is null) as profiles_without_auth_user
from public.profiles p
left join auth.users au on au.id = p.id;

select
  role,
  is_active,
  count(*) as profiles_total
from public.profiles
group by role, is_active
order by role, is_active;

-- ============================================================================
-- 6. ORGANIZATIONS OBSERVATION
-- ============================================================================

select count(*) as organizations_total
from public.organizations;

select
  id,
  name,
  slug,
  created_at,
  updated_at
from public.organizations
order by created_at desc
limit 20;

