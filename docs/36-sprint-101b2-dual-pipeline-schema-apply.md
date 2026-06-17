# Sprint 101B.2 - Dual Pipeline Schema Apply

## 1. Resumo executivo

Esta sprint prepara a versao final, revisavel e manualmente aplicavel do schema Dual Pipeline do EVOLV.

Nada foi executado automaticamente.

Foram produzidos:

- SQL final de apply;
- SQL final de validation;
- SQL final de rollback;
- documentacao operacional da sprint.

O objetivo e permitir que a Camille revise e, se aprovado, execute manualmente no Supabase SQL Editor a base estrutural necessaria para:

- evolucao segura do Dual Pipeline;
- Green Flag com ciclo proprio;
- historico auditavel de transicoes;
- futura Deadline Engine;
- futura Revenue Recognition.

## 2. O que foi aprovado da 101B.1

A proposta da 101B.1 foi mantida em sua essencia:

- `crm_leads` preservada como tabela principal do lead;
- novas colunas de snapshot/dominio adicionadas em `crm_leads`;
- nova tabela `crm_stage_events` para historico auditavel;
- nova tabela `crm_green_flags` para ciclos de retomada.

## 3. Ajustes incorporados nesta 101B.2

Os tres ajustes aprovados foram incorporados:

1. Em `crm_stage_events`:
   - `occurred_at timestamptz not null default now()`

2. Em `crm_green_flags`:
   - `due_at timestamptz not null`

3. Em `crm_green_flags`:
   - `resolution_reason text null`

Esses ajustes melhoram o dominio sem introduzir comportamento funcional novo no app.

## 4. Arquivos criados

- `supabase/sql/20260616_sprint101b2_dual_pipeline_schema_apply.sql`
- `supabase/sql/20260616_sprint101b2_dual_pipeline_schema_validation.sql`
- `supabase/sql/20260616_sprint101b2_dual_pipeline_schema_rollback.sql`
- `docs/36-sprint-101b2-dual-pipeline-schema-apply.md`

## 5. O que o SQL apply faz

O SQL de apply:

1. Mantem `crm_leads.pipeline` e `crm_leads.etapa` intactos.
2. Adiciona, se ainda nao existirem, as colunas:
   - `pipeline_domain`
   - `stage_domain`
   - `last_stage_changed_at`
   - `first_invoice_paid`
   - `first_invoice_paid_at`
   - `sales_closed_at`
3. Cria indices utilitarios para essas colunas.
4. Cria `crm_stage_events` com:
   - FKs organizacionais;
   - `occurred_at`;
   - `created_at`;
   - `metadata`;
   - RLS habilitada.
5. Cria `crm_green_flags` com:
   - `due_at`;
   - `resolution_reason`;
   - `updated_at`;
   - `metadata`;
   - indice parcial de um ciclo aberto por lead;
   - trigger de `updated_at`;
   - RLS habilitada.
6. Nao altera dados existentes.
7. Nao cria policy ampla.
8. Nao libera `anon`.
9. Nao desabilita RLS.

## 6. O que o SQL validation checa

O SQL de validation contem apenas `SELECTs` para verificar:

1. colunas novas em `crm_leads`;
2. existencia de `crm_stage_events`;
3. existencia de `crm_green_flags`;
4. colunas de `crm_stage_events`, incluindo `occurred_at`;
5. colunas de `crm_green_flags`, incluindo `due_at` e `resolution_reason`;
6. indices criados;
7. RLS habilitada nas novas tabelas;
8. ausencia de policies `anon` nas novas tabelas;
9. ausencia de policies amplas com `using (true)` ou `with check (true)`;
10. contagem de `crm_leads` preservada;
11. novas tabelas vazias;
12. permanencia de `pipeline` e `etapa`.

## 7. O que o SQL rollback desfaz

O rollback foi estruturado como rollback conceitual e manual.

Ele:

1. remove trigger criada em `crm_green_flags`;
2. remove tabelas novas:
   - `crm_green_flags`
   - `crm_stage_events`
3. remove indices novos de `crm_leads`;
4. remove colunas novas de `crm_leads`.

Observacao importante:

- o rollback nao deve ser usado sem revisao;
- ele e seguro apenas antes de qualquer uso real dessas estruturas ou apos backup/aprovacao explicita.

## 8. Ordem segura de execucao manual

Sequencia recomendada:

1. Fazer backup logico/registrar estado atual do banco.
2. Revisar manualmente o SQL de apply.
3. Executar `20260616_sprint101b2_dual_pipeline_schema_apply.sql` no Supabase SQL Editor.
4. Executar `20260616_sprint101b2_dual_pipeline_schema_validation.sql`.
5. Conferir manualmente a aba Policies das tabelas novas.
6. Confirmar que nenhuma UI depende ainda dessas tabelas.
7. Nao ligar comportamento visual novo nesta fase.
8. Seguir para a Sprint 101B.3.

## 9. Riscos

### Criticos

- executar apply sem backup/log do estado atual;
- adicionar UI antes de configurar RLS/policies das tabelas novas;
- usar as novas tabelas com acesso aberto.

### Altos

- confundir `occurred_at` com `created_at` em leitura futura;
- usar `due_at` como substituto de toda a logica de deadline antes da 101C;
- aplicar rollback depois de as tabelas passarem a conter uso real.

### Medios

- preencher colunas novas cedo demais com regra de negocio ainda nao implementada;
- misturar `crm_stage_changes` legado com `crm_stage_events` novo sem estrategia de convivio.

## 10. Fora do escopo

Esta sprint nao implementa:

- Dual Pipeline no app;
- UI de Green Flag;
- Deadline Engine;
- Dashboard;
- Revenue Recognition;
- policies finais organization-scoped;
- wiring frontend;
- backfill de dados;
- qualquer execucao automatica.

## 11. Proxima sprint recomendada

**Sprint 101B.3 - Dual Pipeline RLS + Policies**

Motivo:

- as novas tabelas devem nascer protegidas por RLS;
- sem policies elas ficam seguras, mas ainda nao prontas para uso funcional;
- a 101B.3 deve definir acesso autenticado organization-scoped sem liberar `anon`.

## 12. Confirmacao final

- Nenhuma alteracao foi executada automaticamente.
- Nenhum SQL foi executado nesta sprint.
- Nenhuma mudanca foi aplicada no Supabase.
- Nenhum dado real foi alterado.
- Nenhum comportamento do app foi alterado.
