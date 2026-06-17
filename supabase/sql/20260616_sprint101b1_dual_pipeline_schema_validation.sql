-- EVOLV Sprint 101B.1 - Dual Pipeline Schema Validation
-- STATUS: VALIDACAO FUTURA. NAO EXECUTAR NESTA SPRINT.
--
-- Este arquivo contem apenas SELECTs para validar a aplicacao futura do schema.

-- 1) Tabelas esperadas.
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'crm_leads',
    'crm_stage_events',
    'crm_green_flags'
  )
order by table_name;

-- 2) Colunas esperadas em crm_leads.
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
    'sales_closed_at',
    'organization_id',
    'assigned_profile_id'
  )
order by column_name;

-- 3) Colunas esperadas em crm_stage_events.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_stage_events'
order by ordinal_position;

-- 4) Colunas esperadas em crm_green_flags.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_green_flags'
order by ordinal_position;

-- 5) RLS nas tabelas novas.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('crm_stage_events', 'crm_green_flags')
order by c.relname;

-- 6) Policies existentes nas tabelas novas.
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

-- 7) Grants existentes nas tabelas novas.
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('crm_stage_events', 'crm_green_flags')
order by table_name, grantee, privilege_type;

-- 8) Indices esperados.
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('crm_leads', 'crm_stage_events', 'crm_green_flags')
order by tablename, indexname;

-- 9) Sanidade da contagem de leads apos apply.
select count(*) as crm_leads_total
from public.crm_leads;

-- 10) Confirmar que nao houve preenchimento automatico inesperado.
select
  count(*) filter (where pipeline_domain is not null) as leads_with_pipeline_domain,
  count(*) filter (where stage_domain is not null) as leads_with_stage_domain,
  count(*) filter (where first_invoice_paid = true) as leads_with_first_invoice_paid,
  count(*) filter (where sales_closed_at is not null) as leads_with_sales_closed_at
from public.crm_leads;

-- 11) Contagem inicial das novas tabelas.
select count(*) as crm_stage_events_total
from public.crm_stage_events;

select count(*) as crm_green_flags_total
from public.crm_green_flags;
