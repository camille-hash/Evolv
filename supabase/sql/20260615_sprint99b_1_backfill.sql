-- EVOLV Sprint 99B.1 - Proposed initial context backfill.
-- Manual review only. Do not execute before diagnostics/table/index validation.
-- This script inserts notes only; it does not update crm_leads.

with lead_observations as (
  select
    cl.id as lead_id,
    cl.organization_id,
    nullif(trim(cl.observacoes), '') as content,
    cl.created_at,
    cl.updated_at
  from public.crm_leads cl
  where cl.organization_id is not null
    and nullif(trim(coalesce(cl.observacoes, '')), '') is not null
),
default_admin_by_organization as (
  select distinct on (p.organization_id)
    p.organization_id,
    p.id as author_profile_id
  from public.profiles p
  where p.role = 'admin'
    and p.is_active = true
  order by p.organization_id, p.created_at asc
)
insert into public.crm_lead_notes (
  organization_id,
  lead_id,
  author_profile_id,
  content,
  note_type,
  is_internal,
  metadata,
  created_at,
  updated_at
)
select
  lo.organization_id,
  lo.lead_id,
  dao.author_profile_id,
  lo.content,
  'initial_context',
  true,
  jsonb_build_object(
    'source', 'crm_leads.observacoes',
    'backfill', 'sprint99b_1',
    'preserves_original_observacoes', true
  ),
  coalesce(lo.created_at, now()),
  coalesce(lo.updated_at, lo.created_at, now())
from lead_observations lo
left join default_admin_by_organization dao
  on dao.organization_id = lo.organization_id
where not exists (
  select 1
  from public.crm_lead_notes notes
  where notes.lead_id = lo.lead_id
    and notes.note_type = 'initial_context'
    and notes.metadata->>'source' = 'crm_leads.observacoes'
);
