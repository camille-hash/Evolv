-- CONTRACT-024C-01 C8C1 - private evidence storage and reconcilable uploads.

do $$ begin
  if to_regclass('public.contract_evidences') is null
    or to_regclass('public.contract_evidence_commands') is null
    or not exists(select 1 from pg_roles where rolname='evolv_contract_evidence_owner') then
    raise exception 'C8C1_PRECHECK_MISSING_FOUNDATION';
  end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('contract-evidences','contract-evidences',false,15728640,
  array['application/pdf','image/jpeg','image/png']::text[])
on conflict(id) do update set public=false,file_size_limit=15728640,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "contract evidence objects authenticated select" on storage.objects;
drop policy if exists "contract evidence objects authenticated insert" on storage.objects;
drop policy if exists "contract evidence objects authenticated update" on storage.objects;
drop policy if exists "contract evidence objects authenticated delete" on storage.objects;

-- Supabase local may reconcile the auth schema ACL after application migrations,
-- removing USAGE from dedicated NOLOGIN owners. Keep the C8B service-role
-- boundary independent from that mutable platform ACL while preserving the
-- exact role semantics implemented by auth.role().
create or replace function public.contract_evidence_require_internal_actor(
  p_actor_id uuid, out organization_id uuid, out actor_role text
) returns record language plpgsql security invoker
set search_path=public,pg_temp as $$
declare v_request_role text;
begin
  v_request_role:=coalesce(
    nullif(current_setting('request.jwt.claim.role',true),''),
    nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'
  );
  if v_request_role is distinct from 'service_role' then
    raise exception using errcode='42501',message='CE_ACTOR_FORBIDDEN';
  end if;
  select p.organization_id,p.role into organization_id,actor_role
  from public.profiles p where p.id=p_actor_id and p.is_active is true;
  if not found or actor_role not in('master','admin') then
    raise exception using errcode='42501',message='CE_ACTOR_FORBIDDEN';
  end if;
end $$;

-- C8A cardinality/supersession checks are deferred constraint triggers. They
-- execute at COMMIT after a C8B SECURITY DEFINER RPC has returned, so they must
-- retain the dedicated owner's read boundary instead of falling back to the
-- deliberately unprivileged service_role caller.
grant create on schema public to evolv_contract_evidence_owner;
alter function public.validate_contract_evidence_detail_cardinality() security definer;
alter function public.validate_contract_evidence_detail_cardinality() owner to evolv_contract_evidence_owner;
alter function public.validate_contract_evidence_supersession() security definer;
alter function public.validate_contract_evidence_supersession() owner to evolv_contract_evidence_owner;
revoke create on schema public from evolv_contract_evidence_owner;

create table public.contract_evidence_upload_attempts(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid not null,
  actor_id uuid not null,
  evidence_type text not null check(evidence_type in('signed_contract','first_installment_payment','patrion_commission_receipt')),
  idempotency_key_hash bytea not null check(octet_length(idempotency_key_hash)=32),
  object_path text not null check(length(object_path) between 80 and 500),
  content_sha256 bytea not null check(octet_length(content_sha256)=32),
  file_size bigint not null check(file_size between 1 and 15728640),
  state text not null check(state in('uploaded','linked','cleanup_pending','cleaned')),
  evidence_id uuid,
  last_error_code text,
  created_at timestamptz not null default clock_timestamp(),
  linked_at timestamptz,
  cleaned_at timestamptz,
  constraint contract_evidence_upload_attempts_org_id_key unique(organization_id,id),
  constraint contract_evidence_upload_attempts_identity_key unique(organization_id,evidence_type,idempotency_key_hash),
  constraint contract_evidence_upload_attempts_contract_fkey foreign key(organization_id,contract_id)
    references public.contracts(organization_id,id) on delete restrict,
  constraint contract_evidence_upload_attempts_actor_fkey foreign key(organization_id,actor_id)
    references public.profiles(organization_id,id) on delete restrict,
  constraint contract_evidence_upload_attempts_evidence_fkey foreign key(organization_id,evidence_id)
    references public.contract_evidences(organization_id,id) on delete restrict,
  constraint contract_evidence_upload_attempts_lifecycle_check check(
    (state='linked' and evidence_id is not null and linked_at is not null and cleaned_at is null)
    or (state='cleaned' and evidence_id is null and cleaned_at is not null)
    or (state in('uploaded','cleanup_pending') and evidence_id is null and linked_at is null and cleaned_at is null)
  )
);

