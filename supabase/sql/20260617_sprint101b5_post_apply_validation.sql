-- EVOLV Sprint 101B.5 - Post Apply Validation
-- STATUS: DOCUMENTAL. NAO EXECUTAR NESTA SPRINT.
--
-- Apenas SELECTs para consolidar a validacao apos schema + policies.

-- 1) Contagem de crm_leads preservada.
select count(*) as crm_leads_total
from public.crm_leads;

-- 2) Colunas novas em crm_leads.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
  and column_name in (
    'pipeline',
    'etapa',
    'pipeline_domain',
    'stage_domain',
    'last_stage_changed_at',
    'first_invoice_paid',
    'first_invoice_paid_at',
    'sales_closed_at'
  )
order by column_name;

-- 3) Existencia das tabelas novas.
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('crm_stage_events', 'crm_green_flags')
order by table_name;

-- 4) RLS nas tabelas novas.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('crm_stage_events', 'crm_green_flags')
order by c.relname;

-- 5) Policies nas tabelas novas.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('crm_stage_events', 'crm_green_flags')
order by tablename, policyname;

-- 6) Ausencia de anon/public nas tabelas novas.
select
  schemaname,
  tablename,
  policyname,
  roles
from pg_policies
where schemaname = 'public'
  and tablename in ('crm_stage_events', 'crm_green_flags')
  and (
    'anon' = any(roles)
    or 'public' = any(roles)
  )
order by tablename, policyname;

-- 7) Ausencia de policies amplas.
select
  schemaname,
  tablename,
  policyname,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('crm_stage_events', 'crm_green_flags')
  and (
    coalesce(qual, '') ilike '%true%'
    or coalesce(with_check, '') ilike '%true%'
  )
order by tablename, policyname;

-- 8) Novas tabelas vazias no momento zero.
select count(*) as crm_stage_events_total
from public.crm_stage_events;

select count(*) as crm_green_flags_total
from public.crm_green_flags;
