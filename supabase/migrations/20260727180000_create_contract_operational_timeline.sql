-- ERA-VI-001 - Contract Operational Timeline Foundation
-- Structured assemblies and bids remain the source of truth. Timeline events
-- are a read model and never replace their source entities.

do $$
begin
  if to_regclass('public.organizations') is null
    or to_regclass('public.profiles') is null
    or to_regclass('public.contracts') is null then
    raise exception 'ERA-VI-001 dependencies are missing';
  end if;

  if to_regprocedure('public.evolv_current_organization_id()') is null
    or to_regprocedure('public.evolv_current_role()') is null
    or to_regprocedure('public.set_updated_at()') is null then
    raise exception 'ERA-VI-001 security/timestamp helpers are missing';
  end if;
end
$$;

create unique index if not exists contracts_organization_id_id_uidx
  on public.contracts (organization_id, id);

create table if not exists public.contract_assemblies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid not null,
  assembly_date timestamptz not null,
  assembly_number text,
  status text not null default 'scheduled',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contract_assemblies_contract_fk
    foreign key (organization_id, contract_id)
    references public.contracts (organization_id, id)
    on delete cascade,
  constraint contract_assemblies_status_check
    check (status in ('scheduled', 'completed', 'postponed', 'cancelled')),
  constraint contract_assemblies_number_not_blank_check
    check (assembly_number is null or btrim(assembly_number) <> ''),
  constraint contract_assemblies_organization_contract_id_unique
    unique (organization_id, contract_id, id)
);

create table if not exists public.contract_bids (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid not null,
  assembly_id uuid not null,
  bid_modality text not null,
  bid_composition text not null,
  credit_base_amount numeric(14,2) not null,
  cash_amount numeric(14,2) not null default 0,
  embedded_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  cash_percentage numeric(9,4),
  embedded_percentage numeric(9,4),
  total_percentage numeric(9,4),
  submitted_at timestamptz,
  result text not null default 'draft',
  contemplated boolean,
  contemplation_type text,
  winning_percentage numeric(9,4),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contract_bids_contract_fk
    foreign key (organization_id, contract_id)
    references public.contracts (organization_id, id)
    on delete cascade,
  constraint contract_bids_assembly_fk
    foreign key (organization_id, contract_id, assembly_id)
    references public.contract_assemblies (organization_id, contract_id, id)
    on delete cascade,
  constraint contract_bids_modality_check
    check (bid_modality in ('free', 'fixed', 'loyalty', 'other')),
  constraint contract_bids_composition_check
    check (bid_composition in ('cash', 'embedded', 'mixed')),
  constraint contract_bids_result_check
    check (result in (
      'draft',
      'submitted',
      'approved_by_client',
      'rejected_by_client',
      'not_contemplated',
      'contemplated',
      'cancelled'
    )),
  constraint contract_bids_contemplation_type_check
    check (
      contemplation_type is null
      or contemplation_type in ('draw', 'free_bid', 'fixed_bid', 'other')
    ),
  constraint contract_bids_non_negative_amounts_check
    check (
      credit_base_amount >= 0
      and cash_amount >= 0
      and embedded_amount >= 0
      and total_amount > 0
    ),
  constraint contract_bids_total_check
    check (total_amount = cash_amount + embedded_amount),
  constraint contract_bids_composition_amounts_check
    check (
      (bid_composition = 'cash' and cash_amount > 0 and embedded_amount = 0)
      or (bid_composition = 'embedded' and embedded_amount > 0 and cash_amount = 0)
      or (bid_composition = 'mixed' and cash_amount > 0 and embedded_amount > 0)
    ),
  constraint contract_bids_percentage_check
    check (
      (cash_percentage is null or cash_percentage >= 0)
      and (embedded_percentage is null or embedded_percentage >= 0)
      and (total_percentage is null or total_percentage >= 0)
      and (winning_percentage is null or winning_percentage >= 0)
    ),
  constraint contract_bids_result_contemplation_check
    check (
      (result = 'contemplated' and contemplated is true and contemplation_type is not null)
      or (result = 'not_contemplated' and contemplated is false and contemplation_type is null)
      or (result not in ('contemplated', 'not_contemplated'))
    )
);

