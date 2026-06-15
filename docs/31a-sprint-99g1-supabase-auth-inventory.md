# Sprint 99G.1 - Supabase Auth Inventory

## 1. Resumo executivo

Este inventario foi criado para mapear o estado atual esperado do Supabase Auth do EVOLV antes de tentar novamente o teste local com `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`.

A necessidade surgiu porque o modal `Adicionar Nota` ja utiliza uma API server-side protegida por Supabase Auth. O login local permite abrir o dossie e o modal, mas nao gera JWT Supabase. Por isso, ao salvar nota, o frontend nao consegue obter `access_token` via `supabase.auth.getSession()` e a operacao falha com `Sessao indisponivel.`.

Nenhuma alteracao funcional foi realizada nesta sprint. O objetivo foi inventariar o que esta confirmado por codigo/documentacao e separar o que ainda exige consulta real ao Supabase.

Conclusao executiva: o projeto esta **pronto com pendencias**. O codigo e os artefatos documentais indicam a arquitetura esperada, mas a existencia real e a consistencia de Camille/Bruno em `auth.users` e `profiles` nao foram confirmadas nesta sprint.

## 2. Usuarios esperados

### Usuarios esperados no Supabase Auth

Pelo contexto do projeto, estes usuarios devem existir no Supabase Auth antes de qualquer ativacao:

- Camille
- Bruno

Cada um deve possuir:

- usuario em `auth.users`;
- profile correspondente em `public.profiles`;
- `profiles.id = auth.users.id`;
- `organization_id` preenchido;
- `role` valida;
- `is_active = true`.

### Usuarios locais atuais

Usuarios locais definidos pelo modelo atual do EVOLV:

- `admin` - Camille - `admin`
- `bruno` - Bruno - `admin`
- `sdr1` - SDR 1 - `sdr`
- `sdr2` - SDR 2 - `sdr`
- `sdr3` - SDR 3 - `sdr`
- `sdr4` - SDR 4 - `sdr`
- `sdr5` - SDR 5 - `sdr`

Esses usuarios pertencem ao login local e nao representam, por si so, usuarios Supabase Auth.

## 3. Estado do login local

Arquivos relevantes:

- `modules/access/access-engine.ts`
- `modules/access/access-storage.ts`
- `components/access/login-page.tsx`
- `app/page.tsx`

Usuarios locais sao definidos em `defaultAccessUsers`, dentro de `modules/access/access-engine.ts`.

A persistencia local usa:

```text
localStorage["evolv.users.v1"]
sessionStorage["evolv.current-user.v1"]
localStorage["evolv.login-attempts.v1"]
```

A sessao local salva apenas o `user.id` local em `sessionStorage["evolv.current-user.v1"]`.

Limitacoes do login local:

- nao cria sessao Supabase;
- nao cria `access_token`;
- nao cria `refresh_token`;
- nao valida `auth.users`;
- nao valida `profiles`;
- nao valida `organization_id` no Supabase;
- nao atende APIs server-side que exigem Bearer token Supabase.

Por isso, o login local continua suficiente para navegar no app enquanto a flag Supabase Auth esta desligada, mas nao e suficiente para salvar notas pela API protegida.

## 4. Estado esperado do Supabase Auth

Arquivos relevantes:

- `modules/access/supabase-auth.ts`
- `components/access/login-page.tsx`
- `app/page.tsx`
- `.env.example`

O fluxo Supabase Auth e ativado por:

```text
NEXT_PUBLIC_USE_SUPABASE_AUTH=true
```

O fluxo esperado e:

```text
LoginPage
-> signInWithSupabaseAuth(email, password)
-> supabase.auth.signInWithPassword()
-> loadValidatedProfile()
-> public.profiles
-> valida profile ativo
-> valida organization_id
-> valida role admin/sdr
-> app recebe User mapeado
```

Cada usuario deve possuir:

