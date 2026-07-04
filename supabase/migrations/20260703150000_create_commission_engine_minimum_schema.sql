-- COM-001 - Minimum Commission Engine database foundation
-- Creates the physical tables required for contract commission snapshots,
-- schedule items and revenue recognition without changing existing runtime.

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'evolv_current_organization_id'
  ) then
    raise exception 'Missing public.evolv_current_organization_id()';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
  ) then
    raise exception 'Missing public.set_updated_at()';
  end if;
end
$$;

create table if not exists public.contract_commission_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  source_commission_plan_id uuid references public.commission_plans(id) on delete set null,
  source_commission_plan_name text,
  lifecycle text not null default 'criado',
  business_status text not null default 'valido',
  snapshot_version integer not null default 1,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  frozen_at timestamptz,
  superseded_at timestamptz,
  superseded_by uuid references public.profiles(id) on delete set null,
  superseded_reason text,
  metadata jsonb not null default '{}'::jsonb,
  constraint contract_commission_snapshots_snapshot_version_check
    check (snapshot_version > 0),
  constraint contract_commission_snapshots_lifecycle_check
    check (length(trim(lifecycle)) > 0),
  constraint contract_commission_snapshots_business_status_check
    check (length(trim(business_status)) > 0),
  constraint contract_commission_snapshots_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.contract_commission_snapshot_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_id uuid not null references public.contract_commission_snapshots(id) on delete cascade,
  source_plan_item_id uuid references public.commission_plan_schedule_items(id) on delete set null,
  event_type text not null,
  percentage numeric(10,4) not null,
  offset_months integer not null default 0,
  offset_days integer not null default 0,
  sort_order integer not null default 0,
  lifecycle text not null default 'criado',
  business_status text not null default 'valido',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint contract_commission_snapshot_items_percentage_check
    check (percentage > 0 and percentage <= 100),
  constraint contract_commission_snapshot_items_offsets_check
    check (offset_months >= 0 and offset_days >= 0),
  constraint contract_commission_snapshot_items_event_type_check
    check (length(trim(event_type)) > 0),
  constraint contract_commission_snapshot_items_lifecycle_check
    check (length(trim(lifecycle)) > 0),
  constraint contract_commission_snapshot_items_business_status_check
    check (length(trim(business_status)) > 0),
  constraint contract_commission_snapshot_items_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.contract_commission_schedule_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  snapshot_id uuid not null references public.contract_commission_snapshots(id) on delete cascade,
  snapshot_item_id uuid not null references public.contract_commission_snapshot_items(id) on delete cascade,
  event_type text not null,
  percentage numeric(10,4) not null,
  base_credit_amount numeric(14,2),
  expected_amount numeric(14,2),
  lifecycle text not null default 'criada',
  business_status text not null default 'pendente',
  trigger_event_id text,
  triggered_at timestamptz,
  due_date date,
  offset_months integer not null default 0,
  offset_days integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_reason text,
  constraint contract_commission_schedule_items_percentage_check
    check (percentage > 0 and percentage <= 100),
  constraint contract_commission_schedule_items_money_check
    check (
      (base_credit_amount is null or base_credit_amount >= 0)
      and (expected_amount is null or expected_amount >= 0)
    ),
  constraint contract_commission_schedule_items_offsets_check
    check (offset_months >= 0 and offset_days >= 0),
  constraint contract_commission_schedule_items_event_type_check
    check (length(trim(event_type)) > 0),
  constraint contract_commission_schedule_items_lifecycle_check
    check (length(trim(lifecycle)) > 0),
  constraint contract_commission_schedule_items_business_status_check
    check (length(trim(business_status)) > 0),
  constraint contract_commission_schedule_items_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.expected_revenue_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  commission_schedule_item_id uuid not null references public.contract_commission_schedule_items(id) on delete cascade,
  snapshot_id uuid not null references public.contract_commission_snapshots(id) on delete cascade,
  snapshot_item_id uuid not null references public.contract_commission_snapshot_items(id) on delete cascade,
  event_type text not null,
  base_credit_amount numeric(14,2) not null,
  percentage numeric(10,4) not null,
  expected_amount numeric(14,2) not null,
  expected_date date,
  lifecycle text not null default 'criada',
  business_status text not null default 'aguardando_reconhecimento',
  recognized_amount numeric(14,2) not null default 0,
  remaining_amount numeric(14,2) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_reason text,
  constraint expected_revenue_entries_percentage_check
    check (percentage > 0 and percentage <= 100),
  constraint expected_revenue_entries_money_check
    check (
      base_credit_amount >= 0
      and expected_amount >= 0
      and recognized_amount >= 0
      and remaining_amount >= 0
    ),
  constraint expected_revenue_entries_event_type_check
    check (length(trim(event_type)) > 0),
  constraint expected_revenue_entries_lifecycle_check
    check (length(trim(lifecycle)) > 0),
  constraint expected_revenue_entries_business_status_check
    check (length(trim(business_status)) > 0),
  constraint expected_revenue_entries_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.recognized_revenue_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expected_revenue_entry_id uuid not null references public.expected_revenue_entries(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  recognized_amount numeric(14,2) not null,
  recognized_at timestamptz not null,
  recognition_type text not null default 'partial',
  lifecycle text not null default 'criada',
  business_status text not null default 'reconhecida',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  reversed_at timestamptz,
  reversal_reason text,
  constraint recognized_revenue_entries_amount_check
    check (recognized_amount >= 0),
  constraint recognized_revenue_entries_recognition_type_check
    check (length(trim(recognition_type)) > 0),
  constraint recognized_revenue_entries_lifecycle_check
    check (length(trim(lifecycle)) > 0),
  constraint recognized_revenue_entries_business_status_check
    check (length(trim(business_status)) > 0),
  constraint recognized_revenue_entries_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists contract_commission_snapshots_active_contract_uidx
  on public.contract_commission_snapshots (organization_id, contract_id)
  where superseded_at is null;

create unique index if not exists expected_revenue_entries_active_schedule_item_uidx
  on public.expected_revenue_entries (organization_id, commission_schedule_item_id)
  where cancelled_at is null and lifecycle <> 'cancelada';

create index if not exists contract_commission_snapshots_organization_id_idx
  on public.contract_commission_snapshots (organization_id);
create index if not exists contract_commission_snapshots_contract_id_idx
  on public.contract_commission_snapshots (contract_id);
create index if not exists contract_commission_snapshots_source_plan_id_idx
  on public.contract_commission_snapshots (source_commission_plan_id);
create index if not exists contract_commission_snapshots_lifecycle_idx
  on public.contract_commission_snapshots (lifecycle);
create index if not exists contract_commission_snapshots_business_status_idx
  on public.contract_commission_snapshots (business_status);

create index if not exists contract_commission_snapshot_items_organization_id_idx
  on public.contract_commission_snapshot_items (organization_id);
create index if not exists contract_commission_snapshot_items_snapshot_id_idx
  on public.contract_commission_snapshot_items (snapshot_id);
create index if not exists contract_commission_snapshot_items_source_plan_item_id_idx
  on public.contract_commission_snapshot_items (source_plan_item_id);
create index if not exists contract_commission_snapshot_items_event_type_idx
  on public.contract_commission_snapshot_items (event_type);
create index if not exists contract_commission_snapshot_items_lifecycle_idx
  on public.contract_commission_snapshot_items (lifecycle);
create index if not exists contract_commission_snapshot_items_business_status_idx
  on public.contract_commission_snapshot_items (business_status);

create index if not exists contract_commission_schedule_items_organization_id_idx
  on public.contract_commission_schedule_items (organization_id);
create index if not exists contract_commission_schedule_items_contract_id_idx
  on public.contract_commission_schedule_items (contract_id);
create index if not exists contract_commission_schedule_items_snapshot_id_idx
  on public.contract_commission_schedule_items (snapshot_id);
create index if not exists contract_commission_schedule_items_snapshot_item_id_idx
  on public.contract_commission_schedule_items (snapshot_item_id);
create index if not exists contract_commission_schedule_items_event_type_idx
  on public.contract_commission_schedule_items (event_type);
create index if not exists contract_commission_schedule_items_due_date_idx
  on public.contract_commission_schedule_items (due_date);
create index if not exists contract_commission_schedule_items_lifecycle_idx
  on public.contract_commission_schedule_items (lifecycle);
create index if not exists contract_commission_schedule_items_business_status_idx
  on public.contract_commission_schedule_items (business_status);

create index if not exists expected_revenue_entries_organization_id_idx
  on public.expected_revenue_entries (organization_id);
create index if not exists expected_revenue_entries_contract_id_idx
  on public.expected_revenue_entries (contract_id);
create index if not exists expected_revenue_entries_commission_schedule_item_id_idx
  on public.expected_revenue_entries (commission_schedule_item_id);
create index if not exists expected_revenue_entries_snapshot_id_idx
  on public.expected_revenue_entries (snapshot_id);
create index if not exists expected_revenue_entries_snapshot_item_id_idx
  on public.expected_revenue_entries (snapshot_item_id);
create index if not exists expected_revenue_entries_event_type_idx
  on public.expected_revenue_entries (event_type);
create index if not exists expected_revenue_entries_expected_date_idx
  on public.expected_revenue_entries (expected_date);
create index if not exists expected_revenue_entries_lifecycle_idx
  on public.expected_revenue_entries (lifecycle);
create index if not exists expected_revenue_entries_business_status_idx
  on public.expected_revenue_entries (business_status);

create index if not exists recognized_revenue_entries_organization_id_idx
  on public.recognized_revenue_entries (organization_id);
create index if not exists recognized_revenue_entries_expected_revenue_entry_id_idx
  on public.recognized_revenue_entries (expected_revenue_entry_id);
create index if not exists recognized_revenue_entries_contract_id_idx
  on public.recognized_revenue_entries (contract_id);
create index if not exists recognized_revenue_entries_recognized_at_idx
  on public.recognized_revenue_entries (recognized_at);
create index if not exists recognized_revenue_entries_lifecycle_idx
  on public.recognized_revenue_entries (lifecycle);
create index if not exists recognized_revenue_entries_business_status_idx
  on public.recognized_revenue_entries (business_status);

drop trigger if exists contract_commission_schedule_items_set_updated_at
  on public.contract_commission_schedule_items;
create trigger contract_commission_schedule_items_set_updated_at
before update on public.contract_commission_schedule_items
for each row
execute function public.set_updated_at();

drop trigger if exists expected_revenue_entries_set_updated_at
  on public.expected_revenue_entries;
create trigger expected_revenue_entries_set_updated_at
before update on public.expected_revenue_entries
for each row
execute function public.set_updated_at();

grant select, insert, update on table public.contract_commission_snapshots to authenticated;
grant select, insert, update on table public.contract_commission_snapshot_items to authenticated;
grant select, insert, update on table public.contract_commission_schedule_items to authenticated;
grant select, insert, update on table public.expected_revenue_entries to authenticated;
grant select, insert, update on table public.recognized_revenue_entries to authenticated;

alter table public.contract_commission_snapshots enable row level security;
alter table public.contract_commission_snapshot_items enable row level security;
alter table public.contract_commission_schedule_items enable row level security;
alter table public.expected_revenue_entries enable row level security;
alter table public.recognized_revenue_entries enable row level security;

drop policy if exists "organizations can read contract commission snapshots"
  on public.contract_commission_snapshots;
create policy "organizations can read contract commission snapshots"
on public.contract_commission_snapshots
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can insert contract commission snapshots"
  on public.contract_commission_snapshots;
create policy "organizations can insert contract commission snapshots"
on public.contract_commission_snapshots
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.contracts contract
    where contract.id = contract_id
      and contract.organization_id = public.evolv_current_organization_id()
  )
  and (
    source_commission_plan_id is null
    or exists (
      select 1
      from public.commission_plans plan
      where plan.id = source_commission_plan_id
        and plan.organization_id = public.evolv_current_organization_id()
    )
  )
);

