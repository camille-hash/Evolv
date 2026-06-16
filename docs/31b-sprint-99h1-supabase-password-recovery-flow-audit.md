# Sprint 99H.1 - Supabase Password Recovery Flow Audit

## 1. Resumo executivo

A Sprint 99H validou que o EVOLV consegue entrar em modo Supabase Auth localmente quando `NEXT_PUBLIC_USE_SUPABASE_AUTH=true` esta ativo. A tela de login muda corretamente para o fluxo de e-mail/senha, exibe `Esqueci minha senha` e mostra a mensagem de acesso protegido por Supabase Auth.

O bloqueio atual esta no fluxo de recuperacao de senha. O Supabase envia o e-mail de recovery, mas ao clicar em `Reset password` o app abre a tela normal de login, sem tela dedicada para definir nova senha.

Nada foi implementado nesta sprint. Esta auditoria apenas mapeia o fluxo atual e recomenda a correcao minima futura.

## 2. Estado validado pela Sprint 99H

Contexto informado para esta auditoria:

- O teste foi feito em ambiente limpo fora do OneDrive: `C:\Projetos\Evolv-Auth`.
- `.env.local` foi preenchido manualmente com URL e publishable key do Supabase.
- `NEXT_PUBLIC_USE_SUPABASE_AUTH=true` foi utilizado localmente.
- A tela de login ativou o modo Supabase Auth.
- O campo `Usuario` foi substituido por `E-mail`.
- O link `Esqueci minha senha` ficou visivel.
- A mensagem `Acesso protegido por Supabase Auth` ficou visivel.
- O Supabase enviou o e-mail de recuperacao.

## 3. Problema observado

Comportamento observado:

1. Usuario solicita recuperacao em `Esqueci minha senha`.
2. Supabase envia o e-mail de recuperacao.
3. Usuario clica em `Reset password`.
4. O EVOLV abre a tela normal de login.
5. Nao aparece tela para definir nova senha.
6. Nao aparece campo `Confirmar nova senha`.
7. Nao ha acao clara para concluir o recovery.
8. A Sprint 99I permanece bloqueada.

O problema nao e uma tela pedindo senha atual. O problema e a ausencia de tratamento do fluxo de recovery no app.

## 4. Arquivos auditados

Arquivos consultados:

- `components/access/login-page.tsx`
- `modules/access/supabase-auth.ts`
- `modules/access/access-storage.ts`
- `modules/access/access-engine.ts`
- `modules/access/access-types.ts`
- `modules/access/index.ts`
- `app/page.tsx`
- `app/layout.tsx`
- `app/api/crm/lead-notes/route.ts`
- `docs/10-sprint-95-anon-dependency-audit.md`

Comandos de busca utilizados apenas para leitura:

- busca por `resetPasswordForEmail`;
- busca por `redirectTo`;
- busca por `PASSWORD_RECOVERY`;
- busca por `onAuthStateChange`;
- busca por `updateUser`;
- busca por `window.location.hash`;
- busca por `type=recovery`, `access_token`, `refresh_token` e `code`.

## 5. Fluxo atual de login Supabase

### Feature flag

`isSupabaseAuthEnabled()` esta em `modules/access/supabase-auth.ts` e retorna:

```ts
process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "true"
```

### Login

Quando a flag esta ativa, `components/access/login-page.tsx` chama:

```ts
signInWithSupabaseAuth(usuario, senha)
```

A funcao chama:

```ts
supabase.auth.signInWithPassword({ email, password })
```

### Sessao atual

Na inicializacao do app, `app/page.tsx` decide entre:

```ts
isSupabaseAuthEnabled()
  ? await loadSupabaseCurrentUser()
  : loadCurrentUser()
```

`loadSupabaseCurrentUser()` chama:

```ts
supabase.auth.getSession()
```

Se houver sessao, valida o profile.

### Validacao de profiles

`loadValidatedProfile()` consulta `public.profiles` com:

```text
id, organization_id, name, email, role, is_active
```

O profile so e valido se:

- possui `id`;
- possui `organization_id`;
- `role` e `admin` ou `sdr`;
- `is_active = true`.

Se o profile falhar, o app executa sign out e bloqueia o acesso.

## 6. Fluxo atual de Esqueci minha senha

O botao `Esqueci minha senha` aparece apenas quando `usingSupabaseAuth` esta ativo.

No clique, `handlePasswordReset()` chama:

```ts
requestSupabasePasswordReset(usuario)
```

Em `modules/access/supabase-auth.ts`, a funcao executa:

```ts
supabase.auth.resetPasswordForEmail(email.trim(), {
  redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
});
```

### Redirect atual

O `redirectTo` atual e apenas a origem do app, por exemplo:

```text
http://localhost:3000
```

Nao ha rota dedicada como:

```text
/reset-password
/auth/callback
```

### Comportamento esperado

O link de recovery deveria levar a uma tela onde o usuario define nova senha sem informar a senha atual.

### Comportamento observado

O link leva para a tela normal de login porque o app nao possui rota/tela de recovery nem tratamento do evento de recuperacao.

## 7. Tratamento atual de recovery

Resultado da auditoria:

