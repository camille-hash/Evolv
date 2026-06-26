-- EVOLV CAP-002 - Evidence Chain.
--
-- Scope:
-- - Create public.knowledge_evidence.
-- - Link evidence to public.lead_knowledge_items.
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

  if to_regclass('public.lead_knowledge_items') is null then
    raise exception 'Missing public.lead_knowledge_items';
  end if;
end
$$;

create table if not exists public.knowledge_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  lead_id uuid not null references public.crm_leads(id) on delete restrict,
  knowledge_item_id uuid not null references public.lead_knowledge_items(id) on delete restrict,
  title text not null,
  summary text null,
  evidence_type text not null default 'manual',
  source text not null default 'Manual',
  source_reference text null,
  status text not null default 'ACTIVE',
  created_by uuid null references public.profiles(id) on delete set null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_evidence_title_not_blank_check
    check (btrim(title) <> ''),
  constraint knowledge_evidence_type_check
    check (evidence_type in (
      'note',
      'task',
      'simulation',
      'document',
      'conversation',
      'manual'
    )),
  constraint knowledge_evidence_status_check
    check (status in (
      'ACTIVE',
      'ARCHIVED'
    )),
  constraint knowledge_evidence_archived_fields_check
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

comment on table public.knowledge_evidence is
  'CAP-002 Evidence Chain: traceable evidence linked to lead knowledge items.';

create index if not exists knowledge_evidence_organization_id_idx
  on public.knowledge_evidence (organization_id);

create index if not exists knowledge_evidence_lead_id_idx
  on public.knowledge_evidence (lead_id);

create index if not exists knowledge_evidence_knowledge_item_id_idx
  on public.knowledge_evidence (knowledge_item_id);

create index if not exists knowledge_evidence_status_idx
  on public.knowledge_evidence (status);

create index if not exists knowledge_evidence_org_knowledge_status_created_at_idx
  on public.knowledge_evidence (
    organization_id,
    knowledge_item_id,
    status,
    created_at desc
  );

drop trigger if exists knowledge_evidence_set_updated_at
  on public.knowledge_evidence;

create trigger knowledge_evidence_set_updated_at
before update on public.knowledge_evidence
for each row
execute function public.set_updated_at();

alter table public.knowledge_evidence enable row level security;

revoke all on table public.knowledge_evidence from anon;
revoke all on table public.knowledge_evidence from public;

grant select, insert, update on table public.knowledge_evidence to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'knowledge_evidence'
      and policyname = 'knowledge_evidence authenticated read same organization'
  ) then
    create policy "knowledge_evidence authenticated read same organization"
    on public.knowledge_evidence
    for select
    to authenticated
    using (
      organization_id = public.evolv_current_organization_id()
      and exists (
        select 1
        from public.lead_knowledge_items item
        where item.id = knowledge_item_id
          and item.lead_id = lead_id
          and item.organization_id = public.evolv_current_organization_id()
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
      and tablename = 'knowledge_evidence'
      and policyname = 'knowledge_evidence authenticated insert same organization'
  ) then
    create policy "knowledge_evidence authenticated insert same organization"
    on public.knowledge_evidence
    for insert
    to authenticated
    with check (
      organization_id = public.evolv_current_organization_id()
      and status = 'ACTIVE'
      and archived_at is null
      and exists (
        select 1
        from public.lead_knowledge_items item
        where item.id = knowledge_item_id
          and item.lead_id = lead_id
          and item.organization_id = public.evolv_current_organization_id()
          and item.status = 'ACTIVE'
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
      and tablename = 'knowledge_evidence'
      and policyname = 'knowledge_evidence authenticated update same organization'
  ) then
    create policy "knowledge_evidence authenticated update same organization"
    on public.knowledge_evidence
    for update
    to authenticated
    using (
      organization_id = public.evolv_current_organization_id()
      and exists (
        select 1
        from public.lead_knowledge_items item
        where item.id = knowledge_item_id
          and item.lead_id = lead_id
          and item.organization_id = public.evolv_current_organization_id()
      )
    )
    with check (
      organization_id = public.evolv_current_organization_id()
      and exists (
        select 1
        from public.lead_knowledge_items item
        where item.id = knowledge_item_id
          and item.lead_id = lead_id
          and item.organization_id = public.evolv_current_organization_id()
      )
    );
  end if;
end
$$;
