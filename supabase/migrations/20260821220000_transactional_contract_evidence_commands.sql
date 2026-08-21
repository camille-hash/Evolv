-- CONTRACT-024C-01 C8B - internal transactional evidence lifecycle commands.
-- No contract lifecycle or financial effect is introduced by this migration.

do $$
begin
  if to_regclass('public.contract_evidences') is null
    or to_regclass('public.contract_signed_evidence_details') is null
    or to_regclass('public.contract_first_installment_payment_evidence_details') is null
    or to_regclass('public.contract_patrion_receipt_evidence_details') is null
    or to_regclass('public.contract_evidence_audit_events') is null
    or to_regprocedure('public.prevent_contract_evidence_rewrite()') is null
    or to_regprocedure('public.contract_evidence_audit_event_hash(uuid,uuid,uuid,text,uuid,text,text,text,text,text,uuid,uuid,text,integer,jsonb,bytea,timestamptz)') is null then
    raise exception 'C8B_PRECHECK_MISSING_C8A';
  end if;
  if to_regclass('public.contract_evidence_commands') is not null then
    raise exception 'C8B_PRECHECK_TARGET_EXISTS';
  end if;
  if exists (
    select 1 from public.contract_evidence_audit_events
    group by evidence_id having count(*) filter (where previous_event_hash is null) > 1
  ) or exists (
    select 1 from public.contract_evidence_audit_events
    where previous_event_hash is not null
    group by evidence_id, previous_event_hash having count(*) > 1
  ) then
    raise exception 'C8B_PRECHECK_AUDIT_CHAIN_ALREADY_FORKED';
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'evolv_contract_evidence_owner') then
    create role evolv_contract_evidence_owner nologin noinherit bypassrls;
  elsif exists (
    select 1 from pg_roles
    where rolname = 'evolv_contract_evidence_owner' and rolcanlogin
  ) then
    raise exception 'C8B_PRECHECK_OWNER_ROLE_CAN_LOGIN';
  end if;
end
$$;

alter role evolv_contract_evidence_owner nologin noinherit bypassrls;
grant evolv_contract_evidence_owner to postgres;
grant create on schema public to evolv_contract_evidence_owner;

create table public.contract_evidence_commands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  command_type text not null check (command_type in (
    'record_manual_evidence', 'validate_evidence', 'invalidate_evidence', 'supersede_evidence'
  )),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9._:-]{8,128}$'),
  request_hash bytea not null check (octet_length(request_hash) = 32),
  actor_id uuid not null,
  actor_role text not null check (actor_role in ('master', 'admin')),
  contract_id uuid not null,
  evidence_id uuid not null,
  correlation_id uuid not null,
  outcome text not null check (outcome in ('completed', 'already_completed')),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint contract_evidence_commands_time_check check (completed_at >= started_at),
  constraint contract_evidence_commands_org_id_key unique (organization_id, id),
  constraint contract_evidence_commands_idempotency_key
    unique (organization_id, command_type, idempotency_key),
  constraint contract_evidence_commands_actor_fkey foreign key (organization_id, actor_id)
    references public.profiles(organization_id, id) on delete restrict,
  constraint contract_evidence_commands_contract_fkey foreign key (organization_id, contract_id)
    references public.contracts(organization_id, id) on delete restrict,
  constraint contract_evidence_commands_evidence_fkey foreign key (organization_id, evidence_id)
    references public.contract_evidences(organization_id, id) on delete restrict
);

create index contract_evidence_commands_contract_idx
  on public.contract_evidence_commands (organization_id, contract_id, created_at desc);
create index contract_evidence_commands_evidence_idx
  on public.contract_evidence_commands (organization_id, evidence_id, created_at desc);

create unique index contract_evidence_audit_initial_event_uidx
  on public.contract_evidence_audit_events (organization_id, evidence_id)
  where previous_event_hash is null;
create unique index contract_evidence_audit_chain_edge_uidx
  on public.contract_evidence_audit_events (organization_id, evidence_id, previous_event_hash)
  where previous_event_hash is not null;

create or replace function public.contract_evidence_request_hash(p_payload jsonb)
returns bytea language sql immutable
set search_path = public, extensions, pg_temp as $$
  select extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256')
$$;

create or replace function public.contract_evidence_require_internal_actor(
  p_actor_id uuid, out organization_id uuid, out actor_role text
) returns record language plpgsql security invoker
set search_path = public, auth, pg_temp as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'CE_ACTOR_FORBIDDEN';
  end if;
  select p.organization_id, p.role into organization_id, actor_role
  from public.profiles p where p.id = p_actor_id and p.is_active is true;
  if not found or actor_role not in ('master', 'admin') then
    raise exception using errcode = '42501', message = 'CE_ACTOR_FORBIDDEN';
  end if;
end
$$;

