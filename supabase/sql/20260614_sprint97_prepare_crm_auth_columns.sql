-- EVOLV Sprint 97.1 - Prepare CRM auth ownership columns.
-- Human review only. Do not execute through Codex.
-- This script is intentionally additive and does not modify CRM data.

alter table public.crm_leads
  add column if not exists organization_id uuid;

alter table public.crm_leads
  add column if not exists assigned_profile_id uuid;

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crm_leads_assigned_profile_id_fk'
      and conrelid = 'public.crm_leads'::regclass
  ) then
    alter table public.crm_leads
      add constraint crm_leads_assigned_profile_id_fk
      foreign key (assigned_profile_id)
      references public.profiles(id)
      on delete set null
      not valid;
  end if;
end;
$$;

create index if not exists crm_leads_organization_id_idx
  on public.crm_leads(organization_id);

create index if not exists crm_leads_assigned_profile_id_idx
  on public.crm_leads(assigned_profile_id);
