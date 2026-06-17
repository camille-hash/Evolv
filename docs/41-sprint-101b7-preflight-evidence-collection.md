# Sprint 101B.7 - Preflight Evidence Collection

## Resumo executivo

Esta sprint coletou evidencias reais do ambiente atual usando consultas somente leitura com o cliente publico do Supabase configurado em `C:\Projetos\Evolv-Auth\.env.local`.

Nada foi alterado.

O que foi confirmado em runtime:

- `crm_leads` contem **763** registros;
- `crm_leads.organization_id` esta preenchido em **100%** dos registros observados;
- a distribuicao observada aponta **uma unica organizacao**:
  - `ca9fc6a1-8b37-4d13-9435-3458df9c5213`
- `crm_stage_events` e `crm_green_flags` **nao existem no schema cache atual**;
- chamadas RPC publicas para:
  - `public.evolv_current_organization_id()`
  - `public.evolv_current_role()`
  retornaram **PGRST202** no schema cache publico.

O que nao foi possivel confirmar integralmente com o nivel de acesso atual:

- inventario completo de policies via catalogo do banco;
- grants reais via `information_schema.role_table_grants`;
- definicao SQL das funcoes organizacionais;
- conteudo real de `profiles` alem da sua exposicao estrutural pelo Data API.

## Evidencias coletadas

### 1. `crm_leads`

Consulta read-only via Supabase Data API confirmou:

- `total = 763`
- `organization_id null = 0`
- distribuicao observada:
  - `ca9fc6a1-8b37-4d13-9435-3458df9c5213 = 763`

Amostra real observada:

- `pipeline = sales`
- `etapa = documentacao`
- `organization_id = ca9fc6a1-8b37-4d13-9435-3458df9c5213`

### 2. `profiles`

Consulta read-only via Supabase Data API com colunas:

- `id`
- `organization_id`
- `role`
- `is_active`

retornou:

- tabela resolvida sem erro estrutural
- `rows = []`

Interpretacao segura:

- ha evidencia de que `public.profiles` esta exposta no schema cache da Data API;
- com o contexto atual nao houve linhas visiveis;
- isso **nao comprova ausencia de dados**, apenas ausencia de linhas retornadas ao nivel de acesso usado nesta sprint.

### 3. Funcoes organizacionais

Chamadas RPC read-only retornaram:

- `public.evolv_current_organization_id()` -> `PGRST202`
- `public.evolv_current_role()` -> `PGRST202`

Interpretacao segura:

- as funcoes **nao estao disponiveis no schema cache publico da Data API**;
- isso pode significar:
  - funcao inexistente; ou
  - funcao nao exposta/nao acessivel por este caminho publico;
- com o nivel de acesso desta sprint, isso deve ser tratado como **prerequisito nao comprovado**.

### 4. Novas tabelas Dual Pipeline

Consultas read-only via Data API retornaram:

- `public.crm_stage_events` -> `PGRST205`
- `public.crm_green_flags` -> `PGRST205`

Interpretacao segura:

- as tabelas ainda **nao existem no schema cache publico atual**, o que e coerente com o historico de que nenhum SQL Dual Pipeline foi executado.

## Risco

O maior risco atual nao esta em `crm_leads`; esta na falta de prova runtime sobre:

- funcoes organizacionais criticas;
- exposicao real e comportamento de `profiles`;
- estado atual completo de RLS/policies/grants.

## Impacto

Sem essas evidencias, a execucao controlada ainda nao pode ser certificada como pronta.

## Recomendacao

Antes de qualquer janela de apply:

1. obter evidencias read-only com acesso mais privilegiado e ainda seguro;
2. confirmar explicitamente a existencia das funcoes organizacionais;
3. confirmar o estado real de `profiles`, RLS, policies e grants;
4. so depois reavaliar o Go / No-Go.
