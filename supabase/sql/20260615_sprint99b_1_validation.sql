-- EVOLV Sprint 99B.1 - Proposed validation queries.
-- SELECT-only script for manual validation after each step.
-- Do not mutate schema, data, grants, RLS or policies.

-- 1. Table exists.
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'crm_lead_notes';

-- 2. Columns.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_lead_notes'
order by ordinal_position;

-- 3. Constraints.
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

-- 4. Indexes.
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'crm_lead_notes'
order by indexname;

-- 5. Triggers.
select
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'crm_lead_notes'
order by trigger_name, event_manipulation;

-- 6. Notes total.
select count(*) as crm_lead_notes_total
from public.crm_lead_notes;

-- 7. Active notes total.
select count(*) as active_crm_lead_notes_total
from public.crm_lead_notes
where deleted_at is null;

-- 8. Backfilled initial notes.
select count(*) as initial_context_backfilled_notes
from public.crm_lead_notes
where note_type = 'initial_context'
  and metadata->>'source' = 'crm_leads.observacoes';

-- 9. Notes with organization mismatch.
select count(*) as notes_with_organization_mismatch
from public.crm_lead_notes notes
join public.crm_leads leads on leads.id = notes.lead_id
where notes.organization_id <> leads.organization_id;

-- 10. crm_leads total remains available for comparison.
select count(*) as crm_leads_total
from public.crm_leads;
