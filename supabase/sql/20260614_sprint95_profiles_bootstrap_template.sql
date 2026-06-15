-- EVOLV Sprint 95.2 - Profiles bootstrap template.
-- Manual template for a future controlled step.
--
-- IMPORTANT:
-- - Replace every placeholder UUID with the real auth.users.id.
-- - Replace every placeholder email with the real Supabase Auth email.
-- - Do not invent UUIDs.
-- - Do not run before users exist in Supabase Auth.
-- - This template does not touch CRM tables.
-- - This template does not enable RLS or create policies.

with default_organization as (
  select id as organization_id
  from public.organizations
  where slug = 'patrion-evolv'
),
profile_seed as (
  select
    '00000000-0000-0000-0000-000000000001'::uuid as id,
    'camille@example.com'::text as email,
    'Camille'::text as name,
    'admin'::text as role
  union all
  select
    '00000000-0000-0000-0000-000000000002'::uuid,
    'bruno@example.com'::text,
    'Bruno'::text,
    'admin'::text
  union all
  select
    '00000000-0000-0000-0000-000000000011'::uuid,
    'sdr1@example.com'::text,
    'SDR 1'::text,
    'sdr'::text
  union all
  select
    '00000000-0000-0000-0000-000000000012'::uuid,
    'sdr2@example.com'::text,
    'SDR 2'::text,
    'sdr'::text
  union all
  select
    '00000000-0000-0000-0000-000000000013'::uuid,
    'sdr3@example.com'::text,
    'SDR 3'::text,
    'sdr'::text
  union all
  select
    '00000000-0000-0000-0000-000000000014'::uuid,
    'sdr4@example.com'::text,
    'SDR 4'::text,
    'sdr'::text
  union all
  select
    '00000000-0000-0000-0000-000000000015'::uuid,
    'sdr5@example.com'::text,
    'SDR 5'::text,
    'sdr'::text
),
validated_seed as (
  select
    ps.id,
    do.organization_id,
    ps.name,
    ps.email,
    ps.role
  from profile_seed ps
  cross join default_organization do
  join auth.users au on au.id = ps.id and lower(au.email) = lower(ps.email)
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
from validated_seed
on conflict (id) do update
set
  organization_id = excluded.organization_id,
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = now();

-- Review unmatched placeholders before considering the bootstrap complete.
with profile_seed as (
  select
    '00000000-0000-0000-0000-000000000001'::uuid as id,
    'camille@example.com'::text as email,
    'Camille'::text as name
  union all
  select '00000000-0000-0000-0000-000000000002'::uuid, 'bruno@example.com'::text, 'Bruno'::text
  union all
  select '00000000-0000-0000-0000-000000000011'::uuid, 'sdr1@example.com'::text, 'SDR 1'::text
  union all
  select '00000000-0000-0000-0000-000000000012'::uuid, 'sdr2@example.com'::text, 'SDR 2'::text
  union all
  select '00000000-0000-0000-0000-000000000013'::uuid, 'sdr3@example.com'::text, 'SDR 3'::text
  union all
  select '00000000-0000-0000-0000-000000000014'::uuid, 'sdr4@example.com'::text, 'SDR 4'::text
  union all
  select '00000000-0000-0000-0000-000000000015'::uuid, 'sdr5@example.com'::text, 'SDR 5'::text
)
select
  ps.name,
  ps.email,
  ps.id,
  case
    when au.id is null then 'missing auth user or email mismatch'
    else 'ok'
  end as auth_match_status
from profile_seed ps
left join auth.users au on au.id = ps.id and lower(au.email) = lower(ps.email)
order by ps.name;

