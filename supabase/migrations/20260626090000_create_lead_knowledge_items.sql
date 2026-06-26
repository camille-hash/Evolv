-- EVOLV CAP-001 - Organizational Memory / Knowledge Registry.
--
-- Scope:
-- - Create public.lead_knowledge_items.
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

  if to_regclass('public.profiles') is null then
    raise exception 'Missing public.profiles';
  end if;

  if to_regclass('public.crm_leads') is null then
    raise exception 'Missing public.crm_leads';
  end if;
end
$$;

create table if not exists public.lead_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  lead_id uuid not null references public.crm_leads(id) on delete restrict,
  title text not null,
  summary text null,
  knowledge_type text not null,
  knowledge_category text not null default 'DECLARED',
  confidence text not null default 'MEDIUM',
  status text not null default 'ACTIVE',
  source text not null default 'Manual',
  created_by uuid null references public.profiles(id) on delete set null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_knowledge_items_title_not_blank_check
    check (btrim(title) <> ''),
  constraint lead_knowledge_items_knowledge_type_check
    check (knowledge_type in (
      'financial',
      'behavioral',
      'commercial',
      'relationship',
      'strategic',
      'wealth',
      'risk',
      'objective',
      'communication',
      'objection',
      'motivation',
      'timing',
      'profile'
    )),
  constraint lead_knowledge_items_knowledge_category_check
    check (knowledge_category in (
      'DECLARED',
      'OBSERVED',
      'INFERRED',
      'CALCULATED',
      'DECIDED',
      'LEARNED'
    )),
  constraint lead_knowledge_items_confidence_check
    check (confidence in (
      'HIGH',
      'MEDIUM',
      'LOW',
      'UNKNOWN'
    )),
  constraint lead_knowledge_items_status_check
    check (status in (
      'ACTIVE',
      'ARCHIVED'
    )),
  constraint lead_knowledge_items_archived_fields_check
    check (
      (
        status = 'ACTIVE'
        and archived_at is null
      )
      or (
        status = 'ARCHIVED'
        and archived_at is not null
      )
    )
);

comment on table public.lead_knowledge_items is
  'CAP-001 Organizational Memory: strategic knowledge registry items linked to CRM leads.';

create index if not exists lead_knowledge_items_organization_id_idx
  on public.lead_knowledge_items (organization_id);

create index if not exists lead_knowledge_items_lead_id_idx
  on public.lead_knowledge_items (lead_id);

create index if not exists lead_knowledge_items_status_idx
  on public.lead_knowledge_items (status);

create index if not exists lead_knowledge_items_knowledge_type_idx
  on public.lead_knowledge_items (knowledge_type);

create index if not exists lead_knowledge_items_org_lead_status_created_at_idx
  on public.lead_knowledge_items (organization_id, lead_id, status, created_at desc);

drop trigger if exists lead_knowledge_items_set_updated_at
  on public.lead_knowledge_items;

create trigger lead_knowledge_items_set_updated_at
before update on public.lead_knowledge_items
for each row
execute function public.set_updated_at();

alter table public.lead_knowledge_items enable row level security;

revoke all on table public.lead_knowledge_items from anon;
revoke all on table public.lead_knowledge_items from public;

grant select, insert, update on table public.lead_knowledge_items to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lead_knowledge_items'
      and policyname = 'lead_knowledge_items authenticated read same organization'
  ) then
    create policy "lead_knowledge_items authenticated read same organization"
    on public.lead_knowledge_items
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
      and tablename = 'lead_knowledge_items'
      and policyname = 'lead_knowledge_items authenticated insert same organization'
  ) then
    create policy "lead_knowledge_items authenticated insert same organization"
    on public.lead_knowledge_items
    for insert
    to authenticated
    with check (
      organization_id = public.evolv_current_organization_id()
      and status = 'ACTIVE'
      and archived_at is null
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
      and tablename = 'lead_knowledge_items'
      and policyname = 'lead_knowledge_items authenticated update same organization'
  ) then
    create policy "lead_knowledge_items authenticated update same organization"
    on public.lead_knowledge_items
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
