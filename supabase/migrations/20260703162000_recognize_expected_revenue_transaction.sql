create or replace function public.recognize_expected_revenue_transaction(
  p_organization_id uuid,
  p_expected_revenue_entry_id uuid,
  p_recognized_amount numeric,
  p_recognized_at timestamptz,
  p_recognition_type text default null,
  p_notes text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_created_by uuid default null
)
returns table (
  expected_revenue_entry jsonb,
  recognized_revenue_entry jsonb
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expected_revenue_entry public.expected_revenue_entries%rowtype;
  v_recognized_revenue_entry public.recognized_revenue_entries%rowtype;
  v_recognized_amount numeric(14,2);
  v_next_recognized_amount numeric(14,2);
  v_next_remaining_amount numeric(14,2);
  v_recognition_type text;
begin
  if p_organization_id is null then
    raise exception 'organization_id obrigatorio.' using errcode = '22023';
  end if;

  if p_expected_revenue_entry_id is null then
    raise exception 'expected_revenue_entry_id obrigatorio.' using errcode = '22023';
  end if;

  if p_recognized_at is null then
    raise exception 'recognized_at obrigatorio.' using errcode = '22023';
  end if;

  if p_metadata is null then
    p_metadata := '{}'::jsonb;
  end if;

  if jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'metadata deve ser um objeto JSON.' using errcode = '22023';
  end if;

  v_recognized_amount := round(p_recognized_amount, 2);

  if v_recognized_amount <= 0 then
    raise exception 'Valor reconhecido deve ser maior que zero.' using errcode = '22023';
  end if;

  select *
  into v_expected_revenue_entry
  from public.expected_revenue_entries
  where id = p_expected_revenue_entry_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Receita prevista de comissao nao encontrada.' using errcode = 'P0002';
  end if;

  if v_expected_revenue_entry.cancelled_at is not null
    or v_expected_revenue_entry.lifecycle = 'cancelada'
  then
    raise exception 'Receita prevista cancelada nao pode ser reconhecida.' using errcode = 'P0001';
  end if;

  if v_expected_revenue_entry.business_status = 'estornada'
    or v_expected_revenue_entry.lifecycle = 'estornada'
  then
    raise exception 'Receita prevista estornada nao pode ser reconhecida.' using errcode = 'P0001';
  end if;

  if v_expected_revenue_entry.remaining_amount <= 0 then
    raise exception 'Receita prevista ja esta totalmente reconhecida.' using errcode = 'P0001';
  end if;

  if v_recognized_amount > v_expected_revenue_entry.remaining_amount then
    raise exception 'Valor reconhecido excede o saldo restante da receita prevista.' using errcode = 'P0001';
  end if;

  v_next_recognized_amount := round(
    v_expected_revenue_entry.recognized_amount + v_recognized_amount,
    2
  );
  v_next_remaining_amount := round(
    v_expected_revenue_entry.remaining_amount - v_recognized_amount,
    2
  );

  v_recognition_type := nullif(trim(coalesce(p_recognition_type, '')), '');

  if v_recognition_type is null then
    v_recognition_type :=
      case
        when v_next_remaining_amount = 0 then 'total'
        else 'partial'
      end;
  end if;

  insert into public.recognized_revenue_entries (
    organization_id,
    expected_revenue_entry_id,
    contract_id,
    recognized_amount,
    recognized_at,
    recognition_type,
    lifecycle,
    business_status,
    notes,
    metadata,
    created_by
  )
  values (
    p_organization_id,
    v_expected_revenue_entry.id,
    v_expected_revenue_entry.contract_id,
    v_recognized_amount,
    p_recognized_at,
    v_recognition_type,
    'criada',
    'reconhecida',
    nullif(trim(coalesce(p_notes, '')), ''),
    p_metadata,
    p_created_by
  )
  returning *
  into v_recognized_revenue_entry;

  update public.expected_revenue_entries
  set
    recognized_amount = v_next_recognized_amount,
    remaining_amount = v_next_remaining_amount,
    lifecycle =
      case
        when v_next_remaining_amount > 0 then 'ativa'
        else 'encerrada'
      end,
    business_status =
      case
        when v_next_remaining_amount > 0 then 'parcialmente_reconhecida'
        else 'reconhecida'
      end
  where id = v_expected_revenue_entry.id
    and organization_id = p_organization_id
  returning *
  into v_expected_revenue_entry;

  return query
  select
    to_jsonb(v_expected_revenue_entry),
    to_jsonb(v_recognized_revenue_entry);
end;
$$;

grant execute on function public.recognize_expected_revenue_transaction(
  uuid,
  uuid,
  numeric,
  timestamptz,
  text,
  text,
  jsonb,
  uuid
) to authenticated;