create or replace function public.contract_evidence_existing_command_result(
  p_organization_id uuid, p_command_type text, p_idempotency_key text, p_request_hash bytea
) returns jsonb language plpgsql security invoker
set search_path = public, pg_temp as $$
declare v_command public.contract_evidence_commands%rowtype;
begin
  select * into v_command from public.contract_evidence_commands
  where organization_id = p_organization_id and command_type = p_command_type
    and idempotency_key = p_idempotency_key;
  if not found then return null; end if;
  if v_command.request_hash is distinct from p_request_hash then
    raise exception using errcode = 'P0001', message = 'CE_IDEMPOTENCY_CONFLICT';
  end if;
  return jsonb_set(v_command.result, '{outcome}', '"already_completed"'::jsonb, true);
end
$$;

create or replace function public.contract_evidence_insert_typed_detail(
  p_organization_id uuid, p_contract public.contracts, p_evidence_id uuid,
  p_evidence_type text, p_event_at timestamptz, p_has_storage boolean, p_detail jsonb
) returns void language plpgsql security invoker
set search_path = public, pg_temp as $$
declare
  v_amount bigint; v_attributable bigint; v_administrator uuid;
  v_effective_at timestamptz; v_due_at timestamptz; v_type text;
begin
  if p_detail is null or jsonb_typeof(p_detail) <> 'object' then
    raise exception using errcode = 'P0001', message = 'CE_EVIDENCE_DETAIL_INVALID';
  end if;

  if p_evidence_type = 'signed_contract' then
    if p_detail - array['signatureMethod','documentVersion','providerName','providerReference','effectiveSignedAt','signatories'] <> '{}'::jsonb
      or nullif(btrim(p_detail->>'signatureMethod'), '') is null
      or nullif(p_detail->>'effectiveSignedAt', '') is null
      or jsonb_typeof(p_detail->'signatories') <> 'array'
      or jsonb_array_length(p_detail->'signatories') = 0
      or (not p_has_storage and nullif(btrim(p_detail->>'providerReference'), '') is null) then
      raise exception using errcode = 'P0001', message = 'CE_EVIDENCE_DETAIL_INVALID';
    end if;
    begin v_effective_at := (p_detail->>'effectiveSignedAt')::timestamptz;
    exception when others then raise exception using errcode='P0001',message='CE_EVIDENCE_DETAIL_INVALID'; end;
    if v_effective_at is distinct from p_event_at then
      raise exception using errcode='P0001',message='CE_EVIDENCE_DETAIL_INVALID';
    end if;
    insert into public.contract_signed_evidence_details(
      evidence_id, organization_id, contract_id, signature_method, document_version,
      provider_name, provider_reference, effective_signed_at, signatories
    ) values (
      p_evidence_id, p_organization_id, p_contract.id, btrim(p_detail->>'signatureMethod'),
      nullif(btrim(p_detail->>'documentVersion'), ''), nullif(btrim(p_detail->>'providerName'), ''),
      nullif(btrim(p_detail->>'providerReference'), ''), v_effective_at, p_detail->'signatories'
    );
  elsif p_evidence_type = 'first_installment_payment' then
    if p_detail - array['administratorId','billingReference','amountCents','currency','dueAt','paidAt','confirmationReference'] <> '{}'::jsonb
      or nullif(p_detail->>'administratorId', '') is null
      or nullif(btrim(p_detail->>'billingReference'), '') is null
      or jsonb_typeof(p_detail->'amountCents') <> 'number'
      or p_detail->>'currency' <> 'BRL'
      or nullif(p_detail->>'dueAt', '') is null or nullif(p_detail->>'paidAt', '') is null
      or (not p_has_storage and nullif(btrim(p_detail->>'confirmationReference'), '') is null) then
      raise exception using errcode = 'P0001', message = 'CE_EVIDENCE_DETAIL_INVALID';
    end if;
    begin
      v_administrator := (p_detail->>'administratorId')::uuid;
      v_amount := (p_detail->>'amountCents')::bigint;
      v_due_at := (p_detail->>'dueAt')::timestamptz;
      v_effective_at := (p_detail->>'paidAt')::timestamptz;
    exception when others then raise exception using errcode='P0001',message='CE_EVIDENCE_DETAIL_INVALID'; end;
    if v_amount <= 0 or v_effective_at is distinct from p_event_at then
      raise exception using errcode='P0001',message='CE_EVIDENCE_DETAIL_INVALID';
    end if;
    if p_contract.administrator_id is null or p_contract.administrator_id is distinct from v_administrator
      or not exists(select 1 from public.administrators a where a.id=v_administrator and a.organization_id=p_organization_id) then
      raise exception using errcode='P0001',message='CE_CROSS_TENANT_REFERENCE';
    end if;
    insert into public.contract_first_installment_payment_evidence_details(
      evidence_id, organization_id, contract_id, administrator_id, billing_reference,
      amount_cents, currency, due_at, paid_at, confirmation_reference
    ) values (
      p_evidence_id, p_organization_id, p_contract.id, v_administrator,
      btrim(p_detail->>'billingReference'), v_amount, 'BRL', v_due_at, v_effective_at,
      nullif(btrim(p_detail->>'confirmationReference'), '')
    );
  elsif p_evidence_type = 'patrion_commission_receipt' then
    if p_detail - array['expectedRevenueEntryId','amountCents','currency','receivedAt','receiptReference','competenceDate','attributableAmountCents'] <> '{}'::jsonb
      or jsonb_typeof(p_detail->'amountCents') <> 'number'
      or jsonb_typeof(p_detail->'attributableAmountCents') <> 'number'
      or p_detail->>'currency' <> 'BRL'
      or nullif(p_detail->>'receivedAt', '') is null or nullif(p_detail->>'competenceDate', '') is null
      or (not p_has_storage and nullif(btrim(p_detail->>'receiptReference'), '') is null) then
      raise exception using errcode = 'P0001', message = 'CE_EVIDENCE_DETAIL_INVALID';
    end if;
    begin
      v_amount := (p_detail->>'amountCents')::bigint;
      v_attributable := (p_detail->>'attributableAmountCents')::bigint;
      v_effective_at := (p_detail->>'receivedAt')::timestamptz;
    exception when others then raise exception using errcode='P0001',message='CE_EVIDENCE_DETAIL_INVALID'; end;
    if v_amount <= 0 or v_attributable <= 0 or v_attributable > v_amount
      or v_effective_at is distinct from p_event_at then
      raise exception using errcode='P0001',message='CE_EVIDENCE_DETAIL_INVALID';
    end if;
    begin
      insert into public.contract_patrion_receipt_evidence_details(
        evidence_id, organization_id, contract_id, expected_revenue_entry_id, amount_cents,
        currency, received_at, receipt_reference, competence_date, attributable_amount_cents
      ) values (
        p_evidence_id, p_organization_id, p_contract.id,
        nullif(p_detail->>'expectedRevenueEntryId','')::uuid, v_amount, 'BRL', v_effective_at,
        nullif(btrim(p_detail->>'receiptReference'), ''), (p_detail->>'competenceDate')::date,
        v_attributable
      );
    exception when invalid_text_representation or datetime_field_overflow then
      raise exception using errcode='P0001',message='CE_EVIDENCE_DETAIL_INVALID';
    end;
  else
    raise exception using errcode = 'P0001', message = 'CE_EVIDENCE_TYPE_INVALID';
  end if;
