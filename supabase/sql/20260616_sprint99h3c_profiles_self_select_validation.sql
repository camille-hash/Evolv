-- EVOLV Sprint 99H.3C - Profiles Data API + RLS self-select validation.
-- SELECT-only script for manual review after approved execution.
-- Do not mutate schema, data, grants, RLS or policies here.

-- 1. Confirm RLS state for public.profiles.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'profiles';

-- 2. Confirm self-select policy exists and is restricted to authenticated.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
  and policyname = 'Profiles can read own profile';

-- 3. Confirm there is no anon policy on public.profiles.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
  and array_position(roles, 'anon') is not null;

-- 4. Snapshot of profile rows and key access columns.
select
  count(*) as profiles_total,
  count(*) filter (where organization_id is null) as profiles_without_organization_id,
  count(*) filter (where role not in ('admin', 'sdr')) as profiles_with_unexpected_role,
  count(*) filter (where is_active is not true) as profiles_not_active
from public.profiles;

-- 5. Confirm profiles still match auth.users ids.
select
  count(*) filter (where au.id is not null) as profiles_matching_auth_users,
  count(*) filter (where au.id is null) as profiles_without_auth_user
from public.profiles p
left join auth.users au on au.id = p.id;
