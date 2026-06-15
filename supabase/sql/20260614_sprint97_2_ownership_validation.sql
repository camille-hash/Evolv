-- EVOLV Sprint 97.2 - Ownership foundation validation.
-- SELECT-only script for manual review after approved execution.
-- Do not mutate schema, data, grants, RLS or policies.

-- 1. Total leads.
select count(*) as crm_leads_total
from public.crm_leads;

-- 2. Null organization ownership count, safe even if organization_id is absent.
select
  count(*) filter (
    where not (to_jsonb(cl) ? 'organization_id')
      or to_jsonb(cl)->>'organization_id' is null
      or to_jsonb(cl)->>'organization_id' = ''
  ) as leads_without_organization_id
from public.crm_leads cl;

-- 3. Leads by organization.
select
  coalesce(o.slug, '(null)') as organization_slug,
  coalesce(o.name, '(null)') as organization_name,
  coalesce(to_jsonb(cl)->>'organization_id', '(null)') as organization_id,
  count(*) as total
from public.crm_leads cl
left join public.organizations o
  on o.id::text = to_jsonb(cl)->>'organization_id'
group by
  coalesce(o.slug, '(null)'),
  coalesce(o.name, '(null)'),
  coalesce(to_jsonb(cl)->>'organization_id', '(null)')
order by total desc;

-- 4. Foreign key presence.
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
  and con.conname = 'crm_leads_organization_id_fk';

-- 5. Index presence.
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'crm_leads'
  and indexname = 'crm_leads_organization_id_idx';

-- 6. RLS state must match the initial diagnostic.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'crm_leads';

-- 7. Policies must match the initial diagnostic.
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

-- 8. Grants must match the initial diagnostic.
select
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'crm_leads'
order by grantee, privilege_type;
