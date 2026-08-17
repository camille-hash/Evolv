create extension if not exists pgcrypto with schema extensions;

alter table public.crm_lead_commercial_proposals
  add column if not exists snapshot_schema_version text,
  add column if not exists commercial_terms_hash text,
  add column if not exists snapshot_authority text;

update public.crm_lead_commercial_proposals
set snapshot_schema_version = 'legacy', snapshot_authority = 'legacy', commercial_terms_hash = null
where snapshot_schema_version is null;

alter table public.crm_lead_commercial_proposals
  alter column snapshot_schema_version set default 'legacy',
  alter column snapshot_schema_version set not null,
  alter column snapshot_authority set default 'legacy',
  alter column snapshot_authority set not null,
  add constraint crm_lead_commercial_proposals_snapshot_schema_check
    check (snapshot_schema_version in ('legacy', 'commercial-proposal/v1')),
  add constraint crm_lead_commercial_proposals_snapshot_authority_check
    check (snapshot_authority in ('legacy','server_derived','server_verified','client_structured_legacy','unsupported_for_materialization')),
  add constraint crm_lead_commercial_proposals_snapshot_metadata_check check (
    (snapshot_schema_version = 'legacy' and commercial_terms_hash is null and snapshot_authority = 'legacy') or
    (snapshot_schema_version = 'commercial-proposal/v1' and commercial_terms_hash ~ '^[0-9a-f]{64}$' and snapshot_authority <> 'legacy')
  );

create or replace function public.commercial_proposal_canonical_json(p_value jsonb)
returns text language plpgsql immutable strict set search_path = public, pg_temp as $$
declare v_type text := jsonb_typeof(p_value); v_result text;
begin
  if v_type = 'array' then
    select '[' || coalesce(string_agg(public.commercial_proposal_canonical_json(value), ',' order by ordinality), '') || ']'
      into v_result from jsonb_array_elements(p_value) with ordinality;
    return v_result;
  elsif v_type = 'object' then
    select '{' || coalesce(string_agg(to_jsonb(key)::text || ':' || public.commercial_proposal_canonical_json(value), ',' order by key), '') || '}'
      into v_result from jsonb_each(p_value);
    return v_result;
  end if;
  return p_value::text;
end; $$;

create or replace function public.commercial_proposal_terms_hash(p_snapshot jsonb)
returns text language sql immutable strict set search_path = public, extensions, pg_temp as $$
  select encode(extensions.digest(convert_to(public.commercial_proposal_canonical_json(
    jsonb_build_object(
      'commercialTerms', p_snapshot->'commercialTerms',
      'composition', p_snapshot->'composition',
      'disclosures', coalesce((select jsonb_agg(value order by ordinality) from jsonb_array_elements(coalesce(p_snapshot->'disclosures','[]'::jsonb)) with ordinality where value->>'category' <> 'promotional_presentation'), '[]'::jsonb),
      'product', p_snapshot->'product',
      'strategy', p_snapshot->'strategy'
    )), 'UTF8'), 'sha256'), 'hex')
$$;

create or replace function public.commercial_proposal_snapshot_v1_minimally_valid(p_snapshot jsonb)
returns boolean language sql immutable strict as $$
  select coalesce(jsonb_typeof(p_snapshot) = 'object'
    and p_snapshot->>'schemaVersion' = 'commercial-proposal/v1'
    and p_snapshot->>'proposalKind' in ('standard_simulation','patrimonial_strategy')
    and jsonb_typeof(p_snapshot->'provenance') = 'object'
    and p_snapshot#>>'{provenance,authority}' in ('server_derived','server_verified','client_structured_legacy','unsupported_for_materialization')
    and jsonb_typeof(p_snapshot->'product') = 'object'
    and jsonb_typeof(p_snapshot->'strategy') = 'object'
    and jsonb_typeof(p_snapshot->'composition') = 'array'
    and jsonb_array_length(p_snapshot->'composition') > 0
    and jsonb_typeof(p_snapshot->'commercialTerms') = 'object'
    and jsonb_typeof(p_snapshot->'disclosures') = 'array', false)
$$;

create or replace function public.enforce_commercial_proposal_snapshot_metadata()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_hash text; v_authority text;
begin
  if new.saved_snapshot->>'schemaVersion' = 'commercial-proposal/v1' then
    if not public.commercial_proposal_snapshot_v1_minimally_valid(new.saved_snapshot) then
      raise exception using errcode='P0001', message='CP_SNAPSHOT_INVALID';
    end if;
    v_hash := public.commercial_proposal_terms_hash(new.saved_snapshot);
    v_authority := new.saved_snapshot#>>'{provenance,authority}';
    if tg_op = 'INSERT' and v_authority in ('server_derived','server_verified') then
      v_authority := 'client_structured_legacy';
      new.saved_snapshot := jsonb_set(new.saved_snapshot, '{provenance,authority}', to_jsonb(v_authority));
    end if;
    if tg_op = 'UPDATE' and new.saved_snapshot is not distinct from old.saved_snapshot and
      (new.commercial_terms_hash is distinct from old.commercial_terms_hash or new.snapshot_schema_version is distinct from old.snapshot_schema_version or new.snapshot_authority is distinct from old.snapshot_authority) then
      raise exception using errcode='P0001', message='CP_SNAPSHOT_HASH_MISMATCH';
    end if;
    if new.commercial_terms_hash is not null and new.commercial_terms_hash <> v_hash then
      raise exception using errcode='P0001', message='CP_SNAPSHOT_HASH_MISMATCH';
    end if;
    new.snapshot_schema_version := 'commercial-proposal/v1'; new.commercial_terms_hash := v_hash; new.snapshot_authority := v_authority;
  else
    if new.saved_snapshot ? 'schemaVersion' then raise exception using errcode='P0001', message='CP_SNAPSHOT_SCHEMA_UNSUPPORTED'; end if;
    new.snapshot_schema_version := 'legacy'; new.commercial_terms_hash := null; new.snapshot_authority := 'legacy';
  end if;
  return new;
end; $$;

drop trigger if exists crm_lead_commercial_proposals_snapshot_metadata on public.crm_lead_commercial_proposals;
create trigger crm_lead_commercial_proposals_snapshot_metadata
before insert or update
on public.crm_lead_commercial_proposals for each row execute function public.enforce_commercial_proposal_snapshot_metadata();

create or replace function public.preserve_commercial_proposal_audit_hash()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_hash text;
begin
  select commercial_terms_hash into v_hash from public.crm_lead_commercial_proposals where id = new.proposal_id;
  if v_hash is not null then new.snapshot_hash := v_hash; end if;
  return new;
end; $$;
drop trigger if exists commercial_proposal_audit_snapshot_hash on public.commercial_proposal_audit_events;
create trigger commercial_proposal_audit_snapshot_hash before insert on public.commercial_proposal_audit_events
for each row execute function public.preserve_commercial_proposal_audit_hash();

create index if not exists crm_lead_commercial_proposals_snapshot_eligibility_idx
on public.crm_lead_commercial_proposals (organization_id, root_proposal_id, snapshot_authority)
where snapshot_schema_version = 'commercial-proposal/v1';

revoke all on function public.commercial_proposal_terms_hash(jsonb) from anon;
grant execute on function public.commercial_proposal_terms_hash(jsonb) to authenticated;
