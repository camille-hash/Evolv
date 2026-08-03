-- Read-only catalog test for public table privilege hardening.

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
    raise exception 'Role % has prohibited % on public.%',
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
    raise exception 'PUBLIC has direct % on public.%',
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
    raise exception 'Default ACL postgres/public grants prohibited % to %',
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
    raise exception 'Role % has direct % on public.lead_ingestion_events',
      v_failure.role_name, v_failure.privilege_type;
  end if;
end
$$;

select
  r.rolname as role_name,
  c.relname as table_name,
  p.privilege,
  has_table_privilege(r.rolname, c.oid, p.privilege) as has_prohibited_privilege
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join (values ('anon'), ('authenticated')) r(rolname)
cross join (values ('MAINTAIN'), ('REFERENCES'), ('TRIGGER'), ('TRUNCATE')) p(privilege)
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and has_table_privilege(r.rolname, c.oid, p.privilege)
order by r.rolname, c.relname, p.privilege;

select
  beneficiary.rolname as role_name,
  e.privilege_type
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
order by beneficiary.rolname, e.privilege_type;

select
  required.table_name,
  required.privilege,
  has_table_privilege(
    'authenticated',
    format('public.%I', required.table_name),
    required.privilege
  ) as preserved
from (values
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
order by required.table_name, required.privilege;
