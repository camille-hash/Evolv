# Sprint 99B.1 - Notas Estruturadas Persistentes (Desenho)

## Resumo Executivo

Esta sprint desenha a persistencia definitiva de notas estruturadas do Dossie Executivo do Lead, sem executar SQL, sem criar migration real e sem alterar producao.

A recomendacao e criar uma nova tabela `public.crm_lead_notes`, isolada por `organization_id`, vinculada a `crm_leads`, com autoria por `profiles`, edicao permitida para usuarios ativos da organizacao e exclusao por soft delete restrita a administradores.

## Estrutura Proposta Para `crm_lead_notes`

Tabela proposta:

```sql
public.crm_lead_notes
```

Responsabilidade:

- armazenar notas estruturadas de leads;
- separar contexto estrategico, movimentacoes e historico;
- permitir notas internas nunca visiveis ao cliente;
- alimentar a timeline geral do lead em sprint futura;
- preservar auditoria minima de autoria, criacao, edicao e exclusao logica.

## Campos Necessarios

Campos principais:

- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references public.organizations(id) on delete cascade`
- `lead_id uuid not null references public.crm_leads(id) on delete cascade`
- `author_profile_id uuid null references public.profiles(id) on delete set null`
- `updated_by_profile_id uuid null references public.profiles(id) on delete set null`
- `deleted_by_profile_id uuid null references public.profiles(id) on delete set null`
- `content text not null`
- `note_type text not null default 'history'`
- `is_internal boolean not null default true`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

Tipos de nota recomendados:

- `strategic_context`
- `latest_movement`
- `history`
- `initial_context`

## Indices Necessarios

Indices recomendados:

- `crm_lead_notes_organization_id_idx`
- `crm_lead_notes_lead_id_idx`
- `crm_lead_notes_author_profile_id_idx`
- `crm_lead_notes_note_type_idx`
- `crm_lead_notes_created_at_idx`
- `crm_lead_notes_active_lead_created_at_idx`, parcial para `deleted_at is null`

Objetivo:

- carregar rapidamente notas ativas de um lead;
- ordenar historico por data;
- filtrar notas por organizacao antes de qualquer leitura operacional;
- preparar timeline futura sem varredura ampla.

## Relacionamentos Necessarios

Relacionamentos:

- `crm_lead_notes.organization_id` -> `organizations.id`
- `crm_lead_notes.lead_id` -> `crm_leads.id`
- `crm_lead_notes.author_profile_id` -> `profiles.id`
- `crm_lead_notes.updated_by_profile_id` -> `profiles.id`
- `crm_lead_notes.deleted_by_profile_id` -> `profiles.id`

Regra importante:

`organization_id` da nota deve ser igual ao `organization_id` do lead. A versao SQL proposta inclui uma trigger `crm_lead_notes_set_organization_from_lead` para preencher e validar esse campo antes de insert/update.

## Estrategia Para `organization_id`

Recomendacao:

- `organization_id` deve existir diretamente em `crm_lead_notes`;
- o valor deve ser derivado de `crm_leads.organization_id`;
- a aplicacao nao deve confiar em `organization_id` enviado pelo browser;
- uma trigger deve garantir que a nota herde a organizacao do lead.

Por que:

- facilita RLS;
- reduz risco de nota vinculada a organizacao errada;
- permite queries eficientes por tenant;
- preserva compatibilidade com o padrao oficial EVOLV.

## Estrategia Para Autoria

Autoria recomendada:

- `author_profile_id`: quem criou;
- `updated_by_profile_id`: ultimo usuario que editou;
- `deleted_by_profile_id`: admin que apagou logicamente.

No frontend futuro:

- quando Supabase Auth estiver ativo, usar profile autenticado;
- enquanto houver fallback local, a implementacao deve ser desenhada em sprint separada para nao inventar autoria falsa.

## Estrategia Para Soft Delete

Exclusao recomendada:

- nunca apagar linha fisicamente no fluxo operacional;
- preencher `deleted_at`;
- preencher `deleted_by_profile_id`;
- ocultar notas apagadas nas telas e timeline;
- manter leitura administrativa futura para auditoria.

Regra aprovada:

- todos podem editar notas;
- apenas `admin` pode apagar notas.

Essa regra deve ser aplicada no frontend e, quando RLS estiver final, tambem em policy de update restrita para soft delete.

## Estrategia Para Nota Inicial Automatica

Opcoes:

- A) gerar somente em leads novos;
- B) gerar apenas via backfill;
- C) gerar nos dois cenarios.

Recomendacao: **C) gerar nos dois cenarios**.

Motivo:

- leads novos passam a nascer com memoria comercial desde o primeiro cadastro;
- os 763 leads existentes nao ficam sem contexto historico;
- o backfill pode ser idempotente e limitado a leads com `observacoes` preenchidas;
- a nota inicial pode usar `note_type = 'initial_context'`.

## Estrategia Para Observacoes Atuais

Recomendacao: **migrar parcialmente**.

Como:

- migrar apenas leads com `observacoes` preenchidas;
- criar uma nota `initial_context`;
- marcar `is_internal = true`;
- preservar `crm_leads.observacoes` por compatibilidade;
- nao limpar nem alterar o campo original nesta etapa.

Por que nao migrar tudo:

- leads sem observacoes nao geram valor historico;
- observacoes podem conter textos longos ou mistos que precisam continuar disponiveis no campo atual;
- remover `observacoes` quebraria compatibilidade com o dossie atual e com fluxos existentes.

## Estrategia De Timeline Geral

As notas devem entrar na timeline do lead em sprint futura.

Estrutura sugerida:

- `note_type = 'initial_context'`: evento inicial de contexto;
- `note_type = 'strategic_context'`: leitura estrategica;
- `note_type = 'latest_movement'`: movimentacao manual ou operacional;
- `note_type = 'history'`: anotacao livre/historica.

Nesta sprint, a timeline nao deve ser alterada.

## Estrategia De Rollback

Rollback proposto:

1. Validar se a tabela existe.
2. Dropar triggers especificas de `crm_lead_notes`.
3. Dropar funcoes especificas de `crm_lead_notes`.
4. Dropar a tabela `public.crm_lead_notes`.
5. Nao tocar em `crm_leads`.
6. Nao tocar em `profiles`.
7. Nao tocar em `organizations`.
8. Nao alterar RLS/policies/grants de tabelas existentes.

Observacao:

Se a tabela ja tiver sido usada em producao, o rollback deve ser precedido por exportacao/backup das notas.

## Estrategia De Validacao

Validar antes:

- existencia de `organizations`;
- existencia de `profiles`;
- existencia de `crm_leads`;
- existencia de `crm_leads.organization_id`;
- total de leads;
- leads sem `organization_id`;
- leads com `observacoes` preenchidas.

Validar depois:

- tabela `crm_lead_notes` existe;
- constraints existem;
- indices existem;
- trigger existe;
- quantidade de notas criadas por backfill;
- nenhuma linha de `crm_leads` foi alterada;
- notas ativas excluem `deleted_at is not null`;
- notas herdam `organization_id` do lead.

## Impacto Esperado No Frontend

Impacto futuro:

- substituir os mocks temporarios de `buildTemporaryStructuredNotesFromLead` por repository de notas;
- permitir criar/editar notas no dossie;
- permitir soft delete apenas para admin;
- renderizar notas na timeline;
- preservar `observacoes` como campo de compatibilidade ate decisao posterior.

Sem impacto nesta sprint:

- nenhum componente funcional foi alterado;
- nenhum fluxo operacional foi conectado a banco;
- nenhum dado real foi lido ou escrito por nova rotina.

## Impacto Esperado No Backend

Impacto futuro:

- nova tabela `crm_lead_notes`;
- triggers para `updated_at` e consistencia de `organization_id`;
- backfill idempotente de observacoes atuais;
- RLS/policies em sprint separada ou no pacote revisado antes da execucao.

## Ordem Segura De Execucao

1. Executar `diagnostics.sql`.
2. Revisar contagens e colunas.
3. Executar `create_table.sql`.
4. Executar `indexes.sql`.
5. Executar `validation.sql`.
6. Se validado, executar `backfill.sql`.
7. Executar novamente `validation.sql`.
8. Somente depois planejar conexao do frontend.
9. Somente depois planejar RLS/policies finais se ainda nao estiverem no pacote aprovado.

## Criterios De Abortar

Abortar se:

- `crm_leads` nao existir;
- `organizations` nao existir;
- `profiles` nao existir;
- houver leads sem `organization_id`;
- `crm_leads.id` nao for uuid;
- houver divergencia relevante entre producao e SQL proposto;
- a contagem de leads mudar durante a validacao.

## Arquivos SQL Propostos

- `supabase/sql/20260615_sprint99b_1_diagnostics.sql`
- `supabase/sql/20260615_sprint99b_1_create_table.sql`
- `supabase/sql/20260615_sprint99b_1_indexes.sql`
- `supabase/sql/20260615_sprint99b_1_backfill.sql`
- `supabase/sql/20260615_sprint99b_1_validation.sql`
- `supabase/sql/20260615_sprint99b_1_rollback.sql`

## Confirmacoes

- Nenhum SQL foi executado.
- Nenhuma migration foi criada.
- Nenhum dado foi alterado.
- Nenhuma policy foi alterada.
- Nenhum grant foi alterado.
- Nenhum RLS foi alterado.
- Nenhum deploy foi realizado.
- Nenhuma alteracao funcional foi implementada.
