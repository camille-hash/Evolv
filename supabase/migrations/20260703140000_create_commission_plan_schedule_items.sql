-- OPS-021-R1 - Commission Plan Schedule Model
-- Adds a detailed commission schedule while preserving existing commission_plans
-- and existing contracts that reference commission_plan_id.

alter table public.commission_plans
  add column if not exists contract_term_months integer,
  add column if not exists reference_credit_amount numeric(14, 2),
  add column if not exists administration_fee_percentage numeric(8, 4),
  add column if not exists total_schedule_percentage numeric(8, 4),
  add column if not exists total_schedule_amount numeric(14, 2);

alter table public.commission_plans
  drop constraint if exists commission_plans_contract_term_months_check,
  add constraint commission_plans_contract_term_months_check
    check (contract_term_months is null or contract_term_months > 0);

alter table public.commission_plans
  drop constraint if exists commission_plans_reference_credit_amount_check,
  add constraint commission_plans_reference_credit_amount_check
    check (reference_credit_amount is null or reference_credit_amount >= 0);

alter table public.commission_plans
  drop constraint if exists commission_plans_administration_fee_percentage_check,
  add constraint commission_plans_administration_fee_percentage_check
    check (
      administration_fee_percentage is null
      or administration_fee_percentage >= 0
    );

alter table public.commission_plans
  drop constraint if exists commission_plans_total_schedule_percentage_check,
  add constraint commission_plans_total_schedule_percentage_check
    check (
      total_schedule_percentage is null
      or total_schedule_percentage >= 0
    );

alter table public.commission_plans
  drop constraint if exists commission_plans_total_schedule_amount_check,
  add constraint commission_plans_total_schedule_amount_check
    check (
      total_schedule_amount is null
      or total_schedule_amount >= 0
    );

create table if not exists public.commission_plan_schedule_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  commission_plan_id uuid not null references public.commission_plans(id) on delete cascade,
  installment_number integer,
  event_type text not null default 'installment',
  percentage numeric(8, 4) not null default 0,
  amount numeric(14, 2) not null default 0,
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint commission_plan_schedule_items_event_type_check
    check (event_type in ('installment', 'contemplation')),
  constraint commission_plan_schedule_items_installment_number_check
    check (
      (
        event_type = 'installment'
        and installment_number is not null
        and installment_number > 0
      )
      or (
        event_type = 'contemplation'
        and installment_number is null
      )
    ),
  constraint commission_plan_schedule_items_percentage_check
    check (percentage >= 0),
  constraint commission_plan_schedule_items_amount_check
    check (amount >= 0),
  constraint commission_plan_schedule_items_org_plan_unique
    unique (organization_id, commission_plan_id, event_type, installment_number)
);

create index if not exists commission_plan_schedule_items_organization_id_idx
  on public.commission_plan_schedule_items (organization_id);

create index if not exists commission_plan_schedule_items_plan_id_idx
  on public.commission_plan_schedule_items (commission_plan_id);

create index if not exists commission_plan_schedule_items_sort_idx
  on public.commission_plan_schedule_items (commission_plan_id, sort_order);

create unique index if not exists commission_plan_schedule_items_installment_unique_idx
  on public.commission_plan_schedule_items (
    organization_id,
    commission_plan_id,
    installment_number
  )
  where event_type = 'installment';

create unique index if not exists commission_plan_schedule_items_contemplation_unique_idx
  on public.commission_plan_schedule_items (
    organization_id,
    commission_plan_id
  )
  where event_type = 'contemplation';

drop trigger if exists commission_plan_schedule_items_set_updated_at
  on public.commission_plan_schedule_items;
create trigger commission_plan_schedule_items_set_updated_at
before update on public.commission_plan_schedule_items
for each row
execute function public.set_updated_at();

grant select, insert, update, delete
  on table public.commission_plan_schedule_items
  to authenticated;

grant insert, update
  on table public.commission_plans
  to authenticated;

alter table public.commission_plan_schedule_items enable row level security;
alter table public.commission_plans enable row level security;

drop policy if exists "organizations can insert commission plans"
  on public.commission_plans;
create policy "organizations can insert commission plans"
on public.commission_plans
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.administrators administrator
    where administrator.id = administrator_id
      and administrator.organization_id = public.evolv_current_organization_id()
  )
);

drop policy if exists "organizations can update commission plans"
  on public.commission_plans;
create policy "organizations can update commission plans"
on public.commission_plans
for update
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
)
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.administrators administrator
    where administrator.id = administrator_id
      and administrator.organization_id = public.evolv_current_organization_id()
  )
);

drop policy if exists "organizations can read commission plan schedule items"
  on public.commission_plan_schedule_items;
create policy "organizations can read commission plan schedule items"
on public.commission_plan_schedule_items
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can insert commission plan schedule items"
  on public.commission_plan_schedule_items;
create policy "organizations can insert commission plan schedule items"
on public.commission_plan_schedule_items
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.commission_plans plan
    where plan.id = commission_plan_id
      and plan.organization_id = public.evolv_current_organization_id()
  )
);

drop policy if exists "organizations can update commission plan schedule items"
  on public.commission_plan_schedule_items;
create policy "organizations can update commission plan schedule items"
on public.commission_plan_schedule_items
for update
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
)
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.commission_plans plan
    where plan.id = commission_plan_id
      and plan.organization_id = public.evolv_current_organization_id()
  )
);

drop policy if exists "organizations can delete commission plan schedule items"
  on public.commission_plan_schedule_items;
create policy "organizations can delete commission plan schedule items"
on public.commission_plan_schedule_items
for delete
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);
