-- EVOLV Sprint 103A.30
-- Lead-centric simulation schema apply package.
--
-- Manual execution only. Codex must not execute this file.
--
-- Scope:
-- - Create public.crm_lead_simulations.
-- - Create crm_lead_simulations-specific indexes, trigger and RLS policies.
-- - Grant authenticated access governed by RLS.
-- - Do not grant anon access.
-- - Do not create delete policy.
--
-- Explicit non-scope:
-- - Do not alter public.crm_leads.
-- - Do not alter public.crm_tasks.
-- - Do not alter public.crm_lead_notes.
-- - Do not alter public.profiles.
-- - Do not alter public.organizations.
-- - Do not backfill or seed data.

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

create table if not exists public.crm_lead_simulations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  lead_id uuid not null references public.crm_leads(id) on delete restrict,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  simulation_type text not null,
  title text not null,
  status text not null default 'draft',
  source text not null default 'api',
  technical_input jsonb not null,
  calculation_snapshot jsonb not null,
  presentation_snapshot jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  presented_at timestamptz null,
  presented_by uuid null references public.profiles(id) on delete set null,
  proposal_generated_at timestamptz null,
  proposal_generated_by uuid null references public.profiles(id) on delete set null,
  pdf_generated_at timestamptz null,
  pdf_generated_by uuid null references public.profiles(id) on delete set null,
  pdf_sent_at timestamptz null,
  pdf_sent_by uuid null references public.profiles(id) on delete set null,
  archived_at timestamptz null,
  archived_by uuid null references public.profiles(id) on delete set null,
  total_credit numeric null,
  updated_credit numeric null,
  commercial_credit numeric null,
  monthly_payment numeric null,
  post_contemplation_payment numeric null,
  contemplation_month integer null,
  quota_count integer null,
  incc_rate numeric null,
  estimated_roi numeric null,
  estimated_gain numeric null,
  estimated_sale_value numeric null,
  constraint crm_lead_simulations_simulation_type_check
    check (simulation_type in ('commercial', 'multi_cotas')),
  constraint crm_lead_simulations_status_check
    check (status in (
      'draft',
      'presented',
      'proposal_generated',
      'pdf_generated',
      'pdf_sent',
      'archived'
    )),
  constraint crm_lead_simulations_source_check
    check (source in (
      'lead_detail',
      'simulator',
      'multi_cotas',
      'api'
    )),
  constraint crm_lead_simulations_title_not_blank_check
    check (btrim(title) <> ''),
  constraint crm_lead_simulations_jsonb_snapshot_check
    check (
      jsonb_typeof(technical_input) = 'object'
      and jsonb_typeof(calculation_snapshot) = 'object'
      and jsonb_typeof(presentation_snapshot) = 'object'
      and jsonb_typeof(summary) = 'object'
      and technical_input <> '{}'::jsonb
      and calculation_snapshot <> '{}'::jsonb
      and presentation_snapshot <> '{}'::jsonb
    ),
  constraint crm_lead_simulations_money_non_negative_check
    check (
      (total_credit is null or total_credit >= 0)
      and (updated_credit is null or updated_credit >= 0)
      and (commercial_credit is null or commercial_credit >= 0)
      and (monthly_payment is null or monthly_payment >= 0)
      and (post_contemplation_payment is null or post_contemplation_payment >= 0)
      and (estimated_gain is null or estimated_gain >= 0)
      and (estimated_sale_value is null or estimated_sale_value >= 0)
    ),
  constraint crm_lead_simulations_percent_non_negative_check
    check (
      (incc_rate is null or incc_rate >= 0)
      and (estimated_roi is null or estimated_roi >= 0)
    ),
  constraint crm_lead_simulations_quota_count_check
    check (quota_count is null or quota_count >= 1),
  constraint crm_lead_simulations_contemplation_month_check
    check (contemplation_month is null or contemplation_month >= 1),
  constraint crm_lead_simulations_archived_fields_check
    check (
      status <> 'archived'
      or (
        archived_at is not null
        and archived_by is not null
      )
    ),
  constraint crm_lead_simulations_presented_fields_check
    check (presented_at is null or presented_by is not null),
  constraint crm_lead_simulations_proposal_fields_check
    check (
      proposal_generated_at is null
      or proposal_generated_by is not null
    ),
  constraint crm_lead_simulations_pdf_generated_fields_check
    check (
      pdf_generated_at is null
      or pdf_generated_by is not null
    ),
  constraint crm_lead_simulations_pdf_sent_fields_check
    check (
      pdf_sent_at is null
      or (
        pdf_sent_by is not null
        and pdf_generated_at is not null
      )
    ),
  constraint crm_lead_simulations_timestamp_order_check
    check (
      updated_at >= created_at
      and (presented_at is null or presented_at >= created_at)
      and (proposal_generated_at is null or proposal_generated_at >= created_at)
      and (pdf_generated_at is null or pdf_generated_at >= created_at)
      and (pdf_sent_at is null or pdf_sent_at >= created_at)
      and (archived_at is null or archived_at >= created_at)
    )
);

