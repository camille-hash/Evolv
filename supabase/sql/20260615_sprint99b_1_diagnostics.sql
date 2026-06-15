-- EVOLV Sprint 99B.1 - Persistent lead notes diagnostics.
-- SELECT-only script for manual review.
-- Do not mutate schema, data, grants, RLS or policies.

-- 1. Required tables.
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('organizations', 'profiles', 'crm_leads', 'crm_lead_notes')
order by table_name;

-- 2. crm_leads ownership columns.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
  and column_name in ('id', 'organization_id', 'observacoes', 'created_at', 'updated_at')
order by ordinal_position;

-- 3. Total leads and notes table presence.
select count(*) as crm_leads_total
from public.crm_leads;

-- 4. Leads without organization_id.
select
  count(*) filter (
    where not (to_jsonb(cl) ? 'organization_id')
      or to_jsonb(cl)->>'organization_id' is null
      or to_jsonb(cl)->>'organization_id' = ''
  ) as leads_without_organization_id
from public.crm_leads cl;

-- 5. Leads with current observations that could become initial notes.
select
  count(*) as leads_with_observacoes
from public.crm_leads
where nullif(trim(coalesce(observacoes, '')), '') is not null;

-- 6. Leads by organization.
select
  coalesce(nullif(to_jsonb(cl)->>'organization_id', ''), '(null)') as organization_id,
  count(*) as total
from public.crm_leads cl
group by coalesce(nullif(to_jsonb(cl)->>'organization_id', ''), '(null)')
order by total desc;

-- 7. Admin profiles available for author/backfill review.
select
  id,
  organization_id,
  name,
  email,
  role,
  is_active
from public.profiles
where role = 'admin'
order by email;

-- 8. Existing crm_lead_notes columns if the table already exists.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_lead_notes'
order by ordinal_position;

-- 9. Existing crm_lead_notes constraints if the table already exists.
select
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as constraint_definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'crm_lead_notes'
order by con.conname;

-- 10. Existing crm_lead_notes indexes if the table already exists.
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'crm_lead_notes'
order by indexname;
