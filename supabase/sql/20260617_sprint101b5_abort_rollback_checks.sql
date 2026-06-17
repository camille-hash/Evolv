-- EVOLV Sprint 101B.5 - Abort / Rollback Checks
-- STATUS: DOCUMENTAL. NAO EXECUTAR NESTA SPRINT.
--
-- Apenas SELECTs para ajudar a decidir se deve abortar/rollback apos tentativa
-- manual futura.

-- 1) Verificar se as tabelas novas existem.
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('crm_stage_events', 'crm_green_flags')
order by table_name;

-- 2) Verificar se novas tabelas continuam vazias.
select count(*) as crm_stage_events_total
from public.crm_stage_events;

select count(*) as crm_green_flags_total
from public.crm_green_flags;

-- 3) Verificar RLS nas novas tabelas.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('crm_stage_events', 'crm_green_flags')
order by c.relname;

-- 4) Verificar policies nas novas tabelas.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('crm_stage_events', 'crm_green_flags')
order by tablename, policyname;

-- 5) Verificar se apareceu policy anon/public indevida.
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

-- 6) Verificar grants nas novas tabelas.
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('crm_stage_events', 'crm_green_flags')
order by table_name, grantee, privilege_type;

-- 7) Reconfirmar contagem de crm_leads.
select count(*) as crm_leads_total
from public.crm_leads;