create index contract_evidence_upload_attempts_reconcile_idx
on public.contract_evidence_upload_attempts(state,created_at)
where state in('uploaded','cleanup_pending');

create or replace function public.prevent_contract_evidence_upload_attempt_rewrite()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  if tg_op='DELETE' then raise exception using errcode='P0001',message='CE_UPLOAD_ATTEMPT_IMMUTABLE'; end if;
  if current_user<>'evolv_contract_evidence_owner'
    or to_jsonb(new)-array['state','evidence_id','last_error_code','linked_at','cleaned_at']
       is distinct from to_jsonb(old)-array['state','evidence_id','last_error_code','linked_at','cleaned_at'] then
    raise exception using errcode='P0001',message='CE_UPLOAD_ATTEMPT_IMMUTABLE';
  end if;
  if old.state in('linked','cleaned') or (old.state='cleanup_pending' and new.state not in('cleanup_pending','cleaned'))
    or (old.state='uploaded' and new.state not in('uploaded','linked','cleanup_pending','cleaned')) then
    raise exception using errcode='P0001',message='CE_UPLOAD_ATTEMPT_STATE_INVALID';
  end if;
  return new;
end $$;

create trigger contract_evidence_upload_attempts_immutable before update or delete
on public.contract_evidence_upload_attempts for each row execute function public.prevent_contract_evidence_upload_attempt_rewrite();

create or replace function public.prepare_contract_evidence_upload_attempt(
  p_actor_id uuid,p_contract_id uuid,p_evidence_type text,p_idempotency_key_hash text,
  p_object_path text,p_content_sha256 text,p_file_size bigint
) returns jsonb language plpgsql security definer
set search_path=public,auth,extensions,pg_temp as $$
declare v_actor record; v_attempt public.contract_evidence_upload_attempts; v_key bytea; v_sha bytea;
  v_request_role text;
begin
  v_request_role:=coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role');
  if v_request_role is distinct from 'service_role' then raise exception using errcode='42501',message='CE_ACTOR_FORBIDDEN'; end if;
  select organization_id,role into v_actor from public.profiles where id=p_actor_id and is_active=true and role in('master','admin');
  if not found then raise exception using errcode='42501',message='CE_ACTOR_FORBIDDEN'; end if;
  if not exists(select 1 from public.contracts where id=p_contract_id and organization_id=v_actor.organization_id) then
    raise exception using errcode='P0001',message='CE_CONTRACT_NOT_FOUND'; end if;
  begin v_key=decode(p_idempotency_key_hash,'hex'); v_sha=decode(p_content_sha256,'hex'); exception when others then
    raise exception using errcode='P0001',message='CE_INVALID_PAYLOAD'; end;
  if octet_length(v_key)<>32 or octet_length(v_sha)<>32 or p_file_size not between 1 and 15728640
    or p_object_path !~ '^[0-9a-f-]+/[0-9a-f-]+/[a-z_]+/[0-9a-f]{64}/[0-9a-f]{64}\.(pdf|jpg|png)$'
    or p_object_path not like v_actor.organization_id::text||'/'||p_contract_id::text||'/'||p_evidence_type||'/'
      ||lower(p_idempotency_key_hash)||'/'||lower(p_content_sha256)||'.%' then
    raise exception using errcode='P0001',message='CE_INVALID_PAYLOAD'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_actor.organization_id::text||':'||p_evidence_type||':'||p_idempotency_key_hash,0));
  select * into v_attempt from public.contract_evidence_upload_attempts where organization_id=v_actor.organization_id
    and evidence_type=p_evidence_type and idempotency_key_hash=v_key;
  if found then
    if v_attempt.contract_id<>p_contract_id or v_attempt.object_path<>p_object_path
      or v_attempt.content_sha256<>v_sha or v_attempt.file_size<>p_file_size then
      raise exception using errcode='P0001',message='CE_IDEMPOTENCY_CONFLICT'; end if;
  else
    insert into public.contract_evidence_upload_attempts(organization_id,contract_id,actor_id,evidence_type,
      idempotency_key_hash,object_path,content_sha256,file_size,state)
    values(v_actor.organization_id,p_contract_id,p_actor_id,p_evidence_type,v_key,p_object_path,v_sha,p_file_size,'uploaded')
    returning * into v_attempt;
  end if;
  return jsonb_build_object('attemptId',v_attempt.id,'state',v_attempt.state,'evidenceId',v_attempt.evidence_id);
