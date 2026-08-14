-- Align the read-only Meta declarations projections with the exact values
-- emitted by the two official EVOLV forms. No ingestion data is modified.

create or replace function public.get_lead_monthly_investment_capacity(p_lead_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_answer text;
  v_normalized_answer text;
  v_organization_id uuid;
begin
  if auth.uid() is null or p_lead_id is null then
    return null;
  end if;

  select profile.organization_id
  into v_organization_id
  from public.profiles profile
  where profile.id = auth.uid()
    and profile.is_active = true
    and profile.organization_id is not null;

  if v_organization_id is null then
    return null;
  end if;

  with authorized_lead as (
    select lead.id, lead.metadata
    from public.crm_leads lead
    where lead.id = p_lead_id
      and lead.organization_id = v_organization_id
  ), selected_event as (
    select event.normalized_payload -> 'customAnswers' as custom_answers
    from authorized_lead lead
    join public.lead_ingestion_events event
      on event.crm_lead_id = lead.id
     and event.organization_id = v_organization_id
     and event.source_system = 'meta_lead_ads'
     and event.status = 'materialized'
     and jsonb_typeof(event.normalized_payload -> 'customAnswers') = 'array'
    order by
      (event.id::text = nullif(lead.metadata ->> 'leadIngestionEventId', '')) desc,
      event.processed_at asc nulls last,
      event.received_at asc,
      event.id asc
    limit 1
  ), matching_answers as (
    select nullif(btrim(answer ->> 'value'), '') as value
    from selected_event event
    cross join lateral jsonb_array_elements(event.custom_answers) answer
    where answer ->> 'key' = 'qual_é_a_sua_capacidade_de_investimento_mensal?'
  )
  select case when count(distinct value) = 1 then min(value) else null end
  into v_answer
  from matching_answers
  where value is not null;

  if v_answer is null then
    return null;
  end if;

  v_normalized_answer := lower(
    regexp_replace(
      regexp_replace(btrim(v_answer), '_+', ' ', 'g'),
      '\s+',
      ' ',
      'g'
    )
  );

  return case v_normalized_answer
    when 'de r$1.000,00 a r$2.000,00' then 'R$ 1.000 a R$ 2.000/mês'
    when 'de r$2.000,00 a r$3.000,00' then 'R$ 2.000 a R$ 3.000/mês'
    when 'de r$3.000,00 a r$5.000,00' then 'R$ 3.000 a R$ 5.000/mês'
    when 'acima de r$5.000,00' then 'Acima de R$ 5.000/mês'
    when 'r$ 1.000 a r$ 2.000' then 'R$ 1.000 a R$ 2.000/mês'
    when 'r$ 1.000 a r$ 2.000/mês' then 'R$ 1.000 a R$ 2.000/mês'
    when 'r$ 2.000 a r$ 3.000' then 'R$ 2.000 a R$ 3.000/mês'
    when 'r$ 2.000 a r$ 3.000/mês' then 'R$ 2.000 a R$ 3.000/mês'
    when 'r$ 3.000 a r$ 5.000' then 'R$ 3.000 a R$ 5.000/mês'
    when 'r$ 3.000 a r$ 5.000/mês' then 'R$ 3.000 a R$ 5.000/mês'
    when 'acima de r$ 5.000' then 'Acima de R$ 5.000/mês'
    when 'acima de r$ 5.000/mês' then 'Acima de R$ 5.000/mês'
    else null
  end;
end;
$$;

alter function public.get_lead_monthly_investment_capacity(uuid) owner to postgres;
revoke all on function public.get_lead_monthly_investment_capacity(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_lead_monthly_investment_capacity(uuid)
  to authenticated;

create or replace function public.get_lead_meta_declarations(p_lead_id uuid)
returns table (
  monthly_investment_capacity text,
  declared_brazilian_and_cpf_status text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with approved_forms (
    form_id,
    monthly_investment_key,
    brazilian_and_cpf_key
  ) as (
    values
      (
        '1225439199692862'::text,
        'qual_é_a_sua_capacidade_de_investimento_mensal?'::text,
        'você_é_brasileiro_e_possui_cpf?'::text
      ),
      (
        '3912872839009160'::text,
        'qual_é_a_sua_capacidade_de_investimento_mensal?'::text,
        'você_é_brasileiro_e_possui_cpf?'::text
      )
  ), authorized_context as (
    select
      lead.id,
      lead.metadata,
      profile.organization_id
    from public.profiles profile
    join public.crm_leads lead
      on lead.id = p_lead_id
     and lead.organization_id = profile.organization_id
     and lead.source_system = 'meta_lead_ads'
    where auth.uid() is not null
      and p_lead_id is not null
      and profile.id = auth.uid()
      and profile.is_active = true
      and profile.organization_id is not null
  ), selected_event as (
    select
      event.form_id,
      event.normalized_payload -> 'customAnswers' as custom_answers
    from authorized_context context
    join public.lead_ingestion_events event
      on event.crm_lead_id = context.id
     and event.organization_id = context.organization_id
     and event.source_system = 'meta_lead_ads'
     and event.status = 'materialized'
     and jsonb_typeof(event.normalized_payload -> 'customAnswers') = 'array'
    order by
      (event.id::text = nullif(
        context.metadata ->> 'leadIngestionEventId',
        ''
      )) desc,
      event.processed_at asc nulls last,
      event.received_at asc,
      event.id asc
    limit 1
  ), authorized_answers as (
    select
      form.monthly_investment_key,
      form.brazilian_and_cpf_key,
      answer
    from selected_event event
    join approved_forms form
      on form.form_id = event.form_id
    cross join lateral jsonb_array_elements(event.custom_answers) answer
  ), monthly_candidates as (
    select case lower(
      regexp_replace(
        regexp_replace(btrim(answer ->> 'value'), '_+', ' ', 'g'),
        '\s+',
        ' ',
        'g'
      )
    )
      when 'de r$1.000,00 a r$2.000,00' then 'R$ 1.000 a R$ 2.000/mês'
      when 'de r$2.000,00 a r$3.000,00' then 'R$ 2.000 a R$ 3.000/mês'
      when 'de r$3.000,00 a r$5.000,00' then 'R$ 3.000 a R$ 5.000/mês'
      when 'acima de r$5.000,00' then 'Acima de R$ 5.000/mês'
      when 'r$ 1.000 a r$ 2.000' then 'R$ 1.000 a R$ 2.000/mês'
      when 'r$ 1.000 a r$ 2.000/mês' then 'R$ 1.000 a R$ 2.000/mês'
      when 'r$ 2.000 a r$ 3.000' then 'R$ 2.000 a R$ 3.000/mês'
      when 'r$ 2.000 a r$ 3.000/mês' then 'R$ 2.000 a R$ 3.000/mês'
      when 'r$ 3.000 a r$ 5.000' then 'R$ 3.000 a R$ 5.000/mês'
      when 'r$ 3.000 a r$ 5.000/mês' then 'R$ 3.000 a R$ 5.000/mês'
      when 'acima de r$ 5.000' then 'Acima de R$ 5.000/mês'
      when 'acima de r$ 5.000/mês' then 'Acima de R$ 5.000/mês'
      else null
    end as normalized_value
    from authorized_answers
    where answer ->> 'key' = monthly_investment_key
  ), monthly_projection as (
    select case
      when count(*) > 0
        and not exists (
          select 1
          from authorized_answers
          where jsonb_typeof(answer) is distinct from 'object'
        )
        and count(*) filter (where normalized_value is null) = 0
        and count(distinct normalized_value) = 1
      then min(normalized_value)
      else null
    end as value
    from monthly_candidates
  ), brazilian_and_cpf_candidates as (
    select case lower(btrim(answer ->> 'value'))
      when 'sim' then 'yes'
      when 'não' then 'no'
      else null
    end as normalized_value
    from authorized_answers
    where answer ->> 'key' = brazilian_and_cpf_key
  ), brazilian_and_cpf_projection as (
    select case
      when count(*) > 0
        and not exists (
          select 1
          from authorized_answers
          where jsonb_typeof(answer) is distinct from 'object'
        )
        and count(*) filter (where normalized_value is null) = 0
        and count(distinct normalized_value) = 1
      then min(normalized_value)
      else null
    end as value
    from brazilian_and_cpf_candidates
  )
  select
    monthly.value as monthly_investment_capacity,
    brazilian_and_cpf.value as declared_brazilian_and_cpf_status
  from monthly_projection monthly
  cross join brazilian_and_cpf_projection brazilian_and_cpf;
$$;

alter function public.get_lead_meta_declarations(uuid) owner to postgres;
revoke all on function public.get_lead_meta_declarations(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_lead_meta_declarations(uuid)
  to authenticated;

do $$
declare
  v_function_oid oid;
  v_function_name text;
begin
  foreach v_function_name in array array[
    'public.get_lead_monthly_investment_capacity(uuid)',
    'public.get_lead_meta_declarations(uuid)'
  ] loop
    v_function_oid := to_regprocedure(v_function_name);

    if v_function_oid is null
      or not exists (
        select 1
        from pg_proc procedure
        where procedure.oid = v_function_oid
          and procedure.prosecdef = true
          and procedure.provolatile = 's'
          and procedure.proconfig = array['search_path=pg_catalog, public']::text[]
          and pg_get_userbyid(procedure.proowner) = 'postgres'
      )
      or not has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
      or has_function_privilege('public', v_function_oid, 'EXECUTE')
      or has_function_privilege('anon', v_function_oid, 'EXECUTE')
      or has_function_privilege('service_role', v_function_oid, 'EXECUTE') then
      raise exception 'Invalid RPC security contract: %', v_function_name;
    end if;
  end loop;
end;
$$;
