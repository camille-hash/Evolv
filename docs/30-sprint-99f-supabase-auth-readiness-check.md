# Sprint 99F - Supabase Auth Readiness Check

## 1. Resumo executivo

A falha `Sessao indisponivel.` ocorre porque o modal `Adicionar Nota` depende de um `access_token` do Supabase Auth, mas o login local atual do EVOLV nao cria sessao Supabase.

O login local autentica o usuario contra dados salvos no navegador e grava apenas o id do usuario local em `sessionStorage`. Esse valor permite navegar pelo EVOLV, mas nao e um JWT Supabase e nao pode ser usado pela API server-side de notas.

Com isso, o modal abre normalmente para usuarios autenticados localmente, mas o salvamento da nota fica bloqueado antes do `POST`, porque `supabase.auth.getSession()` nao retorna `access_token`.

A API de notas esta correta ao exigir sessao server-side, profile e organizacao. A decisao operacional agora nao deve ser contornar a API, e sim validar se o EVOLV esta pronto para ativar `NEXT_PUBLIC_USE_SUPABASE_AUTH=true` em producao.

## 2. Diagnostico confirmado

- O modal de notas depende de `access_token`.
- O `access_token` e obtido no frontend via `supabase.auth.getSession()`.
- O login local nao gera sessao Supabase.
- A sessao local e a sessao Supabase Auth sao paralelas.
- Um usuario local consegue abrir o modal `Adicionar Nota`.
- Um usuario local nao consegue salvar nota se nao houver sessao Supabase valida no navegador.
- A API server-side de notas exige `Authorization: Bearer <access_token>`.
- A API valida a sessao com `supabase.auth.getUser(accessToken)`.
- A API resolve `profiles` e exige profile ativo com `organization_id`.
- A API valida que o lead pertence a mesma organizacao antes de listar ou criar notas.

## 3. Arquivos auditados

- `components/crm/crm-lead-detail.tsx`
- `app/api/crm/lead-notes/route.ts`
- `modules/crm/server/crm-lead-notes-service.ts`
- `modules/crm/crm-lead-notes.ts`
- `modules/crm/repositories/crm-lead-notes-repository.ts`
- `modules/access/access-storage.ts`
- `modules/access/access-engine.ts`
- `modules/access/access-types.ts`
- `modules/access/supabase-auth.ts`
- `components/access/login-page.tsx`
- `app/page.tsx`
- `.env.example`
- `lib/supabase/client.ts`

## 4. Fluxo atual com login local

O login local e usado quando:

```text
NEXT_PUBLIC_USE_SUPABASE_AUTH !== "true"
```

Fluxo atual:

```text
LoginPage
-> authenticateUser(usuario, senha)
-> loadUsers()
-> localStorage["evolv.users.v1"]
-> saveCurrentUser(user)
-> sessionStorage["evolv.current-user.v1"] = user.id
-> app/page.tsx carrega loadCurrentUser()
```

Usuarios locais padrao:

- `admin` - Camille - `admin`
- `bruno` - Bruno - `admin`
- `sdr1` - SDR 1 - `sdr`
- `sdr2` - SDR 2 - `sdr`
- `sdr3` - SDR 3 - `sdr`
- `sdr4` - SDR 4 - `sdr`
- `sdr5` - SDR 5 - `sdr`

A sessao local contem apenas o id do usuario local. Ela nao contem JWT Supabase, `access_token`, `refresh_token`, `auth.users.id` ou sessao reconhecida pelo Supabase.

Por isso, ela nao atende a API protegida de notas.

## 5. Fluxo esperado com Supabase Auth

O fluxo Supabase Auth e usado quando:

```text
NEXT_PUBLIC_USE_SUPABASE_AUTH=true
```

Fluxo esperado:

```text
LoginPage
-> signInWithSupabaseAuth(email, password)
-> supabase.auth.signInWithPassword()
-> Supabase persiste sessao com persistSession: true
-> loadValidatedProfile()
-> profiles.id = auth.users.id
-> valida organization_id
-> valida role admin/sdr
-> valida is_active = true
-> app recebe User mapeado
```

Depois do login Supabase, o modal de notas consegue:

