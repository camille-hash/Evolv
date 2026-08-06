-- META-ADS-001: finalize the Production baseline created by 20260803120000.
-- Requires 20260805120000 to have completed the crm_leads canonical gap.

do $$
begin
  if to_regclass('public.lead_ingestion_integration_configs') is null
    or to_regclass('public.lead_ingestion_events') is null then
    raise exception 'META baseline 20260803120000 is missing';
  end if;

  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.crm_leads'::regclass
      and attname = 'assigned_profile_id'
      and atttypid = 'uuid'::regtype
      and not attnotnull
      and not attisdropped
  ) or not exists (
    select 1 from pg_attribute
    where attrelid = 'public.crm_leads'::regclass
      and attname = 'source_system'
      and atttypid = 'text'::regtype
      and not attnotnull
      and not attisdropped
  ) or not exists (
    select 1 from pg_attribute
    where attrelid = 'public.crm_leads'::regclass
      and attname = 'metadata'
      and atttypid = 'jsonb'::regtype
      and attnotnull
      and not attisdropped
  ) then
    raise exception 'CRM canonical gap 20260805120000 is incomplete';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lead_ingestion_integration_configs'
      and column_name = 'allowed_form_ids'
  ) or exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lead_ingestion_events'
      and column_name in (
        'form_id', 'failed_stage', 'error_category', 'retryable',
        'next_attempt_at', 'claim_token', 'claimed_at', 'claim_expires_at',
        'worker_id', 'materialization_result', 'reconciliation_decision',
        'manually_reprocessed_at', 'manual_reprocess_reason'
      )
  ) then
    raise exception 'Unexpected partially finalized Meta ingestion structure';
  end if;
end
$$;

-- Reject ambiguous historical shapes before acquiring the first table-changing lock.
do $$
begin
  if exists (
    select 1
    from public.lead_ingestion_events event
    where (event.status = 'received' and event.organization_id is not null)
      or (
        event.status <> 'received'
        and not (
          event.status = 'rejected'
          and event.organization_id is null
          and event.last_error_code = 'INTEGRATION_NOT_FOUND'
        )
        and (event.organization_id is null or event.integration_config_id is null)
      )
  ) then
    raise exception 'Historical ingestion event has an incompatible tenant/status shape';
  end if;

  if exists (
    select 1
    from public.lead_ingestion_events event
    join public.lead_ingestion_integration_configs config
      on config.id = event.integration_config_id
    where event.organization_id is distinct from config.organization_id
      or event.source_system is distinct from config.source_system
  ) then
    raise exception 'Historical ingestion event conflicts with its integration configuration';
  end if;

  if exists (
    select 1
    from public.lead_ingestion_events event
    left join public.crm_leads lead on lead.id = event.crm_lead_id
    where event.status = 'materialized'
      and (
        event.crm_lead_id is null
        or lead.id is null
        or lead.organization_id is distinct from event.organization_id
      )
  ) then
    raise exception 'Historical materialized event has an incompatible CRM lead link';
  end if;
end
$$;

alter table public.lead_ingestion_integration_configs
  add column allowed_form_ids text[] not null default '{}'::text[];

comment on column public.lead_ingestion_integration_configs.allowed_form_ids is
  'Explicit Meta form allowlist for this page. Empty means no form is authorized.';

alter table public.lead_ingestion_events
  add column form_id text null,
  add column failed_stage text null,
  add column error_category text null,
  add column retryable boolean not null default false,
  add column next_attempt_at timestamptz null,
  add column claim_token uuid null,
  add column claimed_at timestamptz null,
  add column claim_expires_at timestamptz null,
  add column worker_id text null,
  add column materialization_result text null,
  add column reconciliation_decision jsonb not null default '{}'::jsonb,
  add column manually_reprocessed_at timestamptz null,
  add column manual_reprocess_reason text null;

