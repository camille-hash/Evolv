-- Sprint 101B.15
-- CRM Leads RLS hardening controlled apply
-- Manual execution only. Codex must not execute this file.
--
-- Scope:
-- - Create organization-scoped SELECT policy
-- - Create organization-scoped UPDATE policy
--
-- Do not remove bridge policies in this phase.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'crm_leads authenticated read same organization'
  ) then
    create policy "crm_leads authenticated read same organization"
    on public.crm_leads
    for select
    to authenticated
    using (
      organization_id = public.evolv_current_organization_id()
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'crm_leads authenticated update same organization'
  ) then
    create policy "crm_leads authenticated update same organization"
    on public.crm_leads
    for update
    to authenticated
    using (
      organization_id = public.evolv_current_organization_id()
    )
    with check (
      organization_id = public.evolv_current_organization_id()
    );
  end if;
end
$$;
