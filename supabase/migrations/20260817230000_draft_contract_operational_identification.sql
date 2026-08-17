-- CONTRACT-024B-01 C6 - controlled operational identification for materialized drafts.
do $$ begin
 if to_regclass('public.contract_materializations') is null or to_regprocedure('public.materialize_approved_commercial_proposal_transaction(uuid,uuid,text)') is null then raise exception 'C6_PRECHECK_MISSING_C5'; end if;
 if exists(select 1 from public.contracts where contract_quota is not null group by organization_id,administrator_id,contract_group,contract_quota having count(*)>1) then raise exception 'C6_PREFLIGHT_DUPLICATE_GROUP_QUOTA'; end if;
end $$;

create unique index contracts_operational_quota_uidx on public.contracts(organization_id,administrator_id,contract_group,contract_quota) nulls not distinct where contract_quota is not null;

create table public.contract_identification_audit_events(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 contract_id uuid not null, contract_materialization_id uuid not null, event_type text not null check(event_type in('contract_identification_completed','contract_identification_corrected')),
 actor_id uuid not null references public.profiles(id) on delete restrict, origin text not null check(origin in('manual','rpa','administrator_integration')),
 changed_fields text[] not null check(cardinality(changed_fields)>0), before_values jsonb not null, after_values jsonb not null,
 reason text, correlation_id uuid not null default gen_random_uuid(), created_at timestamptz not null default now(),
 foreign key(organization_id,contract_id) references public.contracts(organization_id,id) on delete restrict,
 foreign key(organization_id,contract_materialization_id) references public.contract_materializations(organization_id,id) on delete restrict
);
create index contract_identification_audit_contract_idx on public.contract_identification_audit_events(organization_id,contract_id,created_at desc);
create or replace function public.prevent_contract_identification_audit_rewrite() returns trigger language plpgsql set search_path=public,pg_temp as $$begin raise exception using errcode='P0001',message='CONTRACT_IDENTIFICATION_AUDIT_IMMUTABLE'; end$$;
create trigger contract_identification_audit_append_only before update or delete on public.contract_identification_audit_events for each row execute function public.prevent_contract_identification_audit_rewrite();
alter table public.contract_identification_audit_events enable row level security;
revoke all on public.contract_identification_audit_events from public,anon,authenticated;
grant select on public.contract_identification_audit_events to authenticated;
create policy "organizations can read contract identification audit" on public.contract_identification_audit_events for select to authenticated using(organization_id=public.evolv_current_organization_id());

create or replace function public.protect_materialized_contract_operational_fields() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_internal boolean:=current_user='postgres' and current_setting('app.contract_identification_origin',true) in('manual','rpa','administrator_integration');
begin
 if old.contract_materialization_id is not null then
  if old.administrator_id is distinct from new.administrator_id or old.contract_group is distinct from new.contract_group or old.product_type is distinct from new.product_type
   or old.commercial_catalog_code is distinct from new.commercial_catalog_code or old.credit_amount is distinct from new.credit_amount
   or old.installment_amount is distinct from new.installment_amount or old.term_months is distinct from new.term_months
  then raise exception using errcode='P0001',message='CID_MATERIALIZED_TERMS_IMMUTABLE'; end if;
  if (old.contract_number is distinct from new.contract_number or old.contract_quota is distinct from new.contract_quota) and not v_internal then
   raise exception using errcode='P0001',message='CID_IDENTIFICATION_COMMAND_REQUIRED';
  end if;
  if new.status='active' and old.status is distinct from 'active' and (nullif(btrim(new.contract_number),'') is null or nullif(btrim(new.contract_quota),'') is null) then
   raise exception using errcode='P0001',message='CID_IDENTIFICATION_REQUIRED_FOR_ACTIVATION';
  end if;
 end if; return new;
end$$;
create trigger contracts_materialized_operational_guard before update on public.contracts for each row execute function public.protect_materialized_contract_operational_fields();

