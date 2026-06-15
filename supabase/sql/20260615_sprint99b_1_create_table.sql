-- EVOLV Sprint 99B.1 - Proposed crm_lead_notes table.
-- Manual review only. Do not execute before diagnostics approval.
-- This is not a migration file.

create table if not exists public.crm_lead_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  lead_id uuid not null references public.crm_leads(id) on delete restrict,
  author_profile_id uuid null references public.profiles(id) on delete set null,
  updated_by_profile_id uuid null references public.profiles(id) on delete set null,
  deleted_by_profile_id uuid null references public.profiles(id) on delete set null,
  content text not null,
  note_type text not null default 'history',
  is_internal boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint crm_lead_notes_note_type_check
    check (note_type in (
      'strategic_context',
      'latest_movement',
      'history',
      'initial_context'
    )),
  constraint crm_lead_notes_content_not_blank_check
    check (length(trim(content)) > 0),
  constraint crm_lead_notes_deleted_by_requires_deleted_at_check
    check (
      deleted_by_profile_id is null
      or deleted_at is not null
    )
);

comment on table public.crm_lead_notes is
  'Structured internal notes for EVOLV CRM leads. Proposed in Sprint 99B.1; customer-facing visibility is not supported.';

comment on column public.crm_lead_notes.organization_id is
  'Tenant scope. Must match the organization_id of the related crm_leads row.';

comment on column public.crm_lead_notes.is_internal is
  'All lead notes are internal in the current approved model and must never be exposed to clients.';

create or replace function public.crm_lead_notes_set_organization_from_lead()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  lead_organization_id uuid;
begin
  select cl.organization_id
    into lead_organization_id
  from public.crm_leads cl
  where cl.id = new.lead_id;

  if lead_organization_id is null then
    raise exception 'crm_lead_notes requires a lead with organization_id';
  end if;

  if new.organization_id is null then
    new.organization_id := lead_organization_id;
  end if;

  if new.organization_id <> lead_organization_id then
    raise exception 'crm_lead_notes.organization_id must match crm_leads.organization_id';
  end if;

  return new;
end;
$$;

drop trigger if exists crm_lead_notes_set_organization_from_lead
  on public.crm_lead_notes;

create trigger crm_lead_notes_set_organization_from_lead
before insert or update of organization_id, lead_id
on public.crm_lead_notes
for each row
execute function public.crm_lead_notes_set_organization_from_lead();

drop trigger if exists crm_lead_notes_set_updated_at
  on public.crm_lead_notes;

create trigger crm_lead_notes_set_updated_at
before update on public.crm_lead_notes
for each row
execute function public.set_updated_at();
