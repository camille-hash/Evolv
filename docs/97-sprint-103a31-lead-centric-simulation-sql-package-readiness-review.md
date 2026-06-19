# Sprint 103A.31 - Lead-Centric Simulation SQL Package Readiness Review

## Objetivo

Auditar o pacote SQL criado na Sprint 103A.30 antes de qualquer execucao manual controlada.

Esta sprint nao executou SQL, nao alterou banco, nao alterou Auth, nao alterou RLS, nao alterou policies existentes e nao modificou codigo da aplicacao.

## Arquivos revisados

- `supabase/sql/20260619_sprint103a30_lead_simulations_apply.sql`
- `supabase/sql/20260619_sprint103a30_lead_simulations_validation.sql`
- `supabase/sql/20260619_sprint103a30_lead_simulations_rollback.sql`
- `docs/96-sprint-103a30-lead-centric-simulation-sql-package-creation.md`
- Referencias de contexto:
  - `docs/95-sprint-103a29-lead-centric-simulation-sql-package-design.md`
  - `supabase/sql/20260618_sprint103a4_crm_tasks_schema_apply.sql`
  - `supabase/sql/20260618_sprint103a4_crm_tasks_schema_validation.sql`
  - `supabase/sql/20260618_sprint103a4_crm_tasks_schema_rollback.sql`
  - `supabase/sql/20260617_sprint101b11_context_functions_apply.sql`

## Resumo executivo

O pacote esta bem estruturado, segue o padrao recente de `crm_tasks`, cria uma tabela isolada, nao toca em tabelas existentes e usa RLS organization-scoped para usuarios autenticados.

Mesmo assim, o pacote nao deve ser aplicado sem uma revisao pontual antes da janela manual. O principal ponto e que as policies de `insert` e `update` validam `organization_id`, mas nao validam explicitamente que `lead_id` pertence a mesma organizacao. Como a tabela sera lead-centric, essa consistencia deve ser garantida no banco, nao apenas no futuro service.

Parecer final:

```text
APROVADO COM RESSALVAS
```

Recomendacao operacional:

```text
Nao executar apply ainda sem ajustar a validacao organization-scoped do lead_id nas policies de insert/update.
```

## 1. Tabela

### Resultado da revisao

- Nome correto: `public.crm_lead_simulations`.
- Schema correto: `public`.
- Escopo correto: tabela nova e isolada.
- Nao altera `crm_leads`, `crm_tasks`, `crm_lead_notes`, `profiles` ou `organizations`.
- Usa `id uuid primary key default gen_random_uuid()`.
- Usa timestamps `created_at` e `updated_at` com `now()`.
- Usa snapshots JSONB obrigatorios.
- Usa summary fields relacionais.

### Observacoes

O pacote usa `create table if not exists`. Isso ajuda em reexecucao acidental leve, mas pode mascarar uma tabela parcial ou divergente se ela ja existir por tentativa anterior incompleta. A validation cobre existencia de colunas/constraints/indices, mas a operadora deve tratar qualquer resultado parcial como abortar janela e nao continuar manualmente "corrigindo no olho".

## 2. Constraints

### `simulation_type`

Valores atuais:

```text
commercial
multi_cotas
```

Status: adequado para V1.

Risco: baixo. Novos tipos futuros exigirao alteracao controlada da check constraint.

### `status`

Valores atuais:

```text
draft
presented
proposal_generated
pdf_generated
pdf_sent
archived
```

Status: adequado para V1.

Observacao: alguns eventos tambem existem como timestamps independentes. Isso e aceitavel desde que o futuro service mantenha coerencia entre status e timestamps.

### `source`

Valores atuais no apply:

```text
manual
lead_detail
simulator
multi_cotas
```

Ressalva: o design da Sprint 103A.29 recomendava:

```text
lead_dossier
commercial_simulator
multi_cotas
proposal_flow
```

Isso nao e bloqueador tecnico, mas e uma divergencia de nomenclatura. Antes do apply, recomenda-se decidir uma nomenclatura oficial. A opcao atual e mais curta, mas menos expressiva que `commercial_simulator` e `lead_dossier`.

### Monetarios e percentuais

O pacote bloqueia valores negativos para:

- creditos;
- parcelas;
- ganho estimado;
- valor estimado de venda;
- INCC;
- ROI.

Status: adequado para V1 comercial.

Ressalva: se futuramente o EVOLV quiser representar perda, ROI negativo ou ganho negativo, a constraint precisara evoluir. Para o momento atual, a regra conservadora e coerente.

