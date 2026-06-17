-- EVOLV Sprint 101B.2 - Dual Pipeline Schema Validation
-- STATUS: VALIDACAO MANUAL FUTURA. NAO EXECUTAR NESTA SPRINT.
--
-- Apenas SELECTs.

-- 1) Confirmar colunas antigas e novas em crm_leads.
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

-- 2) Confirmar existencia das tabelas novas.
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('crm_stage_events', 'crm_green_flags')
order by table_name;

-- 3) Confirmar colunas de crm_stage_events.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_stage_events'
order by ordinal_position;

-- 4) Confirmar colunas de crm_green_flags.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_green_flags'
order by ordinal_position;

-- 5) Confirmar indices criados.
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('crm_leads', 'crm_stage_events', 'crm_green_flags')
order by tablename, indexname;

-- 6) Confirmar RLS habilitado nas novas tabelas.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('crm_stage_events', 'crm_green_flags')
order by c.relname;

-- 7) Conferir policies existentes nas novas tabelas.
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
  and tablename in ('crm_stage_events', 'crm_green_flags')
order by tablename, policyname;

-- 8) Confirmar ausencia de policy anon nas novas tabelas.
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

-- 9) Confirmar ausencia de policies amplas.
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

-- 10) Confirmar contagem de crm_leads preservada.
select count(*) as crm_leads_total
from public.crm_leads;

-- 11) Confirmar tabelas novas vazias apos apply inicial.
select count(*) as crm_stage_events_total
from public.crm_stage_events;

select count(*) as crm_green_flags_total
from public.crm_green_flags;

-- 12) Confirmar existencia continua de pipeline/etapa originais.
select
  count(*) filter (where column_name = 'pipeline') as has_pipeline,
  count(*) filter (where column_name = 'etapa') as has_etapa
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
  and column_name in ('pipeline', 'etapa');
