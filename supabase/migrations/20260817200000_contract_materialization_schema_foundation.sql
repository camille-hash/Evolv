-- CONTRACT-024B-01 C4 - append-only, tenant-aware contract materialization schema.
do $$ begin
  if to_regclass('public.contracts') is null or to_regclass('public.crm_lead_commercial_proposals') is null or to_regprocedure('public.commercial_proposal_terms_hash(jsonb)') is null then
    raise exception 'C4_PRECHECK_MISSING_FOUNDATION';
  end if;
  if to_regclass('public.contract_materializations') is not null then raise exception 'C4_PRECHECK_TARGET_EXISTS'; end if;
end $$;

alter table public.clients add constraint clients_organization_id_id_key unique (organization_id,id);
alter table public.crm_lead_commercial_proposals add constraint crm_lead_commercial_proposals_materialization_source_key
  unique (organization_id,id,root_proposal_id,lead_id,simulation_id,proposal_number,version);
alter table public.crm_lead_commercial_proposals add constraint crm_lead_commercial_proposals_materialization_root_key
  unique (organization_id,id,root_proposal_id);

create or replace function public.commercial_proposal_composition_hash(p_snapshot jsonb)
returns text language sql immutable strict set search_path=public,extensions,pg_temp as $$
  select encode(extensions.digest(convert_to(public.commercial_proposal_canonical_json(p_snapshot->'composition'),'UTF8'),'sha256'),'hex')
$$;

