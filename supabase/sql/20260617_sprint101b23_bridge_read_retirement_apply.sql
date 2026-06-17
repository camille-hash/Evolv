-- Sprint 101B.23
-- Controlled removal package: authenticated bridge read only
-- Manual execution only. Codex must not execute this file.
--
-- Target policy:
--   Authenticated bridge read crm_leads
--
-- Protected policies:
--   Authenticated bridge update crm_leads
--   Allow public read crm_leads
--   Allow public update crm_leads
--   crm_leads authenticated read same organization
--   crm_leads authenticated update same organization

drop policy if exists "Authenticated bridge read crm_leads" on public.crm_leads;
