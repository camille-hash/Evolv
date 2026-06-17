# Controlled Apply Runbook - Sprint 101B.5

## Objetivo

Definir o passo a passo manual futuro para aplicar o dominio Dual Pipeline no banco com risco controlado.

## Passo 0 - Confirmacoes obrigatorias

- [ ] Backup/export do estado atual confirmado
- [ ] Ambiente de producao estavel
- [ ] Sem deploy paralelo em andamento
- [ ] Camille disponivel para execucao e observacao
- [ ] Rollback entendido e revisado

## Passo 1 - Preflight

Executar:

- `supabase/sql/20260617_sprint101b5_preflight_validation.sql`

Prosseguir apenas se:

- `crm_leads.organization_id` nao tiver nulos relevantes
- `public.evolv_current_organization_id()` existir
- `public.evolv_current_role()` existir
- `crm_stage_events` e `crm_green_flags` ainda nao existirem
- nao houver inconsistencia critica em policies/grants atuais

## Passo 2 - Schema apply

Executar:

- `supabase/sql/20260616_sprint101b2_dual_pipeline_schema_apply.sql`

## Passo 3 - Schema validation

Executar:

- `supabase/sql/20260616_sprint101b2_dual_pipeline_schema_validation.sql`

Prosseguir apenas se:

- colunas novas em `crm_leads` existirem
- `crm_stage_events` existir
- `crm_green_flags` existir
- RLS estiver habilitada nas novas tabelas
- novas tabelas estiverem vazias

## Passo 4 - Policies apply

Executar:

- `supabase/sql/20260617_sprint101b3_dual_pipeline_rls_policies.sql`

## Passo 5 - Policies validation

Executar:

- `supabase/sql/20260617_sprint101b3_dual_pipeline_rls_validation.sql`

Prosseguir apenas se:

- nao houver policies `anon`
- nao houver `using (true)` / `with check (true)`
- `crm_stage_events` nao tiver `UPDATE`/`DELETE`
- `crm_green_flags` nao tiver `DELETE`

## Passo 6 - Post-apply validation consolidada

Executar:

- `supabase/sql/20260617_sprint101b5_post_apply_validation.sql`

## Passo 7 - Smoke tests operacionais

Verificar manualmente:

- CRM carrega normalmente
- Auth continua funcionando
- Recovery continua funcionando
- nenhum comportamento visual mudou

## Passo 8 - Abortar ou concluir

Se qualquer validacao critica falhar:

1. executar `supabase/sql/20260617_sprint101b5_abort_rollback_checks.sql`
2. se confirmado, executar:
   - `supabase/sql/20260617_sprint101b3_dual_pipeline_rls_rollback.sql`
   - e, se necessario, `supabase/sql/20260616_sprint101b2_dual_pipeline_schema_rollback.sql`

## Passo 9 - Registro final

Registrar:

- data/hora
- quem executou
- quais scripts rodaram
- resultados das validacoes
- se houve rollback
- status final de CRM/Auth/Recovery