exception
  when check_violation or not_null_violation then
    raise exception using errcode='P0001',message='CE_EVIDENCE_DETAIL_INVALID';
end
$$;

create or replace function public.contract_evidence_append_audit_event(
  p_organization_id uuid, p_contract_id uuid, p_evidence_id uuid, p_event_type text,
  p_actor_id uuid, p_actor_role text, p_reason text, p_before_status text, p_after_status text,
  p_correlation_id uuid, p_causation_id uuid, p_idempotency_key text, p_payload jsonb
) returns uuid language plpgsql security invoker
set search_path = public, pg_temp as $$
declare v_previous bytea; v_event_id uuid; v_occurred_at timestamptz := clock_timestamp();
begin
  perform 1 from public.contract_evidences where id=p_evidence_id and organization_id=p_organization_id for update;
  select event_hash into v_previous from public.contract_evidence_audit_events
  where organization_id=p_organization_id and evidence_id=p_evidence_id
  order by occurred_at desc, recorded_at desc, id desc limit 1;
  insert into public.contract_evidence_audit_events(
    organization_id,contract_id,evidence_id,event_type,actor_id,actor_role,origin,reason,
    before_status,after_status,correlation_id,causation_id,idempotency_key,payload_schema_version,
    payload,previous_event_hash,occurred_at
  ) values (
    p_organization_id,p_contract_id,p_evidence_id,p_event_type,p_actor_id,p_actor_role,'manual',
    p_reason,p_before_status,p_after_status,p_correlation_id,p_causation_id,p_idempotency_key,1,
    coalesce(p_payload,'{}'::jsonb),v_previous,v_occurred_at
  ) returning id into v_event_id;
  return v_event_id;
end
$$;

-- C8A remains immutable for every caller except the dedicated NOLOGIN function owner,
-- and even that owner may change only the three lifecycle columns.
create or replace function public.prevent_contract_evidence_rewrite()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_table_name = 'contract_evidences' and tg_op = 'UPDATE'
    and current_user = 'evolv_contract_evidence_owner'
    and (to_jsonb(new) - array['status','validated_at','validated_by'])
      is not distinct from (to_jsonb(old) - array['status','validated_at','validated_by']) then
    return new;
  end if;
  raise exception using errcode = 'P0001', message = 'C8A_CONTRACT_EVIDENCE_IMMUTABLE';
end
$$;

