-- CONTRACT-024C-01 C8C2 - reconcilable supersession uploads.
alter table public.contract_evidence_upload_attempts
  add column operation_type text not null default 'record' check(operation_type in('record','supersede')),
  add column previous_evidence_id uuid,
  add constraint contract_evidence_upload_attempts_previous_fkey foreign key(organization_id,previous_evidence_id)
    references public.contract_evidences(organization_id,id) on delete restrict,
  add constraint contract_evidence_upload_attempts_operation_check check(
    (operation_type='record' and previous_evidence_id is null) or
    (operation_type='supersede' and previous_evidence_id is not null)
  );

create index contract_evidence_upload_attempts_previous_idx
on public.contract_evidence_upload_attempts(organization_id,previous_evidence_id)
where previous_evidence_id is not null;

grant create on schema public to evolv_contract_evidence_owner;
create or replace function public.prepare_contract_evidence_supersede_upload_attempt(
  p_actor_id uuid,p_contract_id uuid,p_previous_evidence_id uuid,p_evidence_type text,
  p_idempotency_key_hash text,p_object_path text,p_content_sha256 text,p_file_size bigint
) returns jsonb language plpgsql security definer
set search_path=public,pg_temp as $$
declare v_actor record;v_old record;v_attempt public.contract_evidence_upload_attempts;v_key bytea;v_sha bytea;v_role text;
begin
  v_role:=coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role');
  if v_role is distinct from 'service_role' then raise exception using errcode='42501',message='CE_ACTOR_FORBIDDEN';end if;
  select organization_id into v_actor from public.profiles where id=p_actor_id and is_active=true and role in('master','admin');
  if not found then raise exception using errcode='42501',message='CE_ACTOR_FORBIDDEN';end if;
  select evidence_type,contract_id into v_old from public.contract_evidences where id=p_previous_evidence_id and organization_id=v_actor.organization_id;
  if not found or v_old.contract_id<>p_contract_id then raise exception using errcode='P0001',message='CE_EVIDENCE_NOT_FOUND';end if;
  if v_old.evidence_type<>p_evidence_type then raise exception using errcode='P0001',message='CE_EVIDENCE_TYPE_INVALID';end if;
  begin v_key=decode(p_idempotency_key_hash,'hex');v_sha=decode(p_content_sha256,'hex');exception when others then raise exception using errcode='P0001',message='CE_INVALID_PAYLOAD';end;
  if octet_length(v_key)<>32 or octet_length(v_sha)<>32 or p_file_size not between 1 and 15728640
    or p_object_path not like v_actor.organization_id::text||'/'||p_contract_id::text||'/'||p_evidence_type||'/supersede/'||lower(p_idempotency_key_hash)||'/'||lower(p_content_sha256)||'.%'
    or p_object_path !~ '^[0-9a-f-]+/[0-9a-f-]+/[a-z_]+/supersede/[0-9a-f]{64}/[0-9a-f]{64}\.(pdf|jpg|png)$' then raise exception using errcode='P0001',message='CE_INVALID_PAYLOAD';end if;
  perform pg_advisory_xact_lock(hashtextextended(v_actor.organization_id::text||':supersede:'||p_idempotency_key_hash,0));
  select * into v_attempt from public.contract_evidence_upload_attempts where organization_id=v_actor.organization_id and evidence_type=p_evidence_type and idempotency_key_hash=v_key;
  if found then
    if v_attempt.operation_type<>'supersede' or v_attempt.previous_evidence_id<>p_previous_evidence_id or v_attempt.contract_id<>p_contract_id or v_attempt.object_path<>p_object_path or v_attempt.content_sha256<>v_sha or v_attempt.file_size<>p_file_size then raise exception using errcode='P0001',message='CE_IDEMPOTENCY_CONFLICT';end if;
  else
    insert into public.contract_evidence_upload_attempts(organization_id,contract_id,actor_id,evidence_type,idempotency_key_hash,object_path,content_sha256,file_size,state,operation_type,previous_evidence_id)
    values(v_actor.organization_id,p_contract_id,p_actor_id,p_evidence_type,v_key,p_object_path,v_sha,p_file_size,'uploaded','supersede',p_previous_evidence_id) returning * into v_attempt;
  end if;
  return jsonb_build_object('attemptId',v_attempt.id,'state',v_attempt.state,'evidenceId',v_attempt.evidence_id);
end $$;
alter function public.prepare_contract_evidence_supersede_upload_attempt(uuid,uuid,uuid,text,text,text,text,bigint) owner to evolv_contract_evidence_owner;
revoke all on function public.prepare_contract_evidence_supersede_upload_attempt(uuid,uuid,uuid,text,text,text,text,bigint) from public,anon,authenticated,service_role;
grant execute on function public.prepare_contract_evidence_supersede_upload_attempt(uuid,uuid,uuid,text,text,text,text,bigint) to service_role;
revoke create on schema public from evolv_contract_evidence_owner;
