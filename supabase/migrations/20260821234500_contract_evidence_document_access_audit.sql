-- CONTRACT-024C-01 C8C3 - authenticated, fail-closed evidence document access audit.
grant create on schema public to evolv_contract_evidence_owner;
grant select (id,organization_id,contract_id,evidence_type,status,event_at,storage_bucket,storage_object_path,content_sha256,media_type,file_size)
  on public.contract_evidences to service_role;

create table public.contract_evidence_document_access_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid not null,
  evidence_id uuid not null,
  actor_id uuid not null,
  actor_role text not null check (actor_role in ('master','admin','sdr')),
  outcome text not null check (outcome in ('downloaded','integrity_failed','object_missing')),
  media_type text,
  file_size bigint check (file_size is null or file_size between 1 and 15728640),
  correlation_id uuid not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  failure_code text,
  constraint contract_evidence_document_access_contract_fkey
    foreign key (organization_id,contract_id) references public.contracts(organization_id,id) on delete restrict,
  constraint contract_evidence_document_access_evidence_fkey
    foreign key (organization_id,evidence_id) references public.contract_evidences(organization_id,id) on delete restrict,
  constraint contract_evidence_document_access_actor_fkey
    foreign key (organization_id,actor_id) references public.profiles(organization_id,id) on delete restrict,
  constraint contract_evidence_document_access_outcome_check check (
    (outcome='downloaded' and failure_code is null and media_type is not null and file_size is not null)
    or (outcome='integrity_failed' and failure_code='CED_DOCUMENT_INTEGRITY_FAILED')
    or (outcome='object_missing' and failure_code='CED_OBJECT_MISSING')
  )
);
alter table public.contract_evidence_document_access_events owner to evolv_contract_evidence_owner;
create index contract_evidence_document_access_events_tenant_idx
  on public.contract_evidence_document_access_events(organization_id,recorded_at desc);
create index contract_evidence_document_access_events_evidence_idx
  on public.contract_evidence_document_access_events(organization_id,evidence_id,recorded_at desc);

create function public.prevent_contract_evidence_document_access_rewrite()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception using errcode='42501',message='CED_AUDIT_APPEND_ONLY';end $$;
alter function public.prevent_contract_evidence_document_access_rewrite() owner to evolv_contract_evidence_owner;
create trigger contract_evidence_document_access_events_append_only
before update or delete on public.contract_evidence_document_access_events
for each row execute function public.prevent_contract_evidence_document_access_rewrite();

alter table public.contract_evidence_document_access_events enable row level security;
revoke all on table public.contract_evidence_document_access_events from public,anon,authenticated,service_role;
grant select on table public.contract_evidence_document_access_events to authenticated;
create policy "active tenant profiles can read evidence document access audit"
on public.contract_evidence_document_access_events for select to authenticated using (
  organization_id=public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master','admin','sdr')
);

create function public.record_contract_evidence_document_access_transaction(
  p_actor_id uuid,p_contract_id uuid,p_evidence_id uuid,p_outcome text,
  p_media_type text,p_file_size bigint,p_correlation_id uuid,p_failure_code text
) returns uuid language plpgsql security definer
set search_path=public,auth,pg_temp as $$
declare v_actor record;v_evidence record;v_role text;v_id uuid:=gen_random_uuid();v_now timestamptz:=clock_timestamp();
begin
  v_role:=coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role');
  if v_role is distinct from 'service_role' then raise exception using errcode='42501',message='CED_INTERNAL_BOUNDARY_REQUIRED';end if;
  select organization_id,role into v_actor from public.profiles where id=p_actor_id and is_active=true and role in('master','admin','sdr');
  if not found then raise exception using errcode='42501',message='CED_ACTOR_FORBIDDEN';end if;
  select contract_id,media_type,file_size into v_evidence from public.contract_evidences
    where id=p_evidence_id and organization_id=v_actor.organization_id and contract_id=p_contract_id;
  if not found then raise exception using errcode='P0001',message='CED_DOCUMENT_NOT_FOUND';end if;
  if p_correlation_id is null or p_outcome not in('downloaded','integrity_failed','object_missing') then
    raise exception using errcode='P0001',message='CED_INVALID_PAYLOAD';end if;
  if p_outcome='downloaded' and (p_failure_code is not null or p_media_type is distinct from v_evidence.media_type or p_file_size is distinct from v_evidence.file_size) then
    raise exception using errcode='P0001',message='CED_INVALID_PAYLOAD';end if;
  if p_outcome='integrity_failed' and p_failure_code is distinct from 'CED_DOCUMENT_INTEGRITY_FAILED' then
    raise exception using errcode='P0001',message='CED_INVALID_PAYLOAD';end if;
  if p_outcome='object_missing' and p_failure_code is distinct from 'CED_OBJECT_MISSING' then
    raise exception using errcode='P0001',message='CED_INVALID_PAYLOAD';end if;
  insert into public.contract_evidence_document_access_events(
    id,organization_id,contract_id,evidence_id,actor_id,actor_role,outcome,media_type,file_size,
    correlation_id,occurred_at,failure_code
  ) values (
    v_id,v_actor.organization_id,p_contract_id,p_evidence_id,p_actor_id,v_actor.role,p_outcome,
    case when p_outcome='downloaded' then p_media_type end,
    case when p_outcome='downloaded' then p_file_size end,
    p_correlation_id,v_now,p_failure_code
  );
  return v_id;
end $$;
alter function public.record_contract_evidence_document_access_transaction(uuid,uuid,uuid,text,text,bigint,uuid,text)
  owner to evolv_contract_evidence_owner;
revoke all on function public.prevent_contract_evidence_document_access_rewrite() from public,anon,authenticated,service_role;
revoke all on function public.record_contract_evidence_document_access_transaction(uuid,uuid,uuid,text,text,bigint,uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.record_contract_evidence_document_access_transaction(uuid,uuid,uuid,text,text,bigint,uuid,text)
  to service_role;
revoke create on schema public from evolv_contract_evidence_owner;

comment on table public.contract_evidence_document_access_events is
  'Append-only C8C3 access audit. Never stores bucket, path, hash, credentials, or document bytes.';