create or replace function public.record_manual_contract_evidence_transaction(
  p_actor_id uuid, p_contract_id uuid, p_evidence_type text, p_idempotency_key text,
  p_correlation_id uuid, p_event_at timestamptz, p_external_reference text,
  p_storage_bucket text, p_storage_object_path text, p_content_sha256 text,
  p_media_type text, p_file_size bigint, p_detail jsonb
) returns jsonb language plpgsql security definer
set search_path = public, auth, extensions, pg_temp as $$
declare
  v_org uuid; v_role text; v_contract public.contracts%rowtype; v_existing jsonb;
  v_request jsonb; v_hash bytea; v_evidence_id uuid:=gen_random_uuid(); v_command_id uuid:=gen_random_uuid();
  v_audit_id uuid; v_result jsonb; v_started timestamptz:=clock_timestamp();
  v_external text:=nullif(btrim(p_external_reference),''); v_has_storage boolean;
  v_constraint text;
begin
  select organization_id,actor_role into v_org,v_role
  from public.contract_evidence_require_internal_actor(p_actor_id);
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$'
    or p_correlation_id is null or p_event_at is null
    or p_evidence_type not in ('signed_contract','first_installment_payment','patrion_commission_receipt') then
    raise exception using errcode='P0001',message='CE_INVALID_PAYLOAD';
  end if;
  v_has_storage := p_storage_bucket is not null or p_storage_object_path is not null
    or p_content_sha256 is not null or p_media_type is not null or p_file_size is not null;
  if v_has_storage and (nullif(btrim(p_storage_bucket),'') is null
    or nullif(btrim(p_storage_object_path),'') is null or p_content_sha256 !~ '^[0-9A-Fa-f]{64}$'
    or nullif(btrim(p_media_type),'') is null or p_file_size <= 0) then
    raise exception using errcode='P0001',message='CE_INVALID_PAYLOAD';
  end if;
  if not v_has_storage and p_evidence_type='signed_contract' and v_external is null then
    raise exception using errcode='P0001',message='CE_EVIDENCE_SOURCE_REFERENCE_REQUIRED';
  end if;
  v_request:=jsonb_build_object('actorId',p_actor_id,'contractId',p_contract_id,'evidenceType',p_evidence_type,
    'correlationId',p_correlation_id,'eventAtEpoch',extract(epoch from p_event_at),
    'externalReference',v_external,'storageBucket',nullif(btrim(p_storage_bucket),''),
    'storageObjectPath',nullif(btrim(p_storage_object_path),''),'contentSha256',lower(p_content_sha256),
    'mediaType',nullif(btrim(p_media_type),''),'fileSize',p_file_size,'detail',p_detail);
  v_hash:=public.contract_evidence_request_hash(v_request);
  perform pg_advisory_xact_lock(hashtextextended(v_org::text||':record_manual_evidence:'||p_idempotency_key,0));
  v_existing:=public.contract_evidence_existing_command_result(v_org,'record_manual_evidence',p_idempotency_key,v_hash);
  if v_existing is not null then return v_existing; end if;
  select * into v_contract from public.contracts where id=p_contract_id and organization_id=v_org;
  if not found then raise exception using errcode='P0001',message='CE_CONTRACT_NOT_FOUND'; end if;
  insert into public.contract_evidences(
    id,organization_id,contract_id,evidence_type,status,source,external_reference,event_at,
    recorded_by,storage_bucket,storage_object_path,content_sha256,media_type,file_size,
    correlation_id,idempotency_key,schema_version
  ) values (
    v_evidence_id,v_org,p_contract_id,p_evidence_type,'recorded','manual',v_external,p_event_at,p_actor_id,
    case when v_has_storage then btrim(p_storage_bucket) end,
    case when v_has_storage then btrim(p_storage_object_path) end,
    case when v_has_storage then decode(lower(p_content_sha256),'hex') end,
    case when v_has_storage then btrim(p_media_type) end,
    case when v_has_storage then p_file_size end,p_correlation_id,p_idempotency_key,1
  );
  perform public.contract_evidence_insert_typed_detail(v_org,v_contract,v_evidence_id,p_evidence_type,p_event_at,v_has_storage,p_detail);
  v_audit_id:=public.contract_evidence_append_audit_event(v_org,p_contract_id,v_evidence_id,'evidence_recorded',
    p_actor_id,v_role,null,null,'recorded',p_correlation_id,v_command_id,p_idempotency_key,
    jsonb_build_object('evidenceType',p_evidence_type,'source','manual'));
  v_result:=jsonb_build_object('outcome','completed','commandId',v_command_id,'evidenceId',v_evidence_id,
    'contractId',p_contract_id,'status','recorded','auditEventId',v_audit_id);
  insert into public.contract_evidence_commands(id,organization_id,command_type,idempotency_key,request_hash,
    actor_id,actor_role,contract_id,evidence_id,correlation_id,outcome,result,started_at,completed_at)
  values(v_command_id,v_org,'record_manual_evidence',p_idempotency_key,v_hash,p_actor_id,v_role,p_contract_id,
    v_evidence_id,p_correlation_id,'completed',v_result,v_started,clock_timestamp());
  return v_result;
