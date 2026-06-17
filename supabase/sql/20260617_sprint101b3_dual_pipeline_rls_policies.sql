-- EVOLV Sprint 101B.3 - Dual Pipeline RLS + Policies
-- STATUS: DOCUMENTAL. NAO EXECUTAR NESTA SPRINT.
--
-- Objetivo:
-- - proteger crm_stage_events e crm_green_flags com acesso organization-scoped;
-- - permitir apenas authenticated;
-- - nao liberar anon;
-- - nao criar policies using(true);
-- - nao desabilitar RLS;
-- - nao alterar dados existentes.

-- ============================================================================
-- BLOCO 0 - Premissas
-- ============================================================================
-- Este script pressupoe que a Sprint 101B.2 ja foi aplicada manualmente e que
-- as tabelas abaixo existem:
-- - public.crm_stage_events
-- - public.crm_green_flags
--
-- Este script tambem pressupoe a existencia das funcoes:
-- - public.evolv_current_organization_id()
-- - public.evolv_current_role()

-- ============================================================================
-- BLOCO 1 - Grants minimos
-- ============================================================================
-- Revoga qualquer acesso de anon/public e concede apenas o minimo necessario a
-- authenticated.

revoke all on public.crm_stage_events from anon;
revoke all on public.crm_stage_events from public;
revoke all on public.crm_green_flags from anon;
revoke all on public.crm_green_flags from public;

grant select, insert on public.crm_stage_events to authenticated;
grant select, insert, update on public.crm_green_flags to authenticated;

-- ============================================================================
-- BLOCO 2 - Garantia de RLS habilitada
-- ============================================================================

alter table public.crm_stage_events enable row level security;
alter table public.crm_green_flags enable row level security;

-- ============================================================================
-- BLOCO 3 - Policies de crm_stage_events
-- ============================================================================

drop policy if exists "crm_stage_events_select_organization"
  on public.crm_stage_events;

create policy "crm_stage_events_select_organization"
  on public.crm_stage_events
  for select
  to authenticated
  using (
    public.evolv_current_organization_id() is not null
    and organization_id = public.evolv_current_organization_id()
  );

drop policy if exists "crm_stage_events_insert_organization"
  on public.crm_stage_events;

create policy "crm_stage_events_insert_organization"
  on public.crm_stage_events
  for insert
  to authenticated
  with check (
    public.evolv_current_organization_id() is not null
    and organization_id = public.evolv_current_organization_id()
    and exists (
      select 1
      from public.crm_leads cl
      where cl.id = crm_stage_events.lead_id
        and cl.organization_id = public.evolv_current_organization_id()
    )
  );

-- Nenhuma policy de update/delete para crm_stage_events.
-- A tabela deve ser append-only por padrao.

-- ============================================================================
-- BLOCO 4 - Policies de crm_green_flags
-- ============================================================================

drop policy if exists "crm_green_flags_select_organization"
  on public.crm_green_flags;

create policy "crm_green_flags_select_organization"
  on public.crm_green_flags
  for select
  to authenticated
  using (
    public.evolv_current_organization_id() is not null
    and organization_id = public.evolv_current_organization_id()
  );

drop policy if exists "crm_green_flags_insert_organization"
  on public.crm_green_flags;

create policy "crm_green_flags_insert_organization"
  on public.crm_green_flags
  for insert
  to authenticated
  with check (
    public.evolv_current_organization_id() is not null
    and organization_id = public.evolv_current_organization_id()
    and exists (
      select 1
      from public.crm_leads cl
      where cl.id = crm_green_flags.lead_id
        and cl.organization_id = public.evolv_current_organization_id()
    )
    and (
      crm_green_flags.stage_event_id is null
      or exists (
        select 1
        from public.crm_stage_events cse
        where cse.id = crm_green_flags.stage_event_id
          and cse.organization_id = public.evolv_current_organization_id()
      )
    )
  );

drop policy if exists "crm_green_flags_update_organization"
  on public.crm_green_flags;

create policy "crm_green_flags_update_organization"
  on public.crm_green_flags
  for update
  to authenticated
  using (
    public.evolv_current_organization_id() is not null
    and organization_id = public.evolv_current_organization_id()
  )
  with check (
    public.evolv_current_organization_id() is not null
    and organization_id = public.evolv_current_organization_id()
    and exists (
      select 1
      from public.crm_leads cl
      where cl.id = crm_green_flags.lead_id
        and cl.organization_id = public.evolv_current_organization_id()
    )
    and (
      crm_green_flags.stage_event_id is null
      or exists (
        select 1
        from public.crm_stage_events cse
        where cse.id = crm_green_flags.stage_event_id
          and cse.organization_id = public.evolv_current_organization_id()
      )
    )
  );

-- Nenhuma policy de delete para crm_green_flags nesta fase.
-- O historico deve ser preservado.
