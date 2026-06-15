# Sprint 94.1 - Ativacao Manual Segura De Auth Sem RLS

## Contexto

Projeto Supabase: `evolv-production`

Ambiente: `Production`

Project Reference: `afeahaxclgkyylyxejgj`

A tabela `crm_leads` ja existe em producao e contem 763 leads. A area de Database Migrations do Supabase esta vazia, portanto esta etapa nao deve usar Supabase CLI, `db push` ou `migration up`.

## Decisao Operacional

A migration oficial completa:

`supabase/migrations/20260613_auth_profiles_crm_official_schema.sql`

nao deve ser aplicada inteira nesta etapa.

Motivos:

- ela habilita RLS;
- ela cria policies;
- ela altera a tabela `crm_leads`;
- ela inclui uma fundacao mais ampla do que a necessaria para ativacao manual inicial do Auth;
- aplicar RLS antes de bootstrap/backfill pode deixar o CRM invisivel.

## Escopo Da Sprint 94.1

Esta sprint prepara SQL seguro e parcial para:

- fundacao minima de `organizations`;
- fundacao minima de `profiles`;
- validacao pre-flight;
- execucao manual futura no SQL Editor.

Esta sprint nao executa SQL e nao altera banco.

## Arquivos Preparados

- `supabase/sql/20260614_sprint94_safe_profiles_foundation.sql`
- `supabase/sql/20260614_sprint94_preflight_validation.sql`

## O Que O SQL De Fundacao Faz

O arquivo `20260614_sprint94_safe_profiles_foundation.sql`:

- cria `pgcrypto` se necessario;
- cria ou substitui `public.set_updated_at()`;
- cria `public.organizations` se nao existir;
- adiciona `organizations.slug` se nao existir;
- cria indices seguros em `organizations`;
- cria trigger de `updated_at` em `organizations` se ainda nao existir;
- cria `public.profiles` se nao existir;
- adiciona colunas necessarias em `profiles` se nao existirem;
- define defaults seguros em `profiles`;
- cria constraints seguras com `not valid` quando necessario;
- cria indices seguros em `profiles`;
- cria trigger de `updated_at` em `profiles` se ainda nao existir;
- adiciona comentarios explicativos.

## O Que O SQL Nao Faz

O arquivo de fundacao nao:

- insere users;
- insere profiles;
- insere organizations;
- altera `crm_leads`;
- altera notas, atividades, stage changes, goals ou import batches;
- habilita RLS;
- cria policies;
- usa `auth.uid()`;
- cria funcoes de autorizacao;
- usa `service_role`;
- altera `.env`;
- altera flags.

## Validacao Pre-Flight

O arquivo `20260614_sprint94_preflight_validation.sql` contem apenas `SELECTs` para observar:

- existencia de `organizations`, `profiles` e tabelas de CRM;
- colunas, constraints e indices de `profiles`;
- estado de RLS em `profiles` e `crm_leads`;
- policies existentes, se houver;
- total de leads em `crm_leads`;
- colunas pendentes/perigosas em `crm_leads`;
- contagem de usuarios em `auth.users`;
- contagem e distribuicao de profiles.

### Anotacao Sprint 94.2

A fundacao minima de `organizations` + `profiles` foi executada manualmente no SQL Editor do Supabase com resultado `Success. No rows returned`.

Na reexecucao do preflight, foi identificado que a coluna `crm_leads.source_system` nao existe no banco de producao atual. Por isso, foi criada a versao adaptada:

`supabase/sql/20260614_sprint94_preflight_validation_v2.sql`

Essa versao remove apenas o bloco agregado por `source_system` e preserva os demais SELECTs para refletir o estado real do ambiente.

## Fluxo Operacional Manual Recomendado

1. Executar `20260614_sprint94_preflight_validation.sql` no SQL Editor.
2. Revisar os resultados.
3. Executar `20260614_sprint94_safe_profiles_foundation.sql` somente se o pre-flight estiver coerente.
4. Criar usuarios manualmente em Supabase Auth.
5. Em etapa posterior, criar organizacao padrao e preencher profiles.
6. Em etapa posterior, executar backfill de `crm_leads.organization_id`.
7. Somente depois avaliar RLS/policies.

## RLS Adiado

RLS fica explicitamente adiado. Isso evita risco de bloquear o CRM antes de:

- usuarios Auth existirem;
- profiles estarem preenchidos;
- organizacao padrao existir;
- leads possuirem `organization_id`;
- smoke test confirmar acesso.

## Proximo Passo Operacional

O proximo passo manual e rodar apenas o SQL de validacao pre-flight no Supabase SQL Editor e compartilhar os resultados antes de qualquer execucao de schema.

Nenhuma mudanca deve ser aplicada no banco sem revisao dos resultados.
