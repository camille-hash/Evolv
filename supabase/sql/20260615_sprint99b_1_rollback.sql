-- EVOLV Sprint 99B.1 - Proposed rollback for crm_lead_notes.
-- Manual review only.
-- This rollback removes only the proposed notes foundation.
-- It does not alter crm_leads, profiles, organizations, anon/authenticated policies, grants or RLS on existing tables.
-- SECURITY WARNING:
-- Use this rollback only before real notes are created or after a verified backup/export of crm_lead_notes.
-- Dropping crm_lead_notes after production use will remove note history.

drop trigger if exists crm_lead_notes_set_updated_at
  on public.crm_lead_notes;

drop trigger if exists crm_lead_notes_set_organization_from_lead
  on public.crm_lead_notes;

drop function if exists public.crm_lead_notes_set_organization_from_lead();

drop table if exists public.crm_lead_notes;