exception when unique_violation then
  get stacked diagnostics v_constraint=constraint_name;
  if v_constraint in ('contract_evidences_external_reference_uidx','contract_patrion_receipt_reference_uidx') then
    raise exception using errcode='P0001',message='CE_DUPLICATE_REFERENCE';
  end if;
  raise exception using errcode='P0001',message='CE_INTEGRITY_ERROR';
end
$$;

create or replace function public.validate_contract_evidence_transaction(
  p_actor_id uuid, p_evidence_id uuid, p_idempotency_key text, p_correlation_id uuid, p_reason text default null
) returns jsonb language plpgsql security definer
set search_path = public, auth, extensions, pg_temp as $$
declare
  v_org uuid; v_role text; v_evidence public.contract_evidences%rowtype; v_existing jsonb;
  v_request jsonb; v_hash bytea; v_command_id uuid:=gen_random_uuid(); v_audit_id uuid;
  v_result jsonb; v_started timestamptz:=clock_timestamp(); v_reason text:=nullif(btrim(p_reason),'');
  v_constraint text;
begin
  select organization_id,actor_role into v_org,v_role from public.contract_evidence_require_internal_actor(p_actor_id);
  if p_evidence_id is null or p_correlation_id is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$'
    or (v_reason is not null and length(v_reason)>1000) then raise exception using errcode='P0001',message='CE_INVALID_PAYLOAD'; end if;
  v_request:=jsonb_build_object('actorId',p_actor_id,'evidenceId',p_evidence_id,'correlationId',p_correlation_id,'reason',v_reason);
  v_hash:=public.contract_evidence_request_hash(v_request);
  perform pg_advisory_xact_lock(hashtextextended(v_org::text||':validate_evidence:'||p_idempotency_key,0));
  v_existing:=public.contract_evidence_existing_command_result(v_org,'validate_evidence',p_idempotency_key,v_hash);
  if v_existing is not null then return v_existing; end if;
  select * into v_evidence from public.contract_evidences where id=p_evidence_id and organization_id=v_org for update;
  if not found then raise exception using errcode='P0001',message='CE_EVIDENCE_NOT_FOUND'; end if;
  if v_evidence.status='validated' then raise exception using errcode='P0001',message='CE_EVIDENCE_ALREADY_VALIDATED'; end if;
  if v_evidence.status<>'recorded' then raise exception using errcode='P0001',message='CE_EVIDENCE_NOT_VALIDATABLE'; end if;
  update public.contract_evidences set status='validated',validated_at=clock_timestamp(),validated_by=p_actor_id
  where id=p_evidence_id returning * into v_evidence;
  v_audit_id:=public.contract_evidence_append_audit_event(v_org,v_evidence.contract_id,p_evidence_id,'evidence_validated',
    p_actor_id,v_role,v_reason,'recorded','validated',p_correlation_id,v_command_id,p_idempotency_key,'{}');
  v_result:=jsonb_build_object('outcome','completed','commandId',v_command_id,'evidenceId',p_evidence_id,
    'contractId',v_evidence.contract_id,'status','validated','auditEventId',v_audit_id);
  insert into public.contract_evidence_commands(id,organization_id,command_type,idempotency_key,request_hash,actor_id,
    actor_role,contract_id,evidence_id,correlation_id,outcome,result,started_at,completed_at)
  values(v_command_id,v_org,'validate_evidence',p_idempotency_key,v_hash,p_actor_id,v_role,v_evidence.contract_id,
    p_evidence_id,p_correlation_id,'completed',v_result,v_started,clock_timestamp());
  return v_result;
exception when unique_violation then
  get stacked diagnostics v_constraint=constraint_name;
  if v_constraint='contract_evidences_current_validated_uidx' then
    raise exception using errcode='P0001',message='CE_VALIDATED_EVIDENCE_CONFLICT';
  end if;
  raise exception using errcode='P0001',message='CE_INTEGRITY_ERROR';
end
$$;

create or replace function public.invalidate_contract_evidence_transaction(
  p_actor_id uuid, p_evidence_id uuid, p_reason text, p_idempotency_key text, p_correlation_id uuid
) returns jsonb language plpgsql security definer
set search_path = public, auth, extensions, pg_temp as $$
declare
  v_org uuid; v_role text; v_evidence public.contract_evidences%rowtype; v_existing jsonb;
  v_request jsonb; v_hash bytea; v_command_id uuid:=gen_random_uuid(); v_audit_id uuid;
  v_result jsonb; v_started timestamptz:=clock_timestamp(); v_reason text:=nullif(btrim(p_reason),'');
