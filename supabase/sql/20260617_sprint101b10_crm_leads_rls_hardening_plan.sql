-- Sprint 101B.10
-- CRM LEADS RLS HARDENING PLAN
-- Documento pseudo-SQL. Nao executar.
-- Este arquivo contem apenas comentarios, pseudo-DDL e estrategia.

-- Objetivo:
-- Substituir o modelo atual de policies bridge/publicas em crm_leads
-- por policies organization-scoped baseadas em funcoes canonicas.

-- Estado atual observado em crm_leads:
-- - RLS enabled
-- - Allow public read crm_leads
-- - Allow public update crm_leads
-- - Authenticated bridge read crm_leads
-- - Authenticated bridge update crm_leads
-- - todas com qual = true e with_check = true

-- Estado alvo:
-- - sem policy anon para leitura operacional
-- - sem policy anon para update operacional
-- - select restrito a authenticated da mesma organizacao
-- - update restrito a authenticated da mesma organizacao
-- - reuse de evolv_current_organization_id()
-- - possibilidade futura de refinamento com evolv_current_role()

-- Pseudo-DDL ilustrativo para policy final de leitura:
--
-- create policy "crm_leads authenticated read same organization"
-- on public.crm_leads
-- for select
-- to authenticated
-- using (
--   organization_id = public.evolv_current_organization_id()
-- );

-- Pseudo-DDL ilustrativo para policy final de update:
--
-- create policy "crm_leads authenticated update same organization"
-- on public.crm_leads
-- for update
-- to authenticated
-- using (
--   organization_id = public.evolv_current_organization_id()
-- )
-- with check (
--   organization_id = public.evolv_current_organization_id()
-- );

-- Estrategia de migracao planejada:
-- Fase 1: criar funcoes canonicas
-- Fase 2: validar funcoes em paralelo
-- Fase 3: criar policies novas organization-scoped
-- Fase 4: manter convivencia controlada com bridge atual por janela curta
-- Fase 5: remover policies antigas public/bridge

-- Ordem conceitual de remocao:
-- 1. remover Allow public read crm_leads
-- 2. remover Allow public update crm_leads
-- 3. remover Authenticated bridge read crm_leads
-- 4. remover Authenticated bridge update crm_leads
--
-- Observacao:
-- a ordem real deve ser ajustada de acordo com a validacao operacional da janela de convivencia.

-- Preparacao para Dual Pipeline:
-- - crm_stage_events deve nascer com o mesmo padrao organization-scoped
-- - crm_green_flags deve nascer com o mesmo padrao organization-scoped
-- - nenhuma tabela nova deve herdar policies permissivas por true

-- Condicoes para considerar a remocao do bridge:
-- - CRM funcional
-- - Auth funcional
-- - Recovery funcional
-- - leitura de leads validada
-- - update de leads validado
-- - ausencia de acesso cruzado entre organizacoes
