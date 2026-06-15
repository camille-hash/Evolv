-- EVOLV Sprint 97.2 - Add organization ownership column.
-- Manual review only. Adds no data and changes no policies, grants or RLS.

alter table public.crm_leads
  add column if not exists organization_id uuid;
