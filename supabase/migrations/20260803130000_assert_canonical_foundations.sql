-- LEAD-ING-001 B2.5-R2 - Final read-only structural assertions.

do $$
declare
  v_table text;
  v_column text;
  v_required text[];
  v_record record;
begin
  foreach v_table in array array[
    'organizations', 'profiles', 'crm_leads', 'clients', 'administrators',
    'commission_plans', 'contracts', 'revenue_entries', 'crm_lead_simulations'
  ] loop
    if to_regclass('public.' || v_table) is null then
      raise exception 'Missing canonical table public.%', v_table;
    end if;
  end loop;

  if to_regclass('public.legacy_user_administrators') is null then
    raise exception 'Missing preserved public.legacy_user_administrators';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations' and column_name = 'client_id'
  ) then
    raise exception 'Legacy public.simulations must not contain client_id';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id' and is_nullable = 'NO'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'crm_leads' and column_name = 'organization_id' and is_nullable = 'NO'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'crm_leads' and column_name = 'nome' and is_nullable = 'NO'
  ) then
    raise exception 'Canonical Auth/CRM nullability mismatch';
  end if;

  if (select count(*) from pg_constraint c
      where c.conrelid = 'public.profiles'::regclass and c.contype = 'f'
        and pg_get_constraintdef(c.oid) ilike 'FOREIGN KEY (id) REFERENCES auth.users(id)%') <> 1 then
    raise exception 'profiles.id must have exactly one auth.users foreign key';
  end if;

  if (select count(*) from pg_constraint c
      where c.conrelid = 'public.profiles'::regclass and c.contype = 'f'
        and pg_get_constraintdef(c.oid) ilike 'FOREIGN KEY (organization_id) REFERENCES organizations(id)%') <> 1 then
    raise exception 'profiles.organization_id must have exactly one organizations foreign key';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%master%'
      and pg_get_constraintdef(c.oid) ilike '%admin%'
      and pg_get_constraintdef(c.oid) ilike '%sdr%'
  ) then
    raise exception 'Canonical profiles role check is missing';
  end if;

  for v_record in
    select * from (values
      ('clients', array['id','organization_id','name','phone','email','status','created_at','updated_at','created_by','updated_by']),
      ('administrators', array['id','organization_id','name','slug','status','metadata','created_at','updated_at','created_by','updated_by']),
      ('commission_plans', array['id','organization_id','administrator_id','name','status','commission_type','commission_percentage','commission_fixed_amount','payment_trigger','payment_installments','metadata','created_at','updated_at','created_by','updated_by']),
      ('contracts', array['id','organization_id','lead_id','client_id','administrator_id','commission_plan_id','contract_number','status','product_type','credit_amount','installment_amount','term_months','contemplation_model','metadata','created_at','updated_at','created_by','updated_by']),
      ('revenue_entries', array['id','organization_id','contract_id','client_id','administrator_id','type','status','expected_amount','actual_amount','due_date','paid_at','cancelled_at','metadata','created_at','updated_at']),
      ('crm_lead_simulations', array['id','organization_id','lead_id','created_by','created_at','updated_at','simulation_type','title','status','source','technical_input','calculation_snapshot','presentation_snapshot','summary','presented_at','presented_by','proposal_generated_at','proposal_generated_by','pdf_generated_at','pdf_generated_by','pdf_sent_at','pdf_sent_by','archived_at','archived_by','total_credit','updated_credit','commercial_credit','monthly_payment','post_contemplation_payment','contemplation_month','quota_count','incc_rate','estimated_roi','estimated_gain','estimated_sale_value'])
    ) expected(table_name, columns)
  loop
    v_table := v_record.table_name;
    v_required := v_record.columns;
    foreach v_column in array v_required loop
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = v_table and column_name = v_column
      ) then
        raise exception 'Missing canonical column public.%.%', v_table, v_column;
      end if;
    end loop;
  end loop;

  if exists (
    select 1 from (values
      ('administrators_status_check'), ('administrators_org_slug_unique'),
      ('clients_status_check'), ('commission_plans_status_check'),
      ('contracts_status_check'), ('revenue_entries_status_check'),
      ('crm_lead_simulations_simulation_type_check'),
      ('crm_lead_simulations_status_check'),
      ('crm_lead_simulations_source_check'),
      ('crm_lead_simulations_jsonb_snapshot_check')
    ) expected(name)
    where not exists (select 1 from pg_constraint c where c.conname = expected.name)
  ) then
    raise exception 'One or more canonical constraints are missing';
  end if;

  if exists (
    select 1 from (values
      ('clients_organization_id_idx'), ('administrators_organization_id_idx'),
      ('commission_plans_administrator_id_idx'), ('contracts_organization_id_idx'),
      ('contracts_client_id_idx'), ('contracts_administrator_id_idx'),
      ('revenue_entries_contract_id_idx'),
      ('crm_lead_simulations_organization_id_idx'),
      ('crm_lead_simulations_lead_id_idx'),
      ('crm_lead_simulations_org_lead_created_at_idx')
    ) expected(name)
    where not exists (select 1 from pg_indexes i where i.schemaname = 'public' and i.indexname = expected.name)
  ) then
    raise exception 'One or more canonical indexes are missing';
  end if;

  if exists (
    select 1 from (values
      ('clients_set_updated_at'), ('administrators_set_updated_at'),
      ('commission_plans_set_updated_at'), ('contracts_set_updated_at'),
      ('revenue_entries_set_updated_at'), ('crm_lead_simulations_set_updated_at')
    ) expected(name)
    where not exists (select 1 from pg_trigger t where t.tgname = expected.name and not t.tgisinternal)
  ) then
    raise exception 'One or more canonical updated_at triggers are missing';
  end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('profiles','crm_leads','clients','administrators','commission_plans','contracts','revenue_entries','crm_lead_simulations')
      and not c.relrowsecurity
  ) then
    raise exception 'RLS is not enabled on every canonical protected table';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('clients','administrators','commission_plans','contracts','revenue_entries','crm_lead_simulations')
      and grantee in ('anon', 'PUBLIC')
  ) then
    raise exception 'anon or PUBLIC has canonical operational table grants';
  end if;

  if exists (
    select 1 from (values
      ('clients'), ('administrators'), ('commission_plans'), ('contracts'),
      ('revenue_entries'), ('crm_lead_simulations')
    ) expected(name)
    where not exists (
      select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = expected.name
    )
  ) then
    raise exception 'One or more canonical protected tables have no policies';
  end if;
end
$$;
