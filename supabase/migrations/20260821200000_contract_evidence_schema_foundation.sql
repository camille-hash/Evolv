-- CONTRACT-024C-01 C8A - immutable, tenant-aware contract evidence schema foundation.
-- C8A deliberately exposes no write command and creates no storage or financial effect.

do $$
begin
  if to_regclass('public.contracts') is null
    or to_regclass('public.profiles') is null
    or to_regclass('public.administrators') is null
    or to_regclass('public.organizations') is null
    or to_regprocedure('public.evolv_current_organization_id()') is null
    or not exists (
      select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
      where e.extname = 'pgcrypto' and n.nspname = 'extensions'
    ) then
    raise exception 'C8A_PRECHECK_MISSING_FOUNDATION';
  end if;

  if to_regclass('public.contract_evidences') is not null
    or to_regclass('public.contract_signed_evidence_details') is not null
    or to_regclass('public.contract_first_installment_payment_evidence_details') is not null
    or to_regclass('public.contract_patrion_receipt_evidence_details') is not null
    or to_regclass('public.contract_evidence_audit_events') is not null then
    raise exception 'C8A_PRECHECK_TARGET_EXISTS';
  end if;

  if not exists (
    select 1
    from pg_index i
    join pg_class t on t.oid = i.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'contracts' and i.indisunique
      and pg_get_indexdef(i.indexrelid) like '%(organization_id, id)%'
  ) then
    raise exception 'C8A_PRECHECK_CONTRACT_TENANT_KEY_MISSING';
  end if;
end
$$;

-- Composite identities support tenant-aware foreign keys without weakening existing PKs.
create unique index profiles_organization_id_id_uidx
  on public.profiles (organization_id, id);
create unique index administrators_organization_id_id_uidx
  on public.administrators (organization_id, id);

create table public.contract_evidences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid not null,
  evidence_type text not null,
  status text not null default 'recorded',
  source text not null,
  external_reference text,
  event_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid,
  validated_at timestamptz,
  validated_by uuid,
  storage_bucket text,
  storage_object_path text,
  content_sha256 bytea,
  media_type text,
  file_size bigint,
  correlation_id uuid not null default gen_random_uuid(),
  idempotency_key text not null,
  schema_version integer not null default 1,
  supersedes_evidence_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint contract_evidences_type_check check (
    evidence_type in ('signed_contract', 'first_installment_payment', 'patrion_commission_receipt')
  ),
  constraint contract_evidences_status_check check (
    status in ('recorded', 'validated', 'invalidated', 'superseded')
  ),
  constraint contract_evidences_source_check check (
    source in ('manual', 'rpa', 'administrator_integration', 'webhook')
  ),
  constraint contract_evidences_schema_version_check check (schema_version = 1),
  constraint contract_evidences_external_reference_check check (
    (source = 'manual' and (external_reference is null or nullif(btrim(external_reference), '') is not null))
    or (source <> 'manual' and nullif(btrim(external_reference), '') is not null)
  ),
  constraint contract_evidences_idempotency_key_check check (
    idempotency_key ~ '^[A-Za-z0-9._:-]{8,128}$'
  ),
  constraint contract_evidences_manual_actor_check check (
    source <> 'manual' or recorded_by is not null
  ),
  constraint contract_evidences_validation_pair_check check (
    (validated_at is null) = (validated_by is null)
    and (status <> 'validated' or validated_at is not null)
    and (status <> 'recorded' or validated_at is null)
  ),
  constraint contract_evidences_storage_check check (
    (
      storage_bucket is null and storage_object_path is null and content_sha256 is null
      and media_type is null and file_size is null
    ) or (
      nullif(btrim(storage_bucket), '') is not null
      and nullif(btrim(storage_object_path), '') is not null
      and octet_length(content_sha256) = 32
      and nullif(btrim(media_type), '') is not null
      and file_size > 0
    )
  ),
  constraint contract_evidences_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint contract_evidences_not_self_superseding_check check (
    supersedes_evidence_id is null or supersedes_evidence_id <> id
  ),
  constraint contract_evidences_org_id_key unique (organization_id, id),
  constraint contract_evidences_typed_identity_key unique (organization_id, id, contract_id, evidence_type),
  constraint contract_evidences_contract_fkey foreign key (organization_id, contract_id)
    references public.contracts(organization_id, id) on delete restrict,
  constraint contract_evidences_recorded_by_fkey foreign key (organization_id, recorded_by)
    references public.profiles(organization_id, id) on delete restrict,
  constraint contract_evidences_validated_by_fkey foreign key (organization_id, validated_by)
    references public.profiles(organization_id, id) on delete restrict,
  constraint contract_evidences_supersedes_fkey
    foreign key (organization_id, supersedes_evidence_id, contract_id, evidence_type)
    references public.contract_evidences(organization_id, id, contract_id, evidence_type)
    on delete restrict deferrable initially deferred
);