begin
  select organization_id,actor_role into v_org,v_role from public.contract_evidence_require_internal_actor(p_actor_id);
  if p_evidence_id is null or p_correlation_id is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$'
    or v_reason is null or length(v_reason)>1000 then
    raise exception using errcode='P0001',message=case when v_reason is null then 'CE_REASON_REQUIRED' else 'CE_INVALID_PAYLOAD' end;
  end if;
  v_request:=jsonb_build_object('actorId',p_actor_id,'evidenceId',p_evidence_id,'correlationId',p_correlation_id,'reason',v_reason);
  v_hash:=public.contract_evidence_request_hash(v_request);
  perform pg_advisory_xact_lock(hashtextextended(v_org::text||':invalidate_evidence:'||p_idempotency_key,0));
  v_existing:=public.contract_evidence_existing_command_result(v_org,'invalidate_evidence',p_idempotency_key,v_hash);
  if v_existing is not null then return v_existing; end if;
  select * into v_evidence from public.contract_evidences where id=p_evidence_id and organization_id=v_org for update;
  if not found then raise exception using errcode='P0001',message='CE_EVIDENCE_NOT_FOUND'; end if;
  if v_evidence.status not in ('recorded','validated') then
    raise exception using errcode='P0001',message='CE_EVIDENCE_NOT_INVALIDATABLE';
  end if;
  update public.contract_evidences set status='invalidated' where id=p_evidence_id returning * into v_evidence;
  v_audit_id:=public.contract_evidence_append_audit_event(v_org,v_evidence.contract_id,p_evidence_id,'evidence_invalidated',
    p_actor_id,v_role,v_reason,case when v_evidence.validated_at is null then 'recorded' else 'validated' end,
    'invalidated',p_correlation_id,v_command_id,p_idempotency_key,'{}');
  v_result:=jsonb_build_object('outcome','completed','commandId',v_command_id,'evidenceId',p_evidence_id,
    'contractId',v_evidence.contract_id,'status','invalidated','auditEventId',v_audit_id);
  insert into public.contract_evidence_commands(id,organization_id,command_type,idempotency_key,request_hash,actor_id,
    actor_role,contract_id,evidence_id,correlation_id,outcome,result,started_at,completed_at)
  values(v_command_id,v_org,'invalidate_evidence',p_idempotency_key,v_hash,p_actor_id,v_role,v_evidence.contract_id,
    p_evidence_id,p_correlation_id,'completed',v_result,v_started,clock_timestamp());
  return v_result;
end
$$;

create or replace function public.supersede_contract_evidence_transaction(
  p_actor_id uuid, p_evidence_id uuid, p_idempotency_key text, p_correlation_id uuid,
  p_reason text, p_event_at timestamptz, p_external_reference text,
  p_storage_bucket text, p_storage_object_path text, p_content_sha256 text,
  p_media_type text, p_file_size bigint, p_detail jsonb
) returns jsonb language plpgsql security definer
set search_path = public, auth, extensions, pg_temp as $$
declare
  v_org uuid; v_role text; v_old public.contract_evidences%rowtype; v_contract public.contracts%rowtype;
  v_existing jsonb; v_request jsonb; v_hash bytea; v_new_id uuid:=gen_random_uuid(); v_command_id uuid:=gen_random_uuid();
  v_old_audit uuid; v_new_audit uuid; v_result jsonb; v_started timestamptz:=clock_timestamp();
  v_reason text:=nullif(btrim(p_reason),''); v_external text:=nullif(btrim(p_external_reference),'');
  v_has_storage boolean; v_constraint text;
