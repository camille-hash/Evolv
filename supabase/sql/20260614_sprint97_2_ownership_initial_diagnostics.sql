-- EVOLV Sprint 97.2 - Ownership foundation initial diagnostics.
-- SELECT-only script for manual review.
-- Do not mutate schema, data, grants, RLS or policies.

-- 1. Total leads.
select count(*) as crm_leads_total
from public.crm_leads;

-- 2. organization_id column existence.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
  and column_name = 'organization_id';

-- 3. organization_id index existence.
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'crm_leads'
  and indexdef ilike '%organization_id%'
order by indexname;

-- 4. organization_id constraints.
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
    or pg_get_constraintdef(con.oid) ilike '%organization_id%'
  )
order by con.conname;

-- 5. Null count, safe even if organization_id is absent.
select
  count(*) filter (
    where not (to_jsonb(cl) ? 'organization_id')
      or to_jsonb(cl)->>'organization_id' is null
      or to_jsonb(cl)->>'organization_id' = ''
  ) as leads_without_organization_id
from public.crm_leads cl;

-- 6. patrion-evolv organization.
select
  id,
  name,
  slug,
  created_at,
  updated_at
from public.organizations
where slug = 'patrion-evolv'
order by created_at;

-- 7. Current RLS state for crm_leads.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'crm_leads';

-- 8. Current crm_leads policies.
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

-- 9. Current crm_leads grants.
select
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'crm_leads'
order by grantee, privilege_type;
