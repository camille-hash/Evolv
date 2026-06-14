-- EVOLV Sprint 93 - Bootstrap and backfill execution plan.
-- This file is NOT a migration.
-- Do not execute it automatically.
-- Review, adapt placeholders, run first in staging, and only then consider production.

begin;

-- ============================================================================
-- A. PRE-FLIGHT DIAGNOSTICS - run before any data change
-- ============================================================================

-- Count tenant records.
select count(*) as organizations_count
from public.organizations;

-- Count profiles.
select count(*) as profiles_count
from public.profiles;

-- Count Supabase Auth users.
select count(*) as auth_users_count
from auth.users;

-- Count CRM leads. Expected production reference after PipeRun import: 763.
select count(*) as crm_leads_count
from public.crm_leads;

-- Check whether organization_id exists in crm_leads.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
  and column_name = 'organization_id';

-- Inspect the real crm_leads columns before backfill.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_leads'
order by ordinal_position;

-- Count leads without organization_id.
-- Safety: run only after confirming the column exists.
select count(*) as leads_without_organization_id
from public.crm_leads
where organization_id is null;

-- Count leads by source_system.
select coalesce(source_system, '(null)') as source_system, count(*) as total
from public.crm_leads
group by coalesce(source_system, '(null)')
order by total desc;

-- Check whether profiles.id matches auth.users.id.
select
  count(*) filter (where au.id is not null) as profiles_matching_auth_users,
  count(*) filter (where au.id is null) as profiles_without_auth_user
from public.profiles p
left join auth.users au on au.id = p.id;

-- ============================================================================
-- B. BOOTSTRAP DEFAULT ORGANIZATION
-- ============================================================================

-- Creates the default Patrion/EVOLV organization if it does not exist.
-- This is idempotent when the slug unique index exists.
insert into public.organizations (name, slug)
values ('Patrion EVOLV', 'patrion-evolv')
on conflict (slug) do nothing;

-- Confirm the organization id to be used below.
select id, name, slug
from public.organizations
where slug = 'patrion-evolv';

-- ============================================================================
-- C. BOOTSTRAP PROFILES
-- ============================================================================

-- SECURITY: users must already exist in Supabase Auth.
-- Do not invent auth.users UUIDs.
-- Replace placeholder e-mails before manual execution.

with default_organization as (
  select id as organization_id
  from public.organizations
  where slug = 'patrion-evolv'
),
profile_seed as (
  select
    'substituir_por_email_camille'::text as email,
    'Camille'::text as name,
    'admin'::text as role
  union all
  select
    'substituir_por_email_bruno'::text as email,
    'Bruno'::text as name,
    'admin'::text as role
  union all
  select
    'substituir_por_email_sdr1'::text as email,
    'SDR 1'::text as name,
    'sdr'::text as role
  union all
  select
    'substituir_por_email_sdr2'::text as email,
    'SDR 2'::text as name,
    'sdr'::text as role
  union all
  select
    'substituir_por_email_sdr3'::text as email,
    'SDR 3'::text as name,
    'sdr'::text as role
  union all
  select
    'substituir_por_email_sdr4'::text as email,
    'SDR 4'::text as name,
    'sdr'::text as role
  union all
  select
    'substituir_por_email_sdr5'::text as email,
    'SDR 5'::text as name,
    'sdr'::text as role
),
matched_auth_users as (
  select
    au.id,
    ps.name,
    au.email,
    ps.role,
    do.organization_id
  from profile_seed ps
  join auth.users au on lower(au.email) = lower(ps.email)
  cross join default_organization do
)
insert into public.profiles (
  id,
  organization_id,
  name,
  email,
  role,
  is_active
)
select
  id,
  organization_id,
  name,
  email,
  role,
  true
from matched_auth_users
on conflict (id) do update
set
  organization_id = excluded.organization_id,
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  is_active = true,
  updated_at = now();

-- Validate which placeholder users did not match auth.users.
-- If any row appears here, create the Supabase Auth user first or correct the e-mail.
with profile_seed as (
  select 'substituir_por_email_camille'::text as email
  union all select 'substituir_por_email_bruno'::text
  union all select 'substituir_por_email_sdr1'::text
  union all select 'substituir_por_email_sdr2'::text
  union all select 'substituir_por_email_sdr3'::text
  union all select 'substituir_por_email_sdr4'::text
  union all select 'substituir_por_email_sdr5'::text
)
select ps.email as missing_auth_user_email
from profile_seed ps
left join auth.users au on lower(au.email) = lower(ps.email)
where au.id is null;

-- ============================================================================
-- D. BACKFILL CRM LEADS
-- ============================================================================

-- Safety rules:
-- - update only leads with organization_id is null;
-- - preserve leads already associated with another organization;
-- - do not overwrite existing lead data;
-- - run only after confirming crm_leads.organization_id exists.

with default_organization as (
  select id as organization_id
  from public.organizations
  where slug = 'patrion-evolv'
)
update public.crm_leads cl
set
  organization_id = do.organization_id,
  updated_at = now()
from default_organization do
where cl.organization_id is null;

-- ============================================================================
-- E. POST-BACKFILL VALIDATION
-- ============================================================================

-- Total leads should remain 763 in the current production dataset.
select count(*) as crm_leads_total_after_backfill
from public.crm_leads;

-- This should return 0 before enabling RLS on crm_leads.
select count(*) as leads_without_organization_id_after_backfill
from public.crm_leads
where organization_id is null;

-- Leads by organization.
select organization_id, count(*) as leads_total
from public.crm_leads
group by organization_id
order by leads_total desc;

-- Profiles by organization and role.
select organization_id, role, is_active, count(*) as profiles_total
from public.profiles
group by organization_id, role, is_active
order by organization_id, role, is_active;

-- Conceptual read test by organization.
select cl.organization_id, count(*) as readable_leads_by_org
from public.crm_leads cl
join public.organizations o on o.id = cl.organization_id
where o.slug = 'patrion-evolv'
group by cl.organization_id;

-- Validate all profiles are backed by auth.users.
select
  p.id,
  p.email,
  p.role,
  p.is_active,
  case when au.id is null then 'missing auth user' else 'ok' end as auth_user_status
from public.profiles p
left join auth.users au on au.id = p.id
where p.organization_id = (
  select id from public.organizations where slug = 'patrion-evolv'
)
order by p.role, p.email;

-- ============================================================================
-- F. CONCEPTUAL ROLLBACK FOR TEST ENVIRONMENTS
-- ============================================================================

-- Do not run rollback in production without backup and formal approval.
-- In staging, if you need to undo only the association created by this test,
-- first identify records that were null before the backfill through a snapshot.
--
-- Example pattern for staging only:
-- update public.crm_leads
-- set organization_id = null,
--     updated_at = now()
-- where organization_id = (
--   select id from public.organizations where slug = 'patrion-evolv'
-- )
-- and <replace_with_condition_from_pre_backfill_snapshot>;
--
-- Never delete leads as a rollback strategy.

-- Review all result sets before committing.
-- commit;
rollback;

