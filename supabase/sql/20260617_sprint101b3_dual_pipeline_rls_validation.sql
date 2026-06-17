-- EVOLV Sprint 101B.3 - Dual Pipeline RLS Validation
-- STATUS: DOCUMENTAL. NAO EXECUTAR NESTA SPRINT.
--
-- Apenas SELECTs para validar manualmente o estado futuro apos apply.

-- 1) Confirmar RLS nas tabelas novas.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('crm_stage_events', 'crm_green_flags')
order by c.relname;

-- 2) Confirmar grants nas tabelas novas.
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('crm_stage_events', 'crm_green_flags')
order by table_name, grantee, privilege_type;

-- 3) Confirmar policies criadas.
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

-- 4) Confirmar ausencia de policy anon/public.
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

-- 5) Confirmar ausencia de policies amplas.
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

-- 6) Confirmar que crm_stage_events nao tem update/delete policy.
select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'crm_stage_events'
  and cmd in ('UPDATE', 'DELETE')
order by policyname;

-- 7) Confirmar que crm_green_flags nao tem delete policy.
select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'crm_green_flags'
  and cmd = 'DELETE'
order by policyname;

-- 8) Confirmar que as tabelas continuam vazias na fase inicial.
select count(*) as crm_stage_events_total
from public.crm_stage_events;

select count(*) as crm_green_flags_total
from public.crm_green_flags;

-- 9) Confirmar que crm_leads ainda preserva a contagem.
select count(*) as crm_leads_total
from public.crm_leads;