create table if not exists public.contract_timeline_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid not null,
  event_type text not null,
  event_at timestamptz not null default now(),
  title text not null,
  description text,
  source_entity_type text,
  source_entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint contract_timeline_events_contract_fk
    foreign key (organization_id, contract_id)
    references public.contracts (organization_id, id)
    on delete cascade,
  constraint contract_timeline_events_type_check
    check (event_type in (
      'contract_created',
      'assembly_scheduled',
      'assembly_updated',
      'assembly_completed',
      'bid_created',
      'bid_submitted',
      'bid_result_recorded',
      'contemplated',
      'note_added'
    )),
  constraint contract_timeline_events_title_not_blank_check
    check (btrim(title) <> ''),
  constraint contract_timeline_events_source_check
    check (
      (source_entity_type is null and source_entity_id is null)
      or (
        source_entity_type in ('contract', 'assembly', 'bid')
        and source_entity_id is not null
      )
    )
);

create index if not exists contract_assemblies_organization_id_idx
  on public.contract_assemblies (organization_id);
create index if not exists contract_assemblies_contract_date_idx
  on public.contract_assemblies (contract_id, assembly_date desc);
create index if not exists contract_bids_organization_id_idx
  on public.contract_bids (organization_id);
create index if not exists contract_bids_contract_id_idx
  on public.contract_bids (contract_id);
create index if not exists contract_bids_assembly_id_idx
  on public.contract_bids (assembly_id);
create index if not exists contract_bids_result_idx
  on public.contract_bids (result);
create index if not exists contract_bids_contemplated_idx
  on public.contract_bids (contemplated);
create index if not exists contract_timeline_events_organization_id_idx
  on public.contract_timeline_events (organization_id);
create index if not exists contract_timeline_events_contract_event_at_idx
  on public.contract_timeline_events (contract_id, event_at desc);
create unique index if not exists contract_timeline_events_source_type_uidx
  on public.contract_timeline_events (
    organization_id,
    source_entity_type,
    source_entity_id,
    event_type
  )
  where source_entity_id is not null;

drop trigger if exists contract_assemblies_set_updated_at
  on public.contract_assemblies;
create trigger contract_assemblies_set_updated_at
before update on public.contract_assemblies
for each row execute function public.set_updated_at();

drop trigger if exists contract_bids_set_updated_at
  on public.contract_bids;
create trigger contract_bids_set_updated_at
before update on public.contract_bids
for each row execute function public.set_updated_at();

alter table public.contract_assemblies enable row level security;
alter table public.contract_bids enable row level security;
alter table public.contract_timeline_events enable row level security;

revoke all on table public.contract_assemblies from anon;
revoke all on table public.contract_bids from anon;
revoke all on table public.contract_timeline_events from anon;
grant select, insert on table public.contract_assemblies to authenticated;
grant update (assembly_date, assembly_number, status, notes)
  on table public.contract_assemblies to authenticated;
grant select, insert on table public.contract_bids to authenticated;
grant update (result, contemplated, contemplation_type, winning_percentage, notes)
  on table public.contract_bids to authenticated;
grant select, insert on table public.contract_timeline_events to authenticated;

drop policy if exists "contract assemblies authenticated read same organization"
  on public.contract_assemblies;
create policy "contract assemblies authenticated read same organization"
on public.contract_assemblies for select to authenticated
using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin', 'master', 'sdr')
);

drop policy if exists "contract assemblies authenticated insert same organization"
  on public.contract_assemblies;
create policy "contract assemblies authenticated insert same organization"
on public.contract_assemblies for insert to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin', 'master', 'sdr')
  and created_by = auth.uid()
  and exists (
    select 1 from public.contracts contract
    where contract.id = contract_id
      and contract.organization_id = organization_id
  )
);

drop policy if exists "contract assemblies authenticated update same organization"
  on public.contract_assemblies;