- `auth.user` valido;
- profile correspondente;
- `profile.id = auth.user.id`;
- `organization_id` valido;
- `role` em `admin` ou `sdr`;
- `is_active = true`.

## 5. Inventario realizado

### 5.1 Informacoes confirmadas por codigo/documentacao

- Existe feature flag `NEXT_PUBLIC_USE_SUPABASE_AUTH` em `.env.example`.
- `isSupabaseAuthEnabled()` retorna `true` somente quando a flag e exatamente `true`.
- O login Supabase usa `supabase.auth.signInWithPassword()`.
- O carregamento de usuario Supabase usa `supabase.auth.getSession()`.
- O profile e buscado em `public.profiles` com colunas `id`, `organization_id`, `name`, `email`, `role`, `is_active`.
- O profile e considerado valido apenas se:
  - possui `id`;
  - possui `organization_id`;
  - `role` e `admin` ou `sdr`;
  - `is_active = true`.
- `profiles.id` e o padrao esperado para corresponder a `auth.users.id`.
- Scripts SQL documentais/operacionais existentes esperam organizacao `patrion-evolv`.
- Scripts de validacao existem para conferir `auth.users`, `profiles`, vinculos e `organization_id`.
- A API de notas exige Bearer token Supabase.
- A API de notas valida sessao, profile e organizacao antes de listar/criar nota.
- O login local e paralelo ao Supabase Auth e nao gera JWT.

### 5.2 Informacoes nao confirmadas

Nao foi confirmado nesta sprint:

- se Camille existe hoje em `auth.users`;
- se Bruno existe hoje em `auth.users`;
- se Camille possui profile real;
- se Bruno possui profile real;
- se os IDs dos profiles correspondem aos IDs reais de `auth.users`;
- se `organization_id` real esta preenchido corretamente;
- se Camille e Bruno estao `is_active = true`;
- se as senhas/recovery estao operacionais;
- se o login Supabase funciona hoje em ambiente local;
- se a criacao de notas funciona apos login Supabase real.

### 5.3 Informacoes que exigem consulta ao Supabase

Exigem consulta real ao Supabase, preferencialmente por painel ou SELECTs somente leitura:

- lista de usuarios em `auth.users`;
- e-mails reais de Camille e Bruno;
- status dos usuarios Auth;
- existencia de profiles;
- consistencia `profiles.id = auth.users.id`;
- `organization_id` dos profiles;
- role dos profiles;
- `is_active` dos profiles;
- organizacao vinculada aos profiles;
- contagem de leads por `organization_id`;
- teste real de login e emissao de `access_token`.

## 6. Checklist de Camille

- [ ] Consigo acessar o painel Supabase.
- [ ] Localizei o usuario Camille.
- [ ] Localizei o usuario Bruno.
- [ ] Ambos estao ativos.
- [ ] Ambos possuem e-mail valido.
- [ ] Ambos possuem profile.
- [ ] Ambos possuem `organization_id`.
- [ ] Ambos possuem role adequada.
- [ ] Consigo redefinir senha se necessario.

## 7. Checklist tecnico

- [ ] `auth.users` contem Camille.
- [ ] `auth.users` contem Bruno.
- [ ] `profiles` contem Camille.
- [ ] `profiles` contem Bruno.
- [ ] Relacao `auth.users` -> `profiles` esta consistente.
- [ ] `profiles.id = auth.users.id`.
- [ ] `organization_id` esta preenchido.
- [ ] Ownership esta compativel com os leads.
- [ ] APIs dependentes estao prontas para Supabase Auth.
- [ ] Login Supabase gera `access_token` no navegador.
- [ ] Modal de nota consegue enviar `Authorization: Bearer`.

## 8. Classificacao do estado atual

### PRONTO

Criterio:

- Camille e Bruno confirmados em `auth.users`;
- profiles confirmados;
- `organization_id` confirmado;
- roles confirmadas;
- `is_active = true` confirmado;
- login Supabase testado;
- criacao de nota testada.