-- Preserve any baseline rows while converting only legacy representations.
update public.lead_ingestion_events
set form_id = nullif(btrim(coalesce(normalized_payload ->> 'formId', '')), '')
where form_id is null;

update public.lead_ingestion_events
set status = 'tenant_unresolved',
    failed_stage = 'tenant_resolution',
    error_category = 'tenant_unresolved',
    retryable = false,
    next_attempt_at = null
where status = 'rejected'
  and organization_id is null
  and last_error_code = 'INTEGRATION_NOT_FOUND';

update public.lead_ingestion_events
set failed_stage = 'authorization',
    error_category = 'integration_inactive',
    retryable = false,
    next_attempt_at = null,
    claim_token = null,
    claimed_at = null,
    claim_expires_at = null,
    worker_id = null
where status = 'rejected'
  and organization_id is not null
  and last_error_code = 'INTEGRATION_INACTIVE';

update public.lead_ingestion_events
set status = 'processing_failed',
    failed_stage = 'graph_fetch',
    error_category = coalesce(error_category, 'legacy_fetch_failure'),
    retryable = true,
    next_attempt_at = coalesce(next_attempt_at, now())
where status = 'fetch_failed';

update public.lead_ingestion_events event
set status = case
      when lead.organization_id = event.organization_id then 'materialized'
      else 'integrity_conflict'
    end,
    failed_stage = case
      when lead.organization_id = event.organization_id then null
      else 'materialization'
    end,
    error_category = case
      when lead.organization_id = event.organization_id then null
      else 'cross_tenant_conflict'
    end,
    retryable = false,
    materialization_result = case
      when lead.organization_id = event.organization_id then 'linked_existing'
      else null
    end
from public.crm_leads lead
where event.status = 'duplicate'
  and event.crm_lead_id = lead.id;

update public.lead_ingestion_events
set status = 'integrity_conflict',
    failed_stage = 'materialization',
    error_category = 'legacy_duplicate_without_lead',
    retryable = false
where status = 'duplicate';

update public.lead_ingestion_events event
set materialization_result = case
  when lead.metadata ->> 'leadIngestionEventId' = event.id::text then 'created'
  else 'linked_existing'
end
from public.crm_leads lead
where event.status = 'materialized'
  and event.crm_lead_id = lead.id
  and event.materialization_result is null;

alter table public.lead_ingestion_events
  drop constraint lead_ingestion_events_status_check;

alter table public.lead_ingestion_events
  add constraint lead_ingestion_events_status_check check (status in (
    'received', 'tenant_unresolved', 'fetch_pending', 'processing',
    'materialization_pending', 'review_required', 'processing_failed',
    'rejected', 'integrity_conflict', 'materialized', 'retry_exhausted'
  )),
  add constraint lead_ingestion_events_failed_stage_check check (
    failed_stage is null or failed_stage in (
      'tenant_resolution', 'authorization', 'graph_fetch', 'normalization',
      'reconciliation', 'materialization', 'internal'
    )
  ),
  add constraint lead_ingestion_events_claim_shape_check check (
    (claim_token is null and claimed_at is null and claim_expires_at is null and worker_id is null)
    or (claim_token is not null and claimed_at is not null and claim_expires_at is not null
      and worker_id is not null and claim_expires_at > claimed_at)
  ),
  add constraint lead_ingestion_events_tenant_state_check check (
    (status in ('received', 'tenant_unresolved') and organization_id is null)
    or (status not in ('received', 'tenant_unresolved')
      and organization_id is not null and integration_config_id is not null)
  ),
  add constraint lead_ingestion_events_terminal_retry_check check (
    status not in ('rejected', 'integrity_conflict', 'materialized') or retryable = false
  ),
  add constraint lead_ingestion_events_materialized_shape_check check (
    status <> 'materialized'
    or (crm_lead_id is not null and materialization_result in ('created', 'linked_existing'))
  ),
  add constraint lead_ingestion_events_reconciliation_decision_object_check check (
    jsonb_typeof(reconciliation_decision) = 'object'
  );

