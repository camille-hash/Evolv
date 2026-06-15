-- EVOLV Sprint 97.1 - Validate CRM auth ownership columns.
-- SELECT-only script for manual review after any future approved preparation.
-- Do not execute through Codex. Do not mutate schema, data, grants, RLS or policies.

-- ============================================================================
-- 1. Confirm ownership columns
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
-- 2. Confirm ownership constraints
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
  and con.conname in (
    'crm_leads_organization_id_fk',
    'crm_leads_assigned_profile_id_fk'
  )
order by con.conname;

-- ============================================================================
-- 3. Confirm ownership indexes
-- ============================================================================

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'crm_leads'
  and indexname in (
    'crm_leads_organization_id_idx',
    'crm_leads_assigned_profile_id_idx'
  )
order by indexname;

-- ============================================================================
-- 4. Confirm lead count remains stable
-- ============================================================================

select count(*) as crm_leads_total
from public.crm_leads;

-- ============================================================================
-- 5. Leads with organization_id null, safe even if the column is absent
-- ============================================================================

select
  count(*) filter (
    where not (to_jsonb(cl) ? 'organization_id')
      or to_jsonb(cl)->>'organization_id' is null
      or to_jsonb(cl)->>'organization_id' = ''
  ) as leads_without_organization_id
from public.crm_leads cl;

-- ============================================================================
-- 6. Leads by organization_id, safe even if the column is absent
-- ============================================================================

select
  coalesce(nullif(to_jsonb(cl)->>'organization_id', ''), '(null)') as organization_id,
  count(*) as total
from public.crm_leads cl
group by coalesce(nullif(to_jsonb(cl)->>'organization_id', ''), '(null)')
order by total desc;

-- ============================================================================
-- 7. RLS state for crm_leads
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
-- 8. Current crm_leads policies
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
-- 9. Current crm_leads grants
-- ============================================================================

select
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'crm_leads'
order by grantee, privilege_type;