```text
CrmLeadDetail
-> readSupabaseAccessToken()
-> supabase.auth.getSession()
-> session.access_token
-> fetch("/api/crm/lead-notes", Authorization: Bearer token)
-> API valida token
-> API valida profile
-> API valida organization_id
-> API cria/lista nota
```

## 6. Dependencias obrigatorias para ativacao

Antes de ativar `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`, validar manualmente em Supabase:

- Camille existe em Supabase Auth.
- Bruno existe em Supabase Auth.
- Camille possui profile.
- Bruno possui profile.
- `profiles.id` corresponde a `auth.users.id`.
- Profiles possuem `organization_id` preenchido.
- Profiles possuem `role` valido: `admin` ou `sdr`.
- Profiles possuem `is_active = true`.
- Camille possui role compativel com administracao.
- Bruno possui role compativel com administracao.
- `organization_id` dos profiles corresponde a organizacao dos leads existentes.
- `crm_leads.organization_id` esta preenchido para os leads usados no CRM.
- APIs server-side conseguem resolver sessao, profile e organizacao.
- Login Supabase funciona localmente antes da ativacao em producao.
- Senhas de Camille e Bruno estao definidas.
- Fluxo de recovery/troca de senha esta claro para os usuarios.

Sem consulta real ao Supabase nesta sprint, a readiness nao pode ser confirmada totalmente.

## 7. Riscos de ativar Supabase Auth

### Login bloqueado

Se Camille ou Bruno nao existirem em Supabase Auth, nao conseguirao entrar quando a flag for ativada.

### Usuario sem profile

O codigo bloqueia acesso quando nao encontra profile valido. Isso e correto, mas pode impedir login se o backfill de profiles estiver incompleto.

### Profile sem organizacao

`organization_id` vazio bloqueia acesso no fluxo Supabase Auth e tambem impede uso seguro das notas.

### Role invalida

A aplicacao aceita apenas `admin` e `sdr`. Qualquer role divergente bloqueia acesso.

### Lead invisivel por ownership/RLS

Se policies futuras restringirem por `organization_id` e algum lead estiver sem organizacao correta, o lead pode sumir do CRM ou das notas.

### Notas nao aparecem

Se a sessao Supabase existir, mas o profile ou organization_id estiver incorreto, a API de notas retorna erro generico e nao lista/cria notas.

### SDRs locais deixam de acessar

Os usuarios locais `sdr1` a `sdr5` existem no modelo local. Para Supabase Auth, eles precisam existir em Auth e `profiles`. Se nao forem migrados, nao devem ser considerados aptos para producao Supabase Auth.

### Perda de acesso admin

Se Camille e Bruno forem bloqueados simultaneamente por profile ausente/inativo, a operacao perde acesso administrativo.

### Sessao antiga em navegador

Navegadores com sessao local antiga podem continuar com `evolv.current-user.v1`, mas isso nao tem valor para Supabase Auth. A ativacao deve ser testada em navegador limpo.

### Inconsistencia entre localStorage/sessionStorage e sessao Supabase

Durante a transicao, pode haver vestigios de sessao local e sessao Supabase no mesmo navegador. O app decide o fluxo pela flag, mas a experiencia de teste deve incluir logout, refresh e navegador limpo.

## 8. Checklist tecnico antes de ativar

