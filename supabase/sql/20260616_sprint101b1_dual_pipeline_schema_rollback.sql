-- EVOLV Sprint 101B.1 - Dual Pipeline Schema Rollback
-- STATUS: ROLLBACK CONCEITUAL FUTURO. NAO EXECUTAR NESTA SPRINT.
--
-- ATENCAO:
-- Este rollback so deve ser usado:
-- - antes de qualquer uso real das tabelas novas; ou
-- - apos backup e aprovacao explicita.
--
-- Este script NAO deve tocar em:
-- - pipeline/etapa atuais;
-- - dados atuais de crm_leads;
-- - policies/grants legados do CRM atual;
-- - organizations/profiles/auth.

-- 1) Remover tabelas novas primeiro.
drop trigger if exists crm_green_flags_set_updated_at on public.crm_green_flags;

drop table if exists public.crm_green_flags;
drop table if exists public.crm_stage_events;

-- 2) Remover indices/colunas novas de crm_leads depois.
drop index if exists public.crm_leads_pipeline_domain_idx;
drop index if exists public.crm_leads_stage_domain_idx;
drop index if exists public.crm_leads_last_stage_changed_at_idx;
drop index if exists public.crm_leads_first_invoice_paid_idx;
drop index if exists public.crm_leads_sales_closed_at_idx;

alter table public.crm_leads
  drop column if exists pipeline_domain,
  drop column if exists stage_domain,
  drop column if exists last_stage_changed_at,
  drop column if exists first_invoice_paid,
  drop column if exists first_invoice_paid_at,
  drop column if exists sales_closed_at;

-- 3) Observacao final:
-- Este rollback assume que as colunas acima ainda nao viraram dependencia do app.
-- Se qualquer fluxo ja tiver passado a usar essas estruturas, o rollback deve ser
-- reavaliado manualmente antes de execucao.