create index lead_ingestion_events_retry_schedule_idx
  on public.lead_ingestion_events (next_attempt_at, received_at)
  where status = 'processing_failed' and retryable;
create index lead_ingestion_events_claim_expiration_idx
  on public.lead_ingestion_events (claim_expires_at)
  where claim_token is not null;
create index lead_ingestion_events_form_id_idx
  on public.lead_ingestion_events (form_id);

alter table public.lead_ingestion_integration_configs enable row level security;
alter table public.lead_ingestion_events enable row level security;

revoke all on table public.lead_ingestion_integration_configs
  from public, anon, authenticated, service_role;
revoke all on table public.lead_ingestion_events
  from public, anon, authenticated, service_role;

grant select, insert, update on table public.lead_ingestion_integration_configs
  to authenticated, service_role;
grant select, insert, update on table public.lead_ingestion_events
  to service_role;

drop policy if exists "lead_ingestion_configs authenticated read same organization"
  on public.lead_ingestion_integration_configs;
create policy "lead_ingestion_configs authenticated read same organization"
on public.lead_ingestion_integration_configs
for select to authenticated
using (organization_id = public.evolv_current_organization_id());

drop policy if exists "lead_ingestion_configs authenticated insert same organization"
  on public.lead_ingestion_integration_configs;
create policy "lead_ingestion_configs authenticated insert same organization"
on public.lead_ingestion_integration_configs
for insert to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master', 'admin')
);

drop policy if exists "lead_ingestion_configs authenticated update same organization"
  on public.lead_ingestion_integration_configs;
create policy "lead_ingestion_configs authenticated update same organization"
on public.lead_ingestion_integration_configs
for update to authenticated
using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master', 'admin')
)
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master', 'admin')
);

drop function public.materialize_lead_ingestion_event_transaction(uuid, timestamptz);
drop function if exists public.claim_lead_ingestion_events(text, integer, integer, timestamptz);
drop function if exists public.retry_lead_ingestion_event(uuid, text, timestamptz);

create function public.claim_lead_ingestion_events(
  p_worker_id text,
  p_limit integer default 10,
  p_lease_seconds integer default 60
)
returns setof public.lead_ingestion_events
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
begin
  if nullif(btrim(p_worker_id), '') is null then
    raise exception 'worker_id obrigatorio.' using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 100 or p_lease_seconds < 10 or p_lease_seconds > 900 then
    raise exception 'Parametros de claim invalidos.' using errcode = '22023';
  end if;
  v_now := clock_timestamp();
  return query
  with exhausted_candidates as (
    select event.id
    from public.lead_ingestion_events event
    where event.source_system = 'meta_lead_ads'
      and event.status in ('fetch_pending', 'materialization_pending')
      and event.attempt_count >= 3
      and event.organization_id is not null
      and event.integration_config_id is not null
      and (event.claim_token is null or event.claim_expires_at <= v_now)
    order by event.received_at, event.id
    for update skip locked
    limit p_limit
  ), exhausted as (
    update public.lead_ingestion_events event
    set status = 'retry_exhausted',
        retryable = false,
        next_attempt_at = null,
        claim_token = null,
        claimed_at = null,
        claim_expires_at = null,
        worker_id = null
    from exhausted_candidates
    where event.id = exhausted_candidates.id
    returning event.id
  ), candidates as (
    select event.id
    from public.lead_ingestion_events event
    where event.source_system = 'meta_lead_ads'
      and event.status in ('fetch_pending', 'materialization_pending')
      and event.attempt_count < 3
      and event.organization_id is not null
      and event.integration_config_id is not null
      and (event.next_attempt_at is null or event.next_attempt_at <= v_now)
      and (event.claim_token is null or event.claim_expires_at <= v_now)
      and (select count(*) from exhausted) >= 0
    order by event.received_at, event.id
    for update skip locked
    limit p_limit
  )
  update public.lead_ingestion_events event
  set claim_token = gen_random_uuid(),
      claimed_at = v_now,
      claim_expires_at = v_now + make_interval(secs => p_lease_seconds),
      worker_id = btrim(p_worker_id),
      attempt_count = event.attempt_count + 1
  from candidates
  where event.id = candidates.id
  returning event.*;
