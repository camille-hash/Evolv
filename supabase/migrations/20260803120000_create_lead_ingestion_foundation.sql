-- LEAD-ING-001 B1 - Lead ingestion domain and persistence foundation.
--
-- Scope:
-- - Create organization-scoped ingestion integration configuration.
-- - Create immutable-idempotent lead ingestion inbox.
-- - Create a controlled transactional materialization RPC.
-- - Do not create public webhooks, Meta calls, UI, tokens or secrets.

do $$
begin
  if to_regclass('public.organizations') is null then
    raise exception 'Missing public.organizations';
  end if;

  if to_regclass('public.crm_leads') is null then
    raise exception 'Missing public.crm_leads';
  end if;

  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'Missing public.set_updated_at()';
  end if;

  if to_regprocedure('public.evolv_current_organization_id()') is null then
    raise exception 'Missing public.evolv_current_organization_id()';
  end if;

  if to_regprocedure('public.evolv_current_role()') is null then
    raise exception 'Missing public.evolv_current_role()';
  end if;
end
$$;

create table if not exists public.lead_ingestion_integration_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_system text not null,
  external_account_id text not null,
  status text not null default 'active',
  public_metadata jsonb not null default '{}'::jsonb,
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

comment on table public.lead_ingestion_integration_configs is
  'LEAD-ING-001 B1: non-secret organization mapping for external lead ingestion sources.';

create index if not exists lead_ingestion_integration_configs_organization_id_idx
  on public.lead_ingestion_integration_configs (organization_id);

create index if not exists lead_ingestion_integration_configs_source_status_idx
  on public.lead_ingestion_integration_configs (
    source_system,
    status
  );

drop trigger if exists lead_ingestion_integration_configs_set_updated_at
  on public.lead_ingestion_integration_configs;

create trigger lead_ingestion_integration_configs_set_updated_at
before update on public.lead_ingestion_integration_configs
for each row
execute function public.set_updated_at();

create table if not exists public.lead_ingestion_events (
  id uuid primary key default gen_random_uuid(),
  integration_config_id uuid null references public.lead_ingestion_integration_configs(id) on delete restrict,
  organization_id uuid null references public.organizations(id) on delete restrict,
  source_system text not null,
  external_id text not null,
  external_event_id text null,
  event_type text not null,
  status text not null default 'received',
  source_payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  crm_lead_id uuid null references public.crm_leads(id) on delete set null,
  attempt_count integer not null default 0,
  last_error_code text null,
  last_error_message text null,
  received_at timestamptz not null default now(),
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_ingestion_events_source_system_not_blank_check
    check (btrim(source_system) <> ''),
  constraint lead_ingestion_events_external_id_not_blank_check
    check (btrim(external_id) <> ''),
  constraint lead_ingestion_events_event_type_not_blank_check
    check (btrim(event_type) <> ''),
  constraint lead_ingestion_events_status_check
    check (status in (
      'received',
      'fetch_pending',
      'fetch_failed',
      'materialization_pending',
      'materialized',
      'duplicate',
      'rejected',
      'retry_exhausted'
    )),
  constraint lead_ingestion_events_attempt_count_check
    check (attempt_count >= 0),
  constraint lead_ingestion_events_source_payload_object_check
    check (jsonb_typeof(source_payload) = 'object'),
  constraint lead_ingestion_events_normalized_payload_object_check
    check (jsonb_typeof(normalized_payload) = 'object'),
  constraint lead_ingestion_events_source_external_unique
    unique (source_system, external_id)
);

comment on table public.lead_ingestion_events is
  'LEAD-ING-001 B1: persistent inbox for external lead ingestion events before CRM materialization.';

create index if not exists lead_ingestion_events_integration_config_id_idx
  on public.lead_ingestion_events (integration_config_id);

create index if not exists lead_ingestion_events_organization_id_idx
  on public.lead_ingestion_events (organization_id);

create index if not exists lead_ingestion_events_status_received_idx
  on public.lead_ingestion_events (status, received_at desc);

create index if not exists lead_ingestion_events_crm_lead_id_idx
  on public.lead_ingestion_events (crm_lead_id);

drop trigger if exists lead_ingestion_events_set_updated_at
  on public.lead_ingestion_events;

create trigger lead_ingestion_events_set_updated_at
before update on public.lead_ingestion_events
for each row
execute function public.set_updated_at();

