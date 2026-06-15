-- EVOLV Sprint 97.2 - Controlled Patrion organization backfill.
-- Manual review only.
-- Updates only public.crm_leads.organization_id using organization slug 'patrion-evolv'.
-- Does not modify any other crm_leads column.

update public.crm_leads
set organization_id = (
  select o.id
  from public.organizations o
  where o.slug = 'patrion-evolv'
)
where organization_id is null
  and exists (
    select 1
    from public.organizations o
    where o.slug = 'patrion-evolv'
  );
