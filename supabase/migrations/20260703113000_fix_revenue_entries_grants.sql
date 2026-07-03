-- OPS-018 - Revenue Runtime Stabilization
-- Allows authenticated users to create/read expected revenue entries while
-- preserving organization isolation through RLS policies.

grant select, insert on table public.revenue_entries to authenticated;

alter table public.revenue_entries enable row level security;

drop policy if exists "organizations can read revenue entries"
  on public.revenue_entries;
create policy "organizations can read revenue entries"
on public.revenue_entries
for select
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
);

drop policy if exists "organizations can insert revenue entries"
  on public.revenue_entries;
create policy "organizations can insert revenue entries"
on public.revenue_entries
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.contracts contract
    where contract.id = contract_id
      and contract.organization_id = public.evolv_current_organization_id()
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
);