end;
$$;

create function public.mark_meta_lead_ingestion_event_enriched(
  p_event_id uuid,
  p_claim_token uuid,
  p_normalized_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_updated boolean;
begin
  if p_event_id is null or p_claim_token is null or p_normalized_payload is null then
    return false;
  end if;
  update public.lead_ingestion_events
  set error_category = null,
      failed_stage = null,
      last_error_code = null,
      last_error_message = null,
      normalized_payload = p_normalized_payload,
      retryable = false,
      status = 'materialization_pending'
  where id = p_event_id
    and status = 'fetch_pending'
    and claim_token = p_claim_token
    and claim_expires_at > clock_timestamp()
  returning true into v_updated;
  return coalesce(v_updated, false);
end;
$$;

create function public.mark_meta_lead_ingestion_event_failed(
  p_event_id uuid,
  p_claim_token uuid,
  p_category text,
  p_message text,
  p_retryable boolean,
  p_stage text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_updated boolean;
begin
  if p_event_id is null
    or p_claim_token is null
    or nullif(btrim(p_category), '') is null
    or nullif(btrim(p_message), '') is null
    or p_retryable is null
    or p_stage not in ('graph_fetch', 'normalization', 'materialization') then
    return false;
  end if;
  update public.lead_ingestion_events
  set claim_expires_at = case when p_retryable then claim_expires_at else null end,
      claim_token = case when p_retryable then claim_token else null end,
      claimed_at = case when p_retryable then claimed_at else null end,
      error_category = btrim(p_category),
      failed_stage = p_stage,
      last_error_code = upper(btrim(p_category)),
      last_error_message = btrim(p_message),
      next_attempt_at = null,
      retryable = p_retryable,
      status = case when p_retryable then 'processing_failed' else 'review_required' end,
      worker_id = case when p_retryable then worker_id else null end
  where id = p_event_id
    and claim_token = p_claim_token
    and claim_expires_at > clock_timestamp()
    and ((status = 'fetch_pending' and p_stage in ('graph_fetch', 'normalization'))
      or (status = 'materialization_pending' and p_stage = 'materialization'))
  returning true into v_updated;
  return coalesce(v_updated, false);
end;
$$;

create function public.retry_lead_ingestion_event(
  p_event_id uuid,
  p_claim_token uuid,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.lead_ingestion_events%rowtype;
  v_max_attempts constant integer := 3;
  v_next_status text;
  v_now timestamptz;
begin
  select * into v_event
  from public.lead_ingestion_events
  where id = p_event_id
  for update;
  if not found then return 'lease_lost'; end if;
  v_now := clock_timestamp();
  if p_claim_token is null
    or v_event.claim_token is distinct from p_claim_token
    or v_event.claim_expires_at is null
    or v_event.claim_expires_at <= v_now
    or v_event.status <> 'processing_failed'
    or not v_event.retryable then
    return 'lease_lost';
  end if;
  v_next_status := case v_event.failed_stage
    when 'graph_fetch' then 'fetch_pending'
    when 'normalization' then 'fetch_pending'
    when 'reconciliation' then 'fetch_pending'
    when 'materialization' then 'materialization_pending'
    else null
  end;
  if v_next_status is null then return 'lease_lost'; end if;
  if v_event.attempt_count >= v_max_attempts then
    update public.lead_ingestion_events
    set status = 'retry_exhausted', retryable = false, next_attempt_at = null,
        claim_token = null, claimed_at = null, claim_expires_at = null, worker_id = null
    where id = v_event.id;
    return 'retry_exhausted';
  end if;
  update public.lead_ingestion_events
  set status = v_next_status, retryable = false, next_attempt_at = null,
      claim_token = null, claimed_at = null, claim_expires_at = null, worker_id = null,
      manually_reprocessed_at = v_now,
      manual_reprocess_reason = nullif(btrim(p_reason), '')
  where id = v_event.id;
  return 'retried';
end;
$$;

create function public.materialize_lead_ingestion_event_transaction(
  p_event_id uuid,
  p_claim_token uuid,
  p_target_lead_id uuid default null,
  p_processed_at timestamptz default now()
)
returns table (ingestion_event jsonb, crm_lead jsonb)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.lead_ingestion_events%rowtype;
  v_config public.lead_ingestion_integration_configs%rowtype;
  v_lead public.crm_leads%rowtype;
  v_name text;
  v_phone text;
  v_email text;
  v_materialization_result text;
  v_now timestamptz;
begin
  select * into v_event
  from public.lead_ingestion_events
  where id = p_event_id
  for update;
  if not found then return; end if;
  if v_event.source_system <> 'meta_lead_ads' then return; end if;
  if v_event.status = 'materialized' then
    select * into v_lead
    from public.crm_leads
    where id = v_event.crm_lead_id
      and organization_id = v_event.organization_id;
    if not found then
      raise exception 'Vinculo materializado viola o tenant.' using errcode = 'P0001';
    end if;
    return query select to_jsonb(v_event), to_jsonb(v_lead);
    return;
  end if;
  v_now := clock_timestamp();
  if v_event.status <> 'materialization_pending'
    or v_event.organization_id is null
    or v_event.integration_config_id is null
    or p_claim_token is null
    or v_event.claim_token is distinct from p_claim_token
    or v_event.claim_expires_at is null
    or v_event.claim_expires_at <= v_now then
    return;
  end if;
  select * into v_config
  from public.lead_ingestion_integration_configs
  where id = v_event.integration_config_id
    and organization_id = v_event.organization_id
    and source_system = v_event.source_system
    and status = 'active'
  for update;
  if not found then
    raise exception 'Configuracao inativa ou incompativel com o tenant.' using errcode = 'P0001';
  end if;
  if v_event.form_id is null or not (v_event.form_id = any(v_config.allowed_form_ids)) then
    raise exception 'Formulario nao autorizado.' using errcode = 'P0001';
  end if;
  v_name := nullif(btrim(coalesce(v_event.normalized_payload ->> 'fullName', '')), '');
  v_phone := nullif(btrim(coalesce(v_event.normalized_payload ->> 'phone', '')), '');
  v_email := nullif(btrim(coalesce(v_event.normalized_payload ->> 'email', '')), '');
  if v_name is null then
    raise exception 'Nome valido obrigatorio.' using errcode = 'P0001';
  end if;
  if p_target_lead_id is not null then
    select * into v_lead
    from public.crm_leads
    where id = p_target_lead_id
      and organization_id = v_event.organization_id
    for update;
    if not found then
      raise exception 'Lead alvo ausente ou pertence a outro tenant.' using errcode = 'P0001';
    end if;
    v_materialization_result := 'linked_existing';
  else
    select * into v_lead
    from public.crm_leads
    where source_system = v_event.source_system
      and external_id = v_event.external_id
    for update;

    if found then
      if v_lead.organization_id is distinct from v_event.organization_id then
        raise exception 'Identidade de lead existente pertence a outro tenant.' using errcode = 'P0001';
      end if;
      v_materialization_result := 'linked_existing';
    else
      begin
        insert into public.crm_leads (
          organization_id, assigned_profile_id, external_id, source_system,
          nome, telefone, email, pais, origem, consultor, valor_pretendido,
          observacoes, pipeline, etapa, tags, produto_interesse, temperatura,
          status, proxima_acao, data_proxima_acao, metadata
        ) values (
          v_event.organization_id, null, v_event.external_id, v_event.source_system,
          v_name, v_phone, v_email, null, 'Meta Lead Ads', null, 0,
          null, 'prospecting', 'novos', '{}'::text[], null, 'morna',
          'ativa', null, null, jsonb_build_object('leadIngestionEventId', v_event.id)
        ) returning * into v_lead;
        v_materialization_result := 'created';
      exception
        when unique_violation then
          select * into v_lead
          from public.crm_leads
          where source_system = v_event.source_system
            and external_id = v_event.external_id
          for update;

          if not found then
            raise;
          end if;
          if v_lead.organization_id is distinct from v_event.organization_id then
            raise exception 'Identidade de lead concorrente pertence a outro tenant.' using errcode = 'P0001';
          end if;
          v_materialization_result := 'linked_existing';
      end;
    end if;
  end if;
  update public.lead_ingestion_events
  set crm_lead_id = v_lead.id,
      status = 'materialized',
      materialization_result = v_materialization_result,
      processed_at = v_now,
      failed_stage = null,
      error_category = null,
      retryable = false,
      next_attempt_at = null,
      claim_token = null,
      claimed_at = null,
      claim_expires_at = null,
      worker_id = null,
      last_error_code = null,
      last_error_message = null
  where id = v_event.id
  returning * into v_event;
  return query select to_jsonb(v_event), to_jsonb(v_lead);
end;
$$;

revoke all on function public.claim_lead_ingestion_events(text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_meta_lead_ingestion_event_enriched(uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_meta_lead_ingestion_event_failed(uuid, uuid, text, text, boolean, text)
  from public, anon, authenticated, service_role;
revoke all on function public.retry_lead_ingestion_event(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.materialize_lead_ingestion_event_transaction(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function public.claim_lead_ingestion_events(text, integer, integer) to service_role;
grant execute on function public.mark_meta_lead_ingestion_event_enriched(uuid, uuid, jsonb) to service_role;
grant execute on function public.mark_meta_lead_ingestion_event_failed(uuid, uuid, text, text, boolean, text) to service_role;
grant execute on function public.retry_lead_ingestion_event(uuid, uuid, text) to service_role;
grant execute on function public.materialize_lead_ingestion_event_transaction(uuid, uuid, uuid, timestamptz) to service_role;

do $$
begin
  if to_regprocedure('public.claim_lead_ingestion_events(text,integer,integer)') is null
    or to_regprocedure('public.mark_meta_lead_ingestion_event_enriched(uuid,uuid,jsonb)') is null
    or to_regprocedure('public.mark_meta_lead_ingestion_event_failed(uuid,uuid,text,text,boolean,text)') is null
    or to_regprocedure('public.retry_lead_ingestion_event(uuid,uuid,text)') is null
    or to_regprocedure('public.materialize_lead_ingestion_event_transaction(uuid,uuid,uuid,timestamp with time zone)') is null then
    raise exception 'Final authoritative Meta RPC contract is incomplete';
  end if;

  if to_regprocedure('public.materialize_lead_ingestion_event_transaction(uuid,timestamp with time zone)') is not null
    or to_regprocedure('public.claim_lead_ingestion_events(text,integer,integer,timestamp with time zone)') is not null
    or to_regprocedure('public.retry_lead_ingestion_event(uuid,text,timestamp with time zone)') is not null then
    raise exception 'Obsolete Meta RPC overload remains installed';
  end if;

  if has_table_privilege('authenticated', 'public.lead_ingestion_integration_configs', 'DELETE')
    or has_table_privilege('authenticated', 'public.lead_ingestion_integration_configs', 'TRUNCATE')
    or has_table_privilege('authenticated', 'public.lead_ingestion_integration_configs', 'REFERENCES')
    or has_table_privilege('authenticated', 'public.lead_ingestion_integration_configs', 'TRIGGER')
    or has_table_privilege('authenticated', 'public.lead_ingestion_integration_configs', 'MAINTAIN') then
    raise exception 'authenticated retains excessive integration config privileges';
  end if;
end
$$;
