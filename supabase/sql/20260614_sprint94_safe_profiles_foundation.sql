-- EVOLV Sprint 94.1 - Safe profiles foundation for manual Supabase SQL Editor execution.
-- Project: evolv-production
-- Environment: Production
-- Project ref: afeahaxclgkyylyxejgj
--
-- IMPORTANT:
-- - This is not a Supabase migration.
-- - Do not run with Supabase CLI, db push or migration up.
-- - This script is schema-only for organizations + profiles.
-- - It does not insert users, profiles or organizations.
-- - It does not touch CRM tables.
-- - It does not enable RLS.
-- - It does not create policies.

-- ============================================================================
-- 1. EXTENSION AND SHARED UPDATED_AT HELPER
-- ============================================================================

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

comment on function public.set_updated_at() is
  'Shared updated_at trigger helper. Sprint 94.1 creates no CRM triggers.';

-- ============================================================================
-- 2. ORGANIZATIONS TABLE FOUNDATION
-- ============================================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.organizations
  add column if not exists slug text;

create unique index if not exists organizations_slug_unique_idx
  on public.organizations(slug)
  where slug is not null;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'organizations_set_updated_at'
      and tgrelid = 'public.organizations'::regclass
  ) then
    create trigger organizations_set_updated_at
    before update on public.organizations
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

comment on table public.organizations is
  'Official tenant table for EVOLV. Sprint 94.1 does not insert the default organization.';

-- ============================================================================
-- 3. PROFILES TABLE FOUNDATION
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'sdr' check (role in ('admin', 'sdr')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Existing tables may contain legacy nullable data. Do not force NOT NULL here.
alter table public.profiles
  add column if not exists organization_id uuid,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists role text,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.profiles
  alter column role set default 'sdr',
  alter column is_active set default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_auth_users_fk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_id_auth_users_fk
      foreign key (id)
      references auth.users(id)
      on delete cascade
      not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_organization_id_fk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_organization_id_fk
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade
      not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_official_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_official_check
      check (role in ('admin', 'sdr'))
      not valid;
  end if;
end;
$$;

create index if not exists profiles_organization_id_idx
  on public.profiles(organization_id);

create index if not exists profiles_email_idx
  on public.profiles(email);

create index if not exists profiles_role_idx
  on public.profiles(role);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'profiles_set_updated_at'
      and tgrelid = 'public.profiles'::regclass
  ) then
    create trigger profiles_set_updated_at
    before update on public.profiles
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

comment on table public.profiles is
  'Official EVOLV profile table. profiles.id should match auth.users.id. Sprint 94.1 creates schema only.';

comment on column public.profiles.organization_id is
  'Tenant scope for future authorization. Populate only in a later controlled bootstrap step.';

comment on column public.profiles.role is
  'Initial official roles: admin and sdr.';

-- ============================================================================
-- END OF SAFE FOUNDATION
-- ============================================================================

-- No RLS enabled.
-- No policies created.
-- No CRM tables altered.
-- No data inserted, updated or deleted.