- Existe rota `/reset-password`? **Nao encontrada**.
- Existe rota `/auth/callback`? **Nao encontrada**.
- Existe rota dedicada para recovery? **Nao encontrada**.
- Existe componente de nova senha para Supabase recovery? **Nao encontrado**.
- Existe listener `supabase.auth.onAuthStateChange`? **Nao encontrado**.
- Existe tratamento para evento `PASSWORD_RECOVERY`? **Nao encontrado**.
- Existe leitura de `window.location.hash`? **Nao encontrada**.
- Existe leitura de query params `type=recovery`, `access_token`, `refresh_token` ou `code`? **Nao encontrada**.
- Existe chamada a `supabase.auth.updateUser({ password })` para concluir recovery? **Nao encontrada**.

Observacao: existe `RequiredPasswordChangePage`, mas ela pertence ao fluxo local de troca obrigatoria de senha e exige usuario local ja carregado. Ela nao trata recovery do Supabase e nao substitui uma tela de reset por link.

## 8. Hipotese tecnica principal

A hipotese mais provavel e:

1. O recovery link chega ao EVOLV.
2. O `redirectTo` atual aponta para a origem do app, nao para uma rota especifica de reset.
3. O App Router nao possui `/reset-password` nem `/auth/callback`.
4. O app nao captura hash/query params de recovery.
5. O app nao escuta `PASSWORD_RECOVERY` via `onAuthStateChange`.
6. `loadSupabaseCurrentUser()` trata apenas sessao normal e profile valido.
7. Sem usuario/profile normal carregado, o app renderiza `LoginPage`.
8. Nao existe chamada posterior a `supabase.auth.updateUser({ password })`.

Portanto, o fluxo cai corretamente no login normal do ponto de vista do codigo atual, mas incorretamente para a experiencia de recuperacao de senha.

## 9. Correcao minima futura recomendada

Recomendacao para Sprint 99H.2, sem implementar nesta auditoria:

1. Criar rota dedicada:

```text
/reset-password
```

2. Alterar `redirectTo` em `requestSupabasePasswordReset()` para apontar para essa rota:

```text
${window.location.origin}/reset-password
```

3. Criar tela simples com:

- Nova senha;
- Confirmar nova senha;
- Salvar nova senha.

4. Capturar corretamente a sessao/token de recovery conforme fluxo Supabase usado pelo projeto.

5. Chamar:

```ts
supabase.auth.updateUser({ password: newPassword })
```

6. Apos sucesso:

- mostrar confirmacao;
- redirecionar para login;
- ou carregar usuario autenticado, se essa decisao for aprovada.

7. Tratar erros:

- link expirado;
- link invalido;
- token ausente;
- senha fora da politica minima;
- falha de rede;
- profile ausente apos reset.

## 10. Alternativa futura

Alternativa arquitetural:

1. Criar `/auth/callback`.
2. Processar `code`/hash recebido do Supabase.
3. Estabelecer sessao Supabase quando aplicavel.
4. Detectar fluxo de recovery.
5. Redirecionar para `/reset-password`.
6. Preservar compatibilidade com PKCE/fragment flow do Supabase.

Essa alternativa pode ser mais flexivel se o EVOLV for centralizar callbacks de login, recovery e outros fluxos Auth no futuro.

## 11. Riscos

- Link de recovery expirado.
- Link abrindo ambiente errado.
- Redirect URL local nao autorizada no Supabase.
- Redirect URL de producao nao autorizada no Supabase.
- Mismatch entre `localhost` e dominio de producao.
- Usuario autenticado cair na tela errada.
- Senha alterada mas profile invalido bloquear acesso depois.
- Token de recovery exposto em console ou log.
- Producao ativada antes do recovery funcionar.
- Usuario acreditar que a senha foi redefinida sem concluir o fluxo.

## 12. Configuracoes Supabase a verificar futuramente

Antes de desbloquear 99I, verificar no Supabase:

- Site URL.
- Redirect URLs permitidas.
- URL local permitida para teste.
- URL de producao permitida.
- Templates de e-mail.
- Link de recovery gerado.
- Se `redirectTo` esta sendo respeitado.
- Se o projeto usa PKCE/query code ou fragment hash no recovery.

## 13. Criterio de aprovacao para desbloquear 99I

A 99I so deve ser desbloqueada quando:

- login Supabase funciona;
- recuperacao de senha abre a tela correta;
- nova senha pode ser definida sem senha atual;
- login com nova senha funciona;
- usuario acessa CRM;
- nota pode ser criada;
- refresh mantem sessao;
- logout/login funciona;
- teste local passa antes de qualquer ativacao em producao.

## 14. Proxima sprint recomendada

Recomendacao:

```text
Sprint 99H.2 - Supabase Password Recovery Route Implementation
```

Condições:

- somente apos aprovacao explicita da Camille;
- implementacao pequena;
- sem alterar producao;
- sem deploy;
- teste local antes de qualquer 99I;
- sem alterar CRM, notas ou Supabase alem do fluxo client-side de recovery.

## 15. Checklist final

- [x] Apenas documentacao criada.
- [x] Nenhum codigo alterado.
- [x] Nenhuma rota criada.
- [x] Nenhuma variavel alterada.
- [x] Nenhum SQL executado.
- [x] Nenhuma migration criada.
- [x] Nenhum deploy realizado.
- [x] Producao preservada.
- [x] Diretorio proibido `C:\Users\camil\Documents\Codex` nao usado.

## 16. Status da 99I

Status: **bloqueada**.

Motivo: o Supabase Auth local entra no modo correto, mas o fluxo de recuperacao de senha ainda nao permite definir uma nova senha a partir do link enviado por e-mail.
