-- EVOLV Sprint 103A.30
-- Lead-centric simulation schema validation package.
--
-- Manual execution only. Codex must not execute this file.
-- Read-only validation: SELECT/WITH only.

select
  'crm_lead_simulations_table_exists' as check_name,
  to_regclass('public.crm_lead_simulations') is not null as passed;

select
  'crm_lead_simulations_columns' as check_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_lead_simulations'
order by ordinal_position;

select
  'crm_lead_simulations_expected_columns_present' as check_name,
  expected.column_name,
  (actual.column_name is not null) as passed
from (
  values
    ('id'),
    ('organization_id'),
    ('lead_id'),
    ('created_by'),
    ('created_at'),
    ('updated_at'),
    ('simulation_type'),
    ('title'),
    ('status'),
    ('source'),
    ('technical_input'),
    ('calculation_snapshot'),
    ('presentation_snapshot'),
    ('summary'),
    ('presented_at'),
    ('presented_by'),
    ('proposal_generated_at'),
    ('proposal_generated_by'),
    ('pdf_generated_at'),
    ('pdf_generated_by'),
    ('pdf_sent_at'),
    ('pdf_sent_by'),
    ('archived_at'),
    ('archived_by'),
    ('total_credit'),
    ('updated_credit'),
    ('commercial_credit'),
    ('monthly_payment'),
    ('post_contemplation_payment'),
    ('contemplation_month'),
    ('quota_count'),
    ('incc_rate'),
    ('estimated_roi'),
    ('estimated_gain'),
    ('estimated_sale_value')
) as expected(column_name)
left join information_schema.columns actual
  on actual.table_schema = 'public'
 and actual.table_name = 'crm_lead_simulations'
 and actual.column_name = expected.column_name
order by expected.column_name;

select
  'crm_lead_simulations_constraints' as check_name,
  con.conname,
  con.contype,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'crm_lead_simulations'
order by con.conname;

select
  'crm_lead_simulations_expected_constraints_present' as check_name,
  expected.constraint_name,
  (con.conname is not null) as passed
from (
  values
    ('crm_lead_simulations_simulation_type_check'),
    ('crm_lead_simulations_status_check'),
    ('crm_lead_simulations_source_check'),
    ('crm_lead_simulations_title_not_blank_check'),
    ('crm_lead_simulations_jsonb_snapshot_check'),
    ('crm_lead_simulations_money_non_negative_check'),
    ('crm_lead_simulations_percent_non_negative_check'),
    ('crm_lead_simulations_quota_count_check'),
    ('crm_lead_simulations_contemplation_month_check'),
    ('crm_lead_simulations_archived_fields_check'),
    ('crm_lead_simulations_presented_fields_check'),
    ('crm_lead_simulations_proposal_fields_check'),
    ('crm_lead_simulations_pdf_generated_fields_check'),
    ('crm_lead_simulations_pdf_sent_fields_check'),
    ('crm_lead_simulations_timestamp_order_check')
) as expected(constraint_name)
left join pg_constraint con
  on con.conname = expected.constraint_name
left join pg_class rel
  on rel.oid = con.conrelid
 and rel.relname = 'crm_lead_simulations'
left join pg_namespace nsp
  on nsp.oid = rel.relnamespace
 and nsp.nspname = 'public'
order by expected.constraint_name;

select
  'crm_lead_simulations_foreign_keys' as check_name,
  con.conname,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'crm_lead_simulations'
  and con.contype = 'f'
order by con.conname;

select
  'crm_lead_simulations_crm_leads_fk_exists' as check_name,
  exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace rel_nsp on rel_nsp.oid = rel.relnamespace
    join pg_class foreign_rel on foreign_rel.oid = con.confrelid
    join pg_namespace foreign_nsp on foreign_nsp.oid = foreign_rel.relnamespace
    where rel_nsp.nspname = 'public'
      and rel.relname = 'crm_lead_simulations'
      and con.contype = 'f'
      and foreign_nsp.nspname = 'public'
      and foreign_rel.relname = 'crm_leads'
      and pg_get_constraintdef(con.oid) ilike '%lead_id%'
  ) as passed;

select
  'crm_lead_simulations_indexes' as check_name,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'crm_lead_simulations'
order by indexname;

select
  'crm_lead_simulations_expected_indexes_present' as check_name,
  expected.index_name,
  (idx.indexname is not null) as passed
from (
  values
    ('crm_lead_simulations_organization_id_idx'),
    ('crm_lead_simulations_lead_id_idx'),
    ('crm_lead_simulations_created_by_idx'),
    ('crm_lead_simulations_created_at_idx'),
    ('crm_lead_simulations_type_idx'),
    ('crm_lead_simulations_status_idx'),
    ('crm_lead_simulations_org_lead_created_at_idx'),
    ('crm_lead_simulations_org_type_created_at_idx'),
    ('crm_lead_simulations_org_status_created_at_idx'),
    ('crm_lead_simulations_presented_at_idx'),
    ('crm_lead_simulations_pdf_sent_at_idx')
) as expected(index_name)
left join pg_indexes idx
  on idx.schemaname = 'public'
 and idx.tablename = 'crm_lead_simulations'
 and idx.indexname = expected.index_name
order by expected.index_name;

