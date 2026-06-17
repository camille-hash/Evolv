-- EVOLV Sprint 101B.5 - Preflight Validation
-- STATUS: DOCUMENTAL. NAO EXECUTAR NESTA SPRINT.
--
-- Apenas SELECTs para decidir se a janela manual futura pode começar.

-- 1) Contagem atual de crm_leads.
select count(*) as crm_leads_total
from public.crm_leads;

-- 2) organization_id nulo em crm_leads.
select count(*) as crm_leads_without_organization_id
from public.crm_leads
where organization_id is null;

-- 3) Validar existencia das funcoes-base de RLS.
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'evolv_current_organization_id',
    'evolv_current_role'
  )
order by p.proname;

-- 4) Confirmar se tabelas novas ainda nao existem.
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('crm_stage_events', 'crm_green_flags')
order by table_name;

-- 5) RLS atual em crm_leads e profiles.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('crm_leads', 'profiles')
order by c.relname;

-- 6) Policies atuais em crm_leads e profiles.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('crm_leads', 'profiles')
order by tablename, policyname;

-- 7) Grants atuais em crm_leads.
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'crm_leads'
order by grantee, privilege_type;

-- 8) Conferir se pipeline e etapa continuam presentes em crm_leads.
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
  and column_name in ('pipeline', 'etapa', 'organization_id')
order by column_name;
