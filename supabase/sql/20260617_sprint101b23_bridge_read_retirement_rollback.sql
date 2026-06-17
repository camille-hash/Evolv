-- Sprint 101B.23
-- Rollback for authenticated bridge read retirement
-- Manual execution only. Codex must not execute this file.
--
-- Recreates only the original authenticated bridge read policy.
-- Does not alter anon policies, update bridge, organization-scoped policies,
-- tables, data, auth, profiles or notes.

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
end
$$;
