-- META-ADS-001 Etapa 3 - persistence and security foundation.
-- Additive hardening for tenant resolution, form authorization, claims, retries,
-- and tenant-safe transactional materialization. No credentials are stored here.

alter table public.lead_ingestion_integration_configs
  add column if not exists allowed_form_ids text[] not null default '{}'::text[];

comment on column public.lead_ingestion_integration_configs.allowed_form_ids is
  'Explicit Meta form allowlist for this page. Empty means no form is authorized.';

revoke all on table public.lead_ingestion_integration_configs from anon, authenticated, public;
grant select, insert, update on table public.lead_ingestion_integration_configs to service_role;

drop policy if exists "lead_ingestion_configs authenticated read same organization"
  on public.lead_ingestion_integration_configs;
drop policy if exists "lead_ingestion_configs authenticated insert same organization"
  on public.lead_ingestion_integration_configs;
drop policy if exists "lead_ingestion_configs authenticated update same organization"
  on public.lead_ingestion_integration_configs;

alter table public.lead_ingestion_events
  add column if not exists form_id text null,
  add column if not exists failed_stage text null,
  add column if not exists error_category text null,
  add column if not exists retryable boolean not null default false,
  add column if not exists next_attempt_at timestamptz null,
  add column if not exists claim_token uuid null,
  add column if not exists claimed_at timestamptz null,
  add column if not exists claim_expires_at timestamptz null,
  add column if not exists worker_id text null,
  add column if not exists materialization_result text null,
  add column if not exists reconciliation_decision jsonb not null default '{}'::jsonb,
  add column if not exists manually_reprocessed_at timestamptz null,
  add column if not exists manual_reprocess_reason text null;

update public.lead_ingestion_events
set form_id = nullif(btrim(coalesce(normalized_payload ->> 'formId', '')), '')
where form_id is null;

-- Historical form identifiers remain evidence on the event. They never grant
-- authorization. Only an explicit configuration write may populate the allowlist.

update public.lead_ingestion_events
set
  status = 'tenant_unresolved',
  failed_stage = 'tenant_resolution',
  error_category = 'tenant_unresolved',
  retryable = false,
  next_attempt_at = null
where status = 'rejected'
  and organization_id is null
  and last_error_code = 'INTEGRATION_NOT_FOUND';

update public.lead_ingestion_events
set
  failed_stage = 'authorization',
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
set
  status = 'processing_failed',
  failed_stage = 'graph_fetch',
  error_category = coalesce(error_category, 'legacy_fetch_failure'),
  retryable = true,
  next_attempt_at = coalesce(next_attempt_at, now())
where status = 'fetch_failed';

update public.lead_ingestion_events event
set
  status = case
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
set
  status = 'integrity_conflict',
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
  drop constraint if exists lead_ingestion_events_status_check;

alter table public.lead_ingestion_events
  add constraint lead_ingestion_events_status_check check (status in (
    'received',
    'tenant_unresolved',
    'fetch_pending',
    'processing',
    'materialization_pending',
    'review_required',
    'processing_failed',
    'rejected',
    'integrity_conflict',
    'materialized',
    'retry_exhausted'
  )),
  add constraint lead_ingestion_events_failed_stage_check check (
    failed_stage is null or failed_stage in (
      'tenant_resolution',
      'authorization',
      'graph_fetch',
      'normalization',
      'reconciliation',
      'materialization',
      'internal'
    )
  ),
  add constraint lead_ingestion_events_claim_shape_check check (
    (claim_token is null and claimed_at is null and claim_expires_at is null and worker_id is null)
    or
    (claim_token is not null and claimed_at is not null and claim_expires_at is not null and worker_id is not null
      and claim_expires_at > claimed_at)
  ),
  add constraint lead_ingestion_events_tenant_state_check check (
    (status in ('received', 'tenant_unresolved') and organization_id is null)
    or
    (status not in ('received', 'tenant_unresolved') and organization_id is not null and integration_config_id is not null)
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

create index if not exists lead_ingestion_events_retry_schedule_idx
  on public.lead_ingestion_events (next_attempt_at, received_at)
  where status = 'processing_failed' and retryable;

create index if not exists lead_ingestion_events_claim_expiration_idx
  on public.lead_ingestion_events (claim_expires_at)
  where claim_token is not null;

create index if not exists lead_ingestion_events_form_id_idx
  on public.lead_ingestion_events (form_id);

grant select, insert, update on table public.lead_ingestion_events to service_role;

create or replace function public.claim_lead_ingestion_events(
  p_worker_id text,
  p_limit integer default 10,
  p_lease_seconds integer default 60,
  p_now timestamptz default now()
)
returns setof public.lead_ingestion_events
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if nullif(btrim(p_worker_id), '') is null then
    raise exception 'worker_id obrigatorio.' using errcode = '22023';
  end if;

  if p_limit < 1 or p_limit > 100 or p_lease_seconds < 10 or p_lease_seconds > 900 then
    raise exception 'Parametros de claim invalidos.' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select event.id
    from public.lead_ingestion_events event
    where event.status in ('fetch_pending', 'materialization_pending')
      and event.organization_id is not null
      and event.integration_config_id is not null
      and (event.next_attempt_at is null or event.next_attempt_at <= p_now)
      and (event.claim_token is null or event.claim_expires_at <= p_now)
    order by event.received_at, event.id
    for update skip locked
    limit p_limit
  )
  update public.lead_ingestion_events event
  set
    claim_token = gen_random_uuid(),
    claimed_at = p_now,
    claim_expires_at = p_now + make_interval(secs => p_lease_seconds),
    worker_id = btrim(p_worker_id),
    attempt_count = event.attempt_count + 1
  from candidates
  where event.id = candidates.id
  returning event.*;
