-- EVOLV Sprint 99H.5 - Supabase CRM Auth Access Matrix apply
-- Manual review only. Do not execute through Codex.
--
-- OBJECTIVE:
-- Enable the minimum authenticated access required for lead notes,
-- without changing crm_leads behavior and without exposing notes to anon.
--
-- IMPORTANT:
-- - Data API for public.crm_lead_notes must be enabled manually in the Supabase panel.
-- - This script does not change data in crm_lead_notes.
-- - This script does not create anon access.
-- - This script does not create UPDATE or DELETE policies.
-- - This script assumes public.profiles already has self-select access for authenticated users.
-- - This script assumes public.crm_leads already has the temporary bridge required by the current app flow.

grant select on public.crm_lead_notes to authenticated;
grant insert on public.crm_lead_notes to authenticated;

alter table public.crm_lead_notes enable row level security;

drop policy if exists "Lead notes authenticated read by organization" on public.crm_lead_notes;
create policy "Lead notes authenticated read by organization"
  on public.crm_lead_notes
  for select
  to authenticated
  using (
    deleted_at is null
    and is_internal = true
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.organization_id = crm_lead_notes.organization_id
        and p.is_active = true
        and p.role in ('admin', 'sdr')
    )
  );

drop policy if exists "Lead notes authenticated insert by organization" on public.crm_lead_notes;
create policy "Lead notes authenticated insert by organization"
  on public.crm_lead_notes
  for insert
  to authenticated
  with check (
    is_internal = true
    and author_profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.organization_id = coalesce(crm_lead_notes.organization_id, p.organization_id)
        and p.is_active = true
        and p.role in ('admin', 'sdr')
    )
    and exists (
      select 1
      from public.crm_leads cl
      join public.profiles p
        on p.id = auth.uid()
      where cl.id = crm_lead_notes.lead_id
        and cl.organization_id = p.organization_id
        and (
          crm_lead_notes.organization_id is null
          or crm_lead_notes.organization_id = cl.organization_id
        )
    )
  );