select
  'crm_lead_simulations_rls_enabled' as check_name,
  rel.relrowsecurity as passed
from pg_class rel
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'crm_lead_simulations';

select
  'crm_lead_simulations_policies' as check_name,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'crm_lead_simulations'
order by policyname;

select
  'crm_lead_simulations_expected_policies_present' as check_name,
  expected.policy_name,
  (pol.policyname is not null) as passed
from (
  values
    ('crm_lead_simulations authenticated select same organization'),
    ('crm_lead_simulations authenticated insert same organization'),
    ('crm_lead_simulations authenticated update same organization')
) as expected(policy_name)
left join pg_policies pol
  on pol.schemaname = 'public'
 and pol.tablename = 'crm_lead_simulations'
 and pol.policyname = expected.policy_name
order by expected.policy_name;

select
  'crm_lead_simulations_insert_policy_validates_lead_organization' as check_name,
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_simulations'
      and policyname = 'crm_lead_simulations authenticated insert same organization'
      and cmd = 'INSERT'
      and with_check ilike '%evolv_current_organization_id%'
      and with_check ilike '%crm_leads%'
      and with_check ilike '%lead_id%'
      and with_check ilike '%organization_id%'
  ) as passed;

select
  'crm_lead_simulations_update_policy_validates_existing_row_organization' as check_name,
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_simulations'
      and policyname = 'crm_lead_simulations authenticated update same organization'
      and cmd = 'UPDATE'
      and qual ilike '%evolv_current_organization_id%'
      and qual ilike '%crm_leads%'
      and qual ilike '%lead_id%'
      and qual ilike '%organization_id%'
  ) as passed;

select
  'crm_lead_simulations_update_policy_validates_new_row_organization' as check_name,
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_simulations'
      and policyname = 'crm_lead_simulations authenticated update same organization'
      and cmd = 'UPDATE'
      and with_check ilike '%evolv_current_organization_id%'
      and with_check ilike '%crm_leads%'
      and with_check ilike '%lead_id%'
      and with_check ilike '%organization_id%'
  ) as passed;

select
  'crm_lead_simulations_no_broad_true_policy' as check_name,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_simulations'
      and (
        btrim(coalesce(qual, '')) = 'true'
        or btrim(coalesce(with_check, '')) = 'true'
      )
  ) as passed;

select
  'crm_lead_simulations_no_delete_policy' as check_name,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_simulations'
      and cmd = 'DELETE'
  ) as passed;

select
  'crm_lead_simulations_no_anon_policy' as check_name,
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_lead_simulations'
      and roles::text ilike '%anon%'
  ) as passed;

select
  'crm_lead_simulations_grants' as check_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'crm_lead_simulations'
order by grantee, privilege_type;

select
  'crm_lead_simulations_anon_has_no_grants' as check_name,
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'crm_lead_simulations'
      and grantee = 'anon'
  ) as passed;

select
  'crm_lead_simulations_public_has_no_grants' as check_name,
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'crm_lead_simulations'
      and grantee = 'PUBLIC'
  ) as passed;

select
  'crm_lead_simulations_authenticated_grants' as check_name,
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
 and grant_row.table_name = 'crm_lead_simulations'
 and grant_row.grantee = 'authenticated'
 and grant_row.privilege_type = expected.privilege_type
order by expected.privilege_type;

select
  'crm_lead_simulations_authenticated_has_no_delete_grant' as check_name,
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'crm_lead_simulations'
      and grantee = 'authenticated'
      and privilege_type = 'DELETE'
  ) as passed;

select
  'crm_lead_simulations_source_values_aligned' as check_name,
  exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'crm_lead_simulations'
      and con.conname = 'crm_lead_simulations_source_check'
      and pg_get_constraintdef(con.oid) ilike '%lead_detail%'
      and pg_get_constraintdef(con.oid) ilike '%simulator%'
      and pg_get_constraintdef(con.oid) ilike '%multi_cotas%'
      and pg_get_constraintdef(con.oid) ilike '%api%'
      and pg_get_constraintdef(con.oid) not ilike '%manual%'
  ) as passed;

select
  'crm_lead_simulations_helper_functions_exist' as check_name,
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
  'crm_lead_simulations_updated_at_trigger_exists' as check_name,
  exists (
    select 1
    from pg_trigger trg
    join pg_class rel on rel.oid = trg.tgrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'crm_lead_simulations'
      and trg.tgname = 'crm_lead_simulations_set_updated_at'
      and not trg.tgisinternal
  ) as passed;

select
  'crm_lead_simulations_row_count_expected_zero_after_schema_creation' as check_name,
  count(*) as total
from public.crm_lead_simulations;

select
  'crm_leads_current_count_reference_only' as check_name,
  count(*) as total
from public.crm_leads;

select
  'crm_tasks_current_count_reference_only' as check_name,
  count(*) as total
from public.crm_tasks;

select
  'crm_lead_notes_current_count_reference_only' as check_name,
  count(*) as total
from public.crm_lead_notes;

select
  'profiles_current_count_reference_only' as check_name,
  count(*) as total
from public.profiles;

select
  'existing_tables_reference_only' as check_name,
  'Compare reference counts with operator preflight evidence. This validation file is read-only and does not store pre-state.' as note;
