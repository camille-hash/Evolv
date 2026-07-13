-- EVOLV initial Supabase schema draft.
-- This migration is intentionally not applied by this sprint.
-- It prepares the future operational data model while the app remains 100% localStorage.

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  document_number text,
  brand_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'Root tenant entity for EVOLV, Patrion and future partner organizations. Future RLS should scope all operational records by organization_id.';

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  auth_user_id uuid,
  name text not null,
  email text not null,
  phone text,
  role text not null default 'consultant',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

comment on table public.profiles is
  'Application user profiles. Future RLS should combine auth.uid(), organization_id and role.';

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  phone text,
  email text,
  status text not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.clients is
  'Client records replacing the current local current-client context. Future RLS should restrict access to the client organization.';

create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null unique references public.clients(id) on delete cascade,
  profile_label text,
  current_wealth numeric(14,2) not null default 0,
  target_wealth numeric(14,2) not null default 0,
  current_passive_income numeric(14,2) not null default 0,
  target_passive_income numeric(14,2) not null default 0,
  wealth_goal_term_months integer not null default 120,
  passive_income_goal_term_months integer not null default 120,
  average_property_value numeric(14,2) not null default 0,
  average_letter_value numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  current_value numeric(14,2) not null default 0,
  monthly_income numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consortium_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  administrator_id uuid,
  administrator_name text,
  credit_value numeric(14,2) not null default 0,
  contemplated boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.administrators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'custom',
  administrative_fee_percent numeric(8,4) not null default 0,
  reserve_fund_percent numeric(8,4) not null default 0,
  term_months integer not null default 1,
  monthly_insurance_percent numeric(8,4) not null default 0,
  insurance_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.administrators is
  'Draft table for consortium administrators. Existing early setup may include a different administrators table; reconcile before applying this draft.';

alter table public.consortium_cards
  add constraint consortium_cards_administrator_id_fkey
  foreign key (administrator_id)
  references public.administrators(id)
  on delete set null;

create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  type text not null,
  objective text not null,
  description text,
  target_wealth numeric(14,2) not null default 0,
  target_passive_income numeric(14,2) not null default 0,
  term_months integer not null default 120,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  administrator_id uuid references public.administrators(id) on delete set null,
  name text not null,
  commercial_data jsonb not null default '{}'::jsonb,
  form_state jsonb not null default '{}'::jsonb,
  selected_scenario_key text not null default 'full',
  insurance_option text not null default 'with-insurance',
  contemplation_month integer not null default 1,
  bid_type text not null default 'none',
  result_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  strategy_id uuid references public.strategies(id) on delete set null,
  simulation_id uuid references public.simulations(id) on delete set null,
  administrator_id uuid references public.administrators(id) on delete set null,
  name text not null,
  administrator_name text,
  credit numeric(14,2) not null default 0,
  operation_type text not null default 'consortium',
  status text not null default 'active',
  simulation_state jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.followup_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  operation_id uuid references public.operations(id) on delete set null,
  consortium_card_id uuid references public.consortium_cards(id) on delete set null,
  title text not null,
  type text not null default 'personalizado',
  event_date date not null,
  notes text,
  completed boolean not null default false,
  notification_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  simulation_id uuid references public.simulations(id) on delete set null,
  operation_id uuid references public.operations(id) on delete set null,
  type text not null,
  title text not null,
  file_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  push_enabled boolean not null default false,
  push_permission text not null default 'default',
  push_token text,
  whatsapp_enabled boolean not null default false,
  whatsapp_number text,
  email_enabled boolean not null default false,
  email_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Future notification preferences only. No push, WhatsApp or email delivery is implemented by this migration draft.';

create index if not exists profiles_organization_id_idx on public.profiles(organization_id);
create index if not exists clients_organization_id_idx on public.clients(organization_id);
create index if not exists client_profiles_client_id_idx on public.client_profiles(client_id);
create index if not exists portfolio_properties_client_id_idx on public.portfolio_properties(client_id);
create index if not exists consortium_cards_client_id_idx on public.consortium_cards(client_id);
create index if not exists simulations_client_id_idx on public.simulations(client_id);
create index if not exists operations_client_id_idx on public.operations(client_id);
create index if not exists operations_strategy_id_idx on public.operations(strategy_id);
create index if not exists strategies_client_id_idx on public.strategies(client_id);
create index if not exists followup_events_client_id_idx on public.followup_events(client_id);
create index if not exists followup_events_event_date_idx on public.followup_events(event_date);
create index if not exists reports_client_id_idx on public.reports(client_id);
create index if not exists administrators_organization_id_idx on public.administrators(organization_id);
create index if not exists notification_preferences_organization_id_idx on public.notification_preferences(organization_id);

-- RLS future plan:
-- 1. Enable row level security after authentication is introduced.
-- 2. Scope every operational table by organization_id.
-- 3. Use profiles.role for owner/admin/consultant/assistant/viewer permissions.
-- 4. Keep service-role access restricted to server-side administrative flows.
-- 5. Do not expose cross-organization data through public clients.
