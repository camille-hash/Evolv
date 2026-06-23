-- Strategic lead profile schema validation package.
--
-- Manual execution only. Codex must not execute this file.
-- Read-only validation: SELECT/WITH only.

select
  'crm_lead_profiles_table_exists' as check_name,
  to_regclass('public.crm_lead_profiles') is not null as passed;

select
  'crm_lead_profiles_columns' as check_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_lead_profiles'
order by ordinal_position;

select
  'crm_lead_profiles_expected_columns_present' as check_name,
  expected.column_name,
  (actual.column_name is not null) as passed
from (
  values
    ('id'),
    ('lead_id'),
    ('primary_goal'),
    ('current_moment'),
    ('strategic_topics'),
    ('strategic_notes'),
    ('created_at'),
    ('updated_at')
) as expected(column_name)
left join information_schema.columns actual
  on actual.table_schema = 'public'
 and actual.table_name = 'crm_lead_profiles'
 and actual.column_name = expected.column_name
order by expected.column_name;

select
  'crm_lead_profiles_constraints' as check_name,
  con.conname,
  con.contype,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'crm_lead_profiles'
order by con.conname;

select
  'crm_lead_profiles_unique_lead_constraint_present' as check_name,
  exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'crm_lead_profiles'
      and con.conname = 'crm_lead_profiles_lead_id_unique'
  ) as passed;

select
  'crm_lead_profiles_foreign_keys' as check_name,
  con.conname,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'crm_lead_profiles'
  and con.contype = 'f'
order by con.conname;

select
  'crm_lead_profiles_indexes' as check_name,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'crm_lead_profiles'
order by indexname;

select
  'crm_lead_profiles_expected_indexes_present' as check_name,
  expected.index_name,
  (idx.indexname is not null) as passed
from (
  values
    ('crm_lead_profiles_lead_id_idx'),
    ('crm_lead_profiles_updated_at_idx')
) as expected(index_name)
left join pg_indexes idx
  on idx.schemaname = 'public'
 and idx.tablename = 'crm_lead_profiles'
 and idx.indexname = expected.index_name
order by expected.index_name;

select
  'crm_lead_profiles_rls_enabled' as check_name,
  rel.relrowsecurity as passed
from pg_class rel
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'crm_lead_profiles';

select
  'crm_lead_profiles_policies' as check_name,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'crm_lead_profiles'
order by policyname;

select
  'crm_lead_profiles_expected_policies_present' as check_name,
  expected.policy_name,
  (pol.policyname is not null) as passed
from (
  values
    ('crm_lead_profiles authenticated select same organization'),
    ('crm_lead_profiles authenticated insert same organization'),
    ('crm_lead_profiles authenticated update same organization')
) as expected(policy_name)
left join pg_policies pol
  on pol.schemaname = 'public'
 and pol.tablename = 'crm_lead_profiles'
 and pol.policyname = expected.policy_name
order by expected.policy_name;

select
  'crm_lead_profiles_no_delete_policy' as check_name,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_profiles'
      and cmd = 'DELETE'
  ) as passed;

select
  'crm_lead_profiles_no_anon_policy' as check_name,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_profiles'
      and roles::text ilike '%anon%'
  ) as passed;

select
  'crm_lead_profiles_grants' as check_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'crm_lead_profiles'
order by grantee, privilege_type;

select
  'crm_lead_profiles_anon_has_no_grants' as check_name,
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'crm_lead_profiles'
      and grantee = 'anon'
  ) as passed;

select
  'crm_lead_profiles_authenticated_grants' as check_name,
  expected.privilege_type,
  (grant_row.privilege_type is not null) as passed
from (
  values
    ('SELECT'),
    ('INSERT'),
    ('UPDATE')
) as expected(privilege_type)
left join information_schema.role_table_grants grant_row
  on grant_row.table_schema = 'public'
 and grant_row.table_name = 'crm_lead_profiles'
 and grant_row.grantee = 'authenticated'
 and grant_row.privilege_type = expected.privilege_type
order by expected.privilege_type;

select
  'crm_lead_profiles_helper_functions_exist' as check_name,
  expected.function_name,
  (proc.proname is not null) as passed
from (
  values
    ('evolv_current_organization_id'),
    ('set_updated_at')
) as expected(function_name)
left join pg_proc proc
  on proc.proname = expected.function_name
left join pg_namespace nsp
  on nsp.oid = proc.pronamespace
 and nsp.nspname = 'public'
order by expected.function_name;

select
  'crm_lead_profiles_updated_at_trigger_exists' as check_name,
  exists (
    select 1
    from pg_trigger trg
    join pg_class rel on rel.oid = trg.tgrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'crm_lead_profiles'
      and trg.tgname = 'crm_lead_profiles_set_updated_at'
      and not trg.tgisinternal
  ) as passed;

select
  'crm_lead_profiles_row_count_expected_zero_after_schema_creation' as check_name,
  count(*) as total
from public.crm_lead_profiles;
