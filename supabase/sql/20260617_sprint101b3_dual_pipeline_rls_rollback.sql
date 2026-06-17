-- EVOLV Sprint 101B.3 - Dual Pipeline RLS Rollback
-- STATUS: DOCUMENTAL. NAO EXECUTAR NESTA SPRINT.
--
-- Objetivo:
-- - remover apenas grants/policies do novo dominio Dual Pipeline;
-- - preservar tabelas, dados, RLS habilitada e schema ja aplicado;
-- - nao tocar em crm_leads, auth, profiles, organizations ou app.

-- ============================================================================
-- BLOCO 1 - Policies de crm_green_flags
-- ============================================================================

drop policy if exists "crm_green_flags_update_organization"
  on public.crm_green_flags;

drop policy if exists "crm_green_flags_insert_organization"
  on public.crm_green_flags;

drop policy if exists "crm_green_flags_select_organization"
  on public.crm_green_flags;

-- ============================================================================
-- BLOCO 2 - Policies de crm_stage_events
-- ============================================================================

drop policy if exists "crm_stage_events_insert_organization"
  on public.crm_stage_events;

drop policy if exists "crm_stage_events_select_organization"
  on public.crm_stage_events;

-- ============================================================================
-- BLOCO 3 - Revogar grants do role authenticated
-- ============================================================================

revoke update on public.crm_green_flags from authenticated;
revoke insert on public.crm_green_flags from authenticated;
revoke select on public.crm_green_flags from authenticated;

revoke insert on public.crm_stage_events from authenticated;
revoke select on public.crm_stage_events from authenticated;

-- ============================================================================
-- BLOCO 4 - Observacao final
-- ============================================================================
-- Este rollback nao:
-- - remove tabelas;
-- - remove colunas;
-- - altera dados;
-- - desabilita RLS.
--
-- Se houver wiring funcional dependente dessas policies, o rollback deve ser
-- coordenado antes de execucao.