drop policy if exists "organizations can update contract commission snapshots"
  on public.contract_commission_snapshots;
create policy "organizations can update contract commission snapshots"
on public.contract_commission_snapshots
for update
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
)
with check (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can read contract commission snapshot items"
  on public.contract_commission_snapshot_items;
create policy "organizations can read contract commission snapshot items"
on public.contract_commission_snapshot_items
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can insert contract commission snapshot items"
  on public.contract_commission_snapshot_items;
create policy "organizations can insert contract commission snapshot items"
on public.contract_commission_snapshot_items
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.contract_commission_snapshots snapshot
    where snapshot.id = snapshot_id
      and snapshot.organization_id = public.evolv_current_organization_id()
  )
  and (
    source_plan_item_id is null
    or exists (
      select 1
      from public.commission_plan_schedule_items plan_item
      where plan_item.id = source_plan_item_id
        and plan_item.organization_id = public.evolv_current_organization_id()
    )
  )
);

drop policy if exists "organizations can update contract commission snapshot items"
  on public.contract_commission_snapshot_items;
create policy "organizations can update contract commission snapshot items"
on public.contract_commission_snapshot_items
for update
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
)
with check (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can read contract commission schedule items"
  on public.contract_commission_schedule_items;
create policy "organizations can read contract commission schedule items"
on public.contract_commission_schedule_items
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can insert contract commission schedule items"
  on public.contract_commission_schedule_items;
create policy "organizations can insert contract commission schedule items"
on public.contract_commission_schedule_items
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.contracts contract
    where contract.id = contract_id
      and contract.organization_id = public.evolv_current_organization_id()
  )
  and exists (
    select 1
    from public.contract_commission_snapshots snapshot
    where snapshot.id = snapshot_id
      and snapshot.contract_id = contract_commission_schedule_items.contract_id
      and snapshot.organization_id = public.evolv_current_organization_id()
  )
  and exists (
    select 1
    from public.contract_commission_snapshot_items snapshot_item
    where snapshot_item.id = snapshot_item_id
      and snapshot_item.snapshot_id = contract_commission_schedule_items.snapshot_id
      and snapshot_item.organization_id = public.evolv_current_organization_id()
  )
);

