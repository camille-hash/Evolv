-- META-ADS-001 Stage 4A/3C: make claim-dependent mutations authoritative at execution time.

revoke all on function public.claim_lead_ingestion_events(text, integer, integer, timestamptz)
  from public, anon, authenticated, service_role;
drop function public.claim_lead_ingestion_events(text, integer, integer, timestamptz);

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
  with candidates as (
    select event.id
    from public.lead_ingestion_events event
    where event.status in ('fetch_pending', 'materialization_pending')
      and event.organization_id is not null
      and event.integration_config_id is not null
      and (event.next_attempt_at is null or event.next_attempt_at <= v_now)
      and (event.claim_token is null or event.claim_expires_at <= v_now)
    order by event.received_at, event.id
    for update skip locked
    limit p_limit
  )
  update public.lead_ingestion_events event
  set
    claim_token = gen_random_uuid(),
    claimed_at = v_now,
    claim_expires_at = v_now + make_interval(secs => p_lease_seconds),
    worker_id = btrim(p_worker_id),
    attempt_count = event.attempt_count + 1
  from candidates
  where event.id = candidates.id
  returning event.*;
end;
$$;

create or replace function public.mark_meta_lead_ingestion_event_enriched(
  p_event_id uuid,
  p_claim_token uuid,
  p_normalized_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_updated boolean;
begin
  if p_event_id is null or p_claim_token is null or p_normalized_payload is null then
    return false;
  end if;

  update public.lead_ingestion_events
  set
    error_category = null,
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

create or replace function public.mark_meta_lead_ingestion_event_failed(
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
declare
  v_updated boolean;
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
  set
    claim_expires_at = case when p_retryable then claim_expires_at else null end,
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
    and (
      (status = 'fetch_pending' and p_stage in ('graph_fetch', 'normalization'))
      or (status = 'materialization_pending' and p_stage = 'materialization')
    )
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$$;

revoke all on function public.retry_lead_ingestion_event(uuid, text, timestamptz)
  from public, anon, authenticated, service_role;
drop function public.retry_lead_ingestion_event(uuid, text, timestamptz);

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

  if not found then
    return 'lease_lost';
  end if;

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

  if v_next_status is null then
    return 'lease_lost';
  end if;

  -- attempt_count counts claims already granted. Three claims are the complete
  -- processing budget: the initial attempt plus two additional opportunities.
  if v_event.attempt_count >= v_max_attempts then
    update public.lead_ingestion_events
    set
      status = 'retry_exhausted',
      retryable = false,
      next_attempt_at = null,
      claim_token = null,
      claimed_at = null,
      claim_expires_at = null,
      worker_id = null
    where id = v_event.id;

    return 'retry_exhausted';
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
    manually_reprocessed_at = v_now,
    manual_reprocess_reason = nullif(btrim(p_reason), '')
  where id = v_event.id;

  return 'retried';
end;
$$;

create or replace function public.materialize_lead_ingestion_event_transaction(
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
  v_now timestamptz;
begin
  select * into v_event
  from public.lead_ingestion_events
  where id = p_event_id
  for update;

  if not found then
    return;
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

revoke all on function public.mark_meta_lead_ingestion_event_enriched(uuid, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.claim_lead_ingestion_events(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.mark_meta_lead_ingestion_event_failed(uuid, uuid, text, text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.retry_lead_ingestion_event(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.materialize_lead_ingestion_event_transaction(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;

grant execute on function public.mark_meta_lead_ingestion_event_enriched(uuid, uuid, jsonb)
  to service_role;
grant execute on function public.claim_lead_ingestion_events(text, integer, integer)
  to service_role;
grant execute on function public.mark_meta_lead_ingestion_event_failed(uuid, uuid, text, text, boolean, text)
  to service_role;
grant execute on function public.retry_lead_ingestion_event(uuid, uuid, text)
  to service_role;
grant execute on function public.materialize_lead_ingestion_event_transaction(uuid, uuid, uuid, timestamptz)
  to service_role;
