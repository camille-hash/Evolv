WITH target_functions AS (
  SELECT unnest(ARRAY[
    'evolv_current_organization_id',
    'evolv_current_role'
  ]) AS function_name
),
function_metadata AS (
  SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    l.lanname AS language_name,
    p.provolatile AS volatility,
    p.prosecdef AS is_security_definer,
    p.proconfig AS function_config,
    p.oid AS function_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language l ON l.oid = p.prolang
  WHERE n.nspname = 'public'
    AND p.proname IN (SELECT function_name FROM target_functions)
)
SELECT
  tf.function_name,
  fm.schema_name,
  fm.arguments,
  fm.return_type,
  fm.language_name,
  fm.volatility,
  fm.is_security_definer,
  fm.function_config
FROM target_functions tf
LEFT JOIN function_metadata fm ON fm.function_name = tf.function_name
ORDER BY tf.function_name;

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
  SELECT unnest(ARRAY['anon', 'authenticated', 'service_role', 'public']) AS role_name
)
SELECT
  fm.schema_name,
  fm.function_name,
  rtc.role_name,
  has_function_privilege(rtc.role_name, fm.function_oid, 'EXECUTE') AS can_execute
FROM function_metadata fm
CROSS JOIN roles_to_check rtc
ORDER BY fm.function_name, rtc.role_name;

SELECT
  routine_schema,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('evolv_current_organization_id', 'evolv_current_role')
ORDER BY routine_name;

SELECT
  p.specific_schema AS routine_schema,
  p.specific_name,
  p.parameter_name,
  p.data_type,
  p.ordinal_position
FROM information_schema.parameters p
WHERE p.specific_schema = 'public'
  AND p.specific_name IN (
    SELECT specific_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN ('evolv_current_organization_id', 'evolv_current_role')
  )
ORDER BY p.specific_name, p.ordinal_position;

SELECT
  public.evolv_current_organization_id() AS current_organization_id,
  public.evolv_current_role() AS current_role;
