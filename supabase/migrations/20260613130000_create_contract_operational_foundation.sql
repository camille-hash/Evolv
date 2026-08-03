-- LEAD-ING-001 B2.5-R2 - Canonical contract operational foundation.

do $$
begin
  if to_regclass('public.organizations') is null
    or to_regclass('public.profiles') is null
    or to_regclass('public.crm_leads') is null then
    raise exception 'Missing canonical Auth/CRM foundation';
  end if;
  if to_regprocedure('public.set_updated_at()') is null
    or to_regprocedure('public.evolv_current_organization_id()') is null
    or to_regprocedure('public.evolv_current_role()') is null then
    raise exception 'Missing canonical context functions';
  end if;
  if to_regclass('public.clients') is not null
    or to_regclass('public.administrators') is not null
    or to_regclass('public.commission_plans') is not null
    or to_regclass('public.contracts') is not null
    or to_regclass('public.revenue_entries') is not null then
    raise exception 'Operational foundation target already exists';
  end if;
end
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint clients_name_not_blank_check check (btrim(name) <> ''),
  constraint clients_status_check check (status in ('active', 'inactive', 'archived'))
);

create table public.administrators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint administrators_name_not_blank_check check (btrim(name) <> ''),
  constraint administrators_slug_not_blank_check check (btrim(slug) <> ''),
  constraint administrators_status_check check (status in ('active', 'inactive')),
  constraint administrators_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint administrators_org_slug_unique unique (organization_id, slug)
);

create table public.commission_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  administrator_id uuid not null references public.administrators(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  commission_type text not null default 'percentage',
  commission_percentage numeric(8,4),
  commission_fixed_amount numeric(14,2),
  payment_trigger text not null default 'contract_activation',
  payment_installments integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint commission_plans_status_check check (status in ('active', 'inactive')),
  constraint commission_plans_type_check check (commission_type in ('percentage', 'fixed', 'hybrid')),
  constraint commission_plans_trigger_check check (payment_trigger in ('contract_signed', 'contract_submitted', 'contract_approved', 'contract_activation', 'manual')),
  constraint commission_plans_installments_check check (payment_installments >= 1),
  constraint commission_plans_percentage_check check (commission_percentage is null or commission_percentage >= 0),
  constraint commission_plans_fixed_amount_check check (commission_fixed_amount is null or commission_fixed_amount >= 0)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.crm_leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  administrator_id uuid references public.administrators(id) on delete restrict,
  commission_plan_id uuid references public.commission_plans(id) on delete set null,
  contract_number text,
  status text not null default 'draft',
  product_type text,
  credit_amount numeric(14,2) not null default 0,
  installment_amount numeric(14,2),
  term_months integer,
  contemplation_model text,
  signed_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint contracts_status_check check (status in ('draft', 'pending_documentation', 'submitted', 'approved', 'active', 'completed', 'cancelled', 'rejected')),
  constraint contracts_credit_amount_check check (credit_amount >= 0),
  constraint contracts_installment_amount_check check (installment_amount is null or installment_amount >= 0),
  constraint contracts_term_months_check check (term_months is null or term_months > 0),
  constraint contracts_org_contract_number_unique unique (organization_id, contract_number)
);

create table public.revenue_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  administrator_id uuid references public.administrators(id) on delete set null,
  type text not null default 'commission',
  status text not null default 'expected',
  expected_amount numeric(14,2) not null default 0,
  actual_amount numeric(14,2),
  due_date date,
  paid_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint revenue_entries_type_check check (type in ('commission', 'bonus', 'adjustment', 'chargeback')),
  constraint revenue_entries_status_check check (status in ('expected', 'pending', 'paid', 'overdue', 'cancelled')),
  constraint revenue_entries_expected_amount_check check (expected_amount >= 0),
  constraint revenue_entries_actual_amount_check check (actual_amount is null or actual_amount >= 0)
);

create index clients_organization_id_idx on public.clients (organization_id);
create index clients_org_status_idx on public.clients (organization_id, status);
create index clients_org_email_idx on public.clients (organization_id, email);
create index clients_org_phone_idx on public.clients (organization_id, phone);
create index clients_org_updated_at_idx on public.clients (organization_id, updated_at desc);
create index administrators_organization_id_idx on public.administrators (organization_id);
create index administrators_status_idx on public.administrators (organization_id, status);
create index administrators_name_idx on public.administrators (organization_id, name);
create index commission_plans_organization_id_idx on public.commission_plans (organization_id);
create index commission_plans_administrator_id_idx on public.commission_plans (administrator_id);
create index contracts_organization_id_idx on public.contracts (organization_id);
create index contracts_lead_id_idx on public.contracts (lead_id);
create index contracts_client_id_idx on public.contracts (client_id);
create index contracts_administrator_id_idx on public.contracts (administrator_id);
create index contracts_status_idx on public.contracts (status);
create index revenue_entries_organization_id_idx on public.revenue_entries (organization_id);
create index revenue_entries_contract_id_idx on public.revenue_entries (contract_id);
create index revenue_entries_client_id_idx on public.revenue_entries (client_id);
create index revenue_entries_status_idx on public.revenue_entries (status);
create index revenue_entries_due_date_idx on public.revenue_entries (due_date);

