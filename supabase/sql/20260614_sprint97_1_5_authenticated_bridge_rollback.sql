-- EVOLV Sprint 97.1.5 - Authenticated bridge rollback.
-- Manual review only. Do not execute through Codex.
--
-- This rollback removes only the authenticated bridge created by Sprint 97.1.5.
-- It does not remove anon policies/grants, alter crm_leads data, or change RLS.

drop policy if exists "Authenticated bridge read crm_leads"
  on public.crm_leads;

drop policy if exists "Authenticated bridge update crm_leads"
  on public.crm_leads;

revoke select on public.crm_leads from authenticated;
revoke update on public.crm_leads from authenticated;
