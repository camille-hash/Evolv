-- EVOLV Sprint 69 - Shared CRM schema foundation.
-- This migration only prepares Supabase/Postgres tables for future CRM migration.
-- The application remains 100% localStorage in this sprint.

create extension if not exists "pgcrypto";

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  nome text,
  telefone text,
  email text,
  pais text,
  origem text,
  consultor text,
  valor_pretendido numeric,
  observacoes text,
  pipeline text,
  etapa text,
  tags text[],
  produto_interesse text,
  temperatura text,
  status text,
  proxima_acao text,
  data_proxima_acao date,
  closed_at timestamptz,
  titulo_oportunidade text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_leads is
  'Future shared CRM opportunities migrated from localStorage key evolv.crm.v1.';

create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.crm_leads(id) on delete cascade,
  conteudo text,
  created_at timestamptz not null default now()
);

comment on table public.crm_notes is
  'Future CRM lead notes migrated from localStorage key evolv.crm.notes.v1.';

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.crm_leads(id) on delete cascade,
  descricao text,
  created_at timestamptz not null default now()
);

comment on table public.crm_activities is
  'Future CRM lead activities migrated from localStorage key evolv.crm.activities.v1.';

create table if not exists public.crm_stage_changes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.crm_leads(id) on delete cascade,
  etapa_anterior text,
  etapa_nova text,
  created_at timestamptz not null default now()
);

comment on table public.crm_stage_changes is
  'Future CRM stage movement history migrated from localStorage key evolv.crm.stage-changes.v1.';

create table if not exists public.crm_goals (
  id uuid primary key default gen_random_uuid(),
  valor numeric,
  referencia text,
  created_at timestamptz not null default now()
);

comment on table public.crm_goals is
  'Future CRM commercial goals migrated from localStorage key evolv.crm.goal.v1.';

create table if not exists public.crm_import_batches (
  id uuid primary key default gen_random_uuid(),
  arquivo text,
  quantidade integer,
  created_at timestamptz not null default now()
);

comment on table public.crm_import_batches is
  'Future audit trail for assisted CRM imports such as the Piperun migration.';

create index if not exists crm_leads_external_id_idx
  on public.crm_leads (external_id);

create index if not exists crm_leads_telefone_idx
  on public.crm_leads (telefone);

create index if not exists crm_leads_email_idx
  on public.crm_leads (email);

create index if not exists crm_leads_consultor_idx
  on public.crm_leads (consultor);

create index if not exists crm_leads_pipeline_idx
  on public.crm_leads (pipeline);

create index if not exists crm_leads_etapa_idx
  on public.crm_leads (etapa);

create index if not exists crm_leads_status_idx
  on public.crm_leads (status);

create index if not exists crm_notes_lead_id_idx
  on public.crm_notes (lead_id);

create index if not exists crm_activities_lead_id_idx
  on public.crm_activities (lead_id);

create index if not exists crm_stage_changes_lead_id_idx
  on public.crm_stage_changes (lead_id);

-- RLS and application connection are intentionally not enabled here.
-- Future sprints should define organization/client ownership before exposing these tables to the app.
