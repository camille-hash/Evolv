do $$
begin
  if to_regclass('public.profiles') is null or to_regclass('public.crm_leads') is null then
    raise exception 'C32R_PRECHECK_APPLICATION_TABLES_REQUIRED';
  end if;
end;
$$;

-- PostgREST requires table privileges in addition to the existing RLS policies.
-- Profile reads remain limited by profiles_select_own and the same-tenant admin policy.
revoke all on table public.profiles from public, anon;
grant select on table public.profiles to authenticated;

-- Lead reads are required by C3.1 and the lead dossier. The existing select policy
-- restricts every authenticated role to its active profile organization.
revoke all on table public.crm_leads from public, anon;
grant select on table public.crm_leads to authenticated;

notify pgrst, 'reload schema';