- Confirmar `NEXT_PUBLIC_SUPABASE_URL` em producao.
- Confirmar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` em producao.
- Confirmar `NEXT_PUBLIC_USE_SUPABASE_AUTH` ainda desligada antes do teste final.
- Confirmar usuarios Auth de Camille e Bruno.
- Confirmar profiles de Camille e Bruno.
- Confirmar `profiles.id = auth.users.id`.
- Confirmar `organization_id` dos profiles.
- Confirmar Camille `admin`.
- Confirmar Bruno `admin`.
- Confirmar `is_active = true` para ambos.
- Confirmar que os leads existentes possuem `organization_id` esperado.
- Testar Supabase Auth localmente com flag true.
- Testar login Camille.
- Testar login Bruno.
- Testar abertura do CRM.
- Testar abertura de lead.
- Testar listagem de notas.
- Testar criacao de nota.
- Testar logout/login.
- Testar refresh de pagina.
- Testar acesso em navegador limpo.
- Testar recuperacao de senha ou confirmar procedimento operacional.

## 9. Plano seguro de ativacao futura

1. Confirmar usuarios e profiles no Supabase.
2. Confirmar organizacao vinculada a Camille e Bruno.
3. Testar Supabase Auth localmente com `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`.
4. Testar abertura do CRM localmente.
5. Testar abertura de lead localmente.
6. Testar criacao de nota localmente.
7. Preparar rollback.
8. Alterar variavel na Vercel.
9. Redeploy.
10. Testar login Camille.
11. Testar login Bruno.
12. Testar abertura do CRM em producao.
13. Testar abertura de lead em producao.
14. Testar criacao de nota em producao.
15. Monitorar erros.
16. Se falhar, voltar `NEXT_PUBLIC_USE_SUPABASE_AUTH=false` e fazer redeploy.

## 10. Rollback

Rollback operacional:

```text
NEXT_PUBLIC_USE_SUPABASE_AUTH=false
redeploy
```

Efeito esperado:

- Login local volta a ser usado.
- CRM operacional volta ao estado anterior.
- Simulador, dashboard e pipeline nao devem ser impactados.
- Notas continuam bloqueadas para usuarios apenas locais, pois a API exige token Supabase.
- Nenhum dado deve ser perdido.
- Nenhuma migration precisa ser revertida por esta ativacao de flag.

## 11. Decisao sobre usuarios SDR

Os usuarios `sdr1` a `sdr5` existem no modelo local.

Para Supabase Auth, cada SDR precisa existir em:

- Supabase Auth;
- `profiles`;
- mesma organizacao correta;
- role `sdr`;
- `is_active = true`.

Se os SDRs nao forem migrados agora, a ativacao de Supabase Auth deve ser considerada apta apenas para Camille e Bruno, nao para operacao SDR completa.

Decisao recomendada:

- Para ativacao inicial controlada, validar Camille e Bruno primeiro.
- Antes de abrir acesso para SDRs, executar sprint especifica de backfill e teste de usuarios SDR.

## 12. Recomendacao tecnica

Veredito: **pronto com pendencias**.

Motivo:

- O codigo ja possui fluxo Supabase Auth por feature flag.
- O codigo ja valida profile, organizacao, role e usuario ativo.
- O modal de notas esta alinhado com o modelo server-side protegido.
- O rollback por flag existe.
- Entretanto, a readiness completa depende de validacao real no Supabase: Auth users, profiles, roles, organization_id, senhas e teste de login.

Sem consulta real ao Supabase nesta sprint, nao e tecnicamente correto declarar o EVOLV como totalmente pronto para ativar Supabase Auth em producao.

## 13. Proxima sprint recomendada

Sprint 99G - Supabase Auth User/Profile Backfill Plan

Objetivo sugerido:

- Validar usuarios Auth reais.
- Validar profiles reais.
- Confirmar Camille e Bruno admin.
- Decidir tratamento dos SDRs.
- Definir procedimento de senha/recovery.
- Executar smoke test local com flag true antes de qualquer mudanca em producao.

Se todos esses pontos ja estiverem confirmados manualmente pela Camille, a Sprint 99G pode ser convertida em:

Sprint 99G - Supabase Auth Production Activation Plan

## 14. Checklist de validacao desta sprint

- Apenas documento criado.
- Nenhum codigo alterado.
- Nenhum SQL executado.
- Nenhuma migration criada.
- Nenhuma variavel alterada.
- Nenhum deploy realizado.
- Nenhuma integracao implementada.
- Diretorio proibido `C:\Users\camil\Documents\Codex` nao foi usado como fonte de leitura, copia ou modificacao intencional.

## 15. Conclusao

A falha `Sessao indisponivel.` nao e bug isolado do modal. Ela e consequencia direta de um corte arquitetural correto: notas persistentes exigem identidade Supabase, enquanto o login local nao fornece essa identidade.

O caminho seguro e validar a ativacao de Supabase Auth, sem remover rollback e sem contornar a protecao server-side das notas.