create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger administrators_set_updated_at before update on public.administrators for each row execute function public.set_updated_at();
create trigger commission_plans_set_updated_at before update on public.commission_plans for each row execute function public.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts for each row execute function public.set_updated_at();
create trigger revenue_entries_set_updated_at before update on public.revenue_entries for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.administrators enable row level security;
alter table public.commission_plans enable row level security;
alter table public.contracts enable row level security;
alter table public.revenue_entries enable row level security;

revoke all on table public.clients, public.administrators, public.commission_plans, public.contracts, public.revenue_entries from anon, public;
grant select, insert, update on table public.clients, public.administrators, public.commission_plans, public.contracts to authenticated;
grant select, insert on table public.revenue_entries to authenticated;

create policy "organizations can read clients" on public.clients for select to authenticated using (organization_id = public.evolv_current_organization_id());
create policy "organizations can insert clients" on public.clients for insert to authenticated with check (organization_id = public.evolv_current_organization_id() and public.evolv_current_role() in ('master', 'admin', 'sdr'));
create policy "organizations can update clients" on public.clients for update to authenticated using (organization_id = public.evolv_current_organization_id()) with check (organization_id = public.evolv_current_organization_id() and public.evolv_current_role() in ('master', 'admin', 'sdr'));
create policy "organizations can read administrators" on public.administrators for select to authenticated using (organization_id = public.evolv_current_organization_id());
create policy "organizations can insert administrators" on public.administrators for insert to authenticated with check (organization_id = public.evolv_current_organization_id() and public.evolv_current_role() in ('master', 'admin'));
create policy "organizations can update administrators" on public.administrators for update to authenticated using (organization_id = public.evolv_current_organization_id()) with check (organization_id = public.evolv_current_organization_id() and public.evolv_current_role() in ('master', 'admin'));
create policy "organizations can read commission plans" on public.commission_plans for select to authenticated using (organization_id = public.evolv_current_organization_id());
create policy "organizations can insert commission plans" on public.commission_plans for insert to authenticated with check (organization_id = public.evolv_current_organization_id() and exists (select 1 from public.administrators a where a.id = administrator_id and a.organization_id = public.evolv_current_organization_id()));
create policy "organizations can update commission plans" on public.commission_plans for update to authenticated using (organization_id = public.evolv_current_organization_id()) with check (organization_id = public.evolv_current_organization_id() and exists (select 1 from public.administrators a where a.id = administrator_id and a.organization_id = public.evolv_current_organization_id()));
create policy "organizations can read contracts" on public.contracts for select to authenticated using (organization_id = public.evolv_current_organization_id());
create policy "organizations can insert contracts" on public.contracts for insert to authenticated with check (
  organization_id = public.evolv_current_organization_id()
  and (lead_id is null or exists (select 1 from public.crm_leads l where l.id = lead_id and l.organization_id = public.evolv_current_organization_id()))
  and (client_id is null or exists (select 1 from public.clients c where c.id = client_id and c.organization_id = public.evolv_current_organization_id()))
  and (administrator_id is null or exists (select 1 from public.administrators a where a.id = administrator_id and a.organization_id = public.evolv_current_organization_id()))
  and (commission_plan_id is null or exists (select 1 from public.commission_plans p where p.id = commission_plan_id and p.organization_id = public.evolv_current_organization_id() and (administrator_id is null or p.administrator_id = administrator_id)))
);
create policy "organizations can update contracts" on public.contracts for update to authenticated using (organization_id = public.evolv_current_organization_id()) with check (
  organization_id = public.evolv_current_organization_id()
  and (lead_id is null or exists (select 1 from public.crm_leads l where l.id = lead_id and l.organization_id = public.evolv_current_organization_id()))
  and (client_id is null or exists (select 1 from public.clients c where c.id = client_id and c.organization_id = public.evolv_current_organization_id()))
  and (administrator_id is null or exists (select 1 from public.administrators a where a.id = administrator_id and a.organization_id = public.evolv_current_organization_id()))
  and (commission_plan_id is null or exists (select 1 from public.commission_plans p where p.id = commission_plan_id and p.organization_id = public.evolv_current_organization_id() and (administrator_id is null or p.administrator_id = administrator_id)))
);
create policy "organizations can read revenue entries" on public.revenue_entries for select to authenticated using (organization_id = public.evolv_current_organization_id());
create policy "organizations can insert revenue entries" on public.revenue_entries for insert to authenticated with check (
  organization_id = public.evolv_current_organization_id()
  and exists (select 1 from public.contracts c where c.id = contract_id and c.organization_id = public.evolv_current_organization_id())
  and (client_id is null or exists (select 1 from public.clients c where c.id = client_id and c.organization_id = public.evolv_current_organization_id()))
  and (administrator_id is null or exists (select 1 from public.administrators a where a.id = administrator_id and a.organization_id = public.evolv_current_organization_id()))
);
