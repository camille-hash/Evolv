-- PROP-001 / CONTRACT-024A - Formal Commercial Proposal aggregate.
--
-- Scope:
-- - Evolve SIM-003A saved proposals into a formal, versioned aggregate.
-- - Preserve legacy saved proposals.
-- - Add audit trail, approval transaction and contract source references.

do $$
begin
  if to_regclass('public.crm_lead_commercial_proposals') is null then
    raise exception 'Missing public.crm_lead_commercial_proposals';
  end if;

  if to_regclass('public.crm_lead_simulations') is null then
    raise exception 'Missing public.crm_lead_simulations';
  end if;

  if to_regclass('public.contracts') is null then
    raise exception 'Missing public.contracts';
  end if;

  if to_regprocedure('public.evolv_current_organization_id()') is null then
    raise exception 'Missing public.evolv_current_organization_id()';
  end if;
end
$$;

alter table public.crm_lead_commercial_proposals
  add column if not exists simulation_id uuid null
    references public.crm_lead_simulations(id) on delete set null,
  add column if not exists proposal_number text,
  add column if not exists root_proposal_id uuid null
    references public.crm_lead_commercial_proposals(id) on delete set null,
  add column if not exists previous_version_id uuid null
    references public.crm_lead_commercial_proposals(id) on delete set null,
  add column if not exists version integer not null default 1,
  add column if not exists presented_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid null
    references public.profiles(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid null
    references public.profiles(id) on delete set null,
  add column if not exists expired_at timestamptz,
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by uuid null
    references public.profiles(id) on delete set null,
  add column if not exists assembly_day_of_month integer,
  add column if not exists suggested_next_assembly_date date,
  add column if not exists effective_next_assembly_date date,
  add column if not exists assembly_source text;

update public.crm_lead_commercial_proposals
set proposal_number = 'LEGACY-' || id::text
where proposal_number is null;

alter table public.crm_lead_commercial_proposals
  alter column proposal_number set not null;

alter table public.crm_lead_commercial_proposals
  drop constraint if exists crm_lead_commercial_proposals_status_check;

alter table public.crm_lead_commercial_proposals
  add constraint crm_lead_commercial_proposals_status_check
  check (status in (
    'draft',
    'generated',
    'presented',
    'approved',
    'rejected',
    'expired',
    'superseded',
    'saved'
  ));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crm_lead_commercial_proposals_version_positive_check'
      and conrelid = 'public.crm_lead_commercial_proposals'::regclass
  ) then
    alter table public.crm_lead_commercial_proposals
      add constraint crm_lead_commercial_proposals_version_positive_check
      check (version > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crm_lead_commercial_proposals_assembly_day_check'
      and conrelid = 'public.crm_lead_commercial_proposals'::regclass
  ) then
    alter table public.crm_lead_commercial_proposals
      add constraint crm_lead_commercial_proposals_assembly_day_check
      check (
        assembly_day_of_month is null
        or assembly_day_of_month between 1 and 31
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crm_lead_commercial_proposals_assembly_source_check'
      and conrelid = 'public.crm_lead_commercial_proposals'::regclass
  ) then
    alter table public.crm_lead_commercial_proposals
      add constraint crm_lead_commercial_proposals_assembly_source_check
      check (
        assembly_source is null
        or assembly_source in ('calculated', 'manual')
      );
  end if;
end
$$;

create index if not exists crm_lead_commercial_proposals_simulation_id_idx
  on public.crm_lead_commercial_proposals (simulation_id);

create index if not exists crm_lead_commercial_proposals_number_idx
  on public.crm_lead_commercial_proposals (organization_id, proposal_number);

create index if not exists crm_lead_commercial_proposals_lineage_idx
  on public.crm_lead_commercial_proposals (
    organization_id,
    proposal_number,
    version desc
  );

create unique index if not exists crm_lead_commercial_proposals_lineage_version_uidx
  on public.crm_lead_commercial_proposals (
    organization_id,
    proposal_number,
    version
  );

create unique index if not exists crm_lead_commercial_proposals_one_approved_uidx
  on public.crm_lead_commercial_proposals (organization_id, proposal_number)
  where status = 'approved';

create table if not exists public.commercial_proposal_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  proposal_id uuid not null references public.crm_lead_commercial_proposals(id) on delete cascade,
  proposal_number text not null,
  proposal_version integer not null,
  lead_id uuid not null references public.crm_leads(id) on delete restrict,
  simulation_id uuid null references public.crm_lead_simulations(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint commercial_proposal_audit_events_version_positive_check
    check (proposal_version > 0),
  constraint commercial_proposal_audit_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint commercial_proposal_audit_events_type_check
    check (event_type in (
      'created',
      'version_created',
      'presented',
      'approved',
      'rejected',
      'expired',
      'superseded'
    ))
);

create index if not exists commercial_proposal_audit_events_proposal_idx
  on public.commercial_proposal_audit_events (proposal_id, created_at desc);