### `archived_at/by`

O pacote exige `archived_at` e `archived_by` quando `status = 'archived'`.

Status: adequado.

Risco: baixo. Preserva auditoria minima de arquivamento.

### `contemplation_month` e `quota_count`

O pacote valida:

- `contemplation_month >= 1` quando preenchido;
- `quota_count >= 1` quando preenchido.

Status: adequado.

Ressalva: para `multi_cotas`, `quota_count` poderia ser obrigatorio futuramente, mas nao precisa ser obrigatorio no schema V1 se o snapshot guarda detalhes completos das cartas.

## 3. Foreign Keys

### FKs atuais

- `organization_id -> public.organizations(id) on delete restrict`
- `lead_id -> public.crm_leads(id) on delete restrict`
- campos de autoria -> `public.profiles(id) on delete set null`

### Avaliacao

`on delete restrict` para `organization_id` e `lead_id` e correto. Simulacoes sao historico comercial e nao devem desaparecer por cascade.

`on delete set null` para autoria segue o padrao operacional usado em `crm_tasks`: preserva o registro mesmo se o profile operacional deixar de existir.

### Risco identificado

A FK de `lead_id` garante que o lead existe, mas nao garante sozinha que o lead pertence a mesma `organization_id` gravada na simulacao. Essa consistencia depende de:

- service server-side futuro; e/ou
- policy RLS com `exists` contra `crm_leads`; e/ou
- constraint/trigger futura.

Como a tabela e explicitamente lead-centric e multi-organizacao, a validacao por policy deve ser reforcada antes do apply.

## 4. JSONB

### Campos revisados

- `technical_input`
- `calculation_snapshot`
- `presentation_snapshot`
- `summary`

### Resultado da revisao

O pacote exige que os quatro campos sejam objetos JSONB e exige que os tres snapshots principais nao sejam `{}`.

Status: adequado se a V1 persistir somente simulacoes calculadas.

Ressalva: pode ser rigido para um futuro fluxo de rascunho parcial. Se o EVOLV quiser salvar `draft` antes de rodar engine, a constraint de snapshots nao vazios devera ser revisada ou o status `draft` devera significar "calculado mas ainda nao apresentado".

## 5. Summary Fields

### Campos atuais

- `total_credit`
- `updated_credit`
- `commercial_credit`
- `monthly_payment`
- `post_contemplation_payment`
- `contemplation_month`
- `quota_count`
- `incc_rate`
- `estimated_roi`
- `estimated_gain`
- `estimated_sale_value`

### Avaliacao

Sao suficientes para:

- filtros basicos por tipo/status/data;
- dashboards de volume simulado;
- metricas por credito;
- metricas por credito comercial;
- analise de INCC;
- comparacao de Multi-Cotas por quantidade de cartas;
- timeline futura com resumo legivel.

### Campos eventualmente faltantes

Nao sao bloqueadores para V1, mas podem ser considerados futuramente:

- `embedded_bid_amount`;
- `embedded_bid_percentage`;
- `cash_bid_amount`;
- `strategy_label`;
- `proposal_count`;
- `pdf_count`;
- `presented_to_client` booleano derivado de timestamp.

Como os snapshots preservam o detalhe completo, esses campos nao precisam entrar agora.

## 6. Indices

### Indices atuais

- simples: `organization_id`, `lead_id`, `created_by`, `created_at`, `simulation_type`, `status`;
- compostos: `organization_id + lead_id + created_at`, `organization_id + simulation_type + created_at`, `organization_id + status + created_at`;
- parciais: `presented_at`, `pdf_sent_at`.

### Avaliacao

Cobrem bem:

- listagem por lead;
- historico do dossie;
- dashboard por organizacao;
- dashboard por tipo;
- dashboard por status;
- metricas de apresentacao/PDF.

### Observacoes

Ha alguma redundancia aceitavel entre indices simples e compostos. Para uma tabela nova, isso nao e bloqueador. Se o volume crescer muito, a Sprint de performance pode remover indices simples que forem absorvidos por compostos.

## 7. RLS

### Estado atual do apply

- `alter table ... enable row level security`
- `revoke all ... from anon`
- `revoke all ... from public`
- `grant select, insert, update ... to authenticated`
- sem grant delete;
- sem policy delete;
- sem policy anon;
- policies authenticated para select/insert/update.

### Pontos corretos

- Modelo authenticated-only.
- Sem anon.
- Sem hard delete.
- Policies baseadas em `public.evolv_current_organization_id()`.
- Compatibilidade conceitual com `crm_tasks`.