create policy "contract assemblies authenticated update same organization"
on public.contract_assemblies for update to authenticated
using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin', 'master', 'sdr')
)
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin', 'master', 'sdr')
  and exists (
    select 1 from public.contracts contract
    where contract.id = contract_id
      and contract.organization_id = organization_id
  )
);

drop policy if exists "contract bids authenticated read same organization"
  on public.contract_bids;
create policy "contract bids authenticated read same organization"
on public.contract_bids for select to authenticated
using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin', 'master', 'sdr')
);

drop policy if exists "contract bids authenticated insert same organization"
  on public.contract_bids;
create policy "contract bids authenticated insert same organization"
on public.contract_bids for insert to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin', 'master', 'sdr')
  and created_by = auth.uid()
  and exists (
    select 1 from public.contract_assemblies assembly
    where assembly.id = assembly_id
      and assembly.contract_id = contract_id
      and assembly.organization_id = organization_id
  )
);

drop policy if exists "contract bids authenticated update same organization"
  on public.contract_bids;
create policy "contract bids authenticated update same organization"
on public.contract_bids for update to authenticated
using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin', 'master', 'sdr')
)
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin', 'master', 'sdr')
  and exists (
    select 1 from public.contract_assemblies assembly
    where assembly.id = assembly_id
      and assembly.contract_id = contract_id
      and assembly.organization_id = organization_id
  )
);

drop policy if exists "contract timeline authenticated read same organization"
  on public.contract_timeline_events;
create policy "contract timeline authenticated read same organization"
on public.contract_timeline_events for select to authenticated
using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin', 'master', 'sdr')
);

drop policy if exists "contract timeline authenticated insert same organization"
  on public.contract_timeline_events;
create policy "contract timeline authenticated insert same organization"
on public.contract_timeline_events for insert to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin', 'master', 'sdr')
  and created_by = auth.uid()
  and exists (
    select 1 from public.contracts contract
    where contract.id = contract_id
      and contract.organization_id = organization_id
  )
  and (
    (source_entity_type is null and source_entity_id is null)
    or (source_entity_type = 'contract' and source_entity_id = contract_id)
    or (
      source_entity_type = 'assembly'
      and exists (
        select 1 from public.contract_assemblies assembly
        where assembly.id = source_entity_id
          and assembly.contract_id = contract_id
          and assembly.organization_id = organization_id
      )
    )
    or (
      source_entity_type = 'bid'
      and exists (
        select 1 from public.contract_bids bid
        where bid.id = source_entity_id
          and bid.contract_id = contract_id
          and bid.organization_id = organization_id
      )
    )
  )
);

