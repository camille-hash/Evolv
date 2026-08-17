-- CONTRACT-024B-01 C5 - atomic, idempotent materialization of an approved V1 proposal.
do $$ begin
  if to_regclass('public.contract_materializations') is null
    or to_regprocedure('public.commercial_proposal_composition_hash(jsonb)') is null then
    raise exception 'C5_PRECHECK_MISSING_C4';
  end if;
end $$;

create table public.contract_materialization_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  materialization_id uuid not null,
  source_root_proposal_id uuid not null,
  source_proposal_version_id uuid not null,
  source_simulation_id uuid not null,
  lead_id uuid not null,
  client_id uuid not null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type = 'contract_materialized'),
  snapshot_authority text not null,
  commercial_terms_hash text not null,
  composition_hash text not null,
  contract_count integer not null check (contract_count > 0),
  total_credit_amount numeric(14,2) not null check (total_credit_amount > 0),
  correlation_key text,
  created_at timestamptz not null default now(),
  constraint contract_materialization_audit_materialization_fkey
    foreign key (organization_id, materialization_id)
    references public.contract_materializations(organization_id,id) on delete restrict,
  constraint contract_materialization_audit_once unique (materialization_id, event_type)
);
create index contract_materialization_audit_root_idx
  on public.contract_materialization_audit_events(organization_id,source_root_proposal_id,created_at desc);

create or replace function public.prevent_contract_materialization_audit_rewrite()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  raise exception using errcode='P0001',message='CONTRACT_MATERIALIZATION_AUDIT_IMMUTABLE';
end $$;
create trigger contract_materialization_audit_append_only
before update or delete on public.contract_materialization_audit_events
for each row execute function public.prevent_contract_materialization_audit_rewrite();

alter table public.contract_materialization_audit_events enable row level security;
revoke all on table public.contract_materialization_audit_events from public,anon,authenticated;
grant select on table public.contract_materialization_audit_events to authenticated;
create policy "organizations can read contract materialization audit"
on public.contract_materialization_audit_events for select to authenticated
using (organization_id=public.evolv_current_organization_id());

create or replace function public.guard_materialized_proposal_lineage()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_root_id uuid;
begin
  v_root_id:=coalesce(new.root_proposal_id,old.root_proposal_id,new.id,old.id);
  if exists(select 1 from public.contract_materializations where source_root_proposal_id=v_root_id) then
    if tg_op='INSERT' or old.status is distinct from new.status
      or old.saved_snapshot is distinct from new.saved_snapshot
      or old.original_snapshot is distinct from new.original_snapshot
      or old.root_proposal_id is distinct from new.root_proposal_id
      or old.previous_version_id is distinct from new.previous_version_id
      or old.version is distinct from new.version
      or old.simulation_id is distinct from new.simulation_id
      or old.lead_id is distinct from new.lead_id
      or old.commercial_terms_hash is distinct from new.commercial_terms_hash
      or old.snapshot_authority is distinct from new.snapshot_authority then
      raise exception using errcode='P0001',message='MAT_LINEAGE_LOCKED_BY_MATERIALIZATION';
    end if;
  end if;
  return new;
end $$;
create trigger crm_proposal_materialized_lineage_guard
before insert or update on public.crm_lead_commercial_proposals
for each row execute function public.guard_materialized_proposal_lineage();

