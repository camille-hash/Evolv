-- OPS-017-R2 - Runtime RLS/Grants Fix
-- Allows authenticated users to execute operational reads and contract creation
-- while preserving organization isolation through RLS policies.

grant select on table public.administrators to authenticated;
grant select on table public.commission_plans to authenticated;
grant select, insert on table public.contracts to authenticated;

alter table public.administrators enable row level security;
alter table public.commission_plans enable row level security;
alter table public.contracts enable row level security;

drop policy if exists "organizations can read administrators"
  on public.administrators;
create policy "organizations can read administrators"
on public.administrators
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can read commission plans"
  on public.commission_plans;
create policy "organizations can read commission plans"
on public.commission_plans
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can read contracts"
  on public.contracts;
create policy "organizations can read contracts"
on public.contracts
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can insert contracts"
  on public.contracts;
create policy "organizations can insert contracts"
on public.contracts
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and (
    lead_id is null
    or exists (
      select 1
      from public.crm_leads lead
      where lead.id = lead_id
        and lead.organization_id = public.evolv_current_organization_id()
    )
  )
  and (
    client_id is null
    or exists (
      select 1
      from public.clients client
      where client.id = client_id
        and client.organization_id = public.evolv_current_organization_id()
    )
  )
  and (
    administrator_id is null
    or exists (
      select 1
      from public.administrators administrator
      where administrator.id = administrator_id
        and administrator.organization_id = public.evolv_current_organization_id()
    )
  )
  and (
    commission_plan_id is null
    or exists (
      select 1
      from public.commission_plans plan
      where plan.id = commission_plan_id
        and plan.organization_id = public.evolv_current_organization_id()
        and (
          administrator_id is null
          or plan.administrator_id = administrator_id
        )
    )
  )
);
