-- Strategic lead profile schema rollback package.
--
-- Manual execution only. Codex must not execute this file.
--
-- Scope:
-- - Drop only crm_lead_profiles policies, trigger and table.
-- - Do not alter public.crm_leads.
-- - Do not alter public.crm_tasks.
-- - Do not alter public.crm_lead_notes.
-- - Do not alter public.crm_lead_simulations.
-- - Do not alter public.profiles.
-- - Do not alter public.organizations.

do $$
begin
  if to_regclass('public.crm_lead_profiles') is not null then
    drop policy if exists "crm_lead_profiles authenticated select same organization"
      on public.crm_lead_profiles;

    drop policy if exists "crm_lead_profiles authenticated insert same organization"
      on public.crm_lead_profiles;

    drop policy if exists "crm_lead_profiles authenticated update same organization"
      on public.crm_lead_profiles;

    drop trigger if exists crm_lead_profiles_set_updated_at
      on public.crm_lead_profiles;
  end if;
end
$$;

drop table if exists public.crm_lead_profiles;
