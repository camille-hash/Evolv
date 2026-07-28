-- OPP-002 - versioned bid offers and private commercial PDFs.

create table if not exists public.contract_bid_offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid not null,
  assembly_id uuid not null,
  bid_id uuid,
  client_id uuid,
  status text not null default 'draft',
  version integer not null default 1,
  cash_amount numeric(14,2) not null default 0,
  embedded_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null,
  cash_percentage numeric(9,4),
  embedded_percentage numeric(9,4),
  total_percentage numeric(9,4),
  credit_base_amount numeric(14,2) not null,
  estimated_net_credit numeric(14,2),
  pdf_storage_path text,
  generated_at timestamptz,
  generated_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_channel text,
  approved_at timestamptz,
  rejected_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_bid_offers_contract_fk
    foreign key (organization_id, contract_id)
    references public.contracts (organization_id, id) on delete cascade,
  constraint contract_bid_offers_assembly_fk
    foreign key (organization_id, contract_id, assembly_id)
    references public.contract_assemblies (organization_id, contract_id, id)
    on delete cascade,
  constraint contract_bid_offers_bid_fk
    foreign key (bid_id) references public.contract_bids(id) on delete restrict,
  constraint contract_bid_offers_status_check check (
    status in ('draft','generated','sent','approved','rejected','expired','cancelled','submitted')
  ),
  constraint contract_bid_offers_channel_check check (
    sent_channel is null or sent_channel in ('download','email','whatsapp','other')
  ),
  constraint contract_bid_offers_version_check check (version > 0),
  constraint contract_bid_offers_amounts_check check (
    credit_base_amount >= 0 and cash_amount >= 0 and embedded_amount >= 0
    and total_amount > 0 and total_amount = cash_amount + embedded_amount
    and estimated_net_credit = credit_base_amount - embedded_amount
  ),
  constraint contract_bid_offers_percentages_check check (
    (cash_percentage is null or cash_percentage >= 0)
    and (embedded_percentage is null or embedded_percentage >= 0)
    and (total_percentage is null or total_percentage >= 0)
  ),
  constraint contract_bid_offers_generated_check check (
    (
      status in ('draft','cancelled','expired')
      and generated_at is null and generated_by is null and pdf_storage_path is null
    )
    or (
      status <> 'draft'
      and generated_at is not null and generated_by is not null and pdf_storage_path is not null
    )
  ),
  constraint contract_bid_offers_contract_assembly_version_unique
    unique (organization_id, contract_id, assembly_id, version)
);

create index if not exists contract_bid_offers_organization_status_idx
  on public.contract_bid_offers (organization_id, status);
create index if not exists contract_bid_offers_contract_created_idx
  on public.contract_bid_offers (contract_id, created_at desc);
create index if not exists contract_bid_offers_assembly_version_idx
  on public.contract_bid_offers (assembly_id, version desc);
create index if not exists contract_bid_offers_bid_idx
  on public.contract_bid_offers (bid_id) where bid_id is not null;

drop trigger if exists contract_bid_offers_set_updated_at on public.contract_bid_offers;
create trigger contract_bid_offers_set_updated_at
before update on public.contract_bid_offers
for each row execute function public.set_updated_at();

alter table public.contract_bid_offers enable row level security;
revoke all on table public.contract_bid_offers from anon;
grant select, insert, update on table public.contract_bid_offers to authenticated;

create policy "contract bid offers authenticated read same organization"
on public.contract_bid_offers for select to authenticated
using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin','master','sdr')
);
create policy "contract bid offers authenticated insert same organization"
on public.contract_bid_offers for insert to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin','master','sdr')
  and created_by = auth.uid()
  and exists (
    select 1 from public.contracts contract
    where contract.id = contract_id and contract.organization_id = organization_id
      and contract.client_id is not distinct from client_id
  )
  and exists (
    select 1 from public.contract_assemblies assembly
    where assembly.id = assembly_id and assembly.contract_id = contract_id
      and assembly.organization_id = organization_id
  )
  and exists (
    select 1 from public.contracts contract
    where contract.id = contract_id and contract.organization_id = organization_id
      and contract.client_id is not distinct from client_id
  )
  and (
    bid_id is null or exists (
      select 1 from public.contract_bids bid
      where bid.id = bid_id and bid.assembly_id = assembly_id
        and bid.contract_id = contract_id and bid.organization_id = organization_id
    )
  )
);
create policy "contract bid offers authenticated update same organization"
on public.contract_bid_offers for update to authenticated
using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin','master','sdr')
  and exists (
    select 1 from public.contract_assemblies assembly
    where assembly.id = assembly_id and assembly.contract_id = contract_id
      and assembly.organization_id = organization_id
  )
)
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin','master','sdr')
);

