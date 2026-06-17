# Sprint 101B.5 - Controlled Schema Apply & Validation Window

## 1. Estado inicial esperado

Antes de qualquer execucao manual futura, o estado esperado e:

- branch `main`;
- working tree limpo no repositorio operacional;
- producao estavel;
- Supabase Auth funcionando;
- recovery funcionando;
- CRM funcionando;
- Lead Notes funcionando;
- sprints 101B.0, 101B.1, 101B.2, 101B.3 e 101B.4 concluidas;
- nenhum SQL de Dual Pipeline executado ainda;
- nenhuma migration real aplicada ao Supabase para esse dominio.

## 2. Premissas de seguranca

1. A execucao futura sera manual e supervisionada.
2. Nenhum passo deve ocorrer sem backup/export do estado atual.
3. Nenhum SQL deve ser executado se houver instabilidade operacional.
4. O apply de schema e o apply de RLS/policies devem ocorrer em ordem, nunca invertidos.
5. O dominio novo nao pode introduzir acesso `anon`.
6. O rollback deve estar entendido antes do primeiro passo.

## 3. Scripts envolvidos

### Schema Proposal

- `supabase/sql/20260616_sprint101b1_dual_pipeline_schema_proposal.sql`
- `supabase/sql/20260616_sprint101b1_dual_pipeline_schema_validation.sql`
- `supabase/sql/20260616_sprint101b1_dual_pipeline_schema_rollback.sql`

### Schema Apply

- `supabase/sql/20260616_sprint101b2_dual_pipeline_schema_apply.sql`
- `supabase/sql/20260616_sprint101b2_dual_pipeline_schema_validation.sql`
- `supabase/sql/20260616_sprint101b2_dual_pipeline_schema_rollback.sql`

### RLS + Policies

- `supabase/sql/20260617_sprint101b3_dual_pipeline_rls_policies.sql`
- `supabase/sql/20260617_sprint101b3_dual_pipeline_rls_validation.sql`
- `supabase/sql/20260617_sprint101b3_dual_pipeline_rls_rollback.sql`

### Governanca operacional desta sprint

- `supabase/sql/20260617_sprint101b5_preflight_validation.sql`
- `supabase/sql/20260617_sprint101b5_post_apply_validation.sql`
- `supabase/sql/20260617_sprint101b5_abort_rollback_checks.sql`
- `supabase/sql/20260617_sprint101b5_controlled_apply_runbook.md`

## 4. Ordem futura de execucao recomendada

1. Confirmar backup/export do estado atual.
2. Executar preflight validation.
3. Executar schema apply da Sprint 101B.2.
4. Executar validation da Sprint 101B.2.
5. Executar RLS + policies da Sprint 101B.3.
6. Executar validation da Sprint 101B.3.
7. Executar post-apply validation consolidada da Sprint 101B.5.
8. Testar CRM em producao.
9. Testar Auth/Recovery.
10. Registrar resultado.

## 5. Pre-validacoes obrigatorias

Antes de qualquer execucao manual:

1. Confirmar backup/export recente do estado atual.
2. Confirmar `crm_leads` com contagem esperada.
3. Confirmar `organization_id` presente e sem nulos relevantes em `crm_leads`.
4. Confirmar existencia da funcao `public.evolv_current_organization_id()`.
5. Confirmar existencia da funcao `public.evolv_current_role()`.
6. Confirmar que as policies atuais do CRM nao estao em estado inconsistente.
7. Confirmar que nao ha deploy recente com incidente aberto.
8. Confirmar responsavel manual acompanhando a execucao.

## 6. Criterios para NAO executar

Nao executar se qualquer um ocorrer:

- `crm_leads.organization_id` com valores nulos relevantes;
- funcao `public.evolv_current_organization_id()` inexistente ou invalida;
- funcao `public.evolv_current_role()` inexistente ou invalida;
- policies atuais inconsistentes;
- producao instavel;
- build/deploy recente com erro;
- falta de backup;
- falta de responsavel acompanhando;
- duvida sobre rollback;
- divergencia entre schema real e scripts documentados.

## 7. Janela segura de execucao

Janela recomendada:

