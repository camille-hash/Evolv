# Sprint 99H.5 - Supabase CRM Auth Access Matrix + Lead Notes Fix

## Resumo executivo

Esta sprint foi conduzida como auditoria tecnica com preparacao de SQL manual, sem execucao de comandos no Supabase e sem alteracao de codigo funcional.

O fluxo local de Supabase Auth ja esta funcional para login e recovery. O CRM tambem volta a carregar os 763 leads quando:

- `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`
- `NEXT_PUBLIC_USE_SUPABASE_CRM=true`
- `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=false`

Nesse estado, o badge `CRM SOURCE: ANON` confirma que a leitura de `crm_leads` continua passando pelo repository anon atual, nao pelo shadow authenticated.

O erro 500 em `GET /api/crm/lead-notes` e `POST /api/crm/lead-notes` e mais compativel com falta de exposicao/permissao em `public.crm_lead_notes` do que com bug de aplicacao:

- `profiles` ja foi liberada para Data API + RLS self-select;
- `crm_leads` ja possui bridge anon/authenticated;
- `crm_lead_notes` foi observado anteriormente como `API Disabled`, `RLS Disabled`, sem policies;
- a API de notas usa o JWT Supabase do usuario e depende de acesso authenticated real a `profiles`, `crm_leads` e `crm_lead_notes`.

## Arquivos auditados

- `C:\Projetos\Evolv-Auth\app\api\crm\lead-notes\route.ts`
- `C:\Projetos\Evolv-Auth\modules\crm\server\crm-lead-notes-service.ts`
- `C:\Projetos\Evolv-Auth\modules\crm\repositories\crm-lead-notes-repository.ts`
- `C:\Projetos\Evolv-Auth\modules\crm\repositories\supabase-crm-repository.ts`
- `C:\Projetos\Evolv-Auth\modules\crm\repositories\authenticated-supabase-crm-repository.ts`
- `C:\Projetos\Evolv-Auth\modules\crm\repositories\index.ts`
- `C:\Projetos\Evolv-Auth\components\crm\crm-lead-detail.tsx`
- `C:\Projetos\Evolv-Auth\modules\access\supabase-auth.ts`
- `C:\Projetos\Evolv-Auth\app\page.tsx`
- `C:\Projetos\Evolv-Auth\supabase\sql\20260615_sprint99b_1_create_table.sql`
- `C:\Projetos\Evolv-Auth\supabase\sql\20260614_sprint97_1_5_authenticated_bridge.sql`
- `C:\Projetos\Evolv-Auth\supabase\sql\20260616_sprint99h3c_profiles_self_select_apply.sql`

## Fluxo Auth

### 1. Login Supabase

O app entra por `LoginPage` e, com a flag de Supabase Auth ligada, passa por `signInWithSupabaseAuth()` em `modules/access/supabase-auth.ts`.

Fluxo:

1. `supabase.auth.signInWithPassword(email, password)`
2. `loadValidatedProfile()`
3. leitura client-side de `public.profiles`
4. validacao de:
   - `id`
   - `organization_id`
   - `role in ('admin', 'sdr')`
   - `is_active = true`
5. mapeamento para `User` interno do app

### 2. OrganizationId no app

O `organizationId` entra no estado EVOLV via `mapSupabaseUserToAccessUser()`, que monta:

- `organizationId: profile.organization_id`

Esse dado fica no `currentUser` do app, mas nao e usado diretamente pela API de notas. A API reconfirma tudo pelo proprio token.

### 3. Como o token Supabase e lido no client

Em `components/crm/crm-lead-detail.tsx`, a funcao `readSupabaseAccessToken()`:

1. cria um client Supabase browser-side;
2. chama `supabase.auth.getSession()`;
3. retorna `data.session.access_token`.

### 4. Como o token chega na API de notas

Tanto no GET quanto no POST de notas, o client envia:

`Authorization: Bearer {access_token}`

O route handler le isso em `readBearerToken(request)`.

## CRM - leitura de leads

### Repository usado hoje

O fluxo principal de leads passa por:

- `modules/crm/repositories/index.ts`
- `createSupabaseCrmRepository()` quando `NEXT_PUBLIC_USE_SUPABASE_CRM=true`

### Por que o badge mostra `CRM SOURCE: ANON`

