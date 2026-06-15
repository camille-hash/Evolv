-- EVOLV Sprint 97.1 - CRM authenticated shadow mode diagnostics.
-- SELECT-only script for manual review.
-- Do not execute through Codex. Do not mutate schema, data, grants, RLS or policies.

-- ============================================================================
-- 1. crm_leads table existence
-- ============================================================================

select
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema = 'public'
  and table_name = 'crm_leads';

-- ============================================================================
-- 2. crm_leads total
-- ============================================================================

select count(*) as crm_leads_total
from public.crm_leads;

-- ============================================================================
-- 3. organization_id and assigned_profile_id columns
-- ============================================================================

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
  and column_name in ('organization_id', 'assigned_profile_id')
order by column_name;

-- ============================================================================
-- 4. crm_leads constraints related to organization/profile ownership
-- ============================================================================

select
  con.conname as constraint_name,
  con.contype as constraint_type,
  con.convalidated as is_validated,
  pg_get_constraintdef(con.oid) as constraint_definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'crm_leads'
  and (
    con.conname ilike '%organization%'
    or con.conname ilike '%profile%'
    or pg_get_constraintdef(con.oid) ilike '%organization_id%'
    or pg_get_constraintdef(con.oid) ilike '%assigned_profile_id%'
  )
order by con.conname;

-- ============================================================================
-- 5. crm_leads indexes related to organization/profile ownership
-- ============================================================================

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'crm_leads'
  and (
    indexname ilike '%organization%'
    or indexname ilike '%profile%'
    or indexdef ilike '%organization_id%'
    or indexdef ilike '%assigned_profile_id%'
  )
order by indexname;

-- ============================================================================
-- 6. RLS state for crm_leads
-- ============================================================================

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'crm_leads';

-- ============================================================================
-- 7. Current crm_leads policies
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
-- 8. Current crm_leads grants
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
-- 9. patrion-evolv organization
-- ============================================================================

select
  id,
  name,
  slug,
  created_at,
  updated_at
from public.organizations
where slug = 'patrion-evolv'
order by created_at;

-- ============================================================================
-- 10. Existing admin profiles
-- ============================================================================

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