end $$;

create or replace function public.finish_contract_evidence_upload_attempt(
  p_actor_id uuid,p_attempt_id uuid,p_state text,p_evidence_id uuid default null,p_error_code text default null
) returns void language plpgsql security definer
set search_path=public,auth,pg_temp as $$
declare v_org uuid; v_attempt public.contract_evidence_upload_attempts; v_request_role text;
begin
  v_request_role:=coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role');
  if v_request_role is distinct from 'service_role' then raise exception using errcode='42501',message='CE_ACTOR_FORBIDDEN'; end if;
  select organization_id into v_org from public.profiles where id=p_actor_id and is_active=true and role in('master','admin');
  if not found then raise exception using errcode='42501',message='CE_ACTOR_FORBIDDEN'; end if;
  if p_state not in('linked','cleanup_pending','cleaned') then raise exception using errcode='P0001',message='CE_INVALID_PAYLOAD'; end if;
  select * into v_attempt from public.contract_evidence_upload_attempts
  where id=p_attempt_id and organization_id=v_org for update;
  if not found then raise exception using errcode='P0001',message='CE_EVIDENCE_NOT_FOUND'; end if;
  if v_attempt.state='linked' and p_state='linked' and v_attempt.evidence_id=p_evidence_id then return; end if;
  if v_attempt.state='cleaned' and p_state='cleaned' then return; end if;
  update public.contract_evidence_upload_attempts set state=p_state,evidence_id=case when p_state='linked' then p_evidence_id end,
    last_error_code=nullif(left(btrim(p_error_code),100),''),linked_at=case when p_state='linked' then clock_timestamp() end,
    cleaned_at=case when p_state='cleaned' then clock_timestamp() end
  where id=p_attempt_id and organization_id=v_org;
end $$;

alter table public.contract_evidence_upload_attempts enable row level security;
revoke all on public.contract_evidence_upload_attempts from public,anon,authenticated,service_role;
grant usage on schema public,auth,extensions to evolv_contract_evidence_owner;
grant create on schema public to evolv_contract_evidence_owner;
grant select,insert,update on public.contract_evidence_upload_attempts to evolv_contract_evidence_owner;
grant select on public.profiles,public.contracts,public.contract_evidences to evolv_contract_evidence_owner;
alter function public.prevent_contract_evidence_upload_attempt_rewrite() owner to evolv_contract_evidence_owner;
alter function public.prepare_contract_evidence_upload_attempt(uuid,uuid,text,text,text,text,bigint) owner to evolv_contract_evidence_owner;
alter function public.finish_contract_evidence_upload_attempt(uuid,uuid,text,uuid,text) owner to evolv_contract_evidence_owner;
revoke all on function public.prevent_contract_evidence_upload_attempt_rewrite() from public,anon,authenticated,service_role;
revoke all on function public.prepare_contract_evidence_upload_attempt(uuid,uuid,text,text,text,text,bigint) from public,anon,authenticated,service_role;
revoke all on function public.finish_contract_evidence_upload_attempt(uuid,uuid,text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.prepare_contract_evidence_upload_attempt(uuid,uuid,text,text,text,text,bigint) to service_role;
grant execute on function public.finish_contract_evidence_upload_attempt(uuid,uuid,text,uuid,text) to service_role;
revoke create on schema public from evolv_contract_evidence_owner;
