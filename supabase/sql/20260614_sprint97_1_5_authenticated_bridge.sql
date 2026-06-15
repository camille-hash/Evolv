-- EVOLV Sprint 97.1.5 - Authenticated bridge for crm_leads.
-- Manual review only. Do not execute through Codex.
--
-- TRANSITORY BRIDGE:
-- These grants and policies are temporary and exist only to allow future
-- authenticated access testing in parallel with the current anon path.
-- They intentionally do not reference organization_id and must not be treated
-- as final organization-scoped RLS.
--
-- This script does not remove or alter anon policies/grants.
-- This script does not alter crm_leads data or columns.

grant select on public.crm_leads to authenticated;
grant update on public.crm_leads to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'Authenticated bridge read crm_leads'
  ) then
    create policy "Authenticated bridge read crm_leads"
      on public.crm_leads
      for select
      to authenticated
      using (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'Authenticated bridge update crm_leads'
  ) then
    create policy "Authenticated bridge update crm_leads"
      on public.crm_leads
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end;
$$;
