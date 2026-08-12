-- Persist the lead's answer to the compound declaration used by EVOLV.
-- Existing rows remain null until an explicit answer is recorded.

alter table public.crm_leads
  add column if not exists declared_brazilian_and_cpf_status text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.crm_leads'::regclass
      and conname = 'crm_leads_declared_brazilian_and_cpf_status_check'
  ) then
    alter table public.crm_leads
      add constraint crm_leads_declared_brazilian_and_cpf_status_check
      check (declared_brazilian_and_cpf_status in ('yes', 'no'));
  end if;
end;
$$;

comment on column public.crm_leads.declared_brazilian_and_cpf_status is
  'Explicit answer to the compound question: Brazilian and has CPF. yes means both conditions; no only negates the compound declaration.';
