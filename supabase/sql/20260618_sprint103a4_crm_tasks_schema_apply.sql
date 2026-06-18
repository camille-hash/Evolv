-- EVOLV Sprint 103A.4
-- Commercial Task schema apply package.
--
-- Manual execution only. Codex must not execute this file.
--
-- Scope:
-- - Create public.crm_tasks.
-- - Create crm_tasks-specific indexes, trigger and RLS policies.
-- - Grant authenticated access governed by RLS.
-- - Do not grant anon access.
--
-- Explicit non-scope:
-- - Do not alter public.crm_leads.
-- - Do not alter public.crm_lead_notes.
-- - Do not alter public.crm_notes.
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

  if to_regclass('public.organizations') is null then
    raise exception 'Missing public.organizations';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception 'Missing public.profiles';
  end if;

  if to_regclass('public.crm_leads') is null then
    raise exception 'Missing public.crm_leads';
  end if;

  if to_regclass('public.crm_lead_notes') is null then
    raise exception 'Missing public.crm_lead_notes';
  end if;
end
$$;

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  lead_id uuid not null references public.crm_leads(id) on delete restrict,
  assigned_user_id uuid null references public.profiles(id) on delete set null,
  created_by uuid null references public.profiles(id) on delete set null,
  task_type text not null,
  title text not null,
  notes text null,
  due_date date not null,
  due_time time null,
  status text not null default 'pending',
  completed_at timestamptz null,
  completed_by uuid null references public.profiles(id) on delete set null,
  canceled_at timestamptz null,
  canceled_by uuid null references public.profiles(id) on delete set null,
  source_note_id uuid null references public.crm_lead_notes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_tasks_task_type_check
    check (task_type in (
      'call',
      'whatsapp',
      'send_simulation',
      'send_proposal',
      'schedule_meeting',
      'request_documents',
      'follow_up',
      'other'
    )),
  constraint crm_tasks_status_check
    check (status in (
      'pending',
      'completed',
      'canceled'
    )),
  constraint crm_tasks_title_not_blank_check
    check (btrim(title) <> ''),
  constraint crm_tasks_completed_fields_check
    check (
      status <> 'completed'
      or (
        completed_at is not null
        and completed_by is not null
      )
    ),
  constraint crm_tasks_canceled_fields_check
    check (
      status <> 'canceled'
      or (
        canceled_at is not null
        and canceled_by is not null
      )
    )
);

comment on table public.crm_tasks is
  'Commercial task queue for EVOLV CRM. Notes remember; tasks execute.';

comment on column public.crm_tasks.source_note_id is
  'Optional link to public.crm_lead_notes, the current structured notes table used by the EVOLV dossier.';

create index if not exists crm_tasks_organization_id_idx
  on public.crm_tasks (organization_id);

create index if not exists crm_tasks_lead_id_idx
  on public.crm_tasks (lead_id);

create index if not exists crm_tasks_assigned_user_id_idx
  on public.crm_tasks (assigned_user_id);

create index if not exists crm_tasks_status_idx
  on public.crm_tasks (status);

create index if not exists crm_tasks_due_date_idx
  on public.crm_tasks (due_date);

create index if not exists crm_tasks_due_time_idx
  on public.crm_tasks (due_time);

create index if not exists crm_tasks_status_due_date_idx
  on public.crm_tasks (status, due_date);

create index if not exists crm_tasks_org_status_due_date_idx
  on public.crm_tasks (organization_id, status, due_date);

create index if not exists crm_tasks_org_assignee_status_due_date_idx
  on public.crm_tasks (organization_id, assigned_user_id, status, due_date);

create index if not exists crm_tasks_lead_status_due_date_idx
  on public.crm_tasks (lead_id, status, due_date);

drop trigger if exists crm_tasks_set_updated_at
  on public.crm_tasks;

create trigger crm_tasks_set_updated_at
before update on public.crm_tasks
for each row
execute function public.set_updated_at();

alter table public.crm_tasks enable row level security;

revoke all on table public.crm_tasks from anon;
revoke all on table public.crm_tasks from public;

grant select, insert, update on table public.crm_tasks to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_tasks'
      and policyname = 'crm_tasks authenticated read same organization'
  ) then
    create policy "crm_tasks authenticated read same organization"
    on public.crm_tasks
    for select
    to authenticated
    using (
      organization_id = public.evolv_current_organization_id()
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
      and tablename = 'crm_tasks'
      and policyname = 'crm_tasks authenticated insert same organization'
  ) then
    create policy "crm_tasks authenticated insert same organization"
    on public.crm_tasks
    for insert
    to authenticated
    with check (
      organization_id = public.evolv_current_organization_id()
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
      and tablename = 'crm_tasks'
      and policyname = 'crm_tasks authenticated update same organization'
  ) then
    create policy "crm_tasks authenticated update same organization"
    on public.crm_tasks
    for update
    to authenticated
    using (
      organization_id = public.evolv_current_organization_id()
    )
    with check (
      organization_id = public.evolv_current_organization_id()
    );
  end if;
end
$$;