create table public.contract_signed_evidence_details (
  evidence_id uuid primary key,
  organization_id uuid not null,
  contract_id uuid not null,
  evidence_type text not null default 'signed_contract'
    check (evidence_type = 'signed_contract'),
  signature_method text not null check (nullif(btrim(signature_method), '') is not null),
  document_version text check (document_version is null or nullif(btrim(document_version), '') is not null),
  provider_name text check (provider_name is null or nullif(btrim(provider_name), '') is not null),
  provider_reference text check (provider_reference is null or nullif(btrim(provider_reference), '') is not null),
  effective_signed_at timestamptz not null,
  signatories jsonb not null default '[]'::jsonb,
  constraint contract_signed_details_signatories_check check (
    jsonb_typeof(signatories) = 'array'
    and jsonb_array_length(signatories) > 0
    and not jsonb_path_exists(signatories, '$[*] ? (@.type() != "object")')
  ),
  constraint contract_signed_details_evidence_fkey
    foreign key (organization_id, evidence_id, contract_id, evidence_type)
    references public.contract_evidences(organization_id, id, contract_id, evidence_type)
    on delete cascade deferrable initially deferred
);

create table public.contract_first_installment_payment_evidence_details (
  evidence_id uuid primary key,
  organization_id uuid not null,
  contract_id uuid not null,
  evidence_type text not null default 'first_installment_payment'
    check (evidence_type = 'first_installment_payment'),
  administrator_id uuid not null,
  billing_reference text not null check (nullif(btrim(billing_reference), '') is not null),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  due_at timestamptz not null,
  paid_at timestamptz not null,
  confirmation_reference text check (
    confirmation_reference is null or nullif(btrim(confirmation_reference), '') is not null
  ),
  constraint contract_first_payment_evidence_fkey
    foreign key (organization_id, evidence_id, contract_id, evidence_type)
    references public.contract_evidences(organization_id, id, contract_id, evidence_type)
    on delete cascade deferrable initially deferred,
  constraint contract_first_payment_administrator_fkey
    foreign key (organization_id, administrator_id)
    references public.administrators(organization_id, id) on delete restrict
);

create table public.contract_patrion_receipt_evidence_details (
  evidence_id uuid primary key,
  organization_id uuid not null,
  contract_id uuid not null,
  evidence_type text not null default 'patrion_commission_receipt'
    check (evidence_type = 'patrion_commission_receipt'),
  expected_revenue_entry_id uuid,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  received_at timestamptz not null,
  receipt_reference text,
  competence_date date not null,
  attributable_amount_cents bigint not null,
  constraint contract_patrion_receipt_reference_check check (
    receipt_reference is null or nullif(btrim(receipt_reference), '') is not null
  ),
  constraint contract_patrion_receipt_amount_check check (
    attributable_amount_cents > 0 and attributable_amount_cents <= amount_cents
  ),
  constraint contract_patrion_receipt_evidence_fkey
    foreign key (organization_id, evidence_id, contract_id, evidence_type)
    references public.contract_evidences(organization_id, id, contract_id, evidence_type)
    on delete cascade deferrable initially deferred
);