### PRONTO COM PENDENCIAS

Criterio:

- codigo e arquitetura estao preparados;
- artefatos de validacao existem;
- nao ha contradicao encontrada no codigo;
- mas faltam validacoes reais de usuarios, profiles, senha e login.

### NAO PRONTO

Criterio:

- usuarios ausentes;
- profiles ausentes;
- `organization_id` ausente;
- roles invalidas;
- usuarios inativos;
- login Supabase falhando;
- notas falhando mesmo com usuario Supabase autenticado.

Classificacao desta sprint: **PRONTO COM PENDENCIAS**.

Motivo: o inventario por codigo/documentacao encontrou a estrutura necessaria, mas nao houve consulta real ao Supabase nem confirmacao de usuarios/profiles/credenciais.

## 9. Proximas sprints possiveis

Se `PRONTO`:

- Sprint 99H - Supabase Auth Local Flag Test

Se `PRONTO COM PENDENCIAS`:

- Sprint 99G.2 - Supabase Auth Validation

Se `NAO PRONTO`:

- Sprint 99G.3 - Supabase Auth Recovery & Backfill Plan

Recomendacao atual: **Sprint 99G.2 - Supabase Auth Validation**.

## 10. Transparencia

- Houve consulta real ao Supabase? **Nao**.
- Houve acesso ao painel Supabase? **Nao**.
- Houve acesso a usuarios reais? **Nao**.
- Houve confirmacao de credenciais? **Nao**.
- Houve execucao de SQL? **Nao**.
- Houve alteracao de dados? **Nao**.
- Houve alteracao de codigo produtivo? **Nao**.

Este inventario e baseado exclusivamente em codigo, documentacao e scripts locais existentes no repositorio oficial.

## 11. Checklist final

- [x] Apenas documentacao criada.
- [x] Nenhum codigo alterado.
- [x] Nenhuma migration criada.
- [x] Nenhum SQL executado.
- [x] Nenhuma variavel alterada.
- [x] Nenhum deploy realizado.
- [x] Nenhuma integracao alterada.
- [x] Diretorio proibido `C:\Users\camil\Documents\Codex` nao utilizado.

## 12. Arquivos e evidencias principais

Arquivos de login local:

- `modules/access/access-engine.ts`
- `modules/access/access-storage.ts`
- `components/access/login-page.tsx`

Arquivos de Supabase Auth:

- `modules/access/supabase-auth.ts`
- `app/page.tsx`
- `.env.example`

Arquivos de notas server-side:

- `components/crm/crm-lead-detail.tsx`
- `app/api/crm/lead-notes/route.ts`
- `modules/crm/server/crm-lead-notes-service.ts`

Arquivos SQL/documentais relevantes:

- `supabase/sql/20260613_bootstrap_backfill_plan.sql`
- `supabase/sql/20260614_sprint94_safe_profiles_foundation.sql`
- `supabase/sql/20260614_sprint95_validation_queries.sql`
- `supabase/sql/20260614_sprint97_1_5_authenticated_bridge_diagnostics.sql`
- `supabase/sql/20260614_sprint97_crm_auth_shadow_diagnostics.sql`
- `docs/11-sprint-95-bootstrap-identity.md`
- `docs/24-sprint-99c-2b-notes-access-strategy.md`
- `docs/30-sprint-99f-supabase-auth-readiness-check.md`
- `docs/31-sprint-99h-supabase-auth-local-flag-test.md`

## 13. Conclusao

O EVOLV possui a base tecnica local para Supabase Auth por feature flag e para notas server-side protegidas por token. O bloqueio atual nao esta na existencia do codigo, mas na falta de confirmacao operacional dos usuarios reais, profiles, organization_id e credenciais.

A proxima etapa segura e validar o estado real no Supabase com consultas/painel somente leitura antes de tentar novamente o teste local com a flag ligada.
