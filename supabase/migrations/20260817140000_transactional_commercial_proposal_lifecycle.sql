-- CONTRACT-024B-01 C2 - Transactional proposal revision and approval lifecycle.

alter table public.crm_lead_commercial_proposals
  add column if not exists approval_revoked_at timestamptz,
  add column if not exists approval_revoked_by uuid null
    references public.profiles(id) on delete set null,
  add column if not exists approval_revocation_reason text;

alter table public.crm_lead_commercial_proposals
  drop constraint if exists crm_lead_commercial_proposals_status_check;
alter table public.crm_lead_commercial_proposals
  add constraint crm_lead_commercial_proposals_status_check
  check (status in (
    'draft', 'generated', 'presented', 'approved', 'approval_revoked',
    'rejected', 'expired', 'superseded', 'saved'
  ));

alter table public.crm_lead_commercial_proposals
  add constraint crm_lead_commercial_proposals_revocation_reason_check
  check (
    approval_revocation_reason is null
    or length(approval_revocation_reason) between 1 and 1000
  );

alter table public.commercial_proposal_audit_events
  add column if not exists root_proposal_id uuid,
  add column if not exists related_proposal_id uuid,
  add column if not exists snapshot_hash text,
  add column if not exists correlation_id uuid;

update public.commercial_proposal_audit_events event
set root_proposal_id = proposal.root_proposal_id
from public.crm_lead_commercial_proposals proposal
where proposal.id = event.proposal_id
  and event.root_proposal_id is null;

alter table public.commercial_proposal_audit_events
  add constraint commercial_proposal_audit_events_root_tenant_fkey
    foreign key (organization_id, root_proposal_id)
    references public.crm_lead_commercial_proposals (organization_id, id)
    on delete restrict,
  add constraint commercial_proposal_audit_events_related_fkey
    foreign key (related_proposal_id)
    references public.crm_lead_commercial_proposals (id)
    on delete restrict;

alter table public.commercial_proposal_audit_events
  drop constraint if exists commercial_proposal_audit_events_type_check;
alter table public.commercial_proposal_audit_events
  add constraint commercial_proposal_audit_events_type_check
  check (event_type in (
    'created', 'version_created', 'presented', 'approved', 'rejected',
    'expired', 'superseded', 'version_superseded', 'proposal_approved',
    'proposal_approval_revoked'
  ));

create index if not exists commercial_proposal_audit_events_root_idx
  on public.commercial_proposal_audit_events
    (organization_id, root_proposal_id, created_at desc);
create unique index if not exists commercial_proposal_audit_events_transition_uidx
  on public.commercial_proposal_audit_events
    (proposal_id, event_type, correlation_id)
  where correlation_id is not null;

create or replace function public.prevent_commercial_proposal_audit_rewrite()
returns trigger
language plpgsql
as $$
begin
  raise exception using errcode = 'P0001', message = 'Commercial proposal audit is append-only';
end;
$$;

drop trigger if exists commercial_proposal_audit_events_append_only
  on public.commercial_proposal_audit_events;
create trigger commercial_proposal_audit_events_append_only
before update or delete on public.commercial_proposal_audit_events
for each row execute function public.prevent_commercial_proposal_audit_rewrite();

create or replace function public.prevent_approved_commercial_proposal_rewrite()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('approved', 'approval_revoked', 'rejected', 'expired', 'superseded') then
    if old.original_snapshot is distinct from new.original_snapshot
      or old.saved_snapshot is distinct from new.saved_snapshot
      or old.summary is distinct from new.summary
      or old.lead_id is distinct from new.lead_id
      or old.simulation_id is distinct from new.simulation_id
      or old.source_suggestion is distinct from new.source_suggestion
      or old.proposal_number is distinct from new.proposal_number
      or old.version is distinct from new.version
      or old.root_proposal_id is distinct from new.root_proposal_id
      or old.previous_version_id is distinct from new.previous_version_id
      or old.assembly_day_of_month is distinct from new.assembly_day_of_month
      or old.suggested_next_assembly_date is distinct from new.suggested_next_assembly_date
      or old.effective_next_assembly_date is distinct from new.effective_next_assembly_date
      or old.assembly_source is distinct from new.assembly_source then
      raise exception 'Commercial proposal historical records are immutable';
    end if;
  end if;
  return new;
end;
$$;

drop function if exists public.approve_commercial_proposal_transaction(uuid, uuid, uuid);