comment on column public.contract_patrion_receipt_evidence_details.expected_revenue_entry_id is
  'Reserved correlation only in C8A. No FK is asserted because expected_revenue_entries lacks a proven tenant-aware composite key; C12 must validate and add the relationship.';

create unique index contract_evidences_idempotency_uidx
  on public.contract_evidences (organization_id, evidence_type, source, idempotency_key);
create unique index contract_evidences_external_reference_uidx
  on public.contract_evidences (organization_id, evidence_type, source, external_reference)
  where external_reference is not null;
create unique index contract_evidences_current_validated_uidx
  on public.contract_evidences (organization_id, contract_id, evidence_type)
  where status = 'validated' and evidence_type in ('signed_contract', 'first_installment_payment');
create unique index contract_evidences_supersedes_once_uidx
  on public.contract_evidences (organization_id, supersedes_evidence_id)
  where supersedes_evidence_id is not null;
create unique index contract_patrion_receipt_reference_uidx
  on public.contract_patrion_receipt_evidence_details (organization_id, receipt_reference)
  where receipt_reference is not null;
create index contract_evidences_contract_idx
  on public.contract_evidences (organization_id, contract_id);
create index contract_evidences_type_status_idx
  on public.contract_evidences (contract_id, evidence_type, status);
create index contract_evidences_recorded_at_idx
  on public.contract_evidences (organization_id, recorded_at desc);

comment on index public.contract_evidences_current_validated_uidx is
  'Current means status=validated. Superseding/invalidation commands in C8B must atomically move the previous current row out of validated before validating its successor.';

create or replace function public.validate_contract_evidence_detail_cardinality()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  v_evidence_id uuid := coalesce(
    nullif(to_jsonb(new)->>'evidence_id', '')::uuid,
    nullif(to_jsonb(new)->>'id', '')::uuid,
    nullif(to_jsonb(old)->>'evidence_id', '')::uuid,
    nullif(to_jsonb(old)->>'id', '')::uuid
  );
  v_type text;
  v_signed integer;
  v_payment integer;
  v_receipt integer;
begin
  select evidence_type into v_type from public.contract_evidences where id = v_evidence_id;
  if not found then
    return null;
  end if;

  select count(*) into v_signed from public.contract_signed_evidence_details where evidence_id = v_evidence_id;
  select count(*) into v_payment from public.contract_first_installment_payment_evidence_details where evidence_id = v_evidence_id;
  select count(*) into v_receipt from public.contract_patrion_receipt_evidence_details where evidence_id = v_evidence_id;

  if v_signed + v_payment + v_receipt <> 1
    or (v_type = 'signed_contract' and v_signed <> 1)
    or (v_type = 'first_installment_payment' and v_payment <> 1)
    or (v_type = 'patrion_commission_receipt' and v_receipt <> 1) then
    raise exception using errcode = '23514', message = 'C8A_EVIDENCE_DETAIL_CARDINALITY_INVALID';
  end if;
  return null;
end
$$;

create constraint trigger contract_evidences_detail_cardinality
after insert or update or delete on public.contract_evidences
deferrable initially deferred for each row
execute function public.validate_contract_evidence_detail_cardinality();
create constraint trigger contract_signed_details_cardinality
after insert or update or delete on public.contract_signed_evidence_details
deferrable initially deferred for each row
execute function public.validate_contract_evidence_detail_cardinality();
create constraint trigger contract_first_payment_details_cardinality
after insert or update or delete on public.contract_first_installment_payment_evidence_details
deferrable initially deferred for each row
execute function public.validate_contract_evidence_detail_cardinality();
create constraint trigger contract_patrion_receipt_details_cardinality
after insert or update or delete on public.contract_patrion_receipt_evidence_details
deferrable initially deferred for each row
execute function public.validate_contract_evidence_detail_cardinality();

