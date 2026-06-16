-- EVOLV Sprint 99H.5 - Supabase CRM Auth Access Matrix validation
-- Manual review only. Do not execute through Codex.
-- SELECT-only validation script.

-- 1. Confirm key columns in public.crm_lead_notes.
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crm_lead_notes'
  and column_name in (
    'id',
    'organization_id',
    'lead_id',
    'author_profile_id',
    'content',
    'is_internal',
    'deleted_at',
    'created_at'
  )
order by ordinal_position;

-- 2. Confirm RLS state for public.crm_lead_notes.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'crm_lead_notes';

-- 3. Confirm current policies on public.crm_lead_notes.
select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'crm_lead_notes'
order by policyname;

-- 4. Confirm current grants on public.crm_lead_notes.
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'crm_lead_notes'
order by grantee, privilege_type;

-- 5. Confirm there is no anon policy for crm_lead_notes.
select
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'crm_lead_notes'
  and (
    'anon' = any(roles)
    or 'public' = any(roles)
  )
order by policyname;

-- 6. Confirm there is no UPDATE or DELETE policy for crm_lead_notes.
select
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'crm_lead_notes'
  and cmd in ('UPDATE', 'DELETE')
order by policyname;

-- 7. Totals for notes and active notes.
select count(*) as crm_lead_notes_total
from public.crm_lead_notes;

select count(*) as active_crm_lead_notes_total
from public.crm_lead_notes
where deleted_at is null;

-- 8. Confirm organization consistency between notes and leads.
select count(*) as notes_with_organization_mismatch
from public.crm_lead_notes notes
join public.crm_leads leads on leads.id = notes.lead_id
where notes.organization_id <> leads.organization_id;

-- 9. Confirm note authors still map to profiles when present.
select
  count(*) as notes_with_author_profile,
  count(*) filter (where p.id is not null) as notes_with_matching_profile,
  count(*) filter (where notes.author_profile_id is not null and p.id is null) as notes_with_missing_profile
from public.crm_lead_notes notes
left join public.profiles p on p.id = notes.author_profile_id;

-- 10. Reference totals for leads and profiles.
select count(*) as crm_leads_total
from public.crm_leads;

select count(*) as profiles_total
from public.profiles;