comment on table public.crm_lead_simulations is
  'Lead-centric EVOLV simulations. Every commercial or multi-cotas simulation belongs to one lead.';

comment on column public.crm_lead_simulations.technical_input is
  'JSONB snapshot of the exact technical parameters sent to the simulation engine.';

comment on column public.crm_lead_simulations.calculation_snapshot is
  'JSONB snapshot of calculated engine results at creation time.';

comment on column public.crm_lead_simulations.presentation_snapshot is
  'JSONB snapshot of the commercial presentation values shown to the user/client.';

create index if not exists crm_lead_simulations_organization_id_idx
  on public.crm_lead_simulations (organization_id);

create index if not exists crm_lead_simulations_lead_id_idx
  on public.crm_lead_simulations (lead_id);

create index if not exists crm_lead_simulations_created_by_idx
  on public.crm_lead_simulations (created_by);

create index if not exists crm_lead_simulations_created_at_idx
  on public.crm_lead_simulations (created_at desc);

create index if not exists crm_lead_simulations_type_idx
  on public.crm_lead_simulations (simulation_type);

create index if not exists crm_lead_simulations_status_idx
  on public.crm_lead_simulations (status);

create index if not exists crm_lead_simulations_org_lead_created_at_idx
  on public.crm_lead_simulations (organization_id, lead_id, created_at desc);

create index if not exists crm_lead_simulations_org_type_created_at_idx
  on public.crm_lead_simulations (organization_id, simulation_type, created_at desc);

create index if not exists crm_lead_simulations_org_status_created_at_idx
  on public.crm_lead_simulations (organization_id, status, created_at desc);

create index if not exists crm_lead_simulations_presented_at_idx
  on public.crm_lead_simulations (presented_at desc)
  where presented_at is not null;

create index if not exists crm_lead_simulations_pdf_sent_at_idx
  on public.crm_lead_simulations (pdf_sent_at desc)
  where pdf_sent_at is not null;

drop trigger if exists crm_lead_simulations_set_updated_at
  on public.crm_lead_simulations;

create trigger crm_lead_simulations_set_updated_at
before update on public.crm_lead_simulations
for each row
execute function public.set_updated_at();

alter table public.crm_lead_simulations enable row level security;

revoke all on table public.crm_lead_simulations from anon;
revoke all on table public.crm_lead_simulations from public;

grant select, insert, update on table public.crm_lead_simulations to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_simulations'
      and policyname = 'crm_lead_simulations authenticated select same organization'
  ) then
    create policy "crm_lead_simulations authenticated select same organization"
    on public.crm_lead_simulations
    for select
    to authenticated
    using (
      organization_id = public.evolv_current_organization_id()
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
      and tablename = 'crm_lead_simulations'
      and policyname = 'crm_lead_simulations authenticated insert same organization'
  ) then
    create policy "crm_lead_simulations authenticated insert same organization"
    on public.crm_lead_simulations
    for insert
    to authenticated
    with check (
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
      and tablename = 'crm_lead_simulations'
      and policyname = 'crm_lead_simulations authenticated update same organization'
  ) then
    create policy "crm_lead_simulations authenticated update same organization"
    on public.crm_lead_simulations
    for update
    to authenticated
    using (
      organization_id = public.evolv_current_organization_id()
      and exists (
        select 1
        from public.crm_leads lead
        where lead.id = lead_id
          and lead.organization_id = public.evolv_current_organization_id()
      )
    )
    with check (
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
