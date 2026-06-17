-- Sprint 101B.18
-- Legacy policy retirement audit support
-- Read-only only. Do not execute via Codex.

WITH legacy_policies AS (
  SELECT *
  FROM (
    VALUES
      ('Allow public read crm_leads'),
      ('Allow public update crm_leads'),
      ('Authenticated bridge read crm_leads'),
      ('Authenticated bridge update crm_leads')
  ) AS items(policyname)
),
target_policies AS (
  SELECT *
  FROM (
    VALUES
      ('crm_leads authenticated read same organization'),
      ('crm_leads authenticated update same organization')
  ) AS items(policyname)
),
all_expected_policies AS (
  SELECT policyname, 'legacy' AS policy_group
  FROM legacy_policies
  UNION ALL
  SELECT policyname, 'organization_scoped' AS policy_group
  FROM target_policies
)
SELECT
  aep.policy_group,
  aep.policyname,
  pp.roles,
  pp.cmd,
  pp.qual,
  pp.with_check,
  pp.policyname IS NOT NULL AS exists_in_database
FROM all_expected_policies aep
LEFT JOIN pg_policies pp
  ON pp.schemaname = 'public'
 AND pp.tablename = 'crm_leads'
 AND pp.policyname = aep.policyname
ORDER BY aep.policy_group, aep.policyname;

SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('crm_leads', 'profiles', 'crm_lead_notes')
ORDER BY c.relname;

SELECT
  count(*) AS crm_leads_total,
  count(*) FILTER (WHERE organization_id IS NULL) AS crm_leads_organization_id_nulls
FROM public.crm_leads;

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer,
  p.proconfig AS function_config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('evolv_current_organization_id', 'evolv_current_role')
ORDER BY p.proname;

WITH function_metadata AS (
  SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    p.oid AS function_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('evolv_current_organization_id', 'evolv_current_role')
),
roles_to_check AS (
  SELECT unnest(ARRAY['anon', 'authenticated', 'public']) AS role_name
)
SELECT
  fm.function_name,
  rtc.role_name,
  has_function_privilege(rtc.role_name, fm.function_oid, 'EXECUTE') AS can_execute
FROM function_metadata fm
CROSS JOIN roles_to_check rtc
ORDER BY fm.function_name, rtc.role_name;
