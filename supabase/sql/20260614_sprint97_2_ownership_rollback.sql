-- EVOLV Sprint 97.2 - Ownership foundation rollback.
-- Manual review only.
--
-- IMPORTANT:
-- Execute this rollback only after comparing with the initial diagnostic.
-- It is safe to remove objects only if they were created by Sprint 97.2.
--
-- If organization_id existed before Sprint 97.2, DO NOT drop the column.
-- If organization_id had meaningful values before Sprint 97.2, DO NOT clear values
-- without a reliable pre-sprint snapshot.

alter table public.crm_leads
  drop constraint if exists crm_leads_organization_id_fk;

drop index if exists public.crm_leads_organization_id_idx;

-- Execute the statement below only if the initial diagnostic confirmed that
-- public.crm_leads.organization_id did not exist before Sprint 97.2.
--
-- alter table public.crm_leads
--   drop column if exists organization_id;