alter table public.lead_ingestion_integration_configs enable row level security;
alter table public.lead_ingestion_events enable row level security;

revoke all on table public.lead_ingestion_integration_configs from anon;
revoke all on table public.lead_ingestion_integration_configs from public;
revoke all on table public.lead_ingestion_events from anon;
revoke all on table public.lead_ingestion_events from authenticated;
revoke all on table public.lead_ingestion_events from public;

grant select, insert, update on table public.lead_ingestion_integration_configs to authenticated;

drop policy if exists "lead_ingestion_configs authenticated read same organization"
  on public.lead_ingestion_integration_configs;

create policy "lead_ingestion_configs authenticated read same organization"
on public.lead_ingestion_integration_configs
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "lead_ingestion_configs authenticated insert same organization"
  on public.lead_ingestion_integration_configs;

create policy "lead_ingestion_configs authenticated insert same organization"
on public.lead_ingestion_integration_configs
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master', 'admin')
);

drop policy if exists "lead_ingestion_configs authenticated update same organization"
  on public.lead_ingestion_integration_configs;

create policy "lead_ingestion_configs authenticated update same organization"
on public.lead_ingestion_integration_configs
for update
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master', 'admin')
)
with check (
  organization_id = public.evolv_current_organization_id()
  and public.evolv_current_role() in ('master', 'admin')
);

