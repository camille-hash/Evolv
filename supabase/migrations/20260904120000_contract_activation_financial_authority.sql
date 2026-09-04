-- CONTRACT-024B-01 C9A V2 - persisted financial authority and canonical activation boundary.
alter table public.contracts
  add column financial_authority text null
    check (financial_authority in ('commission_engine','legacy_revenue','not_applicable')),
  add column financial_authority_resolved_at timestamptz null,
  add column financial_authority_resolved_by uuid null references public.profiles(id) on delete set null,
  add column financial_authority_resolution_source text null
    check (financial_authority_resolution_source in ('automatic_ce_history','automatic_legacy_history','automatic_ce_configuration','explicit_master_admin'));

create table public.contract_activation_intents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid not null,
  operation text not null check(operation in ('activate','deactivate','reactivate')),
  idempotency_key text not null check(length(btrim(idempotency_key)) between 8 and 200),
  previous_status text not null,
  requested_status text not null check(requested_status in ('active','inactive')),
  requested_financial_authority text null check(requested_financial_authority in ('commission_engine','legacy_revenue','not_applicable')),
  financial_authority text null check(financial_authority in ('commission_engine','legacy_revenue','not_applicable')),
  authority_resolution_source text null check(authority_resolution_source in ('persisted','automatic_ce_history','automatic_legacy_history','automatic_ce_configuration','explicit_master_admin')),
  resolution_outcome text not null check(resolution_outcome in ('resolved','selection_required','reconciliation_required','configuration_required')),
  financial_outcome text not null check(financial_outcome in ('pending','completed','not_applicable','failed')),
  failure_code text null,
  safe_failure_message text null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint contract_activation_intents_contract_fkey foreign key(organization_id,contract_id) references public.contracts(organization_id,id) on delete restrict,
  constraint contract_activation_intents_idempotency_key unique(organization_id,contract_id,idempotency_key)
);
create index contract_activation_intents_contract_idx on public.contract_activation_intents(organization_id,contract_id,created_at desc);
alter table public.contract_activation_intents enable row level security;
revoke all on public.contract_activation_intents from public,anon,authenticated,service_role;
grant select on public.contract_activation_intents to authenticated;
create policy "organizations can read contract activation intents" on public.contract_activation_intents
 for select to authenticated using(organization_id=public.evolv_current_organization_id());

create or replace function public.protect_contract_activation_boundary() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_command boolean:=current_user='postgres' and coalesce(current_setting('app.contract_activation_command',true),'')='c9a';
begin
 if tg_op='INSERT' and new.status in ('active','inactive') and not v_command then
  raise exception using errcode='P0001',message='ACTIVATION_GENERIC_LIFECYCLE_BYPASS';
 end if;
 if tg_op='UPDATE' then
  if old.financial_authority is distinct from new.financial_authority and not v_command then
   raise exception using errcode='P0001',message='ACTIVATION_AUTHORITY_IMMUTABLE';
  end if;
  if old.status is distinct from new.status and (old.status in ('active','inactive') or new.status in ('active','inactive')) and not v_command then
   raise exception using errcode='P0001',message='ACTIVATION_GENERIC_LIFECYCLE_BYPASS';
  end if;
 end if;
 return new;
end$$;
create trigger contracts_activation_boundary before insert or update on public.contracts for each row execute function public.protect_contract_activation_boundary();

