-- EVOLV Sprint 97.2 - Add organization ownership index.
-- Manual review only. Changes no data, policies, grants or RLS.

create index if not exists crm_leads_organization_id_idx
  on public.crm_leads(organization_id);
