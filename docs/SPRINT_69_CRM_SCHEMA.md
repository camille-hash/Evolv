# Sprint 69 - Fundacao do CRM compartilhado no Supabase

## Objetivo

Preparar o Supabase/Postgres para receber futuramente os dados reais do CRM do EVOLV, hoje persistidos no navegador da Camille em `localStorage`.

Esta sprint cria apenas a fundacao de schema. O app continua operando 100% com `localStorage`.

## Contexto

O EVOLV possui leads reais importados do PipeRun. A Camille ve os 763 leads porque a importacao foi executada no navegador dela. O Bruno ve o CRM vazio porque os dados ainda nao estao em um banco compartilhado.

A Sprint 68 criou uma rotina oficial para exportar backup JSON das chaves locais, incluindo:

- `evolv.crm.v1`;
- `evolv.crm.notes.v1`;
- `evolv.crm.activities.v1`;
- `evolv.crm.stage-changes.v1`;
- `evolv.crm.goal.v1`;
- `evolv.crm.pipelines.v1`.

## Migration criada

Arquivo:

```text
supabase/migrations/20260610_crm_shared_schema.sql
```

A migration e idempotente e utiliza:

- `create table if not exists`;
- `create index if not exists`;
- `pgcrypto` para `gen_random_uuid()`.

Ela nao conecta o app ao Supabase, nao importa dados e nao altera o `localStorage`.

## Tabelas

### `crm_leads`

Tabela principal das oportunidades comerciais.

Proposito:

- armazenar os leads/oportunidades hoje salvos em `evolv.crm.v1`;
- preservar o `external_id` vindo do PipeRun;
- permitir filtro por telefone, e-mail, consultor, pipeline, etapa e status.

Campos principais:

- `id`;
- `external_id`;
- `nome`;
- `telefone`;
- `email`;
- `pais`;
- `origem`;
- `consultor`;
- `valor_pretendido`;
- `observacoes`;
- `pipeline`;
- `etapa`;
- `tags`;
- `produto_interesse`;
- `temperatura`;
- `status`;
- `proxima_acao`;
- `data_proxima_acao`;
- `closed_at`;
- `titulo_oportunidade`;
- `created_at`;
- `updated_at`.

### `crm_notes`

Notas vinculadas aos leads.

Relacao:

- `crm_notes.lead_id` referencia `crm_leads.id`;
- exclusao futura de um lead remove suas notas por `on delete cascade`.

Fonte futura:

- `evolv.crm.notes.v1`.

### `crm_activities`

Atividades vinculadas aos leads.

Relacao:

- `crm_activities.lead_id` referencia `crm_leads.id`;
- exclusao futura de um lead remove suas atividades por `on delete cascade`.

Fonte futura:

- `evolv.crm.activities.v1`.

### `crm_stage_changes`

Historico de mudanca de etapas do CRM.

Relacao:

- `crm_stage_changes.lead_id` referencia `crm_leads.id`;
- exclusao futura de um lead remove seu historico por `on delete cascade`.

Fonte futura:

- `evolv.crm.stage-changes.v1`.

### `crm_goals`

Metas comerciais do CRM.

Fonte futura:

- `evolv.crm.goal.v1`.

### `crm_import_batches`

Registro de lotes de importacao futura.

Proposito:

- documentar arquivo importado;
- registrar quantidade importada;
- servir como trilha minima de auditoria para a migracao PipeRun.

## Indices

Foram criados indices para consultas comuns:

- `external_id`;
- `telefone`;
- `email`;
- `consultor`;
- `pipeline`;
- `etapa`;
- `status`;
- `lead_id` em tabelas filhas.

## Estrategia futura de importacao dos 763 leads

Fase recomendada:

1. Abrir o EVOLV no navegador da Camille.
2. Gerar o backup local pela area administrativa.
3. Guardar o arquivo `evolv-local-backup-YYYY-MM-DD-HH-mm.json`.
4. Validar que `evolv.crm.v1` possui 763 registros.
5. Criar um script de importacao offline ou rota administrativa protegida.
6. Importar primeiro em ambiente de teste.
7. Validar contagem total.
8. Validar amostra com Bruno:
   - nome;
   - telefone;
   - e-mail;
   - consultor;
   - pipeline;
   - etapa;
   - status;
   - valor pretendido.
9. Registrar a importacao em `crm_import_batches`.
10. So depois conectar o app ao Supabase por camada repository ou feature flag.

## Rollback possivel

Como o app ainda nao foi conectado ao Supabase, o rollback desta sprint e simples:

- nao aplicar a migration; ou
- se aplicada em ambiente remoto, remover as tabelas CRM criadas antes de qualquer conexao do app; ou
- manter as tabelas vazias ate a proxima fase.

Para uma importacao futura, o rollback recomendado sera:

1. manter o arquivo JSON original exportado da Camille;
2. registrar o lote em `crm_import_batches`;
3. importar em transacao;
4. validar contagem;
5. se necessario, excluir o lote importado antes de conectar o app.

## Fora do escopo

Esta sprint nao realiza:

- importacao dos 763 leads;
- conexao do app ao Supabase;
- alteracao de `localStorage`;
- alteracao do CRM funcional;
- alteracao de autenticacao;
- alteracao de Simulacao Comercial;
- alteracao de Multi-Cotas;
- alteracao de PipeRun;
- alteracao de calculos financeiros.

## Confirmacoes

- Nenhum lead foi alterado.
- Nenhum dado foi importado.
- Nenhum dado local foi apagado.
- O EVOLV continua operando 100% em `localStorage`.
