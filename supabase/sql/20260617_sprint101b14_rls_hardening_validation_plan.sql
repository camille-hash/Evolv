-- Sprint 101B.14
-- CRM Leads RLS Hardening Validation Plan
-- PLANNING ONLY. DO NOT EXECUTE.
--
-- This file documents future validation queries and checks.
-- It is not an execution script.

-- PRECHECKS
--
-- Confirm RLS status:
-- select relname, relrowsecurity, relforcerowsecurity
-- from pg_class
-- where relname in ('crm_leads', 'profiles');

-- Confirm current policies:
-- select schemaname, tablename, policyname, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'crm_leads'
-- order by policyname;

-- Confirm functions:
-- select public.evolv_current_organization_id();
-- select public.evolv_current_role();

-- Confirm crm_leads organization integrity:
-- select count(*) as total,
--        count(*) filter (where organization_id is null) as organization_id_nulls
-- from public.crm_leads;

-- VALIDATION AFTER ADDING ORGANIZATION-SCOPED POLICIES
--
-- 1. Login with authenticated user.
-- 2. List leads in CRM.
-- 3. Open lead dossier.
-- 4. Edit lead.
-- 5. Create/list lead note.
-- 6. Confirm recovery flow still works.
-- 7. Confirm no policy errors in browser/app logs.

-- VALIDATION AFTER REMOVING ANON POLICIES
--
-- 1. Repeat CRM flow.
-- 2. Confirm anon no longer has operational read/update path.
-- 3. Confirm authenticated path remains operational.

-- VALIDATION AFTER REMOVING AUTHENTICATED BRIDGE POLICIES
--
-- 1. Repeat CRM flow.
-- 2. Confirm only organization-scoped policies remain.
-- 3. Confirm no cross-organization access is possible.

-- FINAL BASELINE EXPECTATION
--
-- crm_leads RLS enabled.
-- profiles RLS enabled.
-- crm_leads SELECT policy scoped by organization_id.
-- crm_leads UPDATE policy scoped by organization_id.
-- no anon operational policies on crm_leads.
-- no bridge policies with true conditions.
