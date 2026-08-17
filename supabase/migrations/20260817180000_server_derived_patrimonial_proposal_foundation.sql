alter table public.commercial_proposal_audit_events drop constraint if exists commercial_proposal_audit_events_type_check;
alter table public.commercial_proposal_audit_events add constraint commercial_proposal_audit_events_type_check check (event_type in (
  'created','version_created','presented','approved','rejected','expired','superseded','version_superseded','proposal_approved','proposal_approval_revoked','server_derived_proposal_created'
));

create table public.commercial_proposal_creation_requests (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  idempotency_key text not null, intent_hash text not null check(intent_hash ~ '^[0-9a-f]{64}$'),
  simulation_id uuid not null references public.crm_lead_simulations(id) on delete restrict,
  proposal_id uuid not null references public.crm_lead_commercial_proposals(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(),
  unique(organization_id,idempotency_key)
);
alter table public.commercial_proposal_creation_requests enable row level security;
revoke all on table public.commercial_proposal_creation_requests from public,anon,authenticated;
grant select,insert on table public.commercial_proposal_creation_requests to service_role;

create or replace function public.enforce_commercial_proposal_snapshot_metadata()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_hash text; v_authority text; v_trusted boolean := current_user='postgres' and current_setting('app.commercial_proposal_trusted_authority',true)='server_derived';
begin
  if new.saved_snapshot->>'schemaVersion'='commercial-proposal/v1' then
    if not public.commercial_proposal_snapshot_v1_minimally_valid(new.saved_snapshot) then raise exception using errcode='P0001',message='CP_SNAPSHOT_INVALID'; end if;
    v_hash:=public.commercial_proposal_terms_hash(new.saved_snapshot); v_authority:=new.saved_snapshot#>>'{provenance,authority}';
    if v_trusted then v_authority:='server_derived'; new.saved_snapshot:=jsonb_set(new.saved_snapshot,'{provenance,authority}','"server_derived"'::jsonb);
    elsif tg_op='INSERT' and v_authority in ('server_derived','server_verified') then v_authority:='client_structured_legacy'; new.saved_snapshot:=jsonb_set(new.saved_snapshot,'{provenance,authority}','"client_structured_legacy"'::jsonb); end if;
    if tg_op='UPDATE' and new.saved_snapshot is not distinct from old.saved_snapshot and (new.commercial_terms_hash is distinct from old.commercial_terms_hash or new.snapshot_schema_version is distinct from old.snapshot_schema_version or new.snapshot_authority is distinct from old.snapshot_authority) then raise exception using errcode='P0001',message='CP_SNAPSHOT_HASH_MISMATCH'; end if;
    if new.commercial_terms_hash is not null and new.commercial_terms_hash<>v_hash then raise exception using errcode='P0001',message='CP_SNAPSHOT_HASH_MISMATCH'; end if;
    new.snapshot_schema_version:='commercial-proposal/v1'; new.commercial_terms_hash:=v_hash; new.snapshot_authority:=v_authority;
  else
    if new.saved_snapshot?'schemaVersion' then raise exception using errcode='P0001',message='CP_SNAPSHOT_SCHEMA_UNSUPPORTED'; end if;
    new.snapshot_schema_version:='legacy'; new.commercial_terms_hash:=null; new.snapshot_authority:='legacy';
  end if; return new;
end $$;

create or replace function public.create_server_derived_patrimonial_proposal_transaction(
  p_organization_id uuid,p_actor_id uuid,p_lead_id uuid,p_simulation_id uuid,p_proposal_id uuid,p_idempotency_key text,p_intent_hash text,
  p_technical_input jsonb,p_calculation_snapshot jsonb,p_saved_snapshot jsonb,p_commercial_terms_hash text
) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_existing public.commercial_proposal_creation_requests%rowtype; v_sim public.crm_lead_simulations%rowtype; v_prop public.crm_lead_commercial_proposals%rowtype; v_number text; v_correlation uuid:=gen_random_uuid();
begin
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then raise exception using errcode='42501',message='CP_INTERNAL_BOUNDARY_REQUIRED'; end if;
  if not exists(select 1 from public.profiles where id=p_actor_id and organization_id=p_organization_id and is_active=true and role in('master','admin','sdr')) then raise exception using errcode='P0001',message='CP_ACTOR_FORBIDDEN'; end if;
  if not exists(select 1 from public.crm_leads where id=p_lead_id and organization_id=p_organization_id) then raise exception using errcode='P0001',message='CP_CURRENT_VERSION_NOT_FOUND'; end if;
  if p_idempotency_key!~'^[A-Za-z0-9._:-]{8,128}$' or p_intent_hash!~'^[0-9a-f]{64}$' then raise exception using errcode='P0001',message='CP_INVALID_PAYLOAD'; end if;
  select * into v_existing from public.commercial_proposal_creation_requests where organization_id=p_organization_id and idempotency_key=p_idempotency_key for update;
  if found then
    if v_existing.intent_hash<>p_intent_hash then raise exception using errcode='P0001',message='CP_IDEMPOTENCY_CONFLICT'; end if;
    select * into v_prop from public.crm_lead_commercial_proposals where id=v_existing.proposal_id; select * into v_sim from public.crm_lead_simulations where id=v_existing.simulation_id;
    return jsonb_build_object('outcome','already_created','proposal',to_jsonb(v_prop),'simulation',to_jsonb(v_sim));
  end if;
  if not public.commercial_proposal_snapshot_v1_minimally_valid(p_saved_snapshot) or p_saved_snapshot->>'proposalKind'<>'patrimonial_strategy' then raise exception using errcode='P0001',message='CP_SNAPSHOT_INVALID'; end if;
  if public.commercial_proposal_terms_hash(p_saved_snapshot)<>p_commercial_terms_hash then raise exception using errcode='P0001',message='CP_SNAPSHOT_HASH_MISMATCH'; end if;
  if p_saved_snapshot#>>'{provenance,simulationId}'<>p_simulation_id::text then raise exception using errcode='P0001',message='CP_SNAPSHOT_INVALID'; end if;
  perform set_config('app.commercial_proposal_trusted_authority','server_derived',true);
  insert into public.crm_lead_simulations(id,organization_id,lead_id,created_by,simulation_type,title,status,source,technical_input,calculation_snapshot,presentation_snapshot,summary,total_credit,quota_count)
  values(p_simulation_id,p_organization_id,p_lead_id,p_actor_id,'commercial','Estrategia Patrimonial Rodobens 2227','proposal_generated','api',p_technical_input,p_calculation_snapshot,jsonb_build_object('source','server_derived','renderer',null),jsonb_build_object('authority','server_derived','engine',p_saved_snapshot#>>'{provenance,calculationEngineKey}','product',p_saved_snapshot#>>'{provenance,financialProductKey}'),((p_saved_snapshot#>>'{strategy,totalCredit,amountCents}')::numeric/100),(p_saved_snapshot#>>'{strategy,quotaCount}')::integer)
  returning * into v_sim;
  v_number:='PROP-PAT-'||upper(substr(replace(p_proposal_id::text,'-',''),1,12));
  insert into public.crm_lead_commercial_proposals(id,organization_id,lead_id,simulation_id,created_by,title,source_suggestion,status,proposal_number,root_proposal_id,version,original_snapshot,saved_snapshot,summary,metadata,snapshot_schema_version,commercial_terms_hash,snapshot_authority)
  values(p_proposal_id,p_organization_id,p_lead_id,p_simulation_id,p_actor_id,'Proposta Patrimonial Rodobens 2227','patrimonial','generated',v_number,p_proposal_id,1,p_saved_snapshot,p_saved_snapshot,jsonb_build_object('totalCreditCents',p_saved_snapshot#>>'{strategy,totalCredit,amountCents}','quotaCount',p_saved_snapshot#>>'{strategy,quotaCount}'),jsonb_build_object('creationMode','server_derived'), 'commercial-proposal/v1',p_commercial_terms_hash,'server_derived') returning * into v_prop;
  insert into public.commercial_proposal_creation_requests(organization_id,idempotency_key,intent_hash,simulation_id,proposal_id,created_by) values(p_organization_id,p_idempotency_key,p_intent_hash,p_simulation_id,p_proposal_id,p_actor_id);
  insert into public.commercial_proposal_audit_events(organization_id,root_proposal_id,proposal_id,proposal_number,proposal_version,lead_id,simulation_id,event_type,metadata,snapshot_hash,correlation_id,created_by)
  values(p_organization_id,p_proposal_id,p_proposal_id,v_number,1,p_lead_id,p_simulation_id,'server_derived_proposal_created',jsonb_build_object('authority','server_derived','engineKey',p_saved_snapshot#>>'{provenance,calculationEngineKey}','engineVersion',p_saved_snapshot#>>'{provenance,calculationEngineVersion}','productKey',p_saved_snapshot#>>'{provenance,financialProductKey}','productVersion',p_saved_snapshot#>>'{provenance,financialProductVersion}','idempotencyKey',p_idempotency_key),p_commercial_terms_hash,v_correlation,p_actor_id);
  return jsonb_build_object('outcome','created','proposal',to_jsonb(v_prop),'simulation',to_jsonb(v_sim));
exception when unique_violation then
  select * into v_existing from public.commercial_proposal_creation_requests where organization_id=p_organization_id and idempotency_key=p_idempotency_key;
  if found and v_existing.intent_hash=p_intent_hash then select * into v_prop from public.crm_lead_commercial_proposals where id=v_existing.proposal_id; select * into v_sim from public.crm_lead_simulations where id=v_existing.simulation_id; return jsonb_build_object('outcome','already_created','proposal',to_jsonb(v_prop),'simulation',to_jsonb(v_sim)); end if;
  raise exception using errcode='P0001',message='CP_IDEMPOTENCY_CONFLICT';
end $$;

revoke all on function public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.create_server_derived_patrimonial_proposal_transaction(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb,jsonb,text) to service_role;
