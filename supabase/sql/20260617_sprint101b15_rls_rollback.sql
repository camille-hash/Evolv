-- Sprint 101B.15
-- CRM Leads RLS hardening rollback
-- Manual execution only. Codex must not execute this file.
--
-- Scope:
-- - Remove only the two organization-scoped policies created by this sprint.
--
-- Do not alter bridge policies, data, tables, profiles, auth, recovery or lead notes.

drop policy if exists "crm_leads authenticated read same organization" on public.crm_leads;
drop policy if exists "crm_leads authenticated update same organization" on public.crm_leads;