create or replace function public.revise_commercial_proposal_transaction(
  p_root_proposal_id uuid,
  p_based_on_version_id uuid,
  p_saved_snapshot jsonb,
  p_revision_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_organization_id uuid;
  v_root public.crm_lead_commercial_proposals%rowtype;
  v_current public.crm_lead_commercial_proposals%rowtype;
  v_new public.crm_lead_commercial_proposals%rowtype;
  v_previous_status text;
  v_reason text := nullif(btrim(regexp_replace(coalesce(p_revision_reason, ''), '\s+', ' ', 'g')), '');
  v_correlation_id uuid := gen_random_uuid();
begin
  select organization_id, role into v_organization_id, v_actor_role
  from public.profiles
  where id = v_actor_id and is_active is true;
  if not found or v_actor_role not in ('master', 'admin', 'sdr') then
    raise exception using errcode = 'P0001', message = 'CP_ACTOR_FORBIDDEN';
  end if;
  if p_saved_snapshot is null or jsonb_typeof(p_saved_snapshot) <> 'object' then
    raise exception using errcode = 'P0001', message = 'CP_SNAPSHOT_INVALID';
  end if;
  if v_reason is not null and length(v_reason) > 1000 then
    raise exception using errcode = 'P0001', message = 'CP_INVALID_PAYLOAD';
  end if;

  select * into v_root from public.crm_lead_commercial_proposals
  where id = p_root_proposal_id
    and root_proposal_id = id
    and organization_id = v_organization_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'CP_CURRENT_VERSION_NOT_FOUND';
  end if;

  select * into v_current from public.crm_lead_commercial_proposals
  where organization_id = v_organization_id
    and root_proposal_id = p_root_proposal_id
  order by version desc limit 1 for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'CP_CURRENT_VERSION_NOT_FOUND';
  end if;
  if v_current.id <> p_based_on_version_id then
    raise exception using errcode = 'P0001', message = 'CP_REVISION_BASE_STALE';
  end if;
  if v_current.status not in (
    'generated', 'presented', 'saved', 'approved', 'approval_revoked',
    'rejected', 'expired'
  ) then
    raise exception using errcode = 'P0001', message = 'CP_VERSION_NOT_REVISABLE';
  end if;
  if v_current.status = 'approved' and v_reason is null then
    raise exception using errcode = 'P0001', message = 'CP_REVISION_REASON_REQUIRED';
  end if;

  v_previous_status := v_current.status;
  update public.crm_lead_commercial_proposals
  set status = 'superseded', superseded_at = now(), superseded_by = v_actor_id
  where id = v_current.id returning * into v_current;

  insert into public.crm_lead_commercial_proposals (
    id, organization_id, lead_id, simulation_id, created_by, title,
    source_suggestion, status, proposal_number, root_proposal_id,
    previous_version_id, version, assembly_day_of_month,
    suggested_next_assembly_date, effective_next_assembly_date, assembly_source,
    original_snapshot, saved_snapshot, summary, metadata
  ) values (
    gen_random_uuid(), v_current.organization_id, v_current.lead_id,
    v_current.simulation_id, v_actor_id, v_current.title,
    v_current.source_suggestion, 'generated', v_current.proposal_number,
    v_current.root_proposal_id, v_current.id, v_current.version + 1,
    v_current.assembly_day_of_month, v_current.suggested_next_assembly_date,
    v_current.effective_next_assembly_date, v_current.assembly_source,
    v_current.original_snapshot, p_saved_snapshot, v_current.summary, v_current.metadata
  ) returning * into v_new;

  insert into public.commercial_proposal_audit_events (
    organization_id, root_proposal_id, proposal_id, related_proposal_id,
    proposal_number, proposal_version, lead_id, simulation_id, event_type,
    metadata, snapshot_hash, correlation_id, created_by
  ) values
  (v_current.organization_id, v_current.root_proposal_id, v_current.id, v_new.id,
   v_current.proposal_number, v_current.version, v_current.lead_id,
   v_current.simulation_id, 'version_superseded',
   jsonb_build_object('previousStatus', v_previous_status, 'status', 'superseded',
     'reason', v_reason), md5(v_current.saved_snapshot::text), v_correlation_id, v_actor_id),
  (v_new.organization_id, v_new.root_proposal_id, v_new.id, v_current.id,
   v_new.proposal_number, v_new.version, v_new.lead_id, v_new.simulation_id,
   'version_created', jsonb_build_object('previousProposalId', v_current.id,
     'status', 'generated', 'reason', v_reason), md5(v_new.saved_snapshot::text),
   v_correlation_id, v_actor_id);

  return jsonb_build_object('previousProposal', to_jsonb(v_current), 'proposal', to_jsonb(v_new));
exception when unique_violation then
  raise exception using errcode = 'P0001', message = 'CP_LINEAGE_INTEGRITY_ERROR';
end;
$$;

create or replace function public.approve_commercial_proposal_transaction(
  p_proposal_id uuid
)
returns public.crm_lead_commercial_proposals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_organization_id uuid;
  v_root_id uuid;
  v_current public.crm_lead_commercial_proposals%rowtype;
begin
  select organization_id, role into v_organization_id, v_actor_role
  from public.profiles where id = v_actor_id and is_active is true;
  if not found or v_actor_role not in ('master', 'admin') then
    raise exception using errcode = 'P0001', message = 'CP_ACTOR_FORBIDDEN';
  end if;
  select root_proposal_id into v_root_id
  from public.crm_lead_commercial_proposals
  where id = p_proposal_id and organization_id = v_organization_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CP_CURRENT_VERSION_NOT_FOUND';
  end if;
  perform 1 from public.crm_lead_commercial_proposals
  where id = v_root_id and organization_id = v_organization_id for update;
  select * into v_current from public.crm_lead_commercial_proposals
  where root_proposal_id = v_root_id and organization_id = v_organization_id
  order by version desc limit 1 for update;
  if v_current.id <> p_proposal_id then
    raise exception using errcode = 'P0001', message = 'CP_VERSION_NOT_CURRENT';
  end if;
  if v_current.status = 'approved' then return v_current; end if;
  if v_current.status not in ('generated', 'presented', 'saved', 'approval_revoked') then
    raise exception using errcode = 'P0001', message = 'CP_VERSION_NOT_APPROVABLE';
  end if;
  if v_current.saved_snapshot is null or jsonb_typeof(v_current.saved_snapshot) <> 'object' then
    raise exception using errcode = 'P0001', message = 'CP_SNAPSHOT_INVALID';
  end if;
  update public.crm_lead_commercial_proposals
  set status = 'approved', approved_at = coalesce(approved_at, now()),
      approved_by = coalesce(approved_by, v_actor_id)
  where id = v_current.id returning * into v_current;
  insert into public.commercial_proposal_audit_events (
    organization_id, root_proposal_id, proposal_id, proposal_number,
    proposal_version, lead_id, simulation_id, event_type, metadata,
    snapshot_hash, correlation_id, created_by
  ) values (
    v_current.organization_id, v_current.root_proposal_id, v_current.id,
    v_current.proposal_number, v_current.version, v_current.lead_id,
    v_current.simulation_id, 'proposal_approved',
    jsonb_build_object('status', 'approved'), md5(v_current.saved_snapshot::text),
    gen_random_uuid(), v_actor_id
  );
  return v_current;
end;
$$;

create or replace function public.revoke_commercial_proposal_approval_transaction(
  p_proposal_version_id uuid,
  p_reason text
)
returns public.crm_lead_commercial_proposals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_organization_id uuid;
  v_root_id uuid;
  v_current public.crm_lead_commercial_proposals%rowtype;
  v_reason text := nullif(btrim(regexp_replace(coalesce(p_reason, ''), '\s+', ' ', 'g')), '');
begin
  select organization_id, role into v_organization_id, v_actor_role
  from public.profiles where id = v_actor_id and is_active is true;
  if not found or v_actor_role not in ('master', 'admin') then
    raise exception using errcode = 'P0001', message = 'CP_ACTOR_FORBIDDEN';
  end if;
  if v_reason is null then
    raise exception using errcode = 'P0001', message = 'CP_REVOCATION_REASON_REQUIRED';
  end if;
  if length(v_reason) > 1000 then
    raise exception using errcode = 'P0001', message = 'CP_INVALID_PAYLOAD';
  end if;
  select root_proposal_id into v_root_id from public.crm_lead_commercial_proposals
  where id = p_proposal_version_id and organization_id = v_organization_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CP_CURRENT_VERSION_NOT_FOUND';
  end if;
  perform 1 from public.crm_lead_commercial_proposals
  where id = v_root_id and organization_id = v_organization_id for update;
  select * into v_current from public.crm_lead_commercial_proposals
  where root_proposal_id = v_root_id and organization_id = v_organization_id
  order by version desc limit 1 for update;
  if v_current.id <> p_proposal_version_id then
    raise exception using errcode = 'P0001', message = 'CP_VERSION_NOT_CURRENT';
  end if;
  if v_current.status = 'approval_revoked' then return v_current; end if;
  if v_current.status <> 'approved' then
    raise exception using errcode = 'P0001', message = 'CP_NOT_APPROVED';
  end if;
  update public.crm_lead_commercial_proposals
  set status = 'approval_revoked', approval_revoked_at = now(),
      approval_revoked_by = v_actor_id, approval_revocation_reason = v_reason
  where id = v_current.id returning * into v_current;
  insert into public.commercial_proposal_audit_events (
    organization_id, root_proposal_id, proposal_id, proposal_number,
    proposal_version, lead_id, simulation_id, event_type, metadata,
    snapshot_hash, correlation_id, created_by
  ) values (
    v_current.organization_id, v_current.root_proposal_id, v_current.id,
    v_current.proposal_number, v_current.version, v_current.lead_id,
    v_current.simulation_id, 'proposal_approval_revoked',
    jsonb_build_object('previousStatus', 'approved', 'status', 'approval_revoked',
      'reason', v_reason), md5(v_current.saved_snapshot::text), gen_random_uuid(), v_actor_id
  );
  return v_current;
end;
$$;

revoke all on function public.revise_commercial_proposal_transaction(uuid, uuid, jsonb, text) from public, anon;
revoke all on function public.approve_commercial_proposal_transaction(uuid) from public, anon;
revoke all on function public.revoke_commercial_proposal_approval_transaction(uuid, text) from public, anon;
grant execute on function public.revise_commercial_proposal_transaction(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.approve_commercial_proposal_transaction(uuid) to authenticated;
grant execute on function public.revoke_commercial_proposal_approval_transaction(uuid, text) to authenticated;