Porque o shadow authenticated esta desligado:

- `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=false`

Entao o seletor de repository vai para:

- `SupabaseCrmRepository`

Esse repository usa:

- `createClient(...)`
- `persistSession: false`
- publishable key
- leitura/escrita direta em `public.crm_leads`

Logo, o CRM continua lendo leads via caminho anon/public atual, mesmo com Auth ativo.

### Leitura de leads deve migrar agora?

Nao necessariamente nesta sprint.

Como o objetivo imediato e destravar Auth + dossie + notas com risco minimo, a recomendacao e:

- manter `crm_leads` temporariamente como esta;
- nao mexer no shadow runtime nesta sprint;
- focar apenas em `crm_lead_notes`, que e o ponto novo quebrando o fluxo.

## Lead Notes API

### Route

`app/api/crm/lead-notes/route.ts`

- `GET` -> `listLeadNotes(accessToken, leadId)`
- `POST` -> `createLeadNote(accessToken, input)`

### Service

`modules/crm/server/crm-lead-notes-service.ts`

Fluxo server-side:

1. recebe `accessToken`;
2. cria client Supabase com publishable key;
3. injeta `Authorization: Bearer {accessToken}` em `global.headers`;
4. executa `supabase.auth.getUser(accessToken)`;
5. le `public.profiles`;
6. valida `organization_id`, `role`, `is_active`;
7. le `public.crm_leads` por `lead_id`;
8. confere se `lead.organization_id === profile.organization_id`;
9. le ou insere `public.crm_lead_notes`.

### Tabelas realmente necessarias

Para o fluxo de notas funcionar, o codigo prova dependencia de:

- `profiles`
- `crm_leads`
- `crm_lead_notes`

`organizations` nao e consultada no codigo da API de notas.

## Access matrix

| Tabela | Usada por | Camada | Operacao | Role esperada | Data API necessaria | RLS necessaria | Policy necessaria | Risco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `public.profiles` | login Supabase + API de notas | client + server | `select` | `authenticated` | sim | sim | self-select por `auth.uid() = id` | alto |
| `public.crm_leads` | CRM principal + API de notas | client + server | `select`, `update` | `anon` hoje; `authenticated` em bridge | sim | ja ativa | bridge atual ja cobre leitura/update | alto |
| `public.crm_lead_notes` | dossie executivo + modal de nota + API de notas | server (via JWT do usuario) | `select`, `insert` | `authenticated` | sim | sim | select por organizacao e nota ativa; insert por organizacao/autoria/lead | critico |
| `public.organizations` | nao usada no fluxo de notas atual | n/a | nenhuma | n/a | nao provada | nao provada | nenhuma nesta sprint | baixo |

## Estado conhecido do Supabase

### `profiles`

Ja compatibilizada anteriormente:

- Data API enabled manualmente;
- RLS enabled;
- policy select authenticated self:
  - `auth.uid() = id`

### `crm_leads`

Ja possui bridge anterior segundo codigo e contexto:

- grants/policies anon existentes;
- grants/policies authenticated bridge existentes;
- sem isolamento final por organizacao nesta fase.

### `crm_lead_notes`

Diagnostico mais provavel:

- Data API ainda nao habilitada;
- RLS ainda nao habilitada;
- sem policy select;
- sem policy insert;
- possivelmente sem grants explicitos para `authenticated`.

## Diagnostico objetivo do erro 500

### Causa mais provavel

`crm_lead_notes` ainda nao esta pronta para acesso authenticated via Data API.

### Motivo

O codigo da API de notas:

- consegue validar o usuario pelo JWT;
- depende de `profiles` e `crm_leads`, que ja possuem base de acesso;
- falha quando chega em `crm_lead_notes`, que era o unico ponto explicitamente conhecido como `API Disabled` e sem RLS/policies.

### Causas menos provaveis

- `service role` ausente:
  - nao se aplica, porque a API deliberadamente usa JWT do usuario com publishable key.
- token nao propagado:
  - pouco provavel, porque o modal consegue ler sessao e enviar bearer token.
- mismatch de `organization_id` entre profile e lead:
  - possivel, mas menos provavel como causa primaria sistemica de GET e POST ambos falhando com 500.
