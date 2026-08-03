-- Harden structural table privileges inherited from postgres defaults in public.
-- TRUNCATE is not constrained by RLS. service_role and sequence privileges are
-- intentionally unchanged pending separate architectural review.

begin;

do $$
declare
  v_role text;
  v_table text;
  v_expected_tables constant text[] := array[
    'administrators',
    'clients',
    'commercial_proposal_audit_events',
    'commission_plan_schedule_items',
    'commission_plans',
    'companies',
    'contract_assemblies',
    'contract_bid_offers',
    'contract_bids',
    'contract_commission_schedule_items',
    'contract_commission_snapshot_items',
    'contract_commission_snapshots',
    'contract_timeline_events',
    'contracts',
    'crm_lead_commercial_proposals',
    'crm_lead_simulations',
    'crm_leads',
    'decision_model_outputs',
    'expected_revenue_entries',
    'knowledge_evidence',
    'lead_ingestion_events',
    'lead_ingestion_integration_configs',
    'lead_knowledge_items',
    'legacy_user_administrators',
    'organizations',
    'profiles',
    'recognized_revenue_entries',
    'revenue_entries',
    'simulation_scenarios',
    'simulations',
    'users'
  ];
begin
  foreach v_role in array array['anon', 'authenticated', 'postgres'] loop
    if not exists (select 1 from pg_roles where rolname = v_role) then
      raise exception 'Required role % does not exist', v_role;
    end if;
  end loop;

  if not exists (select 1 from pg_namespace where nspname = 'public') then
    raise exception 'Required schema public does not exist';
  end if;

  if current_user <> 'postgres'
     and not pg_has_role(current_user, 'postgres', 'MEMBER') then
    raise exception 'Executor % cannot alter default privileges for role postgres', current_user;
  end if;

  foreach v_table in array v_expected_tables loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = v_table
        and c.relkind in ('r', 'p')
    ) then
      raise exception 'Expected public table % does not exist', v_table;
    end if;
  end loop;
end
$$;

alter default privileges for role postgres in schema public
revoke maintain, references, trigger, truncate on tables from anon;

alter default privileges for role postgres in schema public
revoke maintain, references, trigger, truncate on tables from authenticated;

do $$
declare
  v_table record;
begin
  for v_table in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
    order by c.relname
  loop
    execute format(
      'revoke maintain, references, trigger, truncate on table %I.%I from anon, authenticated',
      v_table.schema_name,
      v_table.table_name
    );
  end loop;
end
$$;

do $$
declare
  v_failure record;
  v_required record;
begin
  select r.rolname as role_name, c.relname as table_name, p.privilege
  into v_failure
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated')) r(rolname)
  cross join (values ('MAINTAIN'), ('REFERENCES'), ('TRIGGER'), ('TRUNCATE')) p(privilege)
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and has_table_privilege(r.rolname, c.oid, p.privilege)
  order by r.rolname, c.relname, p.privilege
  limit 1;

  if found then
    raise exception 'Role % retains prohibited % on public.%',
      v_failure.role_name, v_failure.privilege, v_failure.table_name;
  end if;

  select c.relname as table_name, e.privilege_type
  into v_failure
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join lateral aclexplode(c.relacl) e
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and e.grantee = 0
  order by c.relname, e.privilege_type
  limit 1;

  if found then
    raise exception 'PUBLIC retains direct % on public.%',
      v_failure.privilege_type, v_failure.table_name;
  end if;

  select beneficiary.rolname as role_name, e.privilege_type
  into v_failure
  from pg_default_acl d
  join pg_roles owner_role on owner_role.oid = d.defaclrole
  join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) e
  join pg_roles beneficiary on beneficiary.oid = e.grantee
  where owner_role.rolname = 'postgres'
    and n.nspname = 'public'
    and d.defaclobjtype = 'r'
    and beneficiary.rolname in ('anon', 'authenticated')
    and e.privilege_type in ('MAINTAIN', 'REFERENCES', 'TRIGGER', 'TRUNCATE')
  order by beneficiary.rolname, e.privilege_type
  limit 1;

  if found then
    raise exception 'Default ACL postgres/public still grants % to %',
      v_failure.privilege_type, v_failure.role_name;
  end if;

  for v_required in
    select * from (values
      ('crm_lead_simulations', 'SELECT'),
      ('crm_lead_simulations', 'INSERT'),
      ('crm_lead_simulations', 'UPDATE'),
      ('clients', 'SELECT'),
      ('clients', 'INSERT'),
      ('clients', 'UPDATE'),
      ('administrators', 'SELECT'),
      ('administrators', 'INSERT'),
      ('administrators', 'UPDATE'),
      ('commission_plans', 'SELECT'),
      ('commission_plans', 'INSERT'),
      ('commission_plans', 'UPDATE'),
      ('contracts', 'SELECT'),
      ('contracts', 'INSERT'),
      ('contracts', 'UPDATE'),
      ('revenue_entries', 'SELECT'),
      ('revenue_entries', 'INSERT'),
      ('crm_lead_commercial_proposals', 'SELECT'),
      ('crm_lead_commercial_proposals', 'INSERT'),
      ('crm_lead_commercial_proposals', 'UPDATE'),
      ('commercial_proposal_audit_events', 'SELECT'),
      ('commercial_proposal_audit_events', 'INSERT'),
      ('lead_ingestion_integration_configs', 'SELECT'),
      ('lead_ingestion_integration_configs', 'INSERT'),
      ('lead_ingestion_integration_configs', 'UPDATE')
    ) required(table_name, privilege)
  loop
    if not has_table_privilege(
      'authenticated',
      format('public.%I', v_required.table_name),
      v_required.privilege
    ) then
      raise exception 'Role authenticated is missing critical % on public.%',
        v_required.privilege, v_required.table_name;
    end if;
  end loop;

  select beneficiary.rolname as role_name, e.privilege_type
  into v_failure
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join lateral aclexplode(c.relacl) e
  join pg_roles beneficiary on beneficiary.oid = e.grantee
  where n.nspname = 'public'
    and c.relname = 'lead_ingestion_events'
    and c.relkind in ('r', 'p')
    and beneficiary.rolname in ('anon', 'authenticated')
  order by beneficiary.rolname, e.privilege_type
  limit 1;

  if found then
    raise exception 'Role % retains direct % on public.lead_ingestion_events',
      v_failure.role_name, v_failure.privilege_type;
  end if;
end
$$;

commit;
