-- CONTRACT-024B-01 C1 - Canonical Commercial Proposal Lineage.
-- Abort on ambiguous history; never repair, re-chain or delete proposals silently.

do $$
declare
  v_issue text;
begin
  if to_regclass('public.crm_lead_commercial_proposals') is null then
    raise exception 'C1 preflight: missing public.crm_lead_commercial_proposals';
  end if;

  select format('proposal %s has a null root but is not a legitimate root', id)
  into v_issue
  from public.crm_lead_commercial_proposals
  where root_proposal_id is null
    and (previous_version_id is not null or version <> 1)
  limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;

  select format('proposal %s references a missing root %s', p.id, p.root_proposal_id)
  into v_issue
  from public.crm_lead_commercial_proposals p
  left join public.crm_lead_commercial_proposals r on r.id = p.root_proposal_id
  where p.root_proposal_id is not null and r.id is null
  limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;

  select format('proposal %s and root %s belong to different organizations', p.id, r.id)
  into v_issue
  from public.crm_lead_commercial_proposals p
  join public.crm_lead_commercial_proposals r on r.id = p.root_proposal_id
  where p.organization_id <> r.organization_id
  limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;

  select format('proposal %s and root %s have different proposal numbers', p.id, r.id)
  into v_issue
  from public.crm_lead_commercial_proposals p
  join public.crm_lead_commercial_proposals r on r.id = p.root_proposal_id
  where p.proposal_number <> r.proposal_number
  limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;

  select format('root target %s is not an effective version-1 root', r.id)
  into v_issue
  from public.crm_lead_commercial_proposals p
  join public.crm_lead_commercial_proposals r on r.id = p.root_proposal_id
  where r.version <> 1
     or r.previous_version_id is not null
     or (r.root_proposal_id is not null and r.root_proposal_id <> r.id)
  limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;

  select format('descendant %s has no previous version', p.id)
  into v_issue
  from public.crm_lead_commercial_proposals p
  where p.root_proposal_id is not null
    and p.root_proposal_id <> p.id
    and p.previous_version_id is null
  limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;

  select format('proposal %s references previous version %s from another organization', p.id, prev.id)
  into v_issue
  from public.crm_lead_commercial_proposals p
  join public.crm_lead_commercial_proposals prev on prev.id = p.previous_version_id
  where p.organization_id <> prev.organization_id
  limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;

  select format('proposal %s references previous version %s from another lineage', p.id, prev.id)
  into v_issue
  from public.crm_lead_commercial_proposals p
  join public.crm_lead_commercial_proposals prev on prev.id = p.previous_version_id
  where coalesce(p.root_proposal_id, p.id) <> coalesce(prev.root_proposal_id, prev.id)
     or p.proposal_number <> prev.proposal_number
     or p.version <= prev.version
  limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;

  select format('lineage %s has duplicate version %s', coalesce(root_proposal_id, id), version)
  into v_issue
  from public.crm_lead_commercial_proposals
  group by organization_id, coalesce(root_proposal_id, id), version
  having count(*) > 1
  limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;

  select format('previous version %s has incompatible branches', previous_version_id)
  into v_issue
  from public.crm_lead_commercial_proposals
  where previous_version_id is not null
  group by previous_version_id
  having count(*) > 1
  limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;

  select format('lineage %s has more than one approved version', coalesce(root_proposal_id, id))
  into v_issue
  from public.crm_lead_commercial_proposals
  where status = 'approved'
  group by organization_id, coalesce(root_proposal_id, id)
  having count(*) > 1
  limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;

  with recursive ancestry as (
    select id as start_id, previous_version_id as next_id, array[id] as path, false as cycle
    from public.crm_lead_commercial_proposals
    union all
    select a.start_id, p.previous_version_id, a.path || p.id, p.id = any(a.path)
    from ancestry a
    join public.crm_lead_commercial_proposals p on p.id = a.next_id
    where not a.cycle
  )
  select format('proposal chain starting at %s contains a cycle', start_id)
  into v_issue from ancestry where cycle limit 1;
  if v_issue is not null then raise exception 'C1 preflight: %', v_issue; end if;
end
$$;

update public.crm_lead_commercial_proposals
set root_proposal_id = id
where root_proposal_id is null
  and previous_version_id is null
  and version = 1;

alter table public.crm_lead_commercial_proposals
  drop constraint if exists crm_lead_commercial_proposals_root_proposal_id_fkey,
  drop constraint if exists crm_lead_commercial_proposals_previous_version_id_fkey;

alter table public.crm_lead_commercial_proposals
  alter column root_proposal_id set not null;

alter table public.crm_lead_commercial_proposals
  add constraint crm_lead_commercial_proposals_org_id_key
    unique (organization_id, id),
  add constraint crm_lead_commercial_proposals_root_tenant_fkey
    foreign key (organization_id, root_proposal_id)
    references public.crm_lead_commercial_proposals (organization_id, id)
    on delete restrict,
  add constraint crm_lead_commercial_proposals_previous_tenant_fkey
    foreign key (organization_id, previous_version_id)
    references public.crm_lead_commercial_proposals (organization_id, id)
    on delete restrict;

