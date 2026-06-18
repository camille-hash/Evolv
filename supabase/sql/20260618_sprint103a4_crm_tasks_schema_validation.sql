-- EVOLV Sprint 103A.4
-- Commercial Task schema validation package.
--
-- Manual execution only. Codex must not execute this file.
-- Read-only validation: SELECT/WITH only.

select
  'crm_tasks_table_exists' as check_name,
  to_regclass('public.crm_tasks') is not null as passed;

select
  'crm_tasks_columns' as check_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_tasks'
order by ordinal_position;

select
  'crm_tasks_expected_columns_present' as check_name,
  expected.column_name,
  (actual.column_name is not null) as passed
from (
  values
    ('id'),
    ('organization_id'),
    ('lead_id'),
    ('assigned_user_id'),
    ('created_by'),
    ('task_type'),
    ('title'),
    ('notes'),
    ('due_date'),
    ('due_time'),
    ('status'),
    ('completed_at'),
    ('completed_by'),
    ('canceled_at'),
    ('canceled_by'),
    ('source_note_id'),
    ('created_at'),
    ('updated_at')
) as expected(column_name)
left join information_schema.columns actual
  on actual.table_schema = 'public'
 and actual.table_name = 'crm_tasks'
 and actual.column_name = expected.column_name
order by expected.column_name;

select
  'crm_tasks_constraints' as check_name,
  con.conname,
  con.contype,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'crm_tasks'
order by con.conname;

select
  'crm_tasks_expected_constraints_present' as check_name,
  expected.constraint_name,
  (con.conname is not null) as passed
from (
  values
    ('crm_tasks_task_type_check'),
    ('crm_tasks_status_check'),
    ('crm_tasks_title_not_blank_check'),
    ('crm_tasks_completed_fields_check'),
    ('crm_tasks_canceled_fields_check')
) as expected(constraint_name)
left join pg_constraint con
  on con.conname = expected.constraint_name
left join pg_class rel
  on rel.oid = con.conrelid
left join pg_namespace nsp
  on nsp.oid = rel.relnamespace
 and nsp.nspname = 'public'
where rel.relname = 'crm_tasks'
   or rel.relname is null
order by expected.constraint_name;

select
  'crm_tasks_foreign_keys' as check_name,
  con.conname,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'crm_tasks'
  and con.contype = 'f'
order by con.conname;

select
  'crm_tasks_indexes' as check_name,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'crm_tasks'
order by indexname;

select
  'crm_tasks_expected_indexes_present' as check_name,
  expected.index_name,
  (idx.indexname is not null) as passed
from (
  values
    ('crm_tasks_organization_id_idx'),
    ('crm_tasks_lead_id_idx'),
    ('crm_tasks_assigned_user_id_idx'),
    ('crm_tasks_status_idx'),
    ('crm_tasks_due_date_idx'),
    ('crm_tasks_due_time_idx'),
    ('crm_tasks_status_due_date_idx'),
    ('crm_tasks_org_status_due_date_idx'),
    ('crm_tasks_org_assignee_status_due_date_idx'),
    ('crm_tasks_lead_status_due_date_idx')
) as expected(index_name)
left join pg_indexes idx
  on idx.schemaname = 'public'
 and idx.tablename = 'crm_tasks'
 and idx.indexname = expected.index_name
order by expected.index_name;

select
  'crm_tasks_rls_enabled' as check_name,
  rel.relrowsecurity as passed
from pg_class rel
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'crm_tasks';

select
  'crm_tasks_policies' as check_name,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'crm_tasks'
order by policyname;

select
  'crm_tasks_expected_policies_present' as check_name,
  expected.policy_name,
  (pol.policyname is not null) as passed
from (
  values
    ('crm_tasks authenticated read same organization'),
    ('crm_tasks authenticated insert same organization'),
    ('crm_tasks authenticated update same organization')
) as expected(policy_name)
left join pg_policies pol
  on pol.schemaname = 'public'
 and pol.tablename = 'crm_tasks'
 and pol.policyname = expected.policy_name
order by expected.policy_name;

select
  'crm_tasks_no_delete_policy' as check_name,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_tasks'
      and cmd = 'DELETE'
  ) as passed;

select
  'crm_tasks_no_anon_policy' as check_name,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_tasks'
      and roles::text ilike '%anon%'
  ) as passed;

select
  'crm_tasks_grants' as check_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'crm_tasks'
order by grantee, privilege_type;

select
  'crm_tasks_anon_has_no_grants' as check_name,
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'crm_tasks'
      and grantee = 'anon'
  ) as passed;

select
  'crm_tasks_authenticated_grants' as check_name,
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
 and grant_row.table_name = 'crm_tasks'
 and grant_row.grantee = 'authenticated'
 and grant_row.privilege_type = expected.privilege_type
order by expected.privilege_type;

select
  'crm_tasks_helper_functions_exist' as check_name,
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
  'crm_tasks_updated_at_trigger_exists' as check_name,
  exists (
    select 1
    from pg_trigger trg
    join pg_class rel on rel.oid = trg.tgrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'crm_tasks'
      and trg.tgname = 'crm_tasks_set_updated_at'
      and not trg.tgisinternal
  ) as passed;

select
  'crm_tasks_row_count_expected_zero_after_schema_creation' as check_name,
  count(*) as total
from public.crm_tasks;

select
  'crm_leads_current_count_reference_only' as check_name,
  count(*) as total
from public.crm_leads;

select
  'crm_lead_notes_current_count_reference_only' as check_name,
  count(*) as total
from public.crm_lead_notes;

select
  'no_prestate_count_available' as check_name,
  'Compare crm_leads_current_count_reference_only and crm_lead_notes_current_count_reference_only with the operator preflight counts. This validation file is read-only and does not store pre-state.' as note;
