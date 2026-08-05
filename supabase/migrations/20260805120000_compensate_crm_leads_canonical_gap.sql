-- META-ADS-001: compensate the production crm_leads canonical column gap.
-- This migration is intentionally data-preserving and does not change external identity.

do $$
declare
  v_type text;
  v_nullable text;
begin
  if to_regclass('public.crm_leads') is null then
    raise exception 'Missing public.crm_leads';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception 'Missing public.profiles';
  end if;

  select data_type, is_nullable
  into v_type, v_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'crm_leads'
    and column_name = 'assigned_profile_id';

  if not found then
    alter table public.crm_leads
      add column assigned_profile_id uuid null;
  elsif v_type <> 'uuid' or v_nullable <> 'YES' then
    raise exception 'public.crm_leads.assigned_profile_id has incompatible structure';
  end if;

  select data_type, is_nullable
  into v_type, v_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'crm_leads'
    and column_name = 'source_system';

  if not found then
    alter table public.crm_leads
      add column source_system text null;
  elsif v_type <> 'text' or v_nullable <> 'YES' then
    raise exception 'public.crm_leads.source_system has incompatible structure';
  end if;

  -- Existing rows deliberately remain NULL. The default is only for future rows.
  alter table public.crm_leads
    alter column source_system set default 'evolv';

  select data_type, is_nullable
  into v_type, v_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'crm_leads'
    and column_name = 'metadata';

  if not found then
    alter table public.crm_leads
      add column metadata jsonb not null default '{}'::jsonb;
  elsif v_type <> 'jsonb' or v_nullable <> 'NO' then
    raise exception 'public.crm_leads.metadata has incompatible structure';
  else
    alter table public.crm_leads
      alter column metadata set default '{}'::jsonb;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint constraint_row
    join pg_class table_row on table_row.oid = constraint_row.conrelid
    join pg_namespace namespace_row on namespace_row.oid = table_row.relnamespace
    where namespace_row.nspname = 'public'
      and table_row.relname = 'crm_leads'
      and constraint_row.contype = 'f'
      and constraint_row.conkey = array[
        (select attnum from pg_attribute
         where attrelid = 'public.crm_leads'::regclass
           and attname = 'assigned_profile_id')
      ]::smallint[]
      and constraint_row.confrelid = 'public.profiles'::regclass
      and constraint_row.confdeltype = 'n'
  ) then
    alter table public.crm_leads
      add constraint crm_leads_assigned_profile_id_fkey
      foreign key (assigned_profile_id)
      references public.profiles(id)
      on delete set null;
  end if;
end
$$;

create index if not exists crm_leads_assigned_profile_id_idx
  on public.crm_leads (assigned_profile_id);

do $$
begin
  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.crm_leads'::regclass
      and attname = 'assigned_profile_id'
      and atttypid = 'uuid'::regtype
      and not attnotnull
      and not attisdropped
  ) then
    raise exception 'Canonical assigned_profile_id assertion failed';
  end if;

  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.crm_leads'::regclass
      and attname = 'source_system'
      and atttypid = 'text'::regtype
      and not attnotnull
      and not attisdropped
  ) then
    raise exception 'Canonical source_system assertion failed';
  end if;

  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.crm_leads'::regclass
      and attname = 'metadata'
      and atttypid = 'jsonb'::regtype
      and attnotnull
      and not attisdropped
  ) then
    raise exception 'Canonical metadata assertion failed';
  end if;
end
$$;
