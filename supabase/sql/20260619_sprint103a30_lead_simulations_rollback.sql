-- EVOLV Sprint 103A.30
-- Lead-centric simulation schema rollback package.
--
-- Manual execution only. Codex must not execute this file.
--
-- WARNING:
-- This rollback drops public.crm_lead_simulations and destroys any simulation
-- data stored there.
-- Use only before real simulations are created, or after verified backup/export
-- and explicit business approval.
--
-- Scope:
-- - Drop only crm_lead_simulations policies, trigger and table.
--
-- Explicit non-scope:
-- - Do not alter public.crm_leads.
-- - Do not alter public.crm_tasks.
-- - Do not alter public.crm_lead_notes.
-- - Do not alter public.profiles.
-- - Do not alter public.organizations.
-- - Do not alter helper functions.
-- - Do not alter Auth, RLS or policies on other tables.

do $$
begin
  if to_regclass('public.crm_lead_simulations') is not null then
    drop policy if exists "crm_lead_simulations authenticated select same organization"
      on public.crm_lead_simulations;

    drop policy if exists "crm_lead_simulations authenticated insert same organization"
      on public.crm_lead_simulations;

    drop policy if exists "crm_lead_simulations authenticated update same organization"
      on public.crm_lead_simulations;

    drop trigger if exists crm_lead_simulations_set_updated_at
      on public.crm_lead_simulations;
  end if;
end
$$;

drop table if exists public.crm_lead_simulations;