create or replace function public.register_contract_assembly(
  p_id uuid,
  p_contract_id uuid,
  p_assembly_date timestamptz,
  p_assembly_number text default null,
  p_status text default 'scheduled',
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_organization_id uuid := public.evolv_current_organization_id();
  v_assembly public.contract_assemblies;
  v_event public.contract_timeline_events;
  v_event_type text;
begin
  if v_organization_id is null
    or public.evolv_current_role() not in ('admin', 'master', 'sdr') then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  insert into public.contract_assemblies (
    id, organization_id, contract_id, assembly_date, assembly_number,
    status, notes, created_by
  )
  values (
    p_id, v_organization_id, p_contract_id, p_assembly_date,
    nullif(btrim(p_assembly_number), ''), p_status,
    nullif(btrim(p_notes), ''), auth.uid()
  )
  on conflict (id) do nothing
  returning * into v_assembly;

  if v_assembly.id is null then
    select * into v_assembly
    from public.contract_assemblies
    where id = p_id
      and contract_id = p_contract_id
      and organization_id = v_organization_id;
  end if;

  if v_assembly.id is null then
    raise exception 'Assembly id conflict' using errcode = '23505';
  end if;

  v_event_type := case
    when v_assembly.status = 'completed' then 'assembly_completed'
    else 'assembly_scheduled'
  end;

  insert into public.contract_timeline_events (
    organization_id, contract_id, event_type, event_at, title, description,
    source_entity_type, source_entity_id, metadata, created_by
  )
  values (
    v_organization_id, p_contract_id, v_event_type,
    v_assembly.assembly_date,
    case when v_event_type = 'assembly_completed'
      then 'Assembleia realizada'
      else 'Assembleia agendada'
    end,
    v_assembly.notes,
    'assembly', v_assembly.id,
    jsonb_build_object(
      'assembly_number', v_assembly.assembly_number,
      'status', v_assembly.status
    ),
    auth.uid()
  )
  on conflict (organization_id, source_entity_type, source_entity_id, event_type)
    where source_entity_id is not null
  do update set description = excluded.description
  returning * into v_event;

  return jsonb_build_object(
    'assembly', to_jsonb(v_assembly),
    'event', to_jsonb(v_event)
  );
end
$$;

create or replace function public.register_contract_bid(
  p_id uuid,
  p_contract_id uuid,
  p_assembly_id uuid,
  p_bid_modality text,
  p_bid_composition text,
  p_cash_amount numeric,
  p_embedded_amount numeric,
  p_submitted_at timestamptz default null,
  p_result text default 'draft',
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_organization_id uuid := public.evolv_current_organization_id();
  v_credit_base numeric(14,2);
  v_total numeric(14,2);
  v_bid public.contract_bids;
  v_event public.contract_timeline_events;
  v_event_type text;
begin
  if v_organization_id is null
    or public.evolv_current_role() not in ('admin', 'master', 'sdr') then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select credit_amount into v_credit_base
  from public.contracts
  where id = p_contract_id
    and organization_id = v_organization_id;

  if not found then
    raise exception 'Contract not found' using errcode = 'P0002';
  end if;

  v_total := coalesce(p_cash_amount, 0) + coalesce(p_embedded_amount, 0);
  v_event_type := case when p_submitted_at is null then 'bid_created' else 'bid_submitted' end;

  insert into public.contract_bids (
    id, organization_id, contract_id, assembly_id, bid_modality,
    bid_composition, credit_base_amount, cash_amount, embedded_amount,
    total_amount, cash_percentage, embedded_percentage, total_percentage,
    submitted_at, result, notes, created_by
  )
  values (
    p_id, v_organization_id, p_contract_id, p_assembly_id, p_bid_modality,
    p_bid_composition, v_credit_base, coalesce(p_cash_amount, 0),
    coalesce(p_embedded_amount, 0), v_total,
    case when v_credit_base > 0 then round(coalesce(p_cash_amount, 0) / v_credit_base * 100, 4) end,
    case when v_credit_base > 0 then round(coalesce(p_embedded_amount, 0) / v_credit_base * 100, 4) end,
    case when v_credit_base > 0 then round(v_total / v_credit_base * 100, 4) end,
    p_submitted_at, p_result, nullif(btrim(p_notes), ''), auth.uid()
  )
  on conflict (id) do nothing
  returning * into v_bid;

  if v_bid.id is null then
    select * into v_bid
    from public.contract_bids
    where id = p_id
      and contract_id = p_contract_id
      and organization_id = v_organization_id;
  end if;

  if v_bid.id is null then
    raise exception 'Bid id conflict' using errcode = '23505';
  end if;

  insert into public.contract_timeline_events (
    organization_id, contract_id, event_type, event_at, title, description,
    source_entity_type, source_entity_id, metadata, created_by
  )
  values (
    v_organization_id, p_contract_id, v_event_type,
    coalesce(v_bid.submitted_at, v_bid.created_at),
    case when v_event_type = 'bid_submitted' then 'Lance enviado' else 'Lance registrado' end,
    v_bid.notes, 'bid', v_bid.id,
    jsonb_build_object(
      'assembly_id', v_bid.assembly_id,
      'bid_modality', v_bid.bid_modality,
      'bid_composition', v_bid.bid_composition,
      'credit_base_amount', v_bid.credit_base_amount,
      'total_amount', v_bid.total_amount,
      'total_percentage', v_bid.total_percentage
    ),
    auth.uid()
  )
  on conflict (organization_id, source_entity_type, source_entity_id, event_type)
    where source_entity_id is not null
  do update set description = excluded.description
  returning * into v_event;

  return jsonb_build_object('bid', to_jsonb(v_bid), 'event', to_jsonb(v_event));
end
$$;

create or replace function public.register_contract_bid_result(
  p_bid_id uuid,
  p_contemplated boolean,
  p_contemplation_type text default null,
  p_winning_percentage numeric default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_organization_id uuid := public.evolv_current_organization_id();
  v_bid public.contract_bids;
  v_assembly public.contract_assemblies;
  v_event public.contract_timeline_events;
  v_assembly_event public.contract_timeline_events;
  v_event_type text;
begin
  if v_organization_id is null
    or public.evolv_current_role() not in ('admin', 'master', 'sdr') then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  if p_contemplated and p_contemplation_type is null then
    raise exception 'Contemplation type is required' using errcode = '22023';
  end if;

  update public.contract_bids
  set result = case when p_contemplated then 'contemplated' else 'not_contemplated' end,
      contemplated = p_contemplated,
      contemplation_type = case when p_contemplated then p_contemplation_type else null end,
      winning_percentage = p_winning_percentage,
      notes = coalesce(nullif(btrim(p_notes), ''), notes)
  where id = p_bid_id
    and organization_id = v_organization_id
  returning * into v_bid;

  if v_bid.id is null then
    raise exception 'Bid not found' using errcode = 'P0002';
  end if;

  update public.contract_assemblies
  set status = 'completed'
  where id = v_bid.assembly_id
    and organization_id = v_organization_id
  returning * into v_assembly;

  v_event_type := case when p_contemplated then 'contemplated' else 'bid_result_recorded' end;

  insert into public.contract_timeline_events (
    organization_id, contract_id, event_type, event_at, title, description,
    source_entity_type, source_entity_id, metadata, created_by
  )
  values (
    v_organization_id, v_bid.contract_id, v_event_type, now(),
    case when p_contemplated then 'Cota contemplada' else 'Resultado do lance registrado' end,
    nullif(btrim(p_notes), ''), 'bid', v_bid.id,
    jsonb_build_object(
      'assembly_id', v_bid.assembly_id,
      'contemplated', p_contemplated,
      'contemplation_type', v_bid.contemplation_type,
      'winning_percentage', v_bid.winning_percentage,
      'result', v_bid.result
    ),
    auth.uid()
  )
  on conflict (organization_id, source_entity_type, source_entity_id, event_type)
    where source_entity_id is not null
  do update set
    event_at = excluded.event_at,
    description = excluded.description,
    metadata = excluded.metadata
  returning * into v_event;

  insert into public.contract_timeline_events (
    organization_id, contract_id, event_type, event_at, title,
    source_entity_type, source_entity_id, metadata, created_by
  )
  values (
    v_organization_id, v_bid.contract_id, 'assembly_completed', now(),
    'Assembleia realizada', 'assembly', v_bid.assembly_id,
    jsonb_build_object('status', 'completed'), auth.uid()
  )
  on conflict (organization_id, source_entity_type, source_entity_id, event_type)
    where source_entity_id is not null
  do update set event_at = excluded.event_at
  returning * into v_assembly_event;

  return jsonb_build_object(
    'assembly', to_jsonb(v_assembly),
    'bid', to_jsonb(v_bid),
    'event', to_jsonb(v_event),
    'assembly_event', to_jsonb(v_assembly_event)
  );
end
$$;

revoke all on function public.register_contract_assembly(
  uuid, uuid, timestamptz, text, text, text
) from public, anon;
revoke all on function public.register_contract_bid(
  uuid, uuid, uuid, text, text, numeric, numeric, timestamptz, text, text
) from public, anon;
revoke all on function public.register_contract_bid_result(
  uuid, boolean, text, numeric, text
) from public, anon;

grant execute on function public.register_contract_assembly(
  uuid, uuid, timestamptz, text, text, text
) to authenticated;
grant execute on function public.register_contract_bid(
  uuid, uuid, uuid, text, text, numeric, numeric, timestamptz, text, text
) to authenticated;
grant execute on function public.register_contract_bid_result(
  uuid, boolean, text, numeric, text
) to authenticated;
