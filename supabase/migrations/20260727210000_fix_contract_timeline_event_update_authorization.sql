-- ERA-VI-FIX-001
-- Timeline RPCs run as SECURITY INVOKER and use INSERT ... ON CONFLICT DO
-- UPDATE. The authenticated caller therefore needs the narrow UPDATE privilege
-- below, protected by tenant, role, contract and source-integrity checks.

revoke update on table public.contract_timeline_events from anon;

grant update (event_at, description, metadata)
  on table public.contract_timeline_events
  to authenticated;

drop policy if exists "contract timeline authenticated update same organization"
  on public.contract_timeline_events;

create policy "contract timeline authenticated update same organization"
  on public.contract_timeline_events
  for update
  to authenticated
  using (
    organization_id = public.evolv_current_organization_id()
    and public.evolv_current_role() in ('admin', 'master', 'sdr')
  )
  with check (
    organization_id = public.evolv_current_organization_id()
    and public.evolv_current_role() in ('admin', 'master', 'sdr')
    and exists (
      select 1
      from public.contracts contract
      where contract.id = contract_id
        and contract.organization_id = organization_id
    )
    and (
      (source_entity_type is null and source_entity_id is null)
      or (source_entity_type = 'contract' and source_entity_id = contract_id)
      or (
        source_entity_type = 'assembly'
        and exists (
          select 1
          from public.contract_assemblies assembly
          where assembly.id = source_entity_id
            and assembly.contract_id = contract_id
            and assembly.organization_id = organization_id
        )
      )
      or (
        source_entity_type = 'bid'
        and exists (
          select 1
          from public.contract_bids bid
          where bid.id = source_entity_id
            and bid.contract_id = contract_id
            and bid.organization_id = organization_id
        )
      )
    )
  );