### Bloqueio/Ressalva principal

As policies atuais validam:

```text
organization_id = public.evolv_current_organization_id()
```

Isso e necessario, mas nao suficiente para integridade lead-centric em `insert` e `update`.

Recomendacao antes do apply:

```sql
exists (
  select 1
  from public.crm_leads lead
  where lead.id = crm_lead_simulations.lead_id
    and lead.organization_id = public.evolv_current_organization_id()
)
```

De forma conceitual, `insert` e `update` deveriam exigir:

```text
simulation.organization_id = current organization
and
simulation.lead_id belongs to current organization
```

Isso reduz risco de vinculo cruzado entre organizacoes caso algum client autenticado tente escrever diretamente via Data API no futuro.

### Impacto se nao ajustar

Risco medio:

- nao concede leitura de leads de outra organizacao diretamente;
- mas pode permitir registro inconsistente com `organization_id` de uma organizacao e `lead_id` de outra;
- isso prejudica auditoria, timeline futura, metricas e confianca multi-tenant.

## 8. Trigger Updated At

O pacote reutiliza `public.set_updated_at()`, padrao ja usado em `crm_tasks`.

Status: adequado.

Nao ha conflito aparente, pois o trigger se chama:

```text
crm_lead_simulations_set_updated_at
```

e pertence somente a `public.crm_lead_simulations`.

## 9. Validation SQL

### Cobertura atual

O validation cobre:

- tabela;
- colunas;
- constraints;
- FKs;
- indices;
- RLS;
- policies;
- ausencia de delete policy;
- ausencia de anon policy;
- grants;
- helper functions;
- trigger;
- row count;
- contagens referenciais.

### Pontos positivos

O arquivo e read-only. As ocorrencias de `INSERT`, `UPDATE` e `DELETE` aparecem como valores consultados em grants/policies, nao como comandos de mutacao.

### Lacunas recomendadas

Antes do apply, recomenda-se melhorar a validation para detectar:

- policy `insert` contendo validacao de pertencimento do `lead_id`;
- policy `update` contendo validacao de pertencimento do `lead_id`;
- ausencia de policy `ALL`;
- ausencia de `using (true)` ou `with check (true)`;
- grants para `service_role` apenas se for relevante ao modelo operacional;
- `relforcerowsecurity`, mesmo que `force rls` nao seja obrigatorio;
- definicao exata dos FKs com `ON DELETE RESTRICT` e `ON DELETE SET NULL`, nao apenas listar FKs.

Essas lacunas nao invalidam o arquivo como inventario, mas reduzem sua capacidade de detectar o principal risco de integridade organizacional.

## 10. Rollback

### Resultado da revisao

O rollback:

- remove somente policies de `crm_lead_simulations`;
- remove somente trigger de `crm_lead_simulations`;
- dropa somente `public.crm_lead_simulations`;
- nao toca em `crm_leads`;
- nao toca em `crm_tasks`;
- nao toca em `crm_lead_notes`;
- nao toca em `profiles`;
- nao toca em `organizations`;
- nao toca em helper functions.

### Avaliacao

Seguro quanto ao escopo, mas destrutivo para dados de simulacao. O aviso esta correto.

Recomendacao:

Executar rollback apenas:

- antes de simulacoes reais serem criadas; ou
- apos backup/export verificado; e
- com aprovacao explicita da operadora.

## Perguntas obrigatorias

### 1. O pacote esta pronto para execucao manual?

Resposta:

```text
APROVADO COM RESSALVAS
```

Tecnicamente o pacote esta completo, mas recomenda-se ajustar as policies de `insert` e `update` para validar tambem que `lead_id` pertence a mesma organizacao antes de qualquer apply.

### 2. Existe algum bloqueador?

Bloqueador critico: nao.

Bloqueador recomendado de seguranca/integridade antes da execucao: sim.

O pacote deve reforcar a validacao organization-scoped do `lead_id` nas policies de escrita.

### 3. Existe algum ajuste recomendado antes do apply?

Sim:

1. Reforcar policies de `insert` e `update` com validacao de `lead_id` pertencente a organizacao atual.
2. Decidir nomenclatura final de `source`, pois o apply diverge parcialmente do design da Sprint 103A.29.
3. Expandir validation para verificar ausencia de `using (true)` / `with check (true)` e conferir que as policies incluem a validacao de lead.
4. Validar se `draft` deve exigir snapshots nao vazios. Se sim, documentar que `draft` significa "simulacao calculada ainda nao apresentada".

