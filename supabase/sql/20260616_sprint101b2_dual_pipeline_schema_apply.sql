-- EVOLV Sprint 101B.2 - Dual Pipeline Schema Apply
-- STATUS: APPLY MANUAL FUTURO. NAO EXECUTAR AUTOMATICAMENTE NESTA SPRINT.
--
-- Objetivo:
-- - preservar crm_leads atual;
-- - adicionar colunas de snapshot/dominio;
-- - criar crm_stage_events com occurred_at;
-- - criar crm_green_flags com due_at e resolution_reason;
-- - manter novas tabelas protegidas por RLS desde o nascimento;
-- - nao liberar anon;
-- - nao criar policies amplas;
-- - nao alterar dados existentes.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- BLOCO 1 - Snapshot evolutivo em crm_leads
-- ============================================================================

alter table public.crm_leads
  add column if not exists pipeline_domain text,
  add column if not exists stage_domain text,
  add column if not exists last_stage_changed_at timestamptz,
  add column if not exists first_invoice_paid boolean not null default false,
  add column if not exists first_invoice_paid_at timestamptz,
  add column if not exists sales_closed_at timestamptz;

comment on column public.crm_leads.pipeline_domain is
  'Dual Pipeline domain snapshot. Keeps legacy pipeline untouched for compatibility.';

comment on column public.crm_leads.stage_domain is
  'Dual Pipeline stage snapshot. Keeps legacy etapa untouched for compatibility.';

comment on column public.crm_leads.last_stage_changed_at is
  'Timestamp of the last relevant domain stage transition.';

comment on column public.crm_leads.first_invoice_paid is
  'Future revenue recognition flag. Must only turn true after the first invoice is actually paid.';

comment on column public.crm_leads.first_invoice_paid_at is
  'Timestamp when the first paid invoice is confirmed.';

comment on column public.crm_leads.sales_closed_at is
  'Timestamp for the future formal commercial closing event, distinct from documentation progress.';

create index if not exists crm_leads_pipeline_domain_idx
  on public.crm_leads(pipeline_domain);

create index if not exists crm_leads_stage_domain_idx
  on public.crm_leads(stage_domain);

create index if not exists crm_leads_last_stage_changed_at_idx
  on public.crm_leads(last_stage_changed_at);

create index if not exists crm_leads_first_invoice_paid_idx
  on public.crm_leads(first_invoice_paid);

create index if not exists crm_leads_sales_closed_at_idx
  on public.crm_leads(sales_closed_at);

-- ============================================================================
-- BLOCO 2 - Historico oficial de transicoes
-- ============================================================================

create table if not exists public.crm_stage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  actor_profile_id uuid null references public.profiles(id) on delete set null,
  event_type text not null,
  from_pipeline text null,
  from_stage text null,
  to_pipeline text null,
  to_stage text null,
  note text null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.crm_stage_events is
  'Official audit trail for stage transitions, No Show events, Green Flag lifecycle actions and future commercial workflow events.';

comment on column public.crm_stage_events.occurred_at is
  'Business occurrence timestamp of the event. Distinct from created_at when future imports/backfills are needed.';

create index if not exists crm_stage_events_organization_id_idx
  on public.crm_stage_events(organization_id);

create index if not exists crm_stage_events_lead_id_idx
  on public.crm_stage_events(lead_id);

create index if not exists crm_stage_events_actor_profile_id_idx
  on public.crm_stage_events(actor_profile_id);

create index if not exists crm_stage_events_event_type_idx
  on public.crm_stage_events(event_type);

create index if not exists crm_stage_events_occurred_at_idx
  on public.crm_stage_events(occurred_at desc);

create index if not exists crm_stage_events_created_at_idx
  on public.crm_stage_events(created_at desc);

alter table public.crm_stage_events enable row level security;

-- Nenhuma policy e criada nesta sprint.
-- A Sprint 101B.3 deve definir policies organization-scoped para authenticated.

-- ============================================================================
-- BLOCO 3 - Ciclos oficiais de Green Flag
-- ============================================================================

create table if not exists public.crm_green_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  stage_event_id uuid null references public.crm_stage_events(id) on delete set null,
  created_by_profile_id uuid null references public.profiles(id) on delete set null,
  assigned_profile_id uuid null references public.profiles(id) on delete set null,
  resolved_by_profile_id uuid null references public.profiles(id) on delete set null,
  status text not null,
  due_at timestamptz not null,
  note text null,
  context text null,
  resolution_reason text null,
  resolved_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_green_flags is
  'Official Green Flag cycles with due_at, context, resolution and future deadline-engine inputs.';

comment on column public.crm_green_flags.due_at is
  'Exact planned timestamp for commercial follow-up, replacing the broader due_date proposal from 101B.1.';

comment on column public.crm_green_flags.resolution_reason is
  'Optional human-readable reason for resolving, rescheduling, losing or converting the Green Flag cycle.';

create index if not exists crm_green_flags_organization_id_idx
  on public.crm_green_flags(organization_id);

create index if not exists crm_green_flags_lead_id_idx
  on public.crm_green_flags(lead_id);

create index if not exists crm_green_flags_stage_event_id_idx
  on public.crm_green_flags(stage_event_id);

create index if not exists crm_green_flags_assigned_profile_id_idx
  on public.crm_green_flags(assigned_profile_id);

create index if not exists crm_green_flags_status_idx
  on public.crm_green_flags(status);

create index if not exists crm_green_flags_due_at_idx
  on public.crm_green_flags(due_at);

create unique index if not exists crm_green_flags_one_open_cycle_per_lead_idx
  on public.crm_green_flags(lead_id)
  where status in ('active', 'rescheduled');

drop trigger if exists crm_green_flags_set_updated_at on public.crm_green_flags;
create trigger crm_green_flags_set_updated_at
before update on public.crm_green_flags
for each row
execute function public.set_updated_at();

alter table public.crm_green_flags enable row level security;

-- Nenhuma policy e criada nesta sprint.
-- A Sprint 101B.3 deve definir policies organization-scoped e sem acesso anon.

-- ============================================================================
-- BLOCO 4 - Observacoes finais
-- ============================================================================
-- - Este script e aditivo.
-- - Este script nao atualiza nenhuma linha existente.
-- - Este script nao mexe em pipeline/etapa atuais.
-- - Este script nao libera anon.
-- - Este script nao cria using(true) ou with check(true).
