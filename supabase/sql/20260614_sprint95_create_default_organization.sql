-- EVOLV Sprint 95.2 - Create default organization.
-- Manual SQL Editor script.
-- Idempotent, additive, and does not touch CRM tables.
--
-- This script does not:
-- - alter crm_leads;
-- - alter crm_* tables;
-- - enable RLS;
-- - create policies;
-- - alter auth.users;
-- - change flags or environment variables.

insert into public.organizations (
  name,
  slug
)
values (
  'Patrion EVOLV',
  'patrion-evolv'
)
on conflict (slug) do nothing;

select
  id,
  name,
  slug,
  created_at,
  updated_at
from public.organizations
where slug = 'patrion-evolv';

