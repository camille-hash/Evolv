-- EVOLV Sprint 101B.2 - Dual Pipeline Schema Rollback
-- STATUS: ROLLBACK MANUAL FUTURO. NAO EXECUTAR NESTA SPRINT.
--
-- RISCO:
-- - Este rollback remove estruturas criadas para o Dual Pipeline.
-- - So usar antes de qualquer uso funcional real ou apos backup/aprovacao explicita.
-- - Nao mexe em pipeline/etapa legados.
-- - Nao desabilita RLS de tabelas existentes.
-- - Nao toca em crm_leads alem das colunas adicionadas nesta sprint.

-- ============================================================================
-- BLOCO 1 - Remover trigger da tabela crm_green_flags
-- ============================================================================

drop trigger if exists crm_green_flags_set_updated_at on public.crm_green_flags;

-- ============================================================================
-- BLOCO 2 - Remover tabelas novas
-- ============================================================================

drop table if exists public.crm_green_flags;
drop table if exists public.crm_stage_events;

-- ============================================================================
-- BLOCO 3 - Remover indices novos em crm_leads
-- ============================================================================

drop index if exists public.crm_leads_pipeline_domain_idx;
drop index if exists public.crm_leads_stage_domain_idx;
drop index if exists public.crm_leads_last_stage_changed_at_idx;
drop index if exists public.crm_leads_first_invoice_paid_idx;
drop index if exists public.crm_leads_sales_closed_at_idx;

-- ============================================================================
-- BLOCO 4 - Remover colunas novas em crm_leads
-- ============================================================================

alter table public.crm_leads
  drop column if exists pipeline_domain,
  drop column if exists stage_domain,
  drop column if exists last_stage_changed_at,
  drop column if exists first_invoice_paid,
  drop column if exists first_invoice_paid_at,
  drop column if exists sales_closed_at;

-- ============================================================================
-- BLOCO 5 - Observacao final
-- ============================================================================
-- Se qualquer fluxo do app ou processo manual passar a depender dessas estruturas,
-- este rollback deve ser reavaliado antes da execucao.