alter table public.commercial_proposal_audit_events enable row level security;

revoke all on table public.commercial_proposal_audit_events from anon;
revoke all on table public.commercial_proposal_audit_events from public;
grant select, insert on table public.commercial_proposal_audit_events to authenticated;
grant update on table public.crm_lead_commercial_proposals to authenticated;

drop policy if exists "crm_lead_commercial_proposals authenticated insert same organization"
  on public.crm_lead_commercial_proposals;

create policy "crm_lead_commercial_proposals authenticated insert same organization"
on public.crm_lead_commercial_proposals
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and status in ('draft', 'generated', 'saved')
  and exists (
    select 1
    from public.crm_leads lead
    where lead.id = lead_id
      and lead.organization_id = public.evolv_current_organization_id()
  )
  and (
    simulation_id is null
    or exists (
      select 1
      from public.crm_lead_simulations simulation
      where simulation.id = simulation_id
        and simulation.lead_id = lead_id
        and simulation.organization_id = public.evolv_current_organization_id()
    )
  )
);

drop policy if exists "crm_lead_commercial_proposals authenticated update same organization"
  on public.crm_lead_commercial_proposals;

create policy "crm_lead_commercial_proposals authenticated update same organization"
on public.crm_lead_commercial_proposals
for update
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
)
with check (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "commercial_proposal_audit_events authenticated read same organization"
  on public.commercial_proposal_audit_events;

create policy "commercial_proposal_audit_events authenticated read same organization"
on public.commercial_proposal_audit_events
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "commercial_proposal_audit_events authenticated insert same organization"
  on public.commercial_proposal_audit_events;

create policy "commercial_proposal_audit_events authenticated insert same organization"
on public.commercial_proposal_audit_events
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.crm_lead_commercial_proposals proposal
    where proposal.id = proposal_id
      and proposal.organization_id = public.evolv_current_organization_id()
      and proposal.lead_id = lead_id
  )
);

alter table public.contracts
  add column if not exists source_proposal_id uuid null
    references public.crm_lead_commercial_proposals(id) on delete set null,
  add column if not exists source_proposal_version integer,
  add column if not exists proposal_snapshot jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contracts_proposal_snapshot_object_check'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_proposal_snapshot_object_check
      check (
        proposal_snapshot is null
        or jsonb_typeof(proposal_snapshot) = 'object'
      );
  end if;
end
$$;

create index if not exists contracts_source_proposal_id_idx
  on public.contracts (source_proposal_id);

create or replace function public.prevent_approved_commercial_proposal_rewrite()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('approved', 'rejected', 'expired', 'superseded') then
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

drop trigger if exists crm_lead_commercial_proposals_immutability
  on public.crm_lead_commercial_proposals;

create trigger crm_lead_commercial_proposals_immutability
before update on public.crm_lead_commercial_proposals
for each row
execute function public.prevent_approved_commercial_proposal_rewrite();

create or replace function public.approve_commercial_proposal_transaction(
  p_proposal_id uuid,
  p_organization_id uuid,
  p_approved_by uuid
)
returns public.crm_lead_commercial_proposals
language plpgsql
as $$
declare
  v_proposal public.crm_lead_commercial_proposals%rowtype;
  v_existing_approved_id uuid;
begin
  select *
  into v_proposal
  from public.crm_lead_commercial_proposals
  where id = p_proposal_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Commercial proposal not found';
  end if;

  if v_proposal.status not in ('generated', 'presented', 'saved') then
    raise exception 'Commercial proposal cannot be approved from status %',
      v_proposal.status;
  end if;

  if v_proposal.saved_snapshot is null
    or jsonb_typeof(v_proposal.saved_snapshot) <> 'object' then
    raise exception 'Commercial proposal approved snapshot is invalid';
  end if;

  select id
  into v_existing_approved_id
  from public.crm_lead_commercial_proposals
  where organization_id = p_organization_id
    and proposal_number = v_proposal.proposal_number
    and status = 'approved'
    and id <> p_proposal_id
  limit 1
  for update;

  if v_existing_approved_id is not null then
    raise exception 'Commercial proposal already has an approved version';
  end if;

  update public.crm_lead_commercial_proposals
  set status = 'approved',
      approved_at = now(),
      approved_by = p_approved_by
  where id = p_proposal_id
    and organization_id = p_organization_id
  returning *
  into v_proposal;

  insert into public.commercial_proposal_audit_events (
    organization_id,
    proposal_id,
    proposal_number,
    proposal_version,
    lead_id,
    simulation_id,
    event_type,
    metadata,
    created_by
  )
  values (
    v_proposal.organization_id,
    v_proposal.id,
    v_proposal.proposal_number,
    v_proposal.version,
    v_proposal.lead_id,
    v_proposal.simulation_id,
    'approved',
    jsonb_build_object('status', 'approved'),
    p_approved_by
  );

  return v_proposal;
end;
$$;