create or replace function public.begin_contract_activation_intent(
 p_contract_id uuid,p_operation text,p_idempotency_key text,p_selected_authority text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid();v_org uuid;v_role text;v_contract public.contracts%rowtype;v_existing public.contract_activation_intents%rowtype;
 v_requested text;v_ce_snap int;v_ce_schedule int;v_ce_expected int;v_legacy int;v_executed_missing int;v_authority text;v_source text;v_resolution text;v_financial text:='pending';v_intent public.contract_activation_intents%rowtype;v_now timestamptz:=now();v_reusing boolean:=false;
begin
 select organization_id,role into v_org,v_role from public.profiles where id=v_actor and is_active=true;
 if not found or v_role not in('master','admin') then raise exception using errcode='P0001',message='ACTIVATION_FORBIDDEN';end if;
 if p_operation not in('activate','deactivate','reactivate') or nullif(btrim(p_idempotency_key),'') is null or length(btrim(p_idempotency_key)) not between 8 and 200
   or (p_selected_authority is not null and p_selected_authority not in('commission_engine','legacy_revenue','not_applicable')) then
  raise exception using errcode='P0001',message='ACTIVATION_INVALID_PAYLOAD';end if;
 select * into v_contract from public.contracts where id=p_contract_id and organization_id=v_org for update;
 if not found then raise exception using errcode='P0001',message='ACTIVATION_CONTRACT_NOT_FOUND';end if;
 select * into v_existing from public.contract_activation_intents where organization_id=v_org and contract_id=p_contract_id and idempotency_key=btrim(p_idempotency_key) for update;
 if found then
  v_reusing:=true;
  if v_existing.operation<>p_operation or (v_existing.requested_financial_authority is not null and v_existing.requested_financial_authority is distinct from p_selected_authority) then
   raise exception using errcode='P0001',message='ACTIVATION_IDEMPOTENCY_CONFLICT';end if;
  if v_existing.resolution_outcome<>'selection_required' and p_selected_authority is not null and v_existing.requested_financial_authority is null then
   if v_existing.resolution_outcome='reconciliation_required' then
    raise exception using errcode='P0001',message='ACTIVATION_AUTHORITY_RECONCILIATION_REQUIRED';
   end if;
   raise exception using errcode='P0001',message='ACTIVATION_IDEMPOTENCY_CONFLICT';
  end if;
  if v_existing.resolution_outcome<>'selection_required' or p_selected_authority is null then return to_jsonb(v_existing)||jsonb_build_object('contract',to_jsonb(v_contract));end if;
 end if;
 v_requested:=case when p_operation in('activate','reactivate') then 'active' else 'inactive' end;
 if (p_operation='activate' and v_contract.status in('active','inactive')) or (p_operation='reactivate' and v_contract.status<>'inactive') or (p_operation='deactivate' and v_contract.status<>'active') then
  raise exception using errcode='P0001',message='ACTIVATION_TRANSITION_CONFLICT';end if;

 v_authority:=v_contract.financial_authority;v_source:=case when v_authority is null then null else 'persisted' end;
  if v_authority is not null and p_selected_authority is not null and v_authority is distinct from p_selected_authority then
   raise exception using errcode='P0001',message='ACTIVATION_AUTHORITY_CONFLICT';
  end if;
  if v_authority is null then
   select count(*) into v_ce_snap from public.contract_commission_snapshots where contract_id=p_contract_id and organization_id=v_org;
   select count(*) into v_ce_schedule from public.contract_commission_schedule_items where contract_id=p_contract_id and organization_id=v_org;
   select count(*) into v_ce_expected from public.expected_revenue_entries where contract_id=p_contract_id and organization_id=v_org;
   select count(*) into v_legacy from public.revenue_entries where contract_id=p_contract_id and organization_id=v_org;
   select count(*) into v_executed_missing from public.contract_commission_schedule_items s where s.contract_id=p_contract_id and s.organization_id=v_org and s.business_status='executada' and not exists(select 1 from public.expected_revenue_entries e where e.organization_id=v_org and e.commission_schedule_item_id=s.id);
   if (v_ce_snap>0 and v_ce_schedule=0) or v_executed_missing>0 or ((v_ce_snap+v_ce_schedule+v_ce_expected)>0 and v_legacy>0) then v_resolution:='reconciliation_required';
   elsif (v_ce_snap+v_ce_schedule+v_ce_expected)>0 and p_selected_authority is not null and p_selected_authority<>'commission_engine' then v_resolution:='reconciliation_required';
   elsif (v_ce_snap+v_ce_schedule+v_ce_expected)>0 then v_authority:='commission_engine';v_source:='automatic_ce_history';v_resolution:='resolved';
   elsif v_legacy>0 and p_selected_authority is not null and p_selected_authority<>'legacy_revenue' then v_resolution:='reconciliation_required';
   elsif v_legacy>0 then v_authority:='legacy_revenue';v_source:='automatic_legacy_history';v_resolution:='resolved';
   elsif p_selected_authority is null then v_resolution:='selection_required';
   elsif p_selected_authority='commission_engine' and (v_contract.commission_plan_id is null or not exists(select 1 from public.commission_plan_schedule_items where organization_id=v_org and commission_plan_id=v_contract.commission_plan_id)) then v_resolution:='configuration_required';
   else v_authority:=p_selected_authority;v_source:='explicit_master_admin';v_resolution:='resolved';end if;
  else v_resolution:='resolved';end if;
 if v_resolution='resolved' and v_authority='not_applicable' then v_financial:='not_applicable';end if;
 if v_reusing then
  update public.contract_activation_intents set requested_financial_authority=p_selected_authority,financial_authority=v_authority,authority_resolution_source=v_source,resolution_outcome=v_resolution,financial_outcome=v_financial,
   failure_code=case v_resolution when 'reconciliation_required' then 'ACTIVATION_AUTHORITY_RECONCILIATION_REQUIRED' when 'configuration_required' then 'ACTIVATION_FINANCIAL_CONFIGURATION_REQUIRED' else null end,
   safe_failure_message=case v_resolution when 'reconciliation_required' then 'Registros financeiros conflitantes exigem reconciliacao.' when 'configuration_required' then 'A configuracao financeira precisa ser concluida.' else null end
  where id=v_existing.id returning * into v_intent;
 else
  insert into public.contract_activation_intents(organization_id,contract_id,operation,idempotency_key,previous_status,requested_status,requested_financial_authority,financial_authority,authority_resolution_source,resolution_outcome,financial_outcome,failure_code,safe_failure_message,requested_by)
  values(v_org,p_contract_id,p_operation,btrim(p_idempotency_key),v_contract.status,v_requested,p_selected_authority,v_authority,v_source,v_resolution,v_financial,
   case v_resolution when 'reconciliation_required' then 'ACTIVATION_AUTHORITY_RECONCILIATION_REQUIRED' when 'configuration_required' then 'ACTIVATION_FINANCIAL_CONFIGURATION_REQUIRED' else null end,
   case v_resolution when 'reconciliation_required' then 'Registros financeiros conflitantes exigem reconciliacao.' when 'configuration_required' then 'A configuracao financeira precisa ser concluida.' else null end,v_actor) returning * into v_intent;
 end if;
 if v_resolution='resolved' then
  if v_contract.financial_authority is null and v_authority is not null then
   perform set_config('app.contract_activation_command','c9a',true);
   update public.contracts set financial_authority=v_authority,financial_authority_resolved_at=v_now,financial_authority_resolved_by=v_actor,financial_authority_resolution_source=v_source,updated_by=v_actor where id=p_contract_id returning * into v_contract;
  end if;
  perform set_config('app.contract_activation_command','c9a',true);
  update public.contracts set status=v_requested,activated_at=case when v_requested='active' then coalesce(activated_at,v_now) else activated_at end,
   metadata=case when p_operation in('reactivate','deactivate') then jsonb_set(coalesce(metadata,'{}'::jsonb),'{operationalHistory}',coalesce(metadata->'operationalHistory','[]'::jsonb)||jsonb_build_array(jsonb_build_object('type',case when p_operation='reactivate' then 'contract_reactivated' else 'contract_inactivated' end,'occurredAt',v_now,'fromStatus',v_contract.status,'toStatus',v_requested,'source','contract_activation_command')),true) else metadata end,updated_by=v_actor
  where id=p_contract_id returning * into v_contract;
  if v_financial='not_applicable' then update public.contract_activation_intents set completed_at=v_now where id=v_intent.id returning * into v_intent;end if;
 end if;
 return to_jsonb(v_intent)||jsonb_build_object('contract',to_jsonb(v_contract));
end$$;

create or replace function public.finish_contract_activation_intent(p_intent_id uuid,p_financial_outcome text,p_failure_code text default null,p_safe_failure_message text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid();v_org uuid;v_role text;v_intent public.contract_activation_intents%rowtype;
begin
 select organization_id,role into v_org,v_role from public.profiles where id=v_actor and is_active=true;
 if not found or v_role not in('master','admin') then raise exception using errcode='P0001',message='ACTIVATION_FORBIDDEN';end if;
 if p_financial_outcome not in('completed','pending','failed') then raise exception using errcode='P0001',message='ACTIVATION_INVALID_PAYLOAD';end if;
 select * into v_intent from public.contract_activation_intents where id=p_intent_id and organization_id=v_org for update;
 if not found then raise exception using errcode='P0001',message='ACTIVATION_INTENT_NOT_FOUND';end if;
 if v_intent.financial_outcome in('completed','not_applicable') then return to_jsonb(v_intent);end if;
 update public.contract_activation_intents set financial_outcome=p_financial_outcome,failure_code=case when p_financial_outcome='completed' then null else left(p_failure_code,100) end,
 safe_failure_message=case when p_financial_outcome='completed' then null else left(p_safe_failure_message,500) end,completed_at=case when p_financial_outcome in('completed','failed') then now() else null end
 where id=v_intent.id returning * into v_intent;return to_jsonb(v_intent);
end$$;

revoke all on function public.begin_contract_activation_intent(uuid,text,text,text) from public,anon,service_role;
revoke all on function public.finish_contract_activation_intent(uuid,text,text,text) from public,anon,service_role;
grant execute on function public.begin_contract_activation_intent(uuid,text,text,text) to authenticated;
grant execute on function public.finish_contract_activation_intent(uuid,text,text,text) to authenticated;
