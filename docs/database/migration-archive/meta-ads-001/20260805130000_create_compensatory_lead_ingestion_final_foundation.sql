-- META-ADS-001: materialize the final lead-ingestion contract directly.
-- No event, configuration, lead, credential or external call is created here.

do $$
begin
  if to_regclass('public.organizations') is null then
    raise exception 'Missing public.organizations';
  end if;
  if to_regclass('public.profiles') is null then
    raise exception 'Missing public.profiles';
  end if;
  if to_regclass('public.crm_leads') is null then
    raise exception 'Missing public.crm_leads';
  end if;
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'Missing public.set_updated_at()';
  end if;

  if to_regclass('public.lead_ingestion_integration_configs') is null then
    create table public.lead_ingestion_integration_configs (
      id uuid primary key default gen_random_uuid(),
      organization_id uuid not null references public.organizations(id) on delete restrict,
      source_system text not null,
      external_account_id text not null,
      status text not null default 'active',
      public_metadata jsonb not null default '{}'::jsonb,
      allowed_form_ids text[] not null default '{}'::text[],
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint lead_ingestion_integration_configs_source_system_not_blank_check
        check (btrim(source_system) <> ''),
      constraint lead_ingestion_integration_configs_external_account_id_not_blank_check
        check (btrim(external_account_id) <> ''),
      constraint lead_ingestion_integration_configs_status_check
        check (status in ('active', 'inactive')),
      constraint lead_ingestion_integration_configs_public_metadata_object_check
        check (jsonb_typeof(public_metadata) = 'object'),
      constraint lead_ingestion_integration_configs_source_account_unique
        unique (source_system, external_account_id)
    );
  end if;

  if to_regclass('public.lead_ingestion_events') is null then
    create table public.lead_ingestion_events (
      id uuid primary key default gen_random_uuid(),
      integration_config_id uuid null references public.lead_ingestion_integration_configs(id) on delete restrict,
      organization_id uuid null references public.organizations(id) on delete restrict,
      source_system text not null,
      external_id text not null,
      external_event_id text null,
      event_type text not null,
      form_id text null,
      status text not null default 'received',
      source_payload jsonb not null default '{}'::jsonb,
      normalized_payload jsonb not null default '{}'::jsonb,
      crm_lead_id uuid null references public.crm_leads(id) on delete set null,
      attempt_count integer not null default 0,
      last_error_code text null,
      last_error_message text null,
      failed_stage text null,
      error_category text null,
      retryable boolean not null default false,
      next_attempt_at timestamptz null,
      claim_token uuid null,
      claimed_at timestamptz null,
      claim_expires_at timestamptz null,
      worker_id text null,
      materialization_result text null,
      reconciliation_decision jsonb not null default '{}'::jsonb,
      manually_reprocessed_at timestamptz null,
      manual_reprocess_reason text null,
      received_at timestamptz not null default now(),
      processed_at timestamptz null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint lead_ingestion_events_source_system_not_blank_check check (btrim(source_system) <> ''),
      constraint lead_ingestion_events_external_id_not_blank_check check (btrim(external_id) <> ''),
      constraint lead_ingestion_events_event_type_not_blank_check check (btrim(event_type) <> ''),
      constraint lead_ingestion_events_status_check check (status in (
        'received', 'tenant_unresolved', 'fetch_pending', 'processing',
        'materialization_pending', 'review_required', 'processing_failed',
        'rejected', 'integrity_conflict', 'materialized', 'retry_exhausted'
      )),
      constraint lead_ingestion_events_attempt_count_check check (attempt_count >= 0),
      constraint lead_ingestion_events_source_payload_object_check check (jsonb_typeof(source_payload) = 'object'),
      constraint lead_ingestion_events_normalized_payload_object_check check (jsonb_typeof(normalized_payload) = 'object'),
      constraint lead_ingestion_events_source_external_unique unique (source_system, external_id),
      constraint lead_ingestion_events_failed_stage_check check (
        failed_stage is null or failed_stage in (
          'tenant_resolution', 'authorization', 'graph_fetch', 'normalization',
          'reconciliation', 'materialization', 'internal'
        )
      ),
      constraint lead_ingestion_events_claim_shape_check check (
        (claim_token is null and claimed_at is null and claim_expires_at is null and worker_id is null)
        or (claim_token is not null and claimed_at is not null and claim_expires_at is not null
          and worker_id is not null and claim_expires_at > claimed_at)
      ),
      constraint lead_ingestion_events_tenant_state_check check (
        (status in ('received', 'tenant_unresolved') and organization_id is null)
        or (status not in ('received', 'tenant_unresolved')
          and organization_id is not null and integration_config_id is not null)
      ),
      constraint lead_ingestion_events_terminal_retry_check check (
        status not in ('rejected', 'integrity_conflict', 'materialized') or retryable = false
      ),
      constraint lead_ingestion_events_materialized_shape_check check (
        status <> 'materialized'
        or (crm_lead_id is not null and materialization_result in ('created', 'linked_existing'))
      ),
      constraint lead_ingestion_events_reconciliation_decision_object_check check (
        jsonb_typeof(reconciliation_decision) = 'object'
      )
    );
  end if;
