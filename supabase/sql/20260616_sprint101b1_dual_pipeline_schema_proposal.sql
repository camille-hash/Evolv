-- EVOLV Sprint 101B.1 - Dual Pipeline Schema Proposal
-- STATUS: PROPOSTA FUTURA. NAO EXECUTAR NESTA SPRINT.
--
-- Objetivo:
-- - preservar compatibilidade com crm_leads atual;
-- - adicionar snapshot minimo de dominio em crm_leads;
-- - criar tabela auditavel de eventos de etapa;
-- - criar tabela de ciclos Green Flag para futuras retomadas e deadlines;
-- - nao alterar dados existentes;
-- - nao desabilitar RLS;
-- - nao criar policy anon;
-- - nao abrir acesso amplo.

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

-- 1) Snapshot minimo em crm_leads.
-- Mantem pipeline/etapa atuais intactos e adiciona apenas colunas de dominio
-- e revenue recognition futura.
alter table public.crm_leads
  add column if not exists pipeline_domain text,
  add column if not exists stage_domain text,
  add column if not exists last_stage_changed_at timestamptz,
  add column if not exists first_invoice_paid boolean not null default false,
  add column if not exists first_invoice_paid_at timestamptz,
  add column if not exists sales_closed_at timestamptz;

comment on column public.crm_leads.pipeline_domain is
  'Proposed domain pipeline snapshot for future Dual Pipeline evolution. Keeps current pipeline column untouched for compatibility.';

comment on column public.crm_leads.stage_domain is
  'Proposed domain stage snapshot for future Dual Pipeline evolution. Keeps current etapa column untouched for compatibility.';

comment on column public.crm_leads.last_stage_changed_at is
  'Proposed timestamp of the latest domain stage transition.';

comment on column public.crm_leads.first_invoice_paid is
  'Proposed revenue-recognition marker. True only after the first invoice is effectively paid.';

comment on column public.crm_leads.first_invoice_paid_at is
  'Proposed timestamp for the first paid invoice confirmation.';

comment on column public.crm_leads.sales_closed_at is
  'Proposed sales-closing timestamp separated from documentation progress.';

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

-- 2) Tabela oficial de eventos de etapa.
-- Substitui conceitualmente o historico local/front-end e supera as limitacoes
-- do legado crm_stage_changes que so guardava etapa_anterior/etapa_nova.
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
  created_at timestamptz not null default now()
);

comment on table public.crm_stage_events is
  'Proposed audit trail for stage/pipeline transitions, Green Flag actions, No Show events and future workflow events.';

comment on column public.crm_stage_events.event_type is
  'Suggested values: manual_move, green_flag_created, green_flag_rescheduled, no_show, meeting_scheduled, lost, recovered.';

create index if not exists crm_stage_events_organization_id_idx
  on public.crm_stage_events(organization_id);

create index if not exists crm_stage_events_lead_id_idx
  on public.crm_stage_events(lead_id);

create index if not exists crm_stage_events_actor_profile_id_idx
  on public.crm_stage_events(actor_profile_id);

create index if not exists crm_stage_events_event_type_idx
  on public.crm_stage_events(event_type);

create index if not exists crm_stage_events_created_at_idx
  on public.crm_stage_events(created_at desc);

alter table public.crm_stage_events enable row level security;

-- Policies intentionally NOT created in this proposal script.
-- Future apply sprint must define organization-scoped authenticated policies.

-- 3) Tabela oficial de ciclos Green Flag.
-- Cada ciclo de retomada deve viver aqui, evitando poluir crm_leads com campos
-- repetitivos e preservando historico de remarcacoes e resolucoes.
create table if not exists public.crm_green_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  stage_event_id uuid null references public.crm_stage_events(id) on delete set null,
  created_by_profile_id uuid null references public.profiles(id) on delete set null,
  assigned_profile_id uuid null references public.profiles(id) on delete set null,
  resolved_by_profile_id uuid null references public.profiles(id) on delete set null,
  status text not null,
  due_date date not null,
  note text null,
  context text null,
  resolved_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_green_flags is
  'Proposed source of truth for Green Flag cycles, due dates, context and future deadline engine inputs.';

comment on column public.crm_green_flags.status is
  'Suggested values: active, rescheduled, meeting_scheduled, lost, resolved, expired.';

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

create index if not exists crm_green_flags_due_date_idx
  on public.crm_green_flags(due_date);

create unique index if not exists crm_green_flags_one_open_cycle_per_lead_idx
  on public.crm_green_flags(lead_id)
  where status in ('active', 'rescheduled');

drop trigger if exists crm_green_flags_set_updated_at on public.crm_green_flags;
create trigger crm_green_flags_set_updated_at
before update on public.crm_green_flags
for each row
execute function public.set_updated_at();

alter table public.crm_green_flags enable row level security;

-- Policies intentionally NOT created in this proposal script.
-- Future apply sprint must define organization-scoped authenticated policies.

-- 4) Notas de compatibilidade:
-- - pipeline e etapa atuais permanecem como contrato do app atual;
-- - pipeline_domain/stage_domain entram como snapshot evolutivo;
-- - Green Flag detalhado sai de crm_leads e vai para crm_green_flags;
-- - Revenue recognition futura usa first_invoice_paid / first_invoice_paid_at / sales_closed_at.
