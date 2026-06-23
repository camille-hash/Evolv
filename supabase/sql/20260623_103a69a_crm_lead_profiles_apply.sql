-- Strategic lead profile schema apply package.
--
-- Manual execution only. Codex must not execute this file.
--
-- Scope:
-- - Create public.crm_lead_profiles.
-- - Create crm_lead_profiles-specific indexes, trigger and RLS policies.
-- - Grant authenticated access governed by RLS.
-- - Do not grant anon access.
-- - Do not create delete policy.
--
-- Explicit non-scope:
-- - Do not alter public.crm_leads.
-- - Do not alter public.crm_tasks.
-- - Do not alter public.crm_lead_notes.
-- - Do not alter public.crm_lead_simulations.
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

  if to_regclass('public.crm_leads') is null then
    raise exception 'Missing public.crm_leads';
  end if;
end
$$;

create table if not exists public.crm_lead_profiles (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  primary_goal text null,
  current_moment text null,
  strategic_topics text[] not null default '{}'::text[],
  strategic_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_lead_profiles_lead_id_unique unique (lead_id)
);

comment on table public.crm_lead_profiles is
  'Persistent strategic profile for one CRM lead. Complements operational CRM with long-lived client context.';

create index if not exists crm_lead_profiles_lead_id_idx
  on public.crm_lead_profiles (lead_id);

create index if not exists crm_lead_profiles_updated_at_idx
  on public.crm_lead_profiles (updated_at desc);

drop trigger if exists crm_lead_profiles_set_updated_at
  on public.crm_lead_profiles;

create trigger crm_lead_profiles_set_updated_at
before update on public.crm_lead_profiles
for each row
execute function public.set_updated_at();

alter table public.crm_lead_profiles enable row level security;

revoke all on table public.crm_lead_profiles from anon;
revoke all on table public.crm_lead_profiles from public;

grant select, insert, update on table public.crm_lead_profiles to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_profiles'
      and policyname = 'crm_lead_profiles authenticated select same organization'
  ) then
    create policy "crm_lead_profiles authenticated select same organization"
    on public.crm_lead_profiles
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.crm_leads lead
        where lead.id = crm_lead_profiles.lead_id
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
      and tablename = 'crm_lead_profiles'
      and policyname = 'crm_lead_profiles authenticated insert same organization'
  ) then
    create policy "crm_lead_profiles authenticated insert same organization"
    on public.crm_lead_profiles
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.crm_leads lead
        where lead.id = crm_lead_profiles.lead_id
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
      and tablename = 'crm_lead_profiles'
      and policyname = 'crm_lead_profiles authenticated update same organization'
  ) then
    create policy "crm_lead_profiles authenticated update same organization"
    on public.crm_lead_profiles
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.crm_leads lead
        where lead.id = crm_lead_profiles.lead_id
          and lead.organization_id = public.evolv_current_organization_id()
      )
    )
    with check (
      exists (
        select 1
        from public.crm_leads lead
        where lead.id = crm_lead_profiles.lead_id
          and lead.organization_id = public.evolv_current_organization_id()
      )
    );
  end if;
end
$$;
