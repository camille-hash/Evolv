begin;

grant insert on table public.crm_leads to authenticated;

drop policy if exists "crm_leads authenticated insert same organization"
  on public.crm_leads;

create policy "crm_leads authenticated insert same organization"
  on public.crm_leads
  for insert
  to authenticated
  with check (
    public.evolv_current_organization_id() is not null
    and organization_id = public.evolv_current_organization_id()
    and public.evolv_current_role() in ('master', 'admin', 'sdr')
  );

commit;
