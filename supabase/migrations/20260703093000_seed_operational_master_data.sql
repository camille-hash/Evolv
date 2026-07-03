-- OPS-016 - Operational Master Data Setup
-- Initial operational seed for administrators and commission plans.
-- Commission percentages are provisional operational defaults and must be
-- reviewed before being treated as final commercial policy.

with administrator_seed as (
  select
    organization_row.id as organization_id,
    seed.name,
    seed.slug,
    seed.commission_percentage
  from public.organizations organization_row
  cross join (
    values
      ('Canopus', 'canopus', 3.0000::numeric),
      (U&'\00C2ncora', 'ancora', 3.0000::numeric),
      ('Rodobens', 'rodobens', 3.0000::numeric)
  ) as seed(name, slug, commission_percentage)
),
upserted_administrators as (
  insert into public.administrators (
    organization_id,
    name,
    slug,
    status,
    metadata
  )
  select
    organization_id,
    name,
    slug,
    'active',
    jsonb_build_object(
      'origin', 'ops_016_operational_master_data_seed',
      'reviewStatus', 'provisional'
    )
  from administrator_seed
  on conflict (organization_id, slug)
  do update set
    name = excluded.name,
    status = 'active',
    metadata = public.administrators.metadata || excluded.metadata,
    updated_at = now()
  returning id, organization_id, name, slug
)
insert into public.commission_plans (
  organization_id,
  administrator_id,
  name,
  status,
  commission_type,
  commission_percentage,
  payment_trigger,
  payment_installments,
  metadata
)
select
  administrator.organization_id,
  administrator.id,
  'Plano Operacional Inicial - ' || administrator.name,
  'active',
  'percentage',
  seed.commission_percentage,
  'contract_activation',
  1,
  jsonb_build_object(
    'origin', 'ops_016_operational_master_data_seed',
    'reviewStatus', 'provisional',
    'note', 'Percentual operacional inicial revisavel.'
  )
from upserted_administrators administrator
join administrator_seed seed
  on seed.organization_id = administrator.organization_id
 and seed.slug = administrator.slug
where not exists (
  select 1
  from public.commission_plans existing_plan
  where existing_plan.organization_id = administrator.organization_id
    and existing_plan.administrator_id = administrator.id
    and existing_plan.name = 'Plano Operacional Inicial - ' || administrator.name
);
