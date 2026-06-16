-- EVOLV Sprint 99H.5 - Supabase CRM Auth Access Matrix rollback
-- Manual review only. Do not execute through Codex.
--
-- This rollback removes only the authenticated crm_lead_notes access created in Sprint 99H.5.
-- It does not touch crm_leads, profiles, organizations, anon policies, grants or application data.
--
-- WARNING:
-- - This rollback does not delete notes.
-- - Disabling RLS is intentionally left as a manual decision and is NOT performed automatically here.
-- - If notes have already been used successfully, prefer keeping RLS enabled and only removing the policies below if absolutely necessary.

drop policy if exists "Lead notes authenticated insert by organization"
  on public.crm_lead_notes;

drop policy if exists "Lead notes authenticated read by organization"
  on public.crm_lead_notes;

revoke insert on public.crm_lead_notes from authenticated;
revoke select on public.crm_lead_notes from authenticated;

-- Optional and manual, only if explicitly approved:
-- alter table public.crm_lead_notes disable row level security;
