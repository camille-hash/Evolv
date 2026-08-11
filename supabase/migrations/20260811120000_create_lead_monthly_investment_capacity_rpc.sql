-- META-ADS-002: return the sanitized monthly investment capacity range
-- declared by the lead in the selected materialized Meta Lead Ads event,
-- without exposing the ingestion inbox.

create function public.get_lead_monthly_investment_capacity(p_lead_id uuid)
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
    cross join lateral jsonb_array_elements(
      event.custom_answers
    ) answer
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

revoke all on function public.get_lead_monthly_investment_capacity(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_lead_monthly_investment_capacity(uuid)
  to authenticated;