create or replace function public.validate_contract_evidence_supersession()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_cycle boolean;
begin
  if new.supersedes_evidence_id is null then return null; end if;
  with recursive chain(id, supersedes_evidence_id) as (
    select e.id, e.supersedes_evidence_id
    from public.contract_evidences e where e.id = new.supersedes_evidence_id
    union all
    select e.id, e.supersedes_evidence_id
    from public.contract_evidences e join chain c on e.id = c.supersedes_evidence_id
  ) cycle id set is_cycle using path
  select coalesce(bool_or(id = new.id or is_cycle), false) into v_cycle from chain;
  if v_cycle then
    raise exception using errcode = '23514', message = 'C8A_EVIDENCE_SUPERSESSION_CYCLE';
  end if;
  return null;
end
$$;

create constraint trigger contract_evidences_supersession_acyclic
after insert or update on public.contract_evidences
deferrable initially deferred for each row
execute function public.validate_contract_evidence_supersession();

create or replace function public.contract_evidence_audit_event_hash(
  p_organization_id uuid, p_contract_id uuid, p_evidence_id uuid, p_event_type text,
  p_actor_id uuid, p_actor_role text, p_origin text, p_reason text,
  p_before_status text, p_after_status text, p_correlation_id uuid, p_causation_id uuid,
  p_idempotency_key text, p_payload_schema_version integer, p_payload jsonb,
  p_previous_event_hash bytea, p_occurred_at timestamptz
) returns bytea language sql immutable set search_path = public, extensions, pg_temp as $$
  select extensions.digest(convert_to(jsonb_build_object(
    'organizationId', p_organization_id, 'contractId', p_contract_id, 'evidenceId', p_evidence_id,
    'eventType', p_event_type, 'actorId', p_actor_id, 'actorRole', p_actor_role,
    'origin', p_origin, 'reason', p_reason, 'beforeStatus', p_before_status,
    'afterStatus', p_after_status, 'correlationId', p_correlation_id,
    'causationId', p_causation_id, 'idempotencyKey', p_idempotency_key,
    'payloadSchemaVersion', p_payload_schema_version, 'payload', p_payload,
    'previousEventHash', encode(p_previous_event_hash, 'hex'),
    'occurredAtEpoch', extract(epoch from p_occurred_at)
  )::text, 'UTF8'), 'sha256')
$$;

create table public.contract_evidence_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid not null,
  evidence_id uuid not null,
  event_type text not null check (event_type in (
    'evidence_recorded', 'evidence_validated', 'evidence_invalidated', 'evidence_superseded'
  )),
  actor_id uuid not null,
  actor_role text not null check (actor_role in ('master', 'admin', 'system')),
  origin text not null check (origin in ('manual', 'rpa', 'administrator_integration', 'webhook')),
  reason text,
  before_status text check (before_status is null or before_status in ('recorded', 'validated', 'invalidated', 'superseded')),
  after_status text not null check (after_status in ('recorded', 'validated', 'invalidated', 'superseded')),
  correlation_id uuid not null,
  causation_id uuid,
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9._:-]{8,128}$'),
  payload_schema_version integer not null default 1 check (payload_schema_version = 1),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  previous_event_hash bytea,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  event_hash bytea generated always as (public.contract_evidence_audit_event_hash(
    organization_id, contract_id, evidence_id, event_type, actor_id, actor_role, origin,
    reason, before_status, after_status, correlation_id, causation_id, idempotency_key,
    payload_schema_version, payload, previous_event_hash, occurred_at
  )) stored,
  constraint contract_evidence_audit_hash_check check (octet_length(event_hash) = 32),
  constraint contract_evidence_audit_previous_hash_check check (
    previous_event_hash is null or octet_length(previous_event_hash) = 32
  ),
  constraint contract_evidence_audit_contract_fkey foreign key (organization_id, contract_id)
    references public.contracts(organization_id, id) on delete restrict,
  constraint contract_evidence_audit_evidence_fkey foreign key (organization_id, evidence_id)
    references public.contract_evidences(organization_id, id) on delete restrict,
  constraint contract_evidence_audit_actor_fkey foreign key (organization_id, actor_id)
    references public.profiles(organization_id, id) on delete restrict
);

