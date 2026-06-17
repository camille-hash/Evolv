-- Sprint 101B.11
-- Context functions validation
-- Read-only validation. Manual execution only.
-- This script must not alter data, tables, policies or grants.

select
  current_timestamp as validated_at,
  current_database() as database_name,
  current_user as execution_user;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  l.lanname as language_name,
  p.provolatile as volatility,
  p.prosecdef as security_definer,
  p.proconfig as function_config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
  and p.proname in ('evolv_current_organization_id', 'evolv_current_role')
order by p.proname;

select
  routine_schema,
  routine_name,
  routine_type,
  data_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('evolv_current_organization_id', 'evolv_current_role')
order by routine_name;

select
  p.specific_schema as routine_schema,
  p.specific_name,
  p.parameter_name,
  p.data_type,
  p.ordinal_position
from information_schema.parameters p
where p.specific_schema = 'public'
  and p.specific_name in (
    select specific_name
    from information_schema.routines
    where routine_schema = 'public'
      and routine_name in ('evolv_current_organization_id', 'evolv_current_role')
  )
order by p.specific_name, p.ordinal_position;

select
  n.nspname as schema_name,
  p.proname as function_name,
  r.rolname as grantee,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public'
  and p.proname in ('evolv_current_organization_id', 'evolv_current_role')
  and r.rolname in ('anon', 'authenticated', 'service_role', 'public')
order by p.proname, r.rolname;

-- Direct calls are safe and read-only.
-- In SQL Editor without an authenticated request JWT, these may return null.
select
  public.evolv_current_organization_id() as current_organization_id,
  public.evolv_current_role() as current_role;