begin
  select organization_id,actor_role into v_org,v_role from public.contract_evidence_require_internal_actor(p_actor_id);
  if p_evidence_id is null or p_correlation_id is null or p_event_at is null
    or p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$' or v_reason is null or length(v_reason)>1000 then
    raise exception using errcode='P0001',message=case when v_reason is null then 'CE_REASON_REQUIRED' else 'CE_INVALID_PAYLOAD' end;
  end if;
  v_has_storage := p_storage_bucket is not null or p_storage_object_path is not null
    or p_content_sha256 is not null or p_media_type is not null or p_file_size is not null;
  if v_has_storage and (nullif(btrim(p_storage_bucket),'') is null
    or nullif(btrim(p_storage_object_path),'') is null or p_content_sha256 !~ '^[0-9A-Fa-f]{64}$'
    or nullif(btrim(p_media_type),'') is null or p_file_size <= 0) then
    raise exception using errcode='P0001',message='CE_INVALID_PAYLOAD';
  end if;
  v_request:=jsonb_build_object('actorId',p_actor_id,'evidenceId',p_evidence_id,'correlationId',p_correlation_id,
    'reason',v_reason,'eventAtEpoch',extract(epoch from p_event_at),'externalReference',v_external,
    'storageBucket',nullif(btrim(p_storage_bucket),''),'storageObjectPath',nullif(btrim(p_storage_object_path),''),
    'contentSha256',lower(p_content_sha256),'mediaType',nullif(btrim(p_media_type),''),'fileSize',p_file_size,'detail',p_detail);
  v_hash:=public.contract_evidence_request_hash(v_request);
  perform pg_advisory_xact_lock(hashtextextended(v_org::text||':supersede_evidence:'||p_idempotency_key,0));
  v_existing:=public.contract_evidence_existing_command_result(v_org,'supersede_evidence',p_idempotency_key,v_hash);
  if v_existing is not null then return v_existing; end if;
  select * into v_old from public.contract_evidences where id=p_evidence_id and organization_id=v_org for update;
  if not found then raise exception using errcode='P0001',message='CE_EVIDENCE_NOT_FOUND'; end if;
  if v_old.status not in ('recorded','validated') then raise exception using errcode='P0001',message='CE_EVIDENCE_NOT_SUPERSEDABLE'; end if;
  if not v_has_storage and v_old.evidence_type='signed_contract' and v_external is null then
    raise exception using errcode='P0001',message='CE_EVIDENCE_SOURCE_REFERENCE_REQUIRED';
  end if;
  select * into v_contract from public.contracts where id=v_old.contract_id and organization_id=v_org;
  if not found then raise exception using errcode='P0001',message='CE_CONTRACT_NOT_FOUND'; end if;
  update public.contract_evidences set status='superseded' where id=v_old.id;
  insert into public.contract_evidences(
    id,organization_id,contract_id,evidence_type,status,source,external_reference,event_at,recorded_by,
    storage_bucket,storage_object_path,content_sha256,media_type,file_size,correlation_id,idempotency_key,
    schema_version,supersedes_evidence_id
  ) values (
    v_new_id,v_org,v_old.contract_id,v_old.evidence_type,'recorded','manual',v_external,p_event_at,p_actor_id,
    case when v_has_storage then btrim(p_storage_bucket) end,case when v_has_storage then btrim(p_storage_object_path) end,
    case when v_has_storage then decode(lower(p_content_sha256),'hex') end,case when v_has_storage then btrim(p_media_type) end,
    case when v_has_storage then p_file_size end,p_correlation_id,p_idempotency_key,1,v_old.id
  );
  perform public.contract_evidence_insert_typed_detail(v_org,v_contract,v_new_id,v_old.evidence_type,p_event_at,v_has_storage,p_detail);
  v_old_audit:=public.contract_evidence_append_audit_event(v_org,v_old.contract_id,v_old.id,'evidence_superseded',
    p_actor_id,v_role,v_reason,v_old.status,'superseded',p_correlation_id,v_command_id,p_idempotency_key,
    jsonb_build_object('successorEvidenceId',v_new_id));
  v_new_audit:=public.contract_evidence_append_audit_event(v_org,v_old.contract_id,v_new_id,'evidence_recorded',
    p_actor_id,v_role,v_reason,null,'recorded',p_correlation_id,v_command_id,p_idempotency_key,
    jsonb_build_object('evidenceType',v_old.evidence_type,'supersedesEvidenceId',v_old.id));
  v_result:=jsonb_build_object('outcome','completed','commandId',v_command_id,'evidenceId',v_new_id,
    'supersededEvidenceId',v_old.id,'contractId',v_old.contract_id,'status','recorded',
    'supersededAuditEventId',v_old_audit,'recordedAuditEventId',v_new_audit);
  insert into public.contract_evidence_commands(id,organization_id,command_type,idempotency_key,request_hash,actor_id,
    actor_role,contract_id,evidence_id,correlation_id,outcome,result,started_at,completed_at)
  values(v_command_id,v_org,'supersede_evidence',p_idempotency_key,v_hash,p_actor_id,v_role,v_old.contract_id,
    v_new_id,p_correlation_id,'completed',v_result,v_started,clock_timestamp());
  return v_result;
exception when unique_violation then
  get stacked diagnostics v_constraint=constraint_name;
  if v_constraint in ('contract_evidences_external_reference_uidx','contract_patrion_receipt_reference_uidx') then
    raise exception using errcode='P0001',message='CE_DUPLICATE_REFERENCE';
  end if;
  if v_constraint='contract_evidences_supersedes_once_uidx' then
    raise exception using errcode='P0001',message='CE_EVIDENCE_NOT_SUPERSEDABLE';
  end if;
  raise exception using errcode='P0001',message='CE_INTEGRITY_ERROR';
end
$$;

-- Dedicated owner privileges are inaccessible to login roles and are used only while a C8B SECURITY DEFINER RPC runs.
grant usage on schema public, auth, extensions to evolv_contract_evidence_owner;
grant execute on function auth.role() to evolv_contract_evidence_owner;
grant execute on function extensions.digest(bytea,text) to evolv_contract_evidence_owner;
grant execute on function public.contract_evidence_audit_event_hash(uuid,uuid,uuid,text,uuid,text,text,text,text,text,uuid,uuid,text,integer,jsonb,bytea,timestamptz)
  to evolv_contract_evidence_owner;