create table public.contract_materializations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_root_proposal_id uuid not null,
  source_proposal_version_id uuid not null,
  source_proposal_number text not null check(btrim(source_proposal_number)<>''),
  source_proposal_version integer not null check(source_proposal_version>0),
  source_simulation_id uuid not null references public.crm_lead_simulations(id) on delete restrict,
  lead_id uuid not null references public.crm_leads(id) on delete restrict,
  client_id uuid not null,
  snapshot_schema_version text not null check(snapshot_schema_version='commercial-proposal/v1'),
  snapshot_authority text not null check(snapshot_authority in('server_derived','server_verified')),
  commercial_terms_hash text not null check(commercial_terms_hash~'^[0-9a-f]{64}$'),
  composition_hash text not null check(composition_hash~'^[0-9a-f]{64}$'),
  materialized_snapshot jsonb not null,
  item_count integer not null check(item_count>0),
  total_credit_amount numeric(14,2) not null check(total_credit_amount>0),
  idempotency_key text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint contract_materializations_org_id_key unique(organization_id,id),
  constraint contract_materializations_root_unique unique(organization_id,source_root_proposal_id),
  constraint contract_materializations_root_fkey foreign key(organization_id,source_root_proposal_id,source_root_proposal_id)
    references public.crm_lead_commercial_proposals(organization_id,id,root_proposal_id) on delete restrict,
  constraint contract_materializations_version_fkey foreign key(organization_id,source_proposal_version_id,source_root_proposal_id,lead_id,source_simulation_id,source_proposal_number,source_proposal_version)
    references public.crm_lead_commercial_proposals(organization_id,id,root_proposal_id,lead_id,simulation_id,proposal_number,version) on delete restrict,
  constraint contract_materializations_client_fkey foreign key(organization_id,client_id) references public.clients(organization_id,id) on delete restrict,
  constraint contract_materializations_snapshot_check check(jsonb_typeof(materialized_snapshot)='object' and materialized_snapshot->>'schemaVersion'=snapshot_schema_version and materialized_snapshot#>>'{provenance,authority}'=snapshot_authority),
  constraint contract_materializations_hash_check check(public.commercial_proposal_terms_hash(materialized_snapshot)=commercial_terms_hash and public.commercial_proposal_composition_hash(materialized_snapshot)=composition_hash),
  constraint contract_materializations_totals_check check(jsonb_typeof(materialized_snapshot->'composition')='array' and jsonb_array_length(materialized_snapshot->'composition')=item_count and ((materialized_snapshot#>>'{strategy,totalCredit,amountCents}')::numeric/100)=total_credit_amount)
);
create unique index contract_materializations_idempotency_uidx on public.contract_materializations(organization_id,idempotency_key) where idempotency_key is not null;
create index contract_materializations_version_idx on public.contract_materializations(organization_id,source_proposal_version_id);
create index contract_materializations_client_idx on public.contract_materializations(organization_id,client_id,created_at desc);

create or replace function public.validate_contract_materialization_source()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_proposal public.crm_lead_commercial_proposals%rowtype;
begin
  select * into v_proposal from public.crm_lead_commercial_proposals where id=new.source_proposal_version_id and organization_id=new.organization_id;
  if not found or new.materialized_snapshot is distinct from v_proposal.saved_snapshot or new.snapshot_schema_version is distinct from v_proposal.snapshot_schema_version or
    new.snapshot_authority is distinct from v_proposal.snapshot_authority or new.commercial_terms_hash is distinct from v_proposal.commercial_terms_hash
  then raise exception using errcode='P0001',message='CONTRACT_MATERIALIZATION_SOURCE_MISMATCH'; end if;
  return new;
end $$;
create trigger contract_materializations_validate_source before insert on public.contract_materializations for each row execute function public.validate_contract_materialization_source();

alter table public.contracts add column contract_materialization_id uuid, add column source_composition_item_key text, add column commercial_catalog_code text;
alter table public.contracts add constraint contracts_materialization_fkey foreign key(organization_id,contract_materialization_id) references public.contract_materializations(organization_id,id) on delete restrict;
alter table public.contracts add constraint contracts_materialization_fields_check check(
  (contract_materialization_id is null and source_composition_item_key is null and commercial_catalog_code is null) or
  (contract_materialization_id is not null and nullif(btrim(source_composition_item_key),'') is not null)
);
create unique index contracts_materialization_item_uidx on public.contracts(contract_materialization_id,source_composition_item_key) where contract_materialization_id is not null;
create index contracts_materialization_idx on public.contracts(organization_id,contract_materialization_id);

create or replace function public.protect_contract_materialization_foundation()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_materialization public.contract_materializations%rowtype; v_item jsonb;
begin
  if tg_table_name='contract_materializations' then
    raise exception using errcode='P0001',message='CONTRACT_MATERIALIZATION_IMMUTABLE';
  end if;
  if tg_op='INSERT' and new.contract_materialization_id is not null then
    if current_user<>'postgres' then raise exception using errcode='42501',message='CONTRACT_MATERIALIZATION_INTERNAL_ONLY'; end if;
    select * into v_materialization from public.contract_materializations where id=new.contract_materialization_id and organization_id=new.organization_id;
    select value into v_item from jsonb_array_elements(v_materialization.materialized_snapshot->'composition') where value->>'itemKey'=new.source_composition_item_key;
    if not found or new.status<>'draft' or new.source_proposal_id is distinct from v_materialization.source_proposal_version_id or new.source_proposal_version is distinct from v_materialization.source_proposal_version or
      new.lead_id is distinct from v_materialization.lead_id or new.client_id is distinct from v_materialization.client_id or new.proposal_snapshot is distinct from v_item or
      new.commercial_catalog_code is distinct from v_item->>'commercialCatalogCode' or new.contract_group is distinct from v_materialization.materialized_snapshot#>>'{product,groupCode}' or
      new.credit_amount is distinct from ((v_item#>>'{credit,amountCents}')::numeric/100) or new.installment_amount is distinct from ((v_item#>>'{installmentPhases,0,installmentAmount,amountCents}')::numeric/100) or
      new.term_months is distinct from (v_item->>'termMonths')::integer
    then raise exception using errcode='P0001',message='CONTRACT_MATERIALIZATION_ITEM_INVALID'; end if;
  end if;
  if tg_op='UPDATE' and old.contract_materialization_id is not null and (
    old.contract_materialization_id is distinct from new.contract_materialization_id or old.source_composition_item_key is distinct from new.source_composition_item_key or
    old.commercial_catalog_code is distinct from new.commercial_catalog_code or old.source_proposal_id is distinct from new.source_proposal_id or
    old.source_proposal_version is distinct from new.source_proposal_version or old.proposal_snapshot is distinct from new.proposal_snapshot
  ) then raise exception using errcode='P0001',message='CONTRACT_MATERIALIZATION_ITEM_IMMUTABLE'; end if;
  return new;
end $$;
create trigger contract_materializations_append_only before update or delete on public.contract_materializations for each row execute function public.protect_contract_materialization_foundation();
create trigger contracts_materialization_identity before insert or update on public.contracts for each row execute function public.protect_contract_materialization_foundation();

alter table public.contract_materializations enable row level security;
revoke all on table public.contract_materializations from public,anon,authenticated;
grant select,insert on table public.contract_materializations to service_role;
grant select on table public.contract_materializations to authenticated;
create policy "organizations can read contract materializations" on public.contract_materializations for select to authenticated using(
  organization_id=public.evolv_current_organization_id()
);

comment on table public.contract_materializations is 'One immutable completed materialization per commercial proposal lineage; rows are created atomically by the future C5 internal RPC.';
comment on column public.contracts.source_proposal_id is 'For materialized contracts, the exact proposal version captured; legacy semantics remain unchanged.';
comment on column public.contracts.source_composition_item_key is 'Stable commercial composition item identity; never an operational quota or contract number.';
