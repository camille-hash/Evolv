begin;

do $$
declare
  v_missing_columns text[];
begin
  if to_regclass('public.lead_ingestion_events') is null then
    raise exception 'META-ADS-001 preflight: public.lead_ingestion_events is required';
  end if;

  if to_regclass('public.lead_ingestion_integration_configs') is null then
    raise exception 'META-ADS-001 preflight: public.lead_ingestion_integration_configs is required';
  end if;

  select array_agg(required.column_name order by required.column_name)
  into v_missing_columns
  from (
    values
      ('claim_expires_at'),
      ('claim_token'),
      ('claimed_at'),
      ('error_category'),
      ('failed_stage'),
      ('form_id'),
      ('integration_config_id'),
      ('last_error_code'),
      ('last_error_message'),
      ('manual_reprocess_reason'),
      ('manually_reprocessed_at'),
      ('next_attempt_at'),
      ('normalized_payload'),
      ('organization_id'),
      ('reconciliation_decision'),
      ('retryable'),
      ('source_system'),
      ('status'),
      ('worker_id')
  ) as required(column_name)
  where not exists (
    select 1
    from pg_catalog.pg_attribute attribute
    where attribute.attrelid = 'public.lead_ingestion_events'::regclass
      and attribute.attname = required.column_name
      and attribute.attnum > 0
      and not attribute.attisdropped
  );

  if v_missing_columns is not null then
    raise exception
      'META-ADS-001 preflight: lead_ingestion_events is missing required columns: %',
      array_to_string(v_missing_columns, ', ');
  end if;

  select array_agg(required.column_name order by required.column_name)
  into v_missing_columns
  from (
    values
      ('allowed_form_ids'),
      ('external_account_id'),
      ('id'),
      ('organization_id'),
      ('source_system'),
      ('status')
  ) as required(column_name)
  where not exists (
    select 1
    from pg_catalog.pg_attribute attribute
    where attribute.attrelid = 'public.lead_ingestion_integration_configs'::regclass
      and attribute.attname = required.column_name
      and attribute.attnum > 0
      and not attribute.attisdropped
  );

  if v_missing_columns is not null then
    raise exception
      'META-ADS-001 preflight: lead_ingestion_integration_configs is missing required columns: %',
      array_to_string(v_missing_columns, ', ');
  end if;

  if to_regprocedure(
    'public.reconcile_meta_tenant_unresolved_events(uuid,text,integer)'
  ) is not null then
    raise exception
      'META-ADS-001 preflight: reconcile_meta_tenant_unresolved_events already exists';
  end if;
end
$$;

create function public.reconcile_meta_tenant_unresolved_events(
  p_integration_config_id uuid,
  p_reason text,
  p_limit integer default 100
)
returns table (
  examined_count integer,
  reconciled_count integer,
  blocked_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_config public.lead_ingestion_integration_configs%rowtype;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_integration_config_id is null then
    raise exception using
      errcode = '22004',
      message = 'integration_config_id is required';
  end if;

  if p_reason is null or pg_catalog.btrim(p_reason) = '' then
    raise exception using
      errcode = '22023',
      message = 'reconciliation reason is required';
  end if;

  if pg_catalog.length(pg_catalog.btrim(p_reason)) > 500 then
    raise exception using
      errcode = '22023',
      message = 'reconciliation reason must contain at most 500 characters';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception using
      errcode = '22023',
      message = 'reconciliation limit must be between 1 and 1000';
  end if;

  select integration_config.*
  into v_config
  from public.lead_ingestion_integration_configs as integration_config
  where integration_config.id = p_integration_config_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'integration configuration was not found';
  end if;

  if v_config.status <> 'active' then
    raise exception using
      errcode = '55000',
      message = 'integration configuration is not active';
  end if;

  if v_config.source_system <> 'meta_lead_ads' then
    raise exception using
      errcode = '22023',
      message = 'integration configuration is not a Meta lead ads configuration';
  end if;

  return query
  with candidates as materialized (
    select
      event.id,
      event.form_id is not null
        and event.form_id = any(v_config.allowed_form_ids) as form_is_allowed
    from public.lead_ingestion_events as event
    where event.status = 'tenant_unresolved'
      and event.source_system = v_config.source_system
      and event.normalized_payload ->> 'externalAccountId' = v_config.external_account_id
      and event.organization_id is null
      and event.integration_config_id is null
      and event.last_error_code = 'INTEGRATION_NOT_FOUND'
      and event.claim_token is null
      and event.claimed_at is null
      and event.worker_id is null
      and event.claim_expires_at is null
    order by event.received_at, event.id
    for update of event skip locked
    limit p_limit
  ), updated as (
    update public.lead_ingestion_events as event
    set
      organization_id = v_config.organization_id,
      integration_config_id = v_config.id,
      status = 'fetch_pending',
      failed_stage = null,
      error_category = null,
      last_error_code = null,
      last_error_message = null,
      retryable = false,
      next_attempt_at = null,
      claim_token = null,
      claimed_at = null,
      worker_id = null,
      claim_expires_at = null,
      manually_reprocessed_at = v_now,
      manual_reprocess_reason = pg_catalog.btrim(p_reason),
      reconciliation_decision = event.reconciliation_decision
        || pg_catalog.jsonb_build_object(
          'lateTenantResolution', pg_catalog.jsonb_build_object(
            'reason', pg_catalog.btrim(p_reason),
            'result', 'fetch_pending',
            'decidedAt', v_now
          )
        ),
      updated_at = v_now
    from candidates
    where event.id = candidates.id
      and candidates.form_is_allowed
    returning event.id
  )
  select
    (select pg_catalog.count(*)::integer from candidates) as examined_count,
    (select pg_catalog.count(*)::integer from updated) as reconciled_count,
    (
      select pg_catalog.count(*)::integer
      from candidates
      where not candidates.form_is_allowed
    ) as blocked_count;
end;
$$;

alter function public.reconcile_meta_tenant_unresolved_events(uuid, text, integer)
  owner to postgres;

revoke all on function public.reconcile_meta_tenant_unresolved_events(uuid, text, integer)
  from public;
revoke all on function public.reconcile_meta_tenant_unresolved_events(uuid, text, integer)
  from anon;
revoke all on function public.reconcile_meta_tenant_unresolved_events(uuid, text, integer)
  from authenticated;
revoke all on function public.reconcile_meta_tenant_unresolved_events(uuid, text, integer)
  from service_role;

grant execute on function public.reconcile_meta_tenant_unresolved_events(uuid, text, integer)
  to service_role;

comment on function public.reconcile_meta_tenant_unresolved_events(uuid, text, integer)
  is 'Reconciles unlocked and allowlisted unresolved Meta events. examined_count excludes rows skipped because another transaction holds their lock.';

commit;
