-- OPP-002.1 - enforce bid offer immutability and status transitions at table level.

create or replace function public.enforce_contract_bid_offer_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    new.organization_id,
    new.contract_id,
    new.assembly_id,
    new.bid_id,
    new.client_id,
    new.version,
    new.created_by,
    new.created_at
  ) is distinct from (
    old.organization_id,
    old.contract_id,
    old.assembly_id,
    old.bid_id,
    old.client_id,
    old.version,
    old.created_by,
    old.created_at
  ) then
    raise exception 'Offer identity and version are immutable'
      using errcode = '22023';
  end if;

  if old.status <> 'draft' and (
    new.cash_amount,
    new.embedded_amount,
    new.total_amount,
    new.cash_percentage,
    new.embedded_percentage,
    new.total_percentage,
    new.credit_base_amount,
    new.estimated_net_credit,
    new.notes,
    new.pdf_storage_path,
    new.generated_at,
    new.generated_by
  ) is distinct from (
    old.cash_amount,
    old.embedded_amount,
    old.total_amount,
    old.cash_percentage,
    old.embedded_percentage,
    old.total_percentage,
    old.credit_base_amount,
    old.estimated_net_credit,
    old.notes,
    old.pdf_storage_path,
    old.generated_at,
    old.generated_by
  ) then
    raise exception 'Generated offer is immutable; create a new version'
      using errcode = '22023';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status in ('generated', 'cancelled', 'expired'))
    or (old.status = 'generated' and new.status in ('sent', 'cancelled', 'expired'))
    or (old.status = 'sent' and new.status in ('approved', 'rejected', 'cancelled', 'expired'))
    or (old.status = 'approved' and new.status = 'submitted')
  ) then
    raise exception 'Invalid offer transition'
      using errcode = '22023';
  end if;

  if new.status = 'sent' and (
    new.sent_at is null
    or new.sent_by is null
    or new.sent_channel not in ('download', 'email', 'whatsapp', 'other')
  ) then
    raise exception 'Sent offer requires timestamp, actor and channel'
      using errcode = '22023';
  end if;

  if new.status = 'approved' and new.approved_at is null then
    raise exception 'Approved offer requires approval timestamp'
      using errcode = '22023';
  end if;

  if new.status = 'rejected' and new.rejected_at is null then
    raise exception 'Rejected offer requires rejection timestamp'
      using errcode = '22023';
  end if;

  if new.status = 'submitted' and new.bid_id is null then
    raise exception 'Submitted offer requires a linked bid'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists contract_bid_offers_enforce_update
  on public.contract_bid_offers;
create trigger contract_bid_offers_enforce_update
before update on public.contract_bid_offers
for each row execute function public.enforce_contract_bid_offer_update();

revoke all on function public.enforce_contract_bid_offer_update() from public;