create index contract_evidence_audit_evidence_idx
  on public.contract_evidence_audit_events (organization_id, evidence_id, recorded_at);
create index contract_evidence_audit_contract_idx
  on public.contract_evidence_audit_events (organization_id, contract_id, recorded_at desc);

comment on column public.contract_evidence_audit_events.event_hash is
  'Deterministic individual integrity hash. It is not an external digital signature. C8B will serialize commands and enforce previous_event_hash chaining under row locks.';

create or replace function public.prevent_contract_evidence_rewrite()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception using errcode = 'P0001', message = 'C8A_CONTRACT_EVIDENCE_IMMUTABLE';
end
$$;

create trigger contract_evidences_immutable
before update or delete on public.contract_evidences
for each row execute function public.prevent_contract_evidence_rewrite();
create trigger contract_signed_evidence_details_immutable
before update or delete on public.contract_signed_evidence_details
for each row execute function public.prevent_contract_evidence_rewrite();
create trigger contract_first_payment_evidence_details_immutable
before update or delete on public.contract_first_installment_payment_evidence_details
for each row execute function public.prevent_contract_evidence_rewrite();
create trigger contract_patrion_receipt_evidence_details_immutable
before update or delete on public.contract_patrion_receipt_evidence_details
for each row execute function public.prevent_contract_evidence_rewrite();
create trigger contract_evidence_audit_events_append_only
before update or delete on public.contract_evidence_audit_events
for each row execute function public.prevent_contract_evidence_rewrite();

alter table public.contract_evidences enable row level security;
alter table public.contract_signed_evidence_details enable row level security;
alter table public.contract_first_installment_payment_evidence_details enable row level security;
alter table public.contract_patrion_receipt_evidence_details enable row level security;
alter table public.contract_evidence_audit_events enable row level security;

revoke all on table public.contract_evidences from public, anon, authenticated, service_role;
revoke all on table public.contract_signed_evidence_details from public, anon, authenticated, service_role;
revoke all on table public.contract_first_installment_payment_evidence_details from public, anon, authenticated, service_role;
revoke all on table public.contract_patrion_receipt_evidence_details from public, anon, authenticated, service_role;
revoke all on table public.contract_evidence_audit_events from public, anon, authenticated, service_role;

grant select on table public.contract_evidences to authenticated;
grant select on table public.contract_signed_evidence_details to authenticated;
grant select on table public.contract_first_installment_payment_evidence_details to authenticated;
grant select on table public.contract_patrion_receipt_evidence_details to authenticated;
grant select on table public.contract_evidence_audit_events to authenticated;

create policy "active tenant profiles can read contract evidences"
on public.contract_evidences for select to authenticated using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master', 'admin', 'sdr')
);
create policy "active tenant profiles can read signed evidence details"
on public.contract_signed_evidence_details for select to authenticated using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master', 'admin', 'sdr')
);
create policy "active tenant profiles can read first payment evidence details"
on public.contract_first_installment_payment_evidence_details for select to authenticated using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master', 'admin', 'sdr')
);
create policy "active tenant profiles can read patrion receipt evidence details"
on public.contract_patrion_receipt_evidence_details for select to authenticated using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master', 'admin', 'sdr')
);
create policy "active tenant profiles can read contract evidence audit"
on public.contract_evidence_audit_events for select to authenticated using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master', 'admin', 'sdr')
);

comment on table public.contract_evidences is
  'C8A immutable evidence envelope. No public write command exists until C8B.';
comment on table public.contract_evidence_audit_events is
  'C8A append-only evidence audit foundation; writes remain owner-only until C8B.';