- bug puro de app:
  - nao ha evidencia suficiente no codigo para apontar bug de implementacao antes de fechar a matriz de acesso do Supabase.

## Correcao minima segura recomendada

Foco apenas em `crm_lead_notes`.

### Necessario

1. Habilitar Data API manualmente para `public.crm_lead_notes` no painel Supabase.
2. Habilitar RLS em `public.crm_lead_notes`.
3. Conceder apenas:
   - `SELECT` para `authenticated`
   - `INSERT` para `authenticated`
4. Criar policy de leitura authenticated:
   - nota da mesma organizacao do profile
   - `deleted_at is null`
   - `is_internal = true`
5. Criar policy de insert authenticated:
   - `author_profile_id = auth.uid()`
   - organizacao da nota igual ao profile
   - lead pertencente a mesma organizacao
   - `is_internal = true`
6. Nao criar:
   - anon em notas
   - update em notas
   - delete em notas

### Colunas consideradas na proposta

Com base no schema desenhado em `20260615_sprint99b_1_create_table.sql`, a proposta usa apenas colunas comprovadas:

- `id`
- `organization_id`
- `lead_id`
- `author_profile_id`
- `content`
- `is_internal`
- `deleted_at`
- `created_at`

## Observacao importante sobre trigger de organization

O schema de `crm_lead_notes` preve um trigger `crm_lead_notes_set_organization_from_lead()` que:

- preenche `organization_id` a partir do lead, se vier nulo;
- impede mismatch com `crm_leads.organization_id`.

Mesmo assim, a policy de `INSERT` foi desenhada de forma conservadora para aceitar:

- `organization_id` explicitamente igual a do profile;
- ou `organization_id is null`, desde que o lead pertença a mesma organizacao.

Isso reduz risco de bloquear insercao caso a UI/API opte por enviar ou nao o campo.

## Arquivos gerados nesta sprint

- `C:\Projetos\Evolv-Auth\docs\31i-sprint-99h5-supabase-crm-auth-access-matrix-lead-notes-fix.md`
- `C:\Projetos\Evolv-Auth\supabase\sql\20260616_sprint99h5_access_matrix_apply.sql`
- `C:\Projetos\Evolv-Auth\supabase\sql\20260616_sprint99h5_access_matrix_validation.sql`
- `C:\Projetos\Evolv-Auth\supabase\sql\20260616_sprint99h5_access_matrix_rollback.sql`

## Passos manuais para Camille

1. No painel do Supabase, habilitar manualmente Data API para `public.crm_lead_notes`.
2. Executar manualmente:
   - `C:\Projetos\Evolv-Auth\supabase\sql\20260616_sprint99h5_access_matrix_apply.sql`
3. Executar manualmente:
   - `C:\Projetos\Evolv-Auth\supabase\sql\20260616_sprint99h5_access_matrix_validation.sql`
4. Reiniciar o ambiente local do app, se necessario.
5. Entrar com Camille via Supabase Auth.
6. Abrir CRM.
7. Abrir um lead.
8. Validar que `GET /api/crm/lead-notes` nao retorna 500.
9. Criar uma nota pelo modal.
10. Atualizar a pagina.
11. Confirmar que a nota persiste.
12. Fazer logout/login.
13. Confirmar que a nota continua visivel.

Se algo falhar, usar:

- `C:\Projetos\Evolv-Auth\supabase\sql\20260616_sprint99h5_access_matrix_rollback.sql`

## Criterio para desbloquear a 99I

A 99I so deve ser liberada se todos os itens abaixo passarem:

- Auth ok;
- Recovery ok;
- CRM ok;
- GET de notas ok;
- POST de notas ok;
- refresh ok;
- logout/login ok;
- sem policy anon em `crm_lead_notes`;
- sem `update/delete` liberados em `crm_lead_notes`.

## Transparencia

- Nenhum SQL foi executado nesta sprint.
- Nenhum codigo funcional foi alterado nesta sprint.
- Nenhum deploy foi realizado.
- Nenhuma alteracao foi feita em Vercel.
- Nenhuma alteracao foi feita em producao.

## Status da 99I

**Bloqueada**, aguardando:

1. habilitacao manual da Data API em `crm_lead_notes`;
2. aplicacao manual do SQL desta sprint;
3. validacao manual completa do fluxo de notas.
