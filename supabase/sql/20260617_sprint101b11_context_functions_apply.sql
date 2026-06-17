-- Sprint 101B.11
-- Context functions controlled apply
-- Manual execution only. Codex must not execute this file.
--
-- Scope:
-- - Create or replace public.evolv_current_organization_id()
-- - Create or replace public.evolv_current_role()
-- - Grant minimal execution to authenticated
--
-- Explicitly out of scope:
-- - No table changes
-- - No policy changes
-- - No bridge policy removal
-- - No data changes

create or replace function public.evolv_current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

comment on function public.evolv_current_organization_id()
is 'EVOLV organization context helper. Returns only the active authenticated user organization_id from public.profiles.';

revoke all on function public.evolv_current_organization_id() from public;
revoke all on function public.evolv_current_organization_id() from anon;
grant execute on function public.evolv_current_organization_id() to authenticated;

create or replace function public.evolv_current_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

comment on function public.evolv_current_role()
is 'EVOLV role context helper. Returns only the active authenticated user role from public.profiles.';

revoke all on function public.evolv_current_role() from public;
revoke all on function public.evolv_current_role() from anon;
grant execute on function public.evolv_current_role() to authenticated;