end
$$;

comment on table public.lead_ingestion_integration_configs is
  'Non-secret organization mapping for external lead ingestion sources.';
comment on column public.lead_ingestion_integration_configs.allowed_form_ids is
  'Explicit Meta form allowlist for this page. Empty means no form is authorized.';
comment on table public.lead_ingestion_events is
  'Persistent inbox for external lead ingestion events before CRM materialization.';

create index if not exists lead_ingestion_integration_configs_organization_id_idx
  on public.lead_ingestion_integration_configs (organization_id);
create index if not exists lead_ingestion_integration_configs_source_status_idx
  on public.lead_ingestion_integration_configs (source_system, status);
create index if not exists lead_ingestion_events_integration_config_id_idx
  on public.lead_ingestion_events (integration_config_id);
create index if not exists lead_ingestion_events_organization_id_idx
  on public.lead_ingestion_events (organization_id);
create index if not exists lead_ingestion_events_status_received_idx
  on public.lead_ingestion_events (status, received_at desc);
create index if not exists lead_ingestion_events_crm_lead_id_idx
  on public.lead_ingestion_events (crm_lead_id);
create index if not exists lead_ingestion_events_retry_schedule_idx
  on public.lead_ingestion_events (next_attempt_at, received_at)
  where status = 'processing_failed' and retryable;
create index if not exists lead_ingestion_events_claim_expiration_idx
  on public.lead_ingestion_events (claim_expires_at)
  where claim_token is not null;
create index if not exists lead_ingestion_events_form_id_idx
  on public.lead_ingestion_events (form_id);

drop trigger if exists lead_ingestion_integration_configs_set_updated_at
  on public.lead_ingestion_integration_configs;
create trigger lead_ingestion_integration_configs_set_updated_at
before update on public.lead_ingestion_integration_configs
for each row execute function public.set_updated_at();

drop trigger if exists lead_ingestion_events_set_updated_at
  on public.lead_ingestion_events;
create trigger lead_ingestion_events_set_updated_at
before update on public.lead_ingestion_events
for each row execute function public.set_updated_at();

alter table public.lead_ingestion_integration_configs enable row level security;
alter table public.lead_ingestion_events enable row level security;

drop policy if exists "lead_ingestion_configs authenticated read same organization"
  on public.lead_ingestion_integration_configs;
drop policy if exists "lead_ingestion_configs authenticated insert same organization"
  on public.lead_ingestion_integration_configs;
drop policy if exists "lead_ingestion_configs authenticated update same organization"
  on public.lead_ingestion_integration_configs;

revoke all on table public.lead_ingestion_integration_configs from public, anon, authenticated, service_role;
revoke all on table public.lead_ingestion_events from public, anon, authenticated, service_role;
grant select, insert, update on table public.lead_ingestion_integration_configs to service_role;
grant select, insert, update on table public.lead_ingestion_events to service_role;

drop function if exists public.claim_lead_ingestion_events(text, integer, integer, timestamptz);
drop function if exists public.retry_lead_ingestion_event(uuid, text, timestamptz);
drop function if exists public.materialize_lead_ingestion_event_transaction(uuid, timestamptz);

create or replace function public.claim_lead_ingestion_events(
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

create or replace function public.retry_lead_ingestion_event(
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
  if not found then return; end if;
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
      'ativa', null, null, jsonb_build_object('leadIngestionEventId', v_event.id)
    ) returning * into v_lead;
  end if;
  update public.lead_ingestion_events
  set crm_lead_id = v_lead.id,
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

grant execute on function public.mark_meta_lead_ingestion_event_enriched(uuid, uuid, jsonb) to service_role;
grant execute on function public.claim_lead_ingestion_events(text, integer, integer) to service_role;
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
    raise exception 'Final lead-ingestion RPC assertion failed';
  end if;
  if to_regprocedure('public.claim_lead_ingestion_events(text,integer,integer,timestamp with time zone)') is not null
    or to_regprocedure('public.retry_lead_ingestion_event(uuid,text,timestamp with time zone)') is not null
    or to_regprocedure('public.materialize_lead_ingestion_event_transaction(uuid,timestamp with time zone)') is not null then
    raise exception 'Legacy lead-ingestion overload assertion failed';
  end if;
end
$$;
