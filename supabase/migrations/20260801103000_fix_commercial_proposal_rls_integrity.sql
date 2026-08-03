-- DB-001-R1 - Fix commercial proposal RLS relational integrity.
--
-- Scope:
-- - Replace tautological lead_id checks materialized in DB-001 policies.
-- - Keep tenant isolation based on evolv_current_organization_id().
-- - Do not change tables, data, grants, RPCs or triggers.

do $$
begin
  if to_regclass('public.crm_lead_commercial_proposals') is null then
    raise exception 'Missing public.crm_lead_commercial_proposals';
  end if;

  if to_regclass('public.commercial_proposal_audit_events') is null then
    raise exception 'Missing public.commercial_proposal_audit_events';
  end if;

  if to_regclass('public.crm_lead_simulations') is null then
    raise exception 'Missing public.crm_lead_simulations';
  end if;

  if to_regprocedure('public.evolv_current_organization_id()') is null then
    raise exception 'Missing public.evolv_current_organization_id()';
  end if;
end
$$;

drop policy if exists "crm_lead_commercial_proposals authenticated insert same organization"
  on public.crm_lead_commercial_proposals;

create policy "crm_lead_commercial_proposals authenticated insert same organization"
on public.crm_lead_commercial_proposals
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and status in ('draft', 'generated', 'saved')
  and (
    created_by is null
    or created_by = auth.uid()
  )
  and exists (
    select 1
    from public.crm_leads lead
    where lead.id = crm_lead_commercial_proposals.lead_id
      and lead.organization_id = crm_lead_commercial_proposals.organization_id
      and lead.organization_id = public.evolv_current_organization_id()
  )
  and (
    simulation_id is null
    or exists (
      select 1
      from public.crm_lead_simulations simulation
      where simulation.id = crm_lead_commercial_proposals.simulation_id
        and simulation.organization_id = crm_lead_commercial_proposals.organization_id
        and simulation.organization_id = public.evolv_current_organization_id()
        and simulation.lead_id = crm_lead_commercial_proposals.lead_id
    )
  )
);

drop policy if exists "crm_lead_commercial_proposals authenticated update same organization"
  on public.crm_lead_commercial_proposals;

create policy "crm_lead_commercial_proposals authenticated update same organization"
on public.crm_lead_commercial_proposals
for update
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
)
with check (
  organization_id = public.evolv_current_organization_id()
  and exists (
    select 1
    from public.crm_leads lead
    where lead.id = crm_lead_commercial_proposals.lead_id
      and lead.organization_id = crm_lead_commercial_proposals.organization_id
      and lead.organization_id = public.evolv_current_organization_id()
  )
  and (
    simulation_id is null
    or exists (
      select 1
      from public.crm_lead_simulations simulation
      where simulation.id = crm_lead_commercial_proposals.simulation_id
        and simulation.organization_id = crm_lead_commercial_proposals.organization_id
        and simulation.organization_id = public.evolv_current_organization_id()
        and simulation.lead_id = crm_lead_commercial_proposals.lead_id
    )
  )
  and (
    approved_by is null
    or approved_by = auth.uid()
  )
  and (
    rejected_by is null
    or rejected_by = auth.uid()
  )
  and (
    superseded_by is null
    or superseded_by = auth.uid()
  )
);

drop policy if exists "commercial_proposal_audit_events authenticated insert same organization"
  on public.commercial_proposal_audit_events;

create policy "commercial_proposal_audit_events authenticated insert same organization"
on public.commercial_proposal_audit_events
for insert
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
  and (
    created_by is null
    or created_by = auth.uid()
  )
  and exists (
    select 1
    from public.crm_lead_commercial_proposals proposal
    where proposal.id = commercial_proposal_audit_events.proposal_id
      and proposal.organization_id = commercial_proposal_audit_events.organization_id
      and proposal.organization_id = public.evolv_current_organization_id()
      and proposal.lead_id = commercial_proposal_audit_events.lead_id
      and proposal.proposal_number = commercial_proposal_audit_events.proposal_number
      and proposal.version = commercial_proposal_audit_events.proposal_version
      and (
        commercial_proposal_audit_events.simulation_id is null
        or proposal.simulation_id = commercial_proposal_audit_events.simulation_id
      )
  )
);