### 4. Existe risco de impacto em CRM, Auth, RLS, organizations, profiles ou crm_leads?

CRM:

- Baixo no momento do apply, pois nenhuma UI/repository passa a usar a tabela automaticamente.
- Risco futuro se service gravar simulacao sem validar lead/organization.

Auth:

- Baixo. O pacote depende de usuario authenticated e do helper ja existente.

RLS:

- Medio ate reforcar `lead_id` nas policies de escrita.
- Baixo apos reforco.

Organizations:

- Baixo. FK restrict protege contra exclusao destrutiva.

Profiles:

- Baixo. Autoria usa `on delete set null`, padrao ja usado em `crm_tasks`.

crm_leads:

- Baixo para a tabela existente, pois o apply nao altera `crm_leads`.
- Medio para integridade referencial multi-tenant se `lead_id` nao for validado nas policies de escrita.

## Problemas encontrados

1. Policies de escrita nao validam explicitamente que `lead_id` pertence a mesma organizacao.
2. Valores de `source` divergem parcialmente do design anterior.
3. Validation nao verifica expressao exata das policies.
4. Validation nao verifica ausencia de `using (true)` / `with check (true)` explicitamente.
5. Constraint de snapshots nao vazios pode limitar um futuro rascunho realmente parcial.

## Riscos encontrados

| Risco | Severidade | Impacto | Mitigacao |
| --- | --- | --- | --- |
| `lead_id` cross-organization em escrita direta | Medio | Integridade multi-tenant e timeline futura | Reforcar policies de insert/update com `exists` em `crm_leads` |
| `source` inconsistente com design | Baixo | Relatorios e convencao interna | Decidir nomenclatura final antes do apply |
| Validation nao detecta policy fraca | Medio | Falso positivo de readiness | Ampliar validation |
| Snapshots nao vazios bloqueiam draft parcial | Baixo/Medio | Futuro fluxo de rascunho | Documentar semantica de draft ou revisar constraint |
| Rollback destrutivo apos dados reais | Alto | Perda de historico de simulacoes | Usar rollback apenas antes de dados reais ou apos backup |

## Bloqueadores

Nao ha bloqueador estrutural que exija redesenhar a tabela.

Ha um bloqueador recomendado antes da execucao manual:

```text
Reforcar RLS de insert/update para validar que lead_id pertence a mesma organization_id do usuario autenticado.
```

## Ajustes recomendados antes do apply

### Ajuste 1 - RLS de escrita

Atual:

```text
organization_id = public.evolv_current_organization_id()
```

Recomendado:

```text
organization_id = public.evolv_current_organization_id()
and lead_id pertence a public.crm_leads da mesma organization_id
```

### Ajuste 2 - Validation

Adicionar checagens para:

- policy insert/update contem validacao de lead;
- nenhuma policy tem `true` como permissao ampla;
- FKs possuem comportamento esperado;
- grants permanecem sem `DELETE`.

### Ajuste 3 - Source

Escolher uma das convencoes:

Opcao A, atual do apply:

```text
manual
lead_detail
simulator
multi_cotas
```

Opcao B, design 103A.29:

```text
lead_dossier
commercial_simulator
multi_cotas
proposal_flow
```

Recomendacao: usar nomes mais explicitos se forem alimentar metricas futuras.

## Parecer final

```text
APROVADO COM RESSALVAS
```

O pacote tem boa fundacao e esta alinhado ao padrao EVOLV, mas deve passar por uma sprint curta de ajuste antes da execucao manual.

## Confirmacoes

- Nenhum SQL foi executado.
- Nenhum apply foi executado.
- Nenhum validation foi executado.
- Nenhum rollback foi executado.
- Nenhum banco foi alterado.
- Nenhuma migration foi criada.
- Nenhum schema foi alterado.
- Nenhum Auth foi alterado.
- Nenhum RLS existente foi alterado.
- Nenhuma policy existente foi alterada.
- CRM, Simulador, Multi-Cotas, Timeline e PDF nao foram alterados.

## Recomendacao para Sprint 103A.32

Recomenda-se:

```text
Sprint 103A.32 - Lead-Centric Simulation SQL Package RLS Refinement
```

Objetivo sugerido:

- ajustar o pacote 103A.30 sem executar SQL;
- reforcar policies de `insert` e `update`;
- ampliar validation;
- decidir nomenclatura final de `source`;
- manter rollback limitado;
- submeter novamente para readiness antes de qualquer apply.
