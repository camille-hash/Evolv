-- Sprint 101B.26
-- Rollback for authenticated bridge update retirement
-- Manual execution only. Codex must not execute this file.
--
-- Recreates only the original authenticated bridge update policy.
-- Does not alter anon policies, organization-scoped policies, the already
-- retired authenticated bridge read policy, tables, data, auth, profiles or notes.

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
end
$$;