alter table public.contract_timeline_events
  drop constraint if exists contract_timeline_events_type_check,
  add constraint contract_timeline_events_type_check check (event_type in (
    'contract_created','assembly_scheduled','assembly_updated','assembly_completed',
    'bid_created','bid_submitted','bid_result_recorded','contemplated','note_added',
    'bid_offer_created','bid_offer_generated','bid_offer_sent',
    'bid_offer_approved','bid_offer_rejected'
  )),
  drop constraint if exists contract_timeline_events_source_check,
  add constraint contract_timeline_events_source_check check (
    (source_entity_type is null and source_entity_id is null)
    or (
      source_entity_type in ('contract','assembly','bid','bid_offer')
      and source_entity_id is not null
    )
  );

drop policy if exists "contract timeline authenticated insert same organization"
  on public.contract_timeline_events;
create policy "contract timeline authenticated insert same organization"
on public.contract_timeline_events for insert to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('admin','master','sdr')
  and created_by = auth.uid()
  and exists (
    select 1 from public.contracts contract
    where contract.id = contract_id and contract.organization_id = organization_id
  )
  and (
    (source_entity_type is null and source_entity_id is null)
    or (source_entity_type = 'contract' and source_entity_id = contract_id)
    or (source_entity_type = 'assembly' and exists (
      select 1 from public.contract_assemblies assembly
      where assembly.id = source_entity_id and assembly.contract_id = contract_id
        and assembly.organization_id = organization_id
    ))
    or (source_entity_type = 'bid' and exists (
      select 1 from public.contract_bids bid
      where bid.id = source_entity_id and bid.contract_id = contract_id
        and bid.organization_id = organization_id
    ))
    or (source_entity_type = 'bid_offer' and exists (
      select 1 from public.contract_bid_offers offer
      where offer.id = source_entity_id and offer.contract_id = contract_id
        and offer.organization_id = organization_id
    ))
  )
);

insert into storage.buckets (id, name, public)
values ('contract-bid-offers', 'contract-bid-offers', false)
on conflict (id) do update set public = false;

drop policy if exists "contract bid offer files authenticated read" on storage.objects;
create policy "contract bid offer files authenticated read"
on storage.objects for select to authenticated
using (
  bucket_id = 'contract-bid-offers'
  and (storage.foldername(name))[1] = public.evolv_current_organization_id()::text
  and public.evolv_current_role() in ('admin','master','sdr')
);
drop policy if exists "contract bid offer files authenticated insert" on storage.objects;
create policy "contract bid offer files authenticated insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'contract-bid-offers'
  and (storage.foldername(name))[1] = public.evolv_current_organization_id()::text
  and public.evolv_current_role() in ('admin','master','sdr')
);
drop policy if exists "contract bid offer files authenticated delete" on storage.objects;
create policy "contract bid offer files authenticated delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'contract-bid-offers'
  and (storage.foldername(name))[1] = public.evolv_current_organization_id()::text
  and public.evolv_current_role() in ('admin','master','sdr')
);

create or replace function public.save_contract_bid_offer(
  p_id uuid, p_contract_id uuid, p_assembly_id uuid, p_bid_id uuid,
  p_cash_amount numeric, p_embedded_amount numeric, p_notes text default null
) returns public.contract_bid_offers
language plpgsql security invoker set search_path = public as $$
declare
  v_org uuid := public.evolv_current_organization_id();
  v_contract public.contracts;
  v_offer public.contract_bid_offers;
  v_version integer;
