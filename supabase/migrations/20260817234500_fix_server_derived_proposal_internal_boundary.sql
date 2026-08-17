do $$
declare
  v_signature regprocedure := 'public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text)'::regprocedure;
  v_definition text;
  v_old text := 'current_setting(''request.jwt.claim.role'',true) is distinct from ''service_role''';
begin
  select pg_get_functiondef(v_signature) into v_definition;
  if position(v_old in v_definition) = 0 then
    raise exception 'C33_PRECHECK_LEGACY_BOUNDARY_NOT_FOUND';
  end if;
  v_definition := replace(v_definition, v_old, 'auth.role() is distinct from ''service_role''');
  execute v_definition;
end;
$$;

revoke all on function public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text)
  from public, anon, authenticated, service_role;
grant execute on function public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text)
  to service_role;

comment on function public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text) is
  'Internal server-only C3.1 transaction. Requires both service_role EXECUTE and canonical auth.role() service-role identity.';