create or replace function public.materialize_lead_ingestion_event_transaction(
  p_event_id uuid,
  p_processed_at timestamptz default now()
)
returns table (
  ingestion_event jsonb,
  crm_lead jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.lead_ingestion_events%rowtype;
  v_config public.lead_ingestion_integration_configs%rowtype;
  v_existing_lead public.crm_leads%rowtype;
  v_full_name text;
  v_phone text;
  v_email text;
  v_crm_metadata jsonb;
begin
  if p_event_id is null then
    raise exception 'event_id obrigatorio.' using errcode = '22023';
  end if;

  select *
  into v_event
  from public.lead_ingestion_events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Evento de ingestao nao encontrado.' using errcode = 'P0002';
  end if;

  if v_event.status in ('materialized', 'duplicate')
    and v_event.crm_lead_id is not null
  then
    select *
    into v_existing_lead
    from public.crm_leads
    where id = v_event.crm_lead_id;

    return query
    select to_jsonb(v_event), to_jsonb(v_existing_lead);
    return;
  end if;

  select *
  into v_config
  from public.lead_ingestion_integration_configs
  where id = v_event.integration_config_id
    and source_system = v_event.source_system
    and external_account_id = nullif(v_event.normalized_payload ->> 'externalAccountId', '')
  for update;

  if not found then
    update public.lead_ingestion_events
    set
      status = 'rejected',
      last_error_code = 'INTEGRATION_NOT_FOUND',
      last_error_message = 'Integracao de origem nao configurada.',
      processed_at = p_processed_at
    where id = v_event.id
    returning *
    into v_event;

    return query
    select to_jsonb(v_event), null::jsonb;
    return;
  end if;

  if v_config.status <> 'active' then
    update public.lead_ingestion_events
    set
      organization_id = v_config.organization_id,
      status = 'rejected',
      last_error_code = 'INTEGRATION_INACTIVE',
      last_error_message = 'Integracao de origem inativa.',
      processed_at = p_processed_at
    where id = v_event.id
    returning *
    into v_event;

    return query
    select to_jsonb(v_event), null::jsonb;
    return;
  end if;

  v_full_name := nullif(btrim(coalesce(v_event.normalized_payload ->> 'fullName', '')), '');
  v_phone := nullif(btrim(coalesce(v_event.normalized_payload ->> 'phone', '')), '');
  v_email := nullif(btrim(coalesce(v_event.normalized_payload ->> 'email', '')), '');

  if v_full_name is null then
    update public.lead_ingestion_events
    set
      organization_id = v_config.organization_id,
      status = 'rejected',
      last_error_code = 'MISSING_NAME',
      last_error_message = 'Nome obrigatorio ausente.',
      processed_at = p_processed_at
    where id = v_event.id
    returning *
    into v_event;

    return query
    select to_jsonb(v_event), null::jsonb;
    return;
  end if;

  if v_phone is null and v_email is null then
    update public.lead_ingestion_events
    set
      organization_id = v_config.organization_id,
      status = 'rejected',
      last_error_code = 'MISSING_CONTACT',
      last_error_message = 'Telefone ou e-mail obrigatorio ausente.',
      processed_at = p_processed_at
    where id = v_event.id
    returning *
    into v_event;

    return query
    select to_jsonb(v_event), null::jsonb;
    return;
  end if;

  select *
  into v_existing_lead
  from public.crm_leads
  where source_system = v_event.source_system
    and external_id = v_event.external_id
  limit 1;

  if found then
    update public.lead_ingestion_events
    set
      crm_lead_id = v_existing_lead.id,
      integration_config_id = v_config.id,
      organization_id = v_config.organization_id,
      processed_at = p_processed_at,
      status =
        case
          when v_existing_lead.organization_id = v_config.organization_id
            then 'materialized'
          else 'duplicate'
        end,
      last_error_code = null,
      last_error_message = null
    where id = v_event.id
    returning *
    into v_event;

    return query
    select to_jsonb(v_event), to_jsonb(v_existing_lead);
    return;
  end if;

  v_crm_metadata := jsonb_strip_nulls(jsonb_build_object(
    'leadIngestionEventId', v_event.id,
    'sourceSystem', v_event.source_system,
    'externalAccountId', v_config.external_account_id,
    'campaignId', nullif(v_event.normalized_payload ->> 'campaignId', ''),
    'campaignName', nullif(v_event.normalized_payload ->> 'campaignName', ''),
    'adsetId', nullif(v_event.normalized_payload ->> 'adsetId', ''),
    'adsetName', nullif(v_event.normalized_payload ->> 'adsetName', ''),
    'adId', nullif(v_event.normalized_payload ->> 'adId', ''),
    'adName', nullif(v_event.normalized_payload ->> 'adName', ''),
    'formId', nullif(v_event.normalized_payload ->> 'formId', ''),
    'formName', nullif(v_event.normalized_payload ->> 'formName', ''),
    'customAnswers', v_event.normalized_payload -> 'customAnswers'
  ));

  begin
    insert into public.crm_leads (
      organization_id,
      assigned_profile_id,
      external_id,
      source_system,
      nome,
      telefone,
      email,
      pais,
      origem,
      consultor,
      valor_pretendido,
      observacoes,
      pipeline,
      etapa,
      tags,
      produto_interesse,
      temperatura,
      status,
      proxima_acao,
      data_proxima_acao,
      metadata
    )
    values (
      v_config.organization_id,
      null,
      v_event.external_id,
      v_event.source_system,
      v_full_name,
      coalesce(v_phone, ''),
      coalesce(v_email, ''),
      '',
      'Meta Lead Ads',
      '',
      0,
      '',
      'prospecting',
      'novos',
      '{}'::text[],
      '',
      'morna',
      'ativa',
      '',
      null,
      v_crm_metadata
    )
    returning *
    into v_existing_lead;
  exception
    when unique_violation then
      select *
      into v_existing_lead
      from public.crm_leads
      where source_system = v_event.source_system
        and external_id = v_event.external_id
      limit 1;

      if not found then
        raise;
      end if;

      update public.lead_ingestion_events
      set
        crm_lead_id = v_existing_lead.id,
        integration_config_id = v_config.id,
        organization_id = v_config.organization_id,
        processed_at = p_processed_at,
        status =
          case
            when v_existing_lead.organization_id = v_config.organization_id
              then 'materialized'
            else 'duplicate'
          end,
        last_error_code = null,
        last_error_message = null
      where id = v_event.id
      returning *
      into v_event;

      return query
      select to_jsonb(v_event), to_jsonb(v_existing_lead);
      return;
  end;

  update public.lead_ingestion_events
  set
    crm_lead_id = v_existing_lead.id,
    integration_config_id = v_config.id,
    organization_id = v_config.organization_id,
    processed_at = p_processed_at,
    status = 'materialized',
    last_error_code = null,
    last_error_message = null
  where id = v_event.id
  returning *
  into v_event;

  return query
  select to_jsonb(v_event), to_jsonb(v_existing_lead);
end;
$$;

revoke all on function public.materialize_lead_ingestion_event_transaction(
  uuid,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.materialize_lead_ingestion_event_transaction(
  uuid,
  timestamptz
) to service_role;
