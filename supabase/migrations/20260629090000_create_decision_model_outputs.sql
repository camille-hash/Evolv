-- EVOLV Decision Intelligence - Decision Model Outputs.
--
-- Scope:
-- - Create public.decision_model_outputs.
-- - Store versioned, auditable Decision Model outputs.
-- - Enable authenticated, organization-scoped RLS.
-- - Do not alter existing CRM, Timeline, simulations, tasks, dashboard or PDF tables.

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

  if to_regclass('public.crm_leads') is null then
    raise exception 'Missing public.crm_leads';
  end if;
end
$$;

create table if not exists public.decision_model_outputs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  lead_id uuid not null references public.crm_leads(id) on delete restrict,
  model_id text not null,
  model_name text not null,
  model_version text not null,
  decision text not null,
  recommended_action text not null,
  attention_score numeric null,
  confidence text not null,
  calibration_status text not null,
  rationale jsonb not null,
  signals jsonb not null,
  evidence_trace jsonb not null,
  score_contributors jsonb not null,
  output jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decision_model_outputs_model_id_not_blank_check
    check (btrim(model_id) <> ''),
  constraint decision_model_outputs_model_name_not_blank_check
    check (btrim(model_name) <> ''),
  constraint decision_model_outputs_model_version_not_blank_check
    check (btrim(model_version) <> ''),
  constraint decision_model_outputs_decision_not_blank_check
    check (btrim(decision) <> ''),
  constraint decision_model_outputs_confidence_check
    check (confidence in (
      'HIGH',
      'MEDIUM',
      'LOW',
      'UNKNOWN'
    )),
  constraint decision_model_outputs_calibration_status_check
    check (calibration_status in (
      'INITIAL_DEFAULTS',
      'CALIBRATED'
    )),
  constraint decision_model_outputs_attention_score_check
    check (attention_score is null or attention_score >= -1000000),
  constraint decision_model_outputs_jsonb_shape_check
    check (
      jsonb_typeof(rationale) = 'object'
      and jsonb_typeof(signals) = 'array'
      and jsonb_typeof(evidence_trace) = 'array'
      and jsonb_typeof(score_contributors) = 'array'
      and jsonb_typeof(output) = 'object'
      and jsonb_typeof(metadata) = 'object'
    )
);

comment on table public.decision_model_outputs is
  'Versioned and auditable Decision Model outputs linked to CRM leads.';

create index if not exists decision_model_outputs_organization_id_idx
  on public.decision_model_outputs (organization_id);

create index if not exists decision_model_outputs_lead_id_idx
  on public.decision_model_outputs (lead_id);

create index if not exists decision_model_outputs_model_id_idx
  on public.decision_model_outputs (model_id);

create index if not exists decision_model_outputs_model_version_idx
  on public.decision_model_outputs (model_version);

create index if not exists decision_model_outputs_generated_at_idx
  on public.decision_model_outputs (generated_at desc);

create index if not exists decision_model_outputs_org_lead_model_version_generated_idx
  on public.decision_model_outputs (
    organization_id,
    lead_id,
    model_id,
    model_version,
    generated_at desc
  );

drop trigger if exists decision_model_outputs_set_updated_at
  on public.decision_model_outputs;

create trigger decision_model_outputs_set_updated_at
before update on public.decision_model_outputs
for each row
execute function public.set_updated_at();

alter table public.decision_model_outputs enable row level security;

revoke all on table public.decision_model_outputs from anon;
revoke all on table public.decision_model_outputs from public;

grant select, insert on table public.decision_model_outputs to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'decision_model_outputs'
      and policyname = 'decision_model_outputs authenticated read same organization'
  ) then
    create policy "decision_model_outputs authenticated read same organization"
    on public.decision_model_outputs
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
      and tablename = 'decision_model_outputs'
      and policyname = 'decision_model_outputs authenticated insert same organization'
  ) then
    create policy "decision_model_outputs authenticated insert same organization"
    on public.decision_model_outputs
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