begin
  if v_org is null or public.evolv_current_role() not in ('admin','master','sdr') then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  select * into v_contract from public.contracts
  where id = p_contract_id and organization_id = v_org;
  if not found then raise exception 'Contract not found' using errcode = 'P0002'; end if;
  if not exists (
    select 1 from public.contract_assemblies
    where id = p_assembly_id and contract_id = p_contract_id and organization_id = v_org
  ) then raise exception 'Assembly not found' using errcode = 'P0002'; end if;
  if p_bid_id is not null and not exists (
    select 1 from public.contract_bids
    where id = p_bid_id and assembly_id = p_assembly_id
      and contract_id = p_contract_id and organization_id = v_org
  ) then raise exception 'Bid not found' using errcode = 'P0002'; end if;

  select * into v_offer from public.contract_bid_offers
  where id = p_id and organization_id = v_org;
  if v_offer.id is not null and v_offer.status <> 'draft' then
    raise exception 'Generated offer is immutable' using errcode = '22023';
  end if;
  if v_offer.id is null then
    perform pg_advisory_xact_lock(
      hashtextextended(v_org::text || ':' || p_contract_id::text || ':' || p_assembly_id::text, 0)
    );
    select coalesce(max(version), 0) + 1 into v_version
    from public.contract_bid_offers
    where organization_id = v_org and contract_id = p_contract_id
      and assembly_id = p_assembly_id;
    insert into public.contract_bid_offers (
      id, organization_id, contract_id, assembly_id, bid_id, client_id,
      version, cash_amount, embedded_amount, total_amount,
      cash_percentage, embedded_percentage, total_percentage,
      credit_base_amount, estimated_net_credit, notes, created_by
    ) values (
      p_id, v_org, p_contract_id, p_assembly_id, p_bid_id, v_contract.client_id,
      v_version, coalesce(p_cash_amount,0), coalesce(p_embedded_amount,0),
      coalesce(p_cash_amount,0) + coalesce(p_embedded_amount,0),
      case when v_contract.credit_amount > 0 then round(coalesce(p_cash_amount,0) / v_contract.credit_amount * 100,4) end,
      case when v_contract.credit_amount > 0 then round(coalesce(p_embedded_amount,0) / v_contract.credit_amount * 100,4) end,
      case when v_contract.credit_amount > 0 then round((coalesce(p_cash_amount,0)+coalesce(p_embedded_amount,0)) / v_contract.credit_amount * 100,4) end,
      v_contract.credit_amount, v_contract.credit_amount - coalesce(p_embedded_amount,0),
      nullif(btrim(p_notes),''), auth.uid()
    ) returning * into v_offer;
    insert into public.contract_timeline_events (
      organization_id, contract_id, event_type, title, source_entity_type,
      source_entity_id, metadata, created_by
    ) values (
      v_org, p_contract_id, 'bid_offer_created', 'Oferta de lance criada',
      'bid_offer', v_offer.id, jsonb_build_object('version',v_offer.version,'status',v_offer.status),
      auth.uid()
    );
  else
    update public.contract_bid_offers set
      bid_id = p_bid_id, cash_amount = coalesce(p_cash_amount,0),
      embedded_amount = coalesce(p_embedded_amount,0),
      total_amount = coalesce(p_cash_amount,0)+coalesce(p_embedded_amount,0),
      cash_percentage = case when credit_base_amount > 0 then round(coalesce(p_cash_amount,0)/credit_base_amount*100,4) end,
      embedded_percentage = case when credit_base_amount > 0 then round(coalesce(p_embedded_amount,0)/credit_base_amount*100,4) end,
      total_percentage = case when credit_base_amount > 0 then round((coalesce(p_cash_amount,0)+coalesce(p_embedded_amount,0))/credit_base_amount*100,4) end,
      estimated_net_credit = credit_base_amount-coalesce(p_embedded_amount,0),
      notes = nullif(btrim(p_notes),'')
    where id = p_id returning * into v_offer;
  end if;
  return v_offer;
end $$;

