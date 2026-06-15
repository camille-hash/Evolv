# Sprint 95.1 - Auditoria Passiva De Dependencias anon

## 1. Resumo Executivo

Esta auditoria mapeia os pontos do EVOLV que dependem de chaves publicas Supabase no modelo atual. Nenhum arquivo funcional foi alterado e nenhuma configuracao, banco, RLS ou policy foi modificada.

Conclusao principal:

- O CRM compartilhado depende diretamente de uma chave publica no browser quando `NEXT_PUBLIC_USE_SUPABASE_CRM=true`.
- O Supabase Auth depende de chave publica no browser quando `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`.
- A validacao minima de `profiles` tambem ocorre no browser e depende de permissao de leitura adequada para a sessao autenticada.
- Existe um script administrativo de importacao que usa `SUPABASE_SERVICE_ROLE_KEY`, mas ele nao e fluxo anon/browser.
- Existe um helper generico `lib/supabase/client.ts` usando `NEXT_PUBLIC_SUPABASE_ANON_KEY`, mas nao foi encontrado consumo direto dele no codigo atual.

Remover anon/publishable sem substituto quebraria login Supabase, recuperacao de senha, sessao Supabase e CRM compartilhado no browser.

## 2. Inventario De Acessos Supabase

| Arquivo | Funcao/trecho | Operacao | Tabela/servico | Depende de anon? | Criticidade | Impacto se anon for removido |
| --- | --- | --- | --- | --- | --- | --- |
| `modules/crm/repositories/supabase-crm-repository.ts` | `SupabaseCrmRepository` | `createClient` com `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client browser-side | Sim | Alta | CRM compartilhado nao consegue listar/atualizar leads quando a flag CRM estiver ativa. |
| `modules/crm/repositories/supabase-crm-repository.ts` | `list()` | `.from("crm_leads").select(...).order(...)` | `crm_leads` | Sim | Alta | Bruno/Camille podem ver CRM vazio ou cair para localStorage, dependendo do fallback. |
| `modules/crm/repositories/supabase-crm-repository.ts` | `getById(id)` | `.from("crm_leads").select(...).eq(...).maybeSingle()` | `crm_leads` | Sim | Media | Consulta individual de lead compartilhado falha e cai para localStorage. |
| `modules/crm/repositories/supabase-crm-repository.ts` | `updateLead(id, patch)` | `.from("crm_leads").update(...).eq("id", ...).select(...)` | `crm_leads` | Sim | Alta | Edicoes/movimentacoes feitas no browser deixam de persistir no Supabase. |
| `modules/crm/repositories/supabase-crm-repository.ts` | fallback de `updateLead` | `.from("crm_leads").update(...).eq("external_id", ...).select(...)` | `crm_leads` | Sim | Media | Fallback por `external_id` deixa de funcionar. |
| `modules/crm/repositories/index.ts` | `listCrmLeadsFromRepository()` | decide Supabase vs localStorage | `crm_leads` | Sim, quando flag ativa | Alta | Se Supabase falhar, tenta fallback local; em navegadores sem localStorage importado, CRM pode ficar vazio. |
| `modules/crm/repositories/index.ts` | `updateCrmLeadInRepository()` | update Supabase com fallback local | `crm_leads` | Sim, quando flag ativa | Alta | Alteracoes compartilhadas deixam de acontecer; fallback local fragmenta dados por navegador. |
| `components/crm/crm-page.tsx` | carregamento inicial | chama `listCrmLeadsFromRepository()` | CRM repository | Indireta | Alta | Tela CRM depende do repository para receber leads compartilhados. |
| `components/crm/crm-page.tsx` | salvar dossie/edicao/movimentacao | chama `updateCrmLeadInRepository()` | CRM repository | Indireta | Alta | Fluxos operacionais continuam visualmente, mas podem persistir apenas localmente se Supabase falhar. |
| `modules/access/supabase-auth.ts` | `createSupabaseAuthClient()` | `createClient` com `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth/session | Sim | Alta | Login Supabase, sessao, logout e reset de senha param quando Auth estiver ativo. |
| `modules/access/supabase-auth.ts` | `signInWithSupabaseAuth()` | `supabase.auth.signInWithPassword(...)` | Supabase Auth | Sim | Alta | Login profissional nao funciona. |
| `modules/access/supabase-auth.ts` | `loadSupabaseCurrentUser()` | `supabase.auth.getSession()` | Supabase Auth | Sim | Alta | Sessao Supabase nao e recuperada ao abrir/recarregar app. |
| `modules/access/supabase-auth.ts` | `requestSupabasePasswordReset()` | `supabase.auth.resetPasswordForEmail(...)` | Supabase Auth | Sim | Media | Recuperacao de senha nao envia e-mail. |
| `modules/access/supabase-auth.ts` | `loadValidatedProfile()` | `.from("profiles").select(...).eq(...).maybeSingle()` | `profiles` | Sim, via sessao autenticada | Alta | Usuarios autenticados nao passam pela validacao minima de profile. |
| `app/page.tsx` | `loadAccessState()` | escolhe Supabase Auth vs login local | Auth adapter | Indireta | Alta | Com flag Auth ativa, app depende do adapter Supabase para liberar acesso. |
| `app/page.tsx` | `handleLogout()` | chama `signOutFromSupabaseAuth()` | Supabase Auth | Indireta | Media | Logout Supabase nao encerra sessao oficial. |
| `components/access/login-page.tsx` | `handleSubmit()` | chama `signInWithSupabaseAuth()` | Supabase Auth | Indireta | Alta | Tela de login nao autentica usuarios Supabase. |
| `components/access/login-page.tsx` | `handlePasswordReset()` | chama `requestSupabasePasswordReset()` | Supabase Auth | Indireta | Media | Recuperacao de senha fica indisponivel. |
| `lib/supabase/client.ts` | `createSupabaseBrowserClient()` | `createClient` com `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client generico | Sim, mas sem uso encontrado | Baixa/Incerta | Se usado futuramente, dependera de anon key. Hoje nao ha chamada encontrada. |
| `scripts/import-crm-to-supabase.ts` | `main()` | `createClient` com `SUPABASE_SERVICE_ROLE_KEY` | script administrativo | Nao anon; usa service role | Alta, mas fora do browser | Importacao futura falha sem service role, mas nao representa dependencia anon. |
| `scripts/import-crm-to-supabase.ts` | loop de importacao | `.from("crm_leads").upsert(...)` | `crm_leads` | Nao anon; usa service role | Alta, mas fora do browser | Importador manual nao funciona sem service role configurada. |

## 3. Dependencias Diretas Do CRM

Evidencias confirmadas:

- `modules/crm/repositories/supabase-crm-repository.ts` cria client Supabase direto com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `canUseSupabaseCrmRepository()` liga a fonte Supabase apenas quando `NEXT_PUBLIC_USE_SUPABASE_CRM === "true"` e as variaveis publicas existem.
- `list()` le `crm_leads`.
- `getById()` le `crm_leads`.
- `updateLead()` atualiza `crm_leads` por `id` e, se necessario, tenta `external_id`.
- `modules/crm/repositories/index.ts` oferece fallback para localStorage quando Supabase falha.
- `components/crm/crm-page.tsx` chama repository para listagem inicial, edicao de lead, dossie operacional e movimentacao de pipeline.

Criticidade:

- Alta para operacao compartilhada multiusuario.
- Media para rollback local, porque existe fallback localStorage, mas esse fallback fragmenta dados por navegador.

Impacto da remocao anon/publishable:

- Se `NEXT_PUBLIC_USE_SUPABASE_CRM=true`, listagem e escrita compartilhadas quebram.
- O app pode cair para localStorage, mas Bruno/Camille voltariam a ver bases locais diferentes.

## 4. Dependencias Indiretas

### Auth Supabase

`modules/access/supabase-auth.ts` depende de public key para:

- login por e-mail/senha;
- recuperacao de senha;
- persistencia e leitura de sessao;
- logout;
- leitura minima de `profiles`.

Impacto:

- Com `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`, remover anon/publishable impede o app de autenticar, carregar profile e liberar acesso.
- Com `NEXT_PUBLIC_USE_SUPABASE_AUTH=false`, o login local continua independente de Supabase.

### Helper Generico

`lib/supabase/client.ts` cria um client com `NEXT_PUBLIC_SUPABASE_ANON_KEY`, mas nenhuma chamada direta a `createSupabaseBrowserClient()` foi encontrada.

Classificacao:

- Dependencia suspeita/latente.
- Baixa criticidade no estado atual.
- Pode virar dependencia direta se algum modulo passar a importar esse helper.

### Script Administrativo

`scripts/import-crm-to-supabase.ts` usa `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL`.

Classificacao:

- Nao e dependencia anon.
- E fluxo administrativo sensivel.
- Nao deve ir para browser.

## 5. Riscos

| Risco | Criticidade | Evidencia | Impacto |
| --- | --- | --- | --- |
| Remover anon/publishable com `NEXT_PUBLIC_USE_SUPABASE_AUTH=true` | Critico | `modules/access/supabase-auth.ts` | Login, sessao, logout, reset e profile falham. |
| Remover anon/publishable com `NEXT_PUBLIC_USE_SUPABASE_CRM=true` | Critico | `modules/crm/repositories/supabase-crm-repository.ts` | CRM compartilhado deixa de listar/atualizar leads. |
| RLS sem policy compativel para `profiles` | Alto | `loadValidatedProfile()` consulta `profiles` no browser | Usuario autenticado nao consegue carregar profile e e bloqueado. |
| RLS sem policy compativel para `crm_leads` | Alto | repository le/escreve `crm_leads` do browser | CRM fica vazio ou apenas local. |
| Fallback local mascarar falha Supabase | Medio | `modules/crm/repositories/index.ts` | Operacao aparenta funcionar, mas dados nao sao compartilhados. |
| Helper anon generico ser usado sem revisao futura | Medio | `lib/supabase/client.ts` | Novo acesso anon pode surgir fora do fluxo auditado. |
| Service role em script manual | Alto, mas nao anon | `scripts/import-crm-to-supabase.ts` | Importador e poderoso; deve permanecer fora do browser e controlado por ambiente. |

## 6. Ordem Recomendada Para Migracao

Esta ordem e recomendacao de auditoria, nao implementacao automatica:

1. Manter anon/publishable enquanto Supabase Auth e CRM browser-side dependem dele.
2. Validar quais fluxos devem continuar client-side com anon autenticado e quais devem migrar para server-side.
3. Garantir `profiles` com RLS/policies suficientes para `select` do proprio profile.
4. Garantir `crm_leads` com RLS/policies para leitura/update por organizacao antes de remover qualquer fallback.
5. Instrumentar verificacao operacional para detectar quando o fallback localStorage foi acionado.
6. Decidir se update de CRM deve continuar no browser com RLS ou migrar para endpoint/server action.
7. Revisar `lib/supabase/client.ts` antes de qualquer novo uso.
8. Manter `SUPABASE_SERVICE_ROLE_KEY` restrito a scripts/server e nunca expor no client.

## 7. Itens Que Precisam De Validacao Manual

- Confirmar no Supabase quais chaves estao configuradas como anon/publishable.
- Confirmar se `NEXT_PUBLIC_USE_SUPABASE_AUTH` esta ativo ou inativo em producao.
- Confirmar se `NEXT_PUBLIC_USE_SUPABASE_CRM` esta ativo ou inativo em producao.
- Confirmar se RLS esta ativo em `profiles`.
- Confirmar se RLS esta ativo em `crm_leads`.
- Confirmar se existem policies atuais para `profiles`.
- Confirmar se existem policies atuais para `crm_leads`.
- Confirmar se o CRM em producao esta lendo Supabase ou fallback localStorage.
- Confirmar se `lib/supabase/client.ts` e legado ou reservado para uso futuro.

## Evidencias Encontradas

Buscas realizadas localmente:

- `createClient(`
- `createBrowserClient(`
- `createServerClient(`
- `supabase.from(`
- `.from("crm_leads")`
- `.select(`
- `.update(`
- `.insert(`
- `.delete(`
- `.rpc(`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SERVICE_ROLE`
- `service_role`
- `Authorization`
- `Bearer`

Ocorrencias relevantes confirmadas:

- `modules/crm/repositories/supabase-crm-repository.ts`
- `modules/crm/repositories/index.ts`
- `components/crm/crm-page.tsx`
- `modules/access/supabase-auth.ts`
- `components/access/login-page.tsx`
- `app/page.tsx`
- `lib/supabase/client.ts`
- `scripts/import-crm-to-supabase.ts`
- `.env.example`

Nenhuma ocorrencia de `createBrowserClient(`, `createServerClient(`, `.rpc(`, `Authorization` ou `Bearer` foi encontrada no codigo funcional auditado.

## Conclusao

O modelo atual ainda depende de anon/publishable no browser para Auth e CRM compartilhado. A remocao do acesso anon nao deve ser tratada como simples troca de chave: ela exige decisao de arquitetura sobre manter acesso client-side com RLS ou migrar operacoes sensiveis para camada server-side.

Sprint 95.2 deve ser uma etapa de desenho controlado, nao uma remocao direta de anon.
