-- EVOLV Sprint 97.2 - Add protected organization foreign key.
-- Manual review only. FK is intentionally NOT VALID.
-- Changes no data, policies, grants or RLS.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crm_leads_organization_id_fk'
      and conrelid = 'public.crm_leads'::regclass
  ) then
    alter table public.crm_leads
      add constraint crm_leads_organization_id_fk
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade
      not valid;
  end if;
end;
$$;