- horario de menor atividade operacional;
- com responsavel tecnico e responsavel de negocio disponiveis;
- com tempo reservado para:
  - execucao;
  - validacao;
  - eventual rollback.

Nao executar:

- no meio de reunioes comerciais criticas;
- durante incidentes ativos;
- durante deploy paralelo;
- sem janela de observacao apos a execucao.

## 8. Responsavel pela execucao manual

Execucao manual futura:

- responsavel tecnico primario: Camille;
- com acompanhamento consciente de negocio/operacao;
- sem automacao por CLI, migration runner ou script oculto.

## 9. Plano de comunicacao antes/depois

### Antes

- confirmar janela;
- confirmar backup;
- avisar que a execucao e apenas de banco;
- avisar que nao deve haver mudanca visual imediata;
- alinhar condicoes de abortar.

### Depois

- registrar horario de inicio e fim;
- registrar scripts executados;
- registrar resultado das validacoes;
- registrar se houve rollback ou nao;
- registrar status final de CRM, Auth e Recovery.

## 10. Pos-validacoes obrigatorias

Depois da execucao futura:

1. Confirmar colunas novas em `crm_leads`.
2. Confirmar existencia de `crm_stage_events`.
3. Confirmar existencia de `crm_green_flags`.
4. Confirmar RLS enabled nas duas novas tabelas.
5. Confirmar ausencia de policies `anon`.
6. Confirmar policies organization-scoped.
7. Confirmar que novas tabelas nasceram vazias.
8. Confirmar que `pipeline` e `etapa` continuam presentes.
9. Confirmar contagem de `crm_leads` preservada.
10. Validar CRM em producao.
11. Validar Auth.
12. Validar Recovery.

## 11. Criterios de sucesso

- colunas futuras existem em `crm_leads`;
- `crm_stage_events` existe;
- `crm_green_flags` existe;
- RLS enabled nas novas tabelas;
- policies sem `anon`;
- policies organization-scoped;
- CRM atual continua funcionando;
- Auth continua funcionando;
- Recovery continua funcionando;
- nenhum dado real perdido;
- nenhum comportamento visual muda.

## 12. Criterios de abortar

Abortar imediatamente se:

- preflight apontar falha critica;
- validation do schema falhar;
- validation de RLS/policies falhar;
- CRM apresentar regressao imediata;
- Auth falhar;
- Recovery falhar;
- houver duvida objetiva sobre integridade de dados.

## 13. Criterios de rollback

Considerar rollback se:

- schema apply criou estrutura incompleta ou inconsistente;
- policies bloquearam acesso legitimo;
- grants/policies divergiram do esperado;
- validacoes criticas falharam;
- CRM deixou de funcionar de forma confiavel;
- Auth/Recovery sofreram impacto colateral inesperado.

## 14. Ordem de rollback

Ordem recomendada:

1. Executar `20260617_sprint101b3_dual_pipeline_rls_rollback.sql`.
2. Validar remocao das policies/grants do novo dominio.
3. Se ainda necessario, executar `20260616_sprint101b2_dual_pipeline_schema_rollback.sql`.
4. Revalidar CRM/Auth/Recovery.
5. Registrar evento e causa do rollback.

## 15. Riscos conhecidos

### Criticos

- executar sem backup;
- aplicar policies antes de validar schema;
- liberar acesso errado ao novo dominio;
- impactar CRM atual por erro de grant/policy.

### Altos

- divergencia entre schema real e scripts documentados;
- rollback tardio apos wiring futuro;
- falsa sensacao de seguranca sem teste manual completo.

### Medios

- falha humana na ordem dos scripts;
- interpretacao incompleta dos resultados de validacao.

## 16. Confirmacao explicita

Esta sprint:

- NAO executa SQL;
- NAO aplica migrations;
- NAO altera Supabase;
- NAO altera producao;
- NAO altera codigo;
- apenas prepara governanca operacional para futura execucao manual supervisionada.

## 17. Proxima sprint recomendada

**Sprint 101B.6 - Manual Execution Window (supervisionada)**

Somente se:

- o runbook estiver aprovado;
- a janela operacional estiver definida;
- o backup estiver confirmado;
- o responsavel manual estiver designado.