drop policy if exists "organizations can update contract commission schedule items"
  on public.contract_commission_schedule_items;
create policy "organizations can update contract commission schedule items"
on public.contract_commission_schedule_items
for update
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
)
with check (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can read expected revenue entries"
  on public.expected_revenue_entries;
create policy "organizations can read expected revenue entries"
on public.expected_revenue_entries
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can insert expected revenue entries"
  on public.expected_revenue_entries;
create policy "organizations can insert expected revenue entries"
on public.expected_revenue_entries
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.contract_commission_schedule_items schedule_item
    where schedule_item.id = commission_schedule_item_id
      and schedule_item.contract_id = expected_revenue_entries.contract_id
      and schedule_item.snapshot_id = expected_revenue_entries.snapshot_id
      and schedule_item.snapshot_item_id = expected_revenue_entries.snapshot_item_id
      and schedule_item.organization_id = public.evolv_current_organization_id()
  )
);

drop policy if exists "organizations can update expected revenue entries"
  on public.expected_revenue_entries;
create policy "organizations can update expected revenue entries"
on public.expected_revenue_entries
for update
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
)
with check (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can read recognized revenue entries"
  on public.recognized_revenue_entries;
create policy "organizations can read recognized revenue entries"
on public.recognized_revenue_entries
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can insert recognized revenue entries"
  on public.recognized_revenue_entries;
create policy "organizations can insert recognized revenue entries"
on public.recognized_revenue_entries
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.expected_revenue_entries expected_entry
    where expected_entry.id = expected_revenue_entry_id
      and expected_entry.contract_id = recognized_revenue_entries.contract_id
      and expected_entry.organization_id = public.evolv_current_organization_id()
  )
);

drop policy if exists "organizations can update recognized revenue entries"
  on public.recognized_revenue_entries;
create policy "organizations can update recognized revenue entries"
on public.recognized_revenue_entries
for update
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
)
with check (
  organization_id = public.evolv_current_organization_id()
);
