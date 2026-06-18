-- EVOLV Sprint 103A.4
-- Commercial Task schema rollback package.
--
-- Manual execution only. Codex must not execute this file.
--
-- WARNING:
-- This rollback drops public.crm_tasks and destroys any task data stored there.
-- Use only before real tasks are created, or after verified backup and explicit
-- business approval.
--
-- Scope:
-- - Drop only crm_tasks policies, trigger and table.
--
-- Explicit non-scope:
-- - Do not alter public.crm_leads.
-- - Do not alter public.crm_lead_notes.
-- - Do not alter public.crm_notes.
-- - Do not alter public.profiles.
-- - Do not alter public.organizations.
-- - Do not alter helper functions.
-- - Do not alter Auth, RLS or policies on other tables.

do $$
begin
  if to_regclass('public.crm_tasks') is not null then
    drop policy if exists "crm_tasks authenticated read same organization"
      on public.crm_tasks;

    drop policy if exists "crm_tasks authenticated insert same organization"
      on public.crm_tasks;

    drop policy if exists "crm_tasks authenticated update same organization"
      on public.crm_tasks;

    drop trigger if exists crm_tasks_set_updated_at
      on public.crm_tasks;
  end if;
end
$$;

drop table if exists public.crm_tasks;
