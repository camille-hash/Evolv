-- EVOLV SIM-003A - Commercial Proposal persistence.
--
-- Scope:
-- - Create public.crm_lead_commercial_proposals.
-- - Link every proposal to a CRM lead and organization.
-- - Preserve original and saved proposal snapshots.
-- - Enable authenticated, organization-scoped RLS.

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

  if to_regclass('public.organizations') is null then
    raise exception 'Missing public.organizations';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception 'Missing public.profiles';
  end if;

  if to_regclass('public.crm_leads') is null then
    raise exception 'Missing public.crm_leads';
  end if;
end
$$;

create table if not exists public.crm_lead_commercial_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  lead_id uuid not null references public.crm_leads(id) on delete restrict,
  created_by uuid null references public.profiles(id) on delete set null,
  title text not null,
  source_suggestion text not null,
  status text not null default 'saved',
  original_snapshot jsonb not null default '{}'::jsonb,
  saved_snapshot jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_lead_commercial_proposals_title_not_blank_check
    check (btrim(title) <> ''),
  constraint crm_lead_commercial_proposals_source_suggestion_check
    check (source_suggestion in (
      'conservative',
      'recommended',
      'patrimonial'
    )),
  constraint crm_lead_commercial_proposals_status_check
    check (status in ('saved')),
  constraint crm_lead_commercial_proposals_original_snapshot_object_check
    check (jsonb_typeof(original_snapshot) = 'object'),
  constraint crm_lead_commercial_proposals_saved_snapshot_object_check
    check (jsonb_typeof(saved_snapshot) = 'object'),
  constraint crm_lead_commercial_proposals_summary_object_check
    check (jsonb_typeof(summary) = 'object'),
  constraint crm_lead_commercial_proposals_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.crm_lead_commercial_proposals is
  'SIM-003A Commercial Proposals: immutable saved proposal snapshots linked to CRM leads.';

create index if not exists crm_lead_commercial_proposals_organization_id_idx
  on public.crm_lead_commercial_proposals (organization_id);

create index if not exists crm_lead_commercial_proposals_lead_id_idx
  on public.crm_lead_commercial_proposals (lead_id);

create index if not exists crm_lead_commercial_proposals_source_suggestion_idx
  on public.crm_lead_commercial_proposals (source_suggestion);

create index if not exists crm_lead_commercial_proposals_org_lead_created_at_idx
  on public.crm_lead_commercial_proposals (
    organization_id,
    lead_id,
    created_at desc
  );

drop trigger if exists crm_lead_commercial_proposals_set_updated_at
  on public.crm_lead_commercial_proposals;

create trigger crm_lead_commercial_proposals_set_updated_at
before update on public.crm_lead_commercial_proposals
for each row
execute function public.set_updated_at();

alter table public.crm_lead_commercial_proposals enable row level security;

revoke all on table public.crm_lead_commercial_proposals from anon;
revoke all on table public.crm_lead_commercial_proposals from public;

grant select, insert on table public.crm_lead_commercial_proposals to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_commercial_proposals'
      and policyname = 'crm_lead_commercial_proposals authenticated read same organization'
  ) then
    create policy "crm_lead_commercial_proposals authenticated read same organization"
    on public.crm_lead_commercial_proposals
    for select
    to authenticated
    using (
      organization_id = public.evolv_current_organization_id()
      and exists (
        select 1
        from public.crm_leads lead
        where lead.id = lead_id
          and lead.organization_id = public.evolv_current_organization_id()
      )
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_commercial_proposals'
      and policyname = 'crm_lead_commercial_proposals authenticated insert same organization'
  ) then
    create policy "crm_lead_commercial_proposals authenticated insert same organization"
    on public.crm_lead_commercial_proposals
    for insert
    to authenticated
    with check (
      organization_id = public.evolv_current_organization_id()
      and status = 'saved'
      and exists (
        select 1
        from public.crm_leads lead
        where lead.id = lead_id
          and lead.organization_id = public.evolv_current_organization_id()
      )
    );
  end if;
end
$$;
