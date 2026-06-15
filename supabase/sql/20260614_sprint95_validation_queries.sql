-- EVOLV Sprint 95.2 - Identity bootstrap validation queries.
-- SELECT-only validation script.
-- Does not mutate schema or data.

-- Organizations overview.
select
  id,
  name,
  slug,
  created_at,
  updated_at
from public.organizations
order by created_at desc;

-- Default organization check.
select
  id,
  name,
  slug
from public.organizations
where slug = 'patrion-evolv';

-- Auth users overview for manual UUID copy.
select
  id,
  email,
  created_at,
  last_sign_in_at
from auth.users
order by created_at desc;

-- Profiles overview.
select
  id,
  organization_id,
  name,
  email,
  role,
  is_active,
  created_at,
  updated_at
from public.profiles
order by role, email;

-- Profiles that do not match auth.users.
select
  p.id,
  p.email,
  p.role,
  p.is_active
from public.profiles p
left join auth.users au on au.id = p.id
where au.id is null
order by p.email;

-- Profiles missing organization.
select
  id,
  name,
  email,
  role,
  is_active
from public.profiles
where organization_id is null
order by email;

-- Profiles with invalid roles.
select
  id,
  name,
  email,
  role
from public.profiles
where role not in ('admin', 'sdr')
   or role is null
order by email;

-- Profiles by organization and role.
select
  organization_id,
  role,
  is_active,
  count(*) as total
from public.profiles
group by organization_id, role, is_active
order by organization_id, role, is_active;

-- CRM lead count only. This does not alter crm_leads.
select count(*) as crm_leads_total
from public.crm_leads;

-- Check whether CRM identity columns exist without touching data.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
  and column_name in (
    'organization_id',
    'assigned_profile_id'
  )
order by column_name;