end;
$$;

create or replace function public.retry_lead_ingestion_event(
  p_event_id uuid,
  p_reason text,
  p_now timestamptz default now()
)
returns public.lead_ingestion_events
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.lead_ingestion_events%rowtype;
  v_next_status text;
begin
  select * into v_event
  from public.lead_ingestion_events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Evento de ingestao nao encontrado.' using errcode = 'P0002';
  end if;

  if v_event.status not in ('processing_failed', 'retry_exhausted') then
    raise exception 'Evento nao elegivel para retry.' using errcode = 'P0001';
  end if;

  v_next_status := case v_event.failed_stage
    when 'graph_fetch' then 'fetch_pending'
    when 'normalization' then 'fetch_pending'
    when 'reconciliation' then 'fetch_pending'
    when 'materialization' then 'materialization_pending'
    else null
  end;

  if v_next_status is null then
    raise exception 'failed_stage nao permite retry deterministico.' using errcode = 'P0001';
  end if;

  update public.lead_ingestion_events
  set
    status = v_next_status,
    retryable = false,
    next_attempt_at = null,
    claim_token = null,
    claimed_at = null,
    claim_expires_at = null,
    worker_id = null,
    manually_reprocessed_at = p_now,
    manual_reprocess_reason = nullif(btrim(p_reason), '')
  where id = v_event.id
  returning * into v_event;

  return v_event;
end;
$$;

drop function if exists public.materialize_lead_ingestion_event_transaction(uuid, timestamptz);

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
begin
  select * into v_event
  from public.lead_ingestion_events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Evento de ingestao nao encontrado.' using errcode = 'P0002';
  end if;

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

  if v_event.status <> 'materialization_pending'
    or v_event.organization_id is null
    or v_event.integration_config_id is null then
    raise exception 'Evento nao elegivel para materializacao.' using errcode = 'P0001';
  end if;

  if p_claim_token is null
    or v_event.claim_token is distinct from p_claim_token
    or v_event.claim_expires_at <= p_processed_at then
    raise exception 'Claim ausente, invalido ou expirado.' using errcode = 'P0001';
  end if;

  select * into v_config
  from public.lead_ingestion_integration_configs
  where id = v_event.integration_config_id
    and organization_id = v_event.organization_id
    and source_system = v_event.source_system
    and status = 'active'
  for update;

  if not found then
    raise exception 'Configuracao inativa ou incompatível com o tenant.' using errcode = 'P0001';
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
  else
    insert into public.crm_leads (
      organization_id, assigned_profile_id, external_id, source_system,
      nome, telefone, email, pais, origem, consultor, valor_pretendido,
      observacoes, pipeline, etapa, tags, produto_interesse, temperatura,
      status, proxima_acao, data_proxima_acao, metadata
    ) values (
      v_event.organization_id, null, v_event.external_id, v_event.source_system,
      v_name, v_phone, v_email, null, 'Meta Lead Ads', null, 0,
      null, 'prospecting', 'novos', '{}'::text[], null, 'morna',
      'ativa', null, null,
      jsonb_build_object('leadIngestionEventId', v_event.id)
    )
    returning * into v_lead;
  end if;

  update public.lead_ingestion_events
  set
    crm_lead_id = v_lead.id,
    status = 'materialized',
    materialization_result = case when p_target_lead_id is null then 'created' else 'linked_existing' end,
    processed_at = p_processed_at,
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

revoke all on function public.claim_lead_ingestion_events(text, integer, integer, timestamptz)
  from public, anon, authenticated;
revoke all on function public.retry_lead_ingestion_event(uuid, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.materialize_lead_ingestion_event_transaction(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;

grant execute on function public.claim_lead_ingestion_events(text, integer, integer, timestamptz)
  to service_role;
grant execute on function public.retry_lead_ingestion_event(uuid, text, timestamptz)
  to service_role;
grant execute on function public.materialize_lead_ingestion_event_transaction(uuid, uuid, uuid, timestamptz)
  to service_role;