create or replace function public.complete_materialized_contract_identification_transaction(
 p_contract_id uuid,p_set_contract_number boolean,p_contract_number text,p_set_contract_quota boolean,p_contract_quota text,p_reason text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_org uuid; v_role text; v_contract public.contracts%rowtype; v_updated public.contracts%rowtype;
 v_number text; v_quota text; v_reason text:=nullif(btrim(p_reason),''); v_corrected boolean:=false; v_completed boolean:=false;
 v_changed text[]:='{}'; v_before jsonb:='{}'; v_after jsonb:='{}'; v_audit uuid; v_constraint text;
begin
 if v_actor is null then raise exception using errcode='P0001',message='CID_AUTH_REQUIRED'; end if;
 select organization_id,role into v_org,v_role from public.profiles where id=v_actor and is_active=true;
 if not found or v_role not in('master','admin') then raise exception using errcode='P0001',message='CID_ACTOR_FORBIDDEN'; end if;
 if not coalesce(p_set_contract_number,false) and not coalesce(p_set_contract_quota,false) then raise exception using errcode='P0001',message='CID_NO_FIELDS'; end if;
 if p_set_contract_number then v_number:=btrim(p_contract_number); if p_contract_number is null or v_number='' or length(v_number)>128 or v_number~'[[:cntrl:]]' then raise exception using errcode='P0001',message='CID_NUMBER_INVALID'; end if; end if;
 if p_set_contract_quota then v_quota:=btrim(p_contract_quota); if p_contract_quota is null or v_quota='' or length(v_quota)>128 or v_quota~'[[:cntrl:]]' then raise exception using errcode='P0001',message='CID_QUOTA_INVALID'; end if; end if;
 if v_reason is not null and length(v_reason)>1000 then raise exception using errcode='P0001',message='CID_INVALID_PAYLOAD'; end if;
 select * into v_contract from public.contracts where id=p_contract_id and organization_id=v_org for update;
 if not found then raise exception using errcode='P0001',message='CID_CONTRACT_NOT_FOUND'; end if;
 if v_contract.contract_materialization_id is null then raise exception using errcode='P0001',message='CID_NOT_MATERIALIZED'; end if;
 if not exists(select 1 from public.contract_materializations where id=v_contract.contract_materialization_id and organization_id=v_org) then raise exception using errcode='P0001',message='CID_MATERIALIZATION_INCONSISTENT'; end if;
 if v_contract.status<>'draft' then raise exception using errcode='P0001',message='CID_STATUS_NOT_ALLOWED'; end if;
 if p_set_contract_number and v_number is distinct from v_contract.contract_number then
  v_changed:=array_append(v_changed,'contract_number'); v_before:=v_before||jsonb_build_object('contractNumber',v_contract.contract_number); v_after:=v_after||jsonb_build_object('contractNumber',v_number);
  if v_contract.contract_number is null then v_completed:=true; else v_corrected:=true; end if;
 end if;
 if p_set_contract_quota and v_quota is distinct from v_contract.contract_quota then
  v_changed:=array_append(v_changed,'contract_quota'); v_before:=v_before||jsonb_build_object('contractQuota',v_contract.contract_quota); v_after:=v_after||jsonb_build_object('contractQuota',v_quota);
  if v_contract.contract_quota is null then v_completed:=true; else v_corrected:=true; end if;
 end if;
 if cardinality(v_changed)=0 then return jsonb_build_object('outcome','unchanged','contract',to_jsonb(v_contract),'auditEventId',null); end if;
 if v_corrected and v_reason is null then raise exception using errcode='P0001',message='CID_REASON_REQUIRED'; end if;
 perform set_config('app.contract_identification_origin','manual',true);
 update public.contracts set contract_number=case when p_set_contract_number then v_number else contract_number end,
  contract_quota=case when p_set_contract_quota then v_quota else contract_quota end,updated_by=v_actor
 where id=v_contract.id returning * into v_updated;
 insert into public.contract_identification_audit_events(organization_id,contract_id,contract_materialization_id,event_type,actor_id,origin,changed_fields,before_values,after_values,reason)
 values(v_org,v_contract.id,v_contract.contract_materialization_id,case when v_corrected then 'contract_identification_corrected' else 'contract_identification_completed' end,v_actor,'manual',v_changed,v_before,v_after,case when v_corrected then v_reason else null end) returning id into v_audit;
 return jsonb_build_object('outcome',case when v_corrected then 'corrected' else 'completed' end,'contract',to_jsonb(v_updated),'auditEventId',v_audit);
exception when unique_violation then
 get stacked diagnostics v_constraint=constraint_name;
 if v_constraint='contracts_org_contract_number_unique' then raise exception using errcode='P0001',message='CID_NUMBER_CONFLICT'; end if;
 if v_constraint='contracts_operational_quota_uidx' then raise exception using errcode='P0001',message='CID_QUOTA_CONFLICT'; end if;
 raise exception using errcode='P0001',message='CID_INTERNAL_ERROR';
end$$;
revoke all on function public.complete_materialized_contract_identification_transaction(uuid,boolean,text,boolean,text,text) from public,anon,service_role;
grant execute on function public.complete_materialized_contract_identification_transaction(uuid,boolean,text,boolean,text,text) to authenticated;