create unique index crm_lead_commercial_proposals_root_version_uidx
  on public.crm_lead_commercial_proposals (organization_id, root_proposal_id, version);

create index crm_lead_commercial_proposals_root_current_idx
  on public.crm_lead_commercial_proposals (organization_id, root_proposal_id, version desc);

create unique index crm_lead_commercial_proposals_previous_version_uidx
  on public.crm_lead_commercial_proposals (previous_version_id)
  where previous_version_id is not null;

drop index if exists public.crm_lead_commercial_proposals_one_approved_uidx;
create unique index crm_lead_commercial_proposals_one_approved_uidx
  on public.crm_lead_commercial_proposals (organization_id, root_proposal_id)
  where status = 'approved';

create or replace function public.enforce_commercial_proposal_lineage_integrity()
returns trigger
language plpgsql
as $$
declare
  v_root public.crm_lead_commercial_proposals%rowtype;
  v_previous public.crm_lead_commercial_proposals%rowtype;
begin
  if tg_op = 'UPDATE' and (
    old.root_proposal_id is distinct from new.root_proposal_id
    or old.proposal_number is distinct from new.proposal_number
    or old.version is distinct from new.version
    or old.previous_version_id is distinct from new.previous_version_id
  ) then
    raise exception 'Commercial proposal lineage identity is immutable';
  end if;

  if tg_op = 'UPDATE' then return new; end if;

  if new.root_proposal_id is null then
    raise exception 'Commercial proposal canonical root is required';
  end if;

  if new.root_proposal_id = new.id then
    if new.version <> 1 or new.previous_version_id is not null then
      raise exception 'Commercial proposal root must be version 1 without a previous version';
    end if;
    return new;
  end if;

  select * into v_root from public.crm_lead_commercial_proposals
  where id = new.root_proposal_id and organization_id = new.organization_id;
  if not found or v_root.root_proposal_id <> v_root.id or v_root.version <> 1
     or v_root.previous_version_id is not null
     or v_root.proposal_number <> new.proposal_number then
    raise exception 'Commercial proposal canonical root is invalid';
  end if;

  if new.previous_version_id is null then
    raise exception 'Commercial proposal descendant requires a previous version';
  end if;
  select * into v_previous from public.crm_lead_commercial_proposals
  where id = new.previous_version_id and organization_id = new.organization_id;
  if not found or v_previous.root_proposal_id <> new.root_proposal_id
     or v_previous.proposal_number <> new.proposal_number
     or v_previous.version >= new.version then
    raise exception 'Commercial proposal previous version is invalid';
  end if;
  return new;
end;
$$;

drop trigger if exists crm_lead_commercial_proposals_lineage_integrity
  on public.crm_lead_commercial_proposals;
create trigger crm_lead_commercial_proposals_lineage_integrity
before insert or update on public.crm_lead_commercial_proposals
for each row execute function public.enforce_commercial_proposal_lineage_integrity();

create or replace function public.approve_commercial_proposal_transaction(
  p_proposal_id uuid, p_organization_id uuid, p_approved_by uuid
)
returns public.crm_lead_commercial_proposals
language plpgsql
as $$
declare
  v_proposal public.crm_lead_commercial_proposals%rowtype;
  v_existing_approved_id uuid;
begin
  select * into v_proposal
  from public.crm_lead_commercial_proposals
  where id = p_proposal_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'Commercial proposal not found'; end if;
  if v_proposal.status not in ('generated', 'presented', 'saved') then
    raise exception 'Commercial proposal cannot be approved from status %', v_proposal.status;
  end if;
  if v_proposal.saved_snapshot is null or jsonb_typeof(v_proposal.saved_snapshot) <> 'object' then
    raise exception 'Commercial proposal approved snapshot is invalid';
  end if;
  select id into v_existing_approved_id
  from public.crm_lead_commercial_proposals
  where organization_id = p_organization_id
    and root_proposal_id = v_proposal.root_proposal_id
    and status = 'approved' and id <> p_proposal_id
  limit 1 for update;
  if v_existing_approved_id is not null then
    raise exception 'Commercial proposal already has an approved version';
  end if;
  update public.crm_lead_commercial_proposals
  set status = 'approved', approved_at = now(), approved_by = p_approved_by
  where id = p_proposal_id and organization_id = p_organization_id
  returning * into v_proposal;
  insert into public.commercial_proposal_audit_events (
    organization_id, proposal_id, proposal_number, proposal_version, lead_id,
    simulation_id, event_type, metadata, created_by
  ) values (
    v_proposal.organization_id, v_proposal.id, v_proposal.proposal_number,
    v_proposal.version, v_proposal.lead_id, v_proposal.simulation_id,
    'approved', jsonb_build_object('status', 'approved'), p_approved_by
  );
  return v_proposal;
end;
$$;