create or replace function public.mark_contract_bid_offer_generated(
  p_offer_id uuid, p_storage_path text
) returns public.contract_bid_offers
language plpgsql security invoker set search_path = public as $$
declare v_org uuid := public.evolv_current_organization_id(); v_offer public.contract_bid_offers;
begin
  update public.contract_bid_offers set status='generated',
    pdf_storage_path=p_storage_path, generated_at=now(), generated_by=auth.uid()
  where id=p_offer_id and organization_id=v_org and status='draft'
  returning * into v_offer;
  if v_offer.id is null then raise exception 'Draft offer not found' using errcode='P0002'; end if;
  insert into public.contract_timeline_events (
    organization_id,contract_id,event_type,title,source_entity_type,source_entity_id,metadata,created_by
  ) values (
    v_org,v_offer.contract_id,'bid_offer_generated','PDF da oferta de lance gerado',
    'bid_offer',v_offer.id,jsonb_build_object('version',v_offer.version,'status',v_offer.status),auth.uid()
  );
  return v_offer;
end $$;

create or replace function public.transition_contract_bid_offer(
  p_offer_id uuid, p_status text, p_channel text default null
) returns public.contract_bid_offers
language plpgsql security invoker set search_path = public as $$
declare
  v_org uuid := public.evolv_current_organization_id();
  v_offer public.contract_bid_offers;
  v_event text;
begin
  select * into v_offer from public.contract_bid_offers
  where id=p_offer_id and organization_id=v_org for update;
  if v_offer.id is null then raise exception 'Offer not found' using errcode='P0002'; end if;
  if not (
    (v_offer.status='generated' and p_status='sent')
    or (v_offer.status='sent' and p_status in ('approved','rejected'))
    or (v_offer.status='approved' and p_status='submitted')
    or (v_offer.status in ('draft','generated','sent') and p_status in ('cancelled','expired'))
  ) then raise exception 'Invalid offer transition' using errcode='22023'; end if;
  if p_status='sent' and p_channel not in ('download','email','whatsapp','other') then
    raise exception 'Invalid channel' using errcode='22023';
  end if;
  if p_status='submitted' and v_offer.bid_id is null then
    raise exception 'Offer has no bid' using errcode='22023';
  end if;
  update public.contract_bid_offers set status=p_status,
    sent_at=case when p_status='sent' then now() else sent_at end,
    sent_by=case when p_status='sent' then auth.uid() else sent_by end,
    sent_channel=case when p_status='sent' then p_channel else sent_channel end,
    approved_at=case when p_status='approved' then now() else approved_at end,
    rejected_at=case when p_status='rejected' then now() else rejected_at end
  where id=p_offer_id returning * into v_offer;
  if p_status='submitted' then
    update public.contract_bids set result='submitted',submitted_at=coalesce(submitted_at,now())
    where id=v_offer.bid_id and organization_id=v_org;
  end if;
  v_event := case p_status
    when 'sent' then 'bid_offer_sent' when 'approved' then 'bid_offer_approved'
    when 'rejected' then 'bid_offer_rejected' when 'submitted' then 'bid_submitted'
    else null end;
  if v_event is not null then
    insert into public.contract_timeline_events (
      organization_id,contract_id,event_type,title,source_entity_type,source_entity_id,metadata,created_by
    ) values (
      v_org,v_offer.contract_id,v_event,
      case p_status when 'sent' then 'Oferta compartilhada com o cliente'
        when 'approved' then 'Oferta aprovada pelo cliente'
        when 'rejected' then 'Oferta rejeitada pelo cliente'
        else 'Lance enviado a administradora' end,
      'bid_offer',v_offer.id,jsonb_build_object('version',v_offer.version,'status',v_offer.status,'channel',p_channel),
      auth.uid()
    );
  end if;
  return v_offer;
end $$;

revoke all on function public.save_contract_bid_offer(uuid,uuid,uuid,uuid,numeric,numeric,text) from public,anon;
revoke all on function public.mark_contract_bid_offer_generated(uuid,text) from public,anon;
revoke all on function public.transition_contract_bid_offer(uuid,text,text) from public,anon;
grant execute on function public.save_contract_bid_offer(uuid,uuid,uuid,uuid,numeric,numeric,text) to authenticated;
grant execute on function public.mark_contract_bid_offer_generated(uuid,text) to authenticated;
grant execute on function public.transition_contract_bid_offer(uuid,text,text) to authenticated;