create or replace function public.materialize_approved_commercial_proposal_transaction(
  p_proposal_version_id uuid,
  p_client_id uuid,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $$
declare
  v_actor_id uuid:=auth.uid();
  v_actor_role text;
  v_organization_id uuid;
  v_requested public.crm_lead_commercial_proposals%rowtype;
  v_current public.crm_lead_commercial_proposals%rowtype;
  v_existing public.contract_materializations%rowtype;
  v_materialization public.contract_materializations%rowtype;
  v_client public.clients%rowtype;
  v_admin public.administrators%rowtype;
  v_item jsonb;
  v_contracts jsonb;
  v_item_count integer;
  v_child_count integer;
  v_total numeric(14,2);
  v_child_total numeric(14,2);
  v_composition_hash text;
  v_outcome text:='created';
begin
  if v_actor_id is null then raise exception using errcode='P0001',message='MAT_AUTH_REQUIRED'; end if;
  select organization_id,role into v_organization_id,v_actor_role from public.profiles
  where id=v_actor_id and is_active=true;
  if not found or v_actor_role not in('master','admin') then
    raise exception using errcode='P0001',message='MAT_ACTOR_FORBIDDEN';
  end if;
  if p_idempotency_key is not null and p_idempotency_key!~'^[A-Za-z0-9._:-]{8,128}$' then
    raise exception using errcode='P0001',message='MAT_IDEMPOTENCY_CONFLICT';
  end if;

  select * into v_requested from public.crm_lead_commercial_proposals
  where id=p_proposal_version_id and organization_id=v_organization_id;
  if not found then raise exception using errcode='P0001',message='MAT_PROPOSAL_NOT_FOUND'; end if;
  perform 1 from public.crm_lead_commercial_proposals
  where id=v_requested.root_proposal_id and organization_id=v_organization_id for update;
  select * into v_current from public.crm_lead_commercial_proposals
  where organization_id=v_organization_id and root_proposal_id=v_requested.root_proposal_id
  order by version desc limit 1 for update;
  if v_current.id<>p_proposal_version_id then raise exception using errcode='P0001',message='MAT_VERSION_NOT_CURRENT'; end if;

  if p_idempotency_key is not null and exists(
    select 1 from public.contract_materializations where organization_id=v_organization_id
      and idempotency_key=p_idempotency_key and source_root_proposal_id<>v_current.root_proposal_id
  ) then raise exception using errcode='P0001',message='MAT_IDEMPOTENCY_CONFLICT'; end if;

  select * into v_existing from public.contract_materializations
  where organization_id=v_organization_id and source_root_proposal_id=v_current.root_proposal_id;
  if found then
    if v_existing.source_proposal_version_id<>p_proposal_version_id
      or v_existing.client_id<>p_client_id
      or v_existing.lead_id<>v_current.lead_id
      or v_existing.source_simulation_id is distinct from v_current.simulation_id
      or v_existing.commercial_terms_hash is distinct from v_current.commercial_terms_hash
      or v_existing.composition_hash is distinct from public.commercial_proposal_composition_hash(v_current.saved_snapshot)
    then raise exception using errcode='P0001',message='MAT_ALREADY_MATERIALIZED_CONFLICT'; end if;
    if p_idempotency_key is not null and v_existing.idempotency_key is distinct from p_idempotency_key then
      raise exception using errcode='P0001',message='MAT_IDEMPOTENCY_CONFLICT';
    end if;
    select count(*),coalesce(sum(credit_amount),0),jsonb_agg(to_jsonb(c) order by
      (select (item->>'position')::integer from jsonb_array_elements(v_existing.materialized_snapshot->'composition') item
        where item->>'itemKey'=c.source_composition_item_key),c.source_composition_item_key)
      into v_child_count,v_child_total,v_contracts from public.contracts c
      where contract_materialization_id=v_existing.id;
    if v_child_count<>v_existing.item_count or v_child_total<>v_existing.total_credit_amount
      or (select array_agg(source_composition_item_key order by source_composition_item_key) from public.contracts where contract_materialization_id=v_existing.id)
       is distinct from
       (select array_agg(value->>'itemKey' order by value->>'itemKey') from jsonb_array_elements(v_existing.materialized_snapshot->'composition'))
    then raise exception using errcode='P0001',message='MAT_EXISTING_MATERIALIZATION_INCONSISTENT'; end if;
    return jsonb_build_object('outcome','already_created','materialization',to_jsonb(v_existing),'contracts',coalesce(v_contracts,'[]'::jsonb));
  end if;

  if v_current.status='approval_revoked' or v_current.approval_revoked_at is not null then
    raise exception using errcode='P0001',message='MAT_APPROVAL_REVOKED';
  end if;
  if v_current.status<>'approved' or v_current.approved_at is null or v_current.approved_by is null then
    raise exception using errcode='P0001',message='MAT_PROPOSAL_NOT_APPROVED';
  end if;
  if v_current.simulation_id is null then raise exception using errcode='P0001',message='MAT_SIMULATION_REQUIRED'; end if;
  if not exists(select 1 from public.crm_lead_simulations where id=v_current.simulation_id
    and organization_id=v_organization_id and lead_id=v_current.lead_id) then
    raise exception using errcode='P0001',message='MAT_SIMULATION_MISMATCH';
  end if;
  if v_current.snapshot_schema_version<>'commercial-proposal/v1' then
    raise exception using errcode='P0001',message='MAT_SNAPSHOT_SCHEMA_UNSUPPORTED';
  end if;
  if v_current.snapshot_authority not in('server_derived','server_verified')
    or v_current.saved_snapshot#>>'{provenance,authority}' not in('server_derived','server_verified') then
    raise exception using errcode='P0001',message='MAT_SNAPSHOT_AUTHORITY_INSUFFICIENT';
  end if;
  if not public.commercial_proposal_snapshot_v1_minimally_valid(v_current.saved_snapshot)
    or v_current.saved_snapshot#>>'{provenance,simulationId}'<>v_current.simulation_id::text then
    raise exception using errcode='P0001',message='MAT_SNAPSHOT_INVALID';
  end if;
  if v_current.commercial_terms_hash is null
    or public.commercial_proposal_terms_hash(v_current.saved_snapshot)<>v_current.commercial_terms_hash then
    raise exception using errcode='P0001',message='MAT_SNAPSHOT_HASH_MISMATCH';
  end if;

  v_item_count:=jsonb_array_length(v_current.saved_snapshot->'composition');
  v_total:=((v_current.saved_snapshot#>>'{strategy,totalCredit,amountCents}')::numeric/100);
  v_composition_hash:=public.commercial_proposal_composition_hash(v_current.saved_snapshot);
  if v_item_count<1 or v_total<=0 or exists(
    select 1 from jsonb_array_elements(v_current.saved_snapshot->'composition') item
    where nullif(btrim(item->>'itemKey'),'') is null
      or (item->>'termMonths')::integer<=0
      or (item#>>'{credit,amountCents}')::numeric<=0
      or jsonb_array_length(item->'installmentPhases')<1
      or (item#>>'{installmentPhases,0,installmentAmount,amountCents}')::numeric<0
  ) or (select count(distinct item->>'itemKey') from jsonb_array_elements(v_current.saved_snapshot->'composition') item)<>v_item_count
  then raise exception using errcode='P0001',message='MAT_COMPOSITION_INVALID'; end if;

  select * into v_client from public.clients where id=p_client_id and organization_id=v_organization_id;
  if not found then raise exception using errcode='P0001',message='MAT_CLIENT_NOT_FOUND'; end if;
  if v_client.status<>'active' then raise exception using errcode='P0001',message='MAT_CLIENT_INELIGIBLE'; end if;

  if nullif(v_current.saved_snapshot#>>'{product,administratorTechnicalId}','') is null then
    raise exception using errcode='P0001',message='MAT_ADMINISTRATOR_REFERENCE_REQUIRED';
  end if;
  if v_current.saved_snapshot#>>'{product,administratorTechnicalId}' !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
    raise exception using errcode='P0001',message='MAT_ADMINISTRATOR_REFERENCE_INVALID';
  end if;
  select * into v_admin from public.administrators
  where id=(v_current.saved_snapshot#>>'{product,administratorTechnicalId}')::uuid
    and organization_id=v_organization_id;
  if not found or v_admin.status<>'active'
    or v_admin.slug is distinct from v_current.saved_snapshot#>>'{product,administratorReferenceKey}'
    or lower(v_admin.name) is distinct from lower(v_current.saved_snapshot#>>'{product,administratorDisplayName}') then
    raise exception using errcode='P0001',message='MAT_ADMINISTRATOR_REFERENCE_INVALID';
  end if;

  insert into public.contract_materializations(
    organization_id,source_root_proposal_id,source_proposal_version_id,source_proposal_number,
    source_proposal_version,source_simulation_id,lead_id,client_id,snapshot_schema_version,
    snapshot_authority,commercial_terms_hash,composition_hash,materialized_snapshot,item_count,
    total_credit_amount,idempotency_key,created_by
  ) values(v_organization_id,v_current.root_proposal_id,v_current.id,v_current.proposal_number,
    v_current.version,v_current.simulation_id,v_current.lead_id,p_client_id,v_current.snapshot_schema_version,
    v_current.snapshot_authority,v_current.commercial_terms_hash,v_composition_hash,v_current.saved_snapshot,
    v_item_count,v_total,p_idempotency_key,v_actor_id) returning * into v_materialization;

  for v_item in select value from jsonb_array_elements(v_current.saved_snapshot->'composition') with ordinality order by ordinality loop
    insert into public.contracts(
      organization_id,contract_materialization_id,source_composition_item_key,source_proposal_id,
      source_proposal_version,proposal_snapshot,lead_id,client_id,administrator_id,commission_plan_id,
      contract_group,contract_quota,contract_number,commercial_catalog_code,credit_amount,
      installment_amount,term_months,product_type,status,created_by
    ) values(v_organization_id,v_materialization.id,v_item->>'itemKey',v_current.id,v_current.version,
      v_item,v_current.lead_id,p_client_id,v_admin.id,null,v_current.saved_snapshot#>>'{product,groupCode}',
      null,null,v_item->>'commercialCatalogCode',((v_item#>>'{credit,amountCents}')::numeric/100),
      ((v_item#>>'{installmentPhases,0,installmentAmount,amountCents}')::numeric/100),
      (v_item->>'termMonths')::integer,v_current.saved_snapshot#>>'{product,productKey}','draft',v_actor_id);
  end loop;

  select count(*),coalesce(sum(credit_amount),0),jsonb_agg(to_jsonb(c) order by
    (select (item->>'position')::integer from jsonb_array_elements(v_materialization.materialized_snapshot->'composition') item
      where item->>'itemKey'=c.source_composition_item_key),c.source_composition_item_key)
    into v_child_count,v_child_total,v_contracts from public.contracts c where contract_materialization_id=v_materialization.id;
  if v_child_count<>v_item_count then raise exception using errcode='P0001',message='MAT_CHILD_COUNT_MISMATCH'; end if;
  if v_child_total<>v_total then raise exception using errcode='P0001',message='MAT_CHILD_CREDIT_MISMATCH'; end if;
  if (select array_agg(source_composition_item_key order by source_composition_item_key) from public.contracts where contract_materialization_id=v_materialization.id)
    is distinct from (select array_agg(value->>'itemKey' order by value->>'itemKey') from jsonb_array_elements(v_current.saved_snapshot->'composition')) then
    raise exception using errcode='P0001',message='MAT_CHILD_COUNT_MISMATCH';
  end if;

  insert into public.contract_materialization_audit_events(
    organization_id,materialization_id,source_root_proposal_id,source_proposal_version_id,
    source_simulation_id,lead_id,client_id,actor_id,event_type,snapshot_authority,
    commercial_terms_hash,composition_hash,contract_count,total_credit_amount,correlation_key
  ) values(v_organization_id,v_materialization.id,v_current.root_proposal_id,v_current.id,
    v_current.simulation_id,v_current.lead_id,p_client_id,v_actor_id,'contract_materialized',
    v_current.snapshot_authority,v_current.commercial_terms_hash,v_composition_hash,v_child_count,v_child_total,p_idempotency_key);
  return jsonb_build_object('outcome',v_outcome,'materialization',to_jsonb(v_materialization),'contracts',coalesce(v_contracts,'[]'::jsonb));
exception
  when unique_violation then
    raise exception using errcode='P0001',message='MAT_IDEMPOTENCY_CONFLICT';
  when invalid_text_representation or numeric_value_out_of_range or check_violation then
    raise exception using errcode='P0001',message='MAT_COMPOSITION_INVALID';
end $$;

revoke all on function public.materialize_approved_commercial_proposal_transaction(uuid,uuid,text) from public,anon,service_role;
grant execute on function public.materialize_approved_commercial_proposal_transaction(uuid,uuid,text) to authenticated;

comment on table public.contract_materialization_audit_events is
  'Append-only success audit. A coherent retry reads the original event and never inserts another.';