grant select on public.profiles,public.contracts,public.administrators to evolv_contract_evidence_owner;
grant select,insert,update on public.contract_evidences to evolv_contract_evidence_owner;
grant select,insert on public.contract_signed_evidence_details,
  public.contract_first_installment_payment_evidence_details,
  public.contract_patrion_receipt_evidence_details,
  public.contract_evidence_audit_events,
  public.contract_evidence_commands to evolv_contract_evidence_owner;

alter function public.contract_evidence_request_hash(jsonb) owner to evolv_contract_evidence_owner;
alter function public.contract_evidence_require_internal_actor(uuid) owner to evolv_contract_evidence_owner;
alter function public.contract_evidence_existing_command_result(uuid,text,text,bytea) owner to evolv_contract_evidence_owner;
alter function public.contract_evidence_insert_typed_detail(uuid,public.contracts,uuid,text,timestamptz,boolean,jsonb) owner to evolv_contract_evidence_owner;
alter function public.contract_evidence_append_audit_event(uuid,uuid,uuid,text,uuid,text,text,text,text,uuid,uuid,text,jsonb) owner to evolv_contract_evidence_owner;
alter function public.record_manual_contract_evidence_transaction(uuid,uuid,text,text,uuid,timestamptz,text,text,text,text,text,bigint,jsonb) owner to evolv_contract_evidence_owner;
alter function public.validate_contract_evidence_transaction(uuid,uuid,text,uuid,text) owner to evolv_contract_evidence_owner;
alter function public.invalidate_contract_evidence_transaction(uuid,uuid,text,text,uuid) owner to evolv_contract_evidence_owner;
alter function public.supersede_contract_evidence_transaction(uuid,uuid,text,uuid,text,timestamptz,text,text,text,text,text,bigint,jsonb) owner to evolv_contract_evidence_owner;

revoke all on function public.contract_evidence_request_hash(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.validate_contract_evidence_detail_cardinality() from public,anon,authenticated,service_role;
revoke all on function public.validate_contract_evidence_supersession() from public,anon,authenticated,service_role;
revoke all on function public.contract_evidence_audit_event_hash(uuid,uuid,uuid,text,uuid,text,text,text,text,text,uuid,uuid,text,integer,jsonb,bytea,timestamptz) from public,anon,authenticated,service_role;
revoke all on function public.prevent_contract_evidence_rewrite() from public,anon,authenticated,service_role;
revoke all on function public.contract_evidence_require_internal_actor(uuid) from public,anon,authenticated,service_role;
revoke all on function public.contract_evidence_existing_command_result(uuid,text,text,bytea) from public,anon,authenticated,service_role;
revoke all on function public.contract_evidence_insert_typed_detail(uuid,public.contracts,uuid,text,timestamptz,boolean,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.contract_evidence_append_audit_event(uuid,uuid,uuid,text,uuid,text,text,text,text,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.record_manual_contract_evidence_transaction(uuid,uuid,text,text,uuid,timestamptz,text,text,text,text,text,bigint,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.validate_contract_evidence_transaction(uuid,uuid,text,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.invalidate_contract_evidence_transaction(uuid,uuid,text,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.supersede_contract_evidence_transaction(uuid,uuid,text,uuid,text,timestamptz,text,text,text,text,text,bigint,jsonb) from public,anon,authenticated,service_role;

grant execute on function public.record_manual_contract_evidence_transaction(uuid,uuid,text,text,uuid,timestamptz,text,text,text,text,text,bigint,jsonb) to service_role;
grant execute on function public.validate_contract_evidence_transaction(uuid,uuid,text,uuid,text) to service_role;
grant execute on function public.invalidate_contract_evidence_transaction(uuid,uuid,text,text,uuid) to service_role;
grant execute on function public.supersede_contract_evidence_transaction(uuid,uuid,text,uuid,text,timestamptz,text,text,text,text,text,bigint,jsonb) to service_role;

create trigger contract_evidence_commands_immutable
before update or delete on public.contract_evidence_commands
for each row execute function public.prevent_contract_evidence_rewrite();

alter table public.contract_evidence_commands enable row level security;
revoke all on table public.contract_evidence_commands from public,anon,authenticated,service_role;
grant select on table public.contract_evidence_commands to authenticated;
create policy "active tenant profiles can read contract evidence commands"
on public.contract_evidence_commands for select to authenticated using (
  organization_id=public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master','admin','sdr')
);

comment on role evolv_contract_evidence_owner is
  'NOLOGIN/BYPASSRLS owner used only by C8B SECURITY DEFINER commands; never granted to application roles.';
comment on table public.contract_evidence_commands is
  'Immutable completed C8B command results used for transactional idempotency.';
comment on function public.record_manual_contract_evidence_transaction(uuid,uuid,text,text,uuid,timestamptz,text,text,text,text,text,bigint,jsonb) is
  'Internal service-role-only C8B command. Records one manual evidence and no contract or financial lifecycle effect.';

revoke create on schema public from evolv_contract_evidence_owner;
