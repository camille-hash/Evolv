-- EVOLV Sprint 99B.1 - Proposed crm_lead_notes indexes.
-- Manual review only. Do not execute before table creation is approved.
-- This is not a migration file.

create index if not exists crm_lead_notes_organization_id_idx
  on public.crm_lead_notes(organization_id);

create index if not exists crm_lead_notes_lead_id_idx
  on public.crm_lead_notes(lead_id);

create index if not exists crm_lead_notes_author_profile_id_idx
  on public.crm_lead_notes(author_profile_id);

create index if not exists crm_lead_notes_note_type_idx
  on public.crm_lead_notes(note_type);

create index if not exists crm_lead_notes_created_at_idx
  on public.crm_lead_notes(created_at desc);

create index if not exists crm_lead_notes_active_lead_created_at_idx
  on public.crm_lead_notes(lead_id, created_at desc)
  where deleted_at is null;

create index if not exists crm_lead_notes_active_organization_created_at_idx
  on public.crm_lead_notes(organization_id, created_at desc)
  where deleted_at is null;
