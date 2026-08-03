-- EVOLV Sprint 89 - Official Auth + Profiles + CRM schema foundation.
-- This migration is additive and conservative: it does not drop tables,
-- delete data, rename legacy tables, or connect Supabase Auth to the UI.

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

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists organizations_slug_unique_idx
  on public.organizations(slug)
  where slug is not null;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

comment on table public.organizations is
  'Official tenant table for EVOLV. New Auth/CRM tables must use organization_id, not company_id.';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'sdr' check (role in ('master', 'admin', 'sdr')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists profiles_organization_id_idx
  on public.profiles(organization_id);

create index if not exists profiles_email_idx
  on public.profiles(email);

create index if not exists profiles_role_idx
  on public.profiles(role);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

comment on table public.profiles is
  'Official EVOLV profile table. profiles.id must match auth.users.id for new Supabase Auth users.';

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assigned_profile_id uuid null references public.profiles(id) on delete set null,
  external_id text null,
  source_system text null default 'evolv',
  nome text not null,
  telefone text null,
  email text null,
  pais text null,
  origem text null,
  consultor text null,
  valor_pretendido numeric not null default 0,
  observacoes text null,
  pipeline text null,
  etapa text null,
  tags text[] not null default '{}',
  produto_interesse text null,
  temperatura text not null default 'morna',
  status text not null default 'ativa',
  proxima_acao text null,
  data_proxima_acao date null,
  closed_at timestamptz null,
  titulo_oportunidade text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists crm_leads_organization_id_idx
  on public.crm_leads(organization_id);

create index if not exists crm_leads_assigned_profile_id_idx
  on public.crm_leads(assigned_profile_id);

create index if not exists crm_leads_external_id_idx
  on public.crm_leads(external_id);

create index if not exists crm_leads_email_idx
  on public.crm_leads(email);

create index if not exists crm_leads_telefone_idx
  on public.crm_leads(telefone);

create index if not exists crm_leads_pipeline_etapa_idx
  on public.crm_leads(pipeline, etapa);

create index if not exists crm_leads_status_idx
  on public.crm_leads(status);

create index if not exists crm_leads_data_proxima_acao_idx
  on public.crm_leads(data_proxima_acao);

create unique index if not exists crm_leads_source_external_id_unique_idx
  on public.crm_leads(source_system, external_id)
  where external_id is not null;

drop trigger if exists crm_leads_set_updated_at on public.crm_leads;
create trigger crm_leads_set_updated_at
before update on public.crm_leads
for each row
execute function public.set_updated_at();

comment on table public.crm_leads is
  'Official shared EVOLV CRM leads table. Scope every row by organization_id and use Portuguese snake_case fields compatible with the current CRM domain.';

create or replace function public.evolv_current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

create or replace function public.evolv_current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

create or replace function public.evolv_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

alter table public.profiles enable row level security;
alter table public.crm_leads enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (id = auth.uid());
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_admin_select_organization'
  ) then
    create policy profiles_admin_select_organization
      on public.profiles
      for select
      to authenticated
      using (
        public.evolv_current_role() = 'admin'
        and organization_id = public.evolv_current_organization_id()
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_admin_update_organization'
  ) then
    create policy profiles_admin_update_organization
      on public.profiles
      for update
      to authenticated
      using (
        public.evolv_current_role() = 'admin'
        and organization_id = public.evolv_current_organization_id()
      )
      with check (
        public.evolv_current_role() = 'admin'
        and organization_id = public.evolv_current_organization_id()
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'crm_leads_select_organization'
  ) then
    create policy crm_leads_select_organization
      on public.crm_leads
      for select
      to authenticated
      using (
        public.evolv_current_organization_id() is not null
        and organization_id = public.evolv_current_organization_id()
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'crm_leads_insert_organization'
  ) then
    create policy crm_leads_insert_organization
      on public.crm_leads
      for insert
      to authenticated
      with check (
        public.evolv_current_organization_id() is not null
        and organization_id = public.evolv_current_organization_id()
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'crm_leads_update_organization'
  ) then
    create policy crm_leads_update_organization
      on public.crm_leads
      for update
      to authenticated
      using (
        public.evolv_current_organization_id() is not null
        and organization_id = public.evolv_current_organization_id()
      )
      with check (
        public.evolv_current_organization_id() is not null
        and organization_id = public.evolv_current_organization_id()
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_leads'
      and policyname = 'crm_leads_admin_delete_organization'
  ) then
    create policy crm_leads_admin_delete_organization
      on public.crm_leads
      for delete
      to authenticated
      using (
        public.evolv_current_role() = 'admin'
        and organization_id = public.evolv_current_organization_id()
      );
  end if;
end;
$$;
