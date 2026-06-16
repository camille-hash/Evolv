# Sprint 99H.4 - Recovery Session Hydration Audit

## 1. Resumo executivo

Esta auditoria teve como objetivo identificar como `components/access/reset-password-page.tsx` obtém, ou deixa de obter, a sessao Supabase antes de chamar `updateSupabasePasswordForRecovery()`.

O achado principal e simples: o componente de reset nao faz nenhuma hidratacao explicita da sessao de recovery. Ele apenas chama `updateSupabasePasswordForRecovery(newPassword)`, e essa funcao por sua vez chama `supabase.auth.updateUser({ password })` em um client criado com `detectSessionInUrl: true`.

Portanto, o fluxo atual depende implicitamente de o `supabase-js` conseguir restaurar a sessao de recovery automaticamente a partir da URL quando o client e criado no navegador. Nao existe no codigo atual nenhuma confirmacao explicita dessa sessao antes da tentativa de trocar a senha.

## 2. Arquivos auditados

- `components/access/reset-password-page.tsx`
- `modules/access/supabase-auth.ts`
- `app/reset-password/page.tsx`
- `app/page.tsx`

## 3. Fluxo atual encontrado

Fluxo da tela de reset:

```text
/reset-password
-> ResetPasswordPage
-> usuario informa nova senha e confirmacao
-> handleSubmit()
-> updateSupabasePasswordForRecovery(newPassword)
-> createSupabaseAuthClient()
-> supabase.auth.updateUser({ password })
```

O componente nao faz nenhuma etapa intermediaria para:

- verificar sessao;
- restaurar sessao manualmente;
- processar `code`;
- processar `access_token`;
- processar `refresh_token`;
- capturar `PASSWORD_RECOVERY`.

## 4. Verificacoes solicitadas

### 1. Existe chamada para `supabase.auth.getSession()`?

No componente `components/access/reset-password-page.tsx`: **nao**.

No modulo `modules/access/supabase-auth.ts`: **sim**, mas apenas em `loadSupabaseCurrentUser()`.

Essa chamada nao participa do fluxo da tela `/reset-password`.

### 2. Existe uso de `supabase.auth.onAuthStateChange()`?

**Nao encontrado** no checkout auditado.

### 3. Existe uso de `supabase.auth.exchangeCodeForSession()`?

**Nao encontrado** no checkout auditado.

### 4. Existe qualquer mecanismo de hidratacao/restauracao da sessao de recovery enviada pelo Supabase?

**Nao de forma explicita.**

O unico mecanismo relacionado encontrado e a criacao do client com:

```ts
auth: {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
}
```

Ou seja, o fluxo atual aposta na hidratacao implicita do `supabase-js`.

### 5. O fluxo atual depende implicitamente de `detectSessionInUrl: true`?

**Sim.**

Sem `getSession()`, sem `onAuthStateChange()` e sem `exchangeCodeForSession()`, a unica pista de restauracao automatica e exatamente `detectSessionInUrl: true` no `createSupabaseAuthClient()`.

### 6. O componente pode chamar `supabase.auth.updateUser({ password })` sem uma sessao autenticada de recovery previamente estabelecida?

Do ponto de vista do codigo, **ele chama, sim**.

Do ponto de vista funcional, **isso so funciona se o Supabase JS ja tiver conseguido estabelecer uma sessao valida de recovery antes ou durante essa chamada**.

Se essa sessao nao existir, a chamada pode falhar e cair no erro amigavel:

```text
Nao foi possivel redefinir sua senha. Solicite um novo link e tente novamente.
```

## 5. Onde a sessao de recovery deveria aparecer

Ponto exato onde a sessao poderia ser criada ou restaurada no fluxo atual:

- dentro de `createSupabaseAuthClient()` em `modules/access/supabase-auth.ts`;
- especificamente pelo comportamento interno do `supabase-js` com `detectSessionInUrl: true`.

Ponto exato onde o app confirma essa sessao:

- **nenhum** no fluxo `/reset-password`.

Em outras palavras:

- a sessao de recovery nao e criada explicitamente pelo EVOLV;
- a sessao de recovery nao e restaurada explicitamente pelo EVOLV;
- a tela de reset nao verifica se a sessao existe;
- se o `supabase-js` nao hidratar sozinho, o app nao tem plano B.

## 6. Compatibilidade do erro observado

O erro:

```text
Nao foi possivel redefinir sua senha. Solicite um novo link e tente novamente.
```

e **totalmente compativel** com ausencia de sessao de recovery.

Motivo:

- `updateSupabasePasswordForRecovery()` chama diretamente `supabase.auth.updateUser({ password })`;
- se nao houver sessao autenticada valida no client naquele momento, o Supabase pode devolver erro;
- esse erro e convertido pelo helper no texto amigavel acima.

Logo, sim: esse erro e coerente com o cenario em que a sessao de recovery nao foi hidratada.

## 7. O que o fluxo atual nao faz

O fluxo atual nao:

- chama `getSession()` antes de atualizar a senha;
- confirma que existe `session.user`;
- escuta `PASSWORD_RECOVERY`;
- processa `code` explicitamente;
- processa `access_token` ou `refresh_token` explicitamente;
- faz `exchangeCodeForSession()`;
- mostra erro especifico de “link expirado” versus “sessao ausente”.

Isso significa que o comportamento atual e bastante dependente do mecanismo automatico do SDK e oferece pouca observabilidade quando a sessao nao aparece.

## 8. Correcao minima recomendada

Sem implementar agora, a correcao minima recomendada e:

1. Ao abrir `/reset-password`, confirmar explicitamente a sessao de recovery.
2. Se o projeto estiver recebendo `code` via query string, usar `supabase.auth.exchangeCodeForSession()` antes do formulario ficar operacional.
3. Se o fluxo estiver baseado em hash/tokens e o SDK resolver isso sozinho, ainda assim chamar `supabase.auth.getSession()` para verificar se a sessao realmente existe antes de permitir `updateUser()`.
4. Se nao houver sessao valida, mostrar erro claro do tipo:

```text
O link de redefinicao e invalido ou expirou. Solicite um novo link.
```

5. So habilitar o submit do formulario quando a sessao de recovery estiver confirmada.

## 9. Proposta minima de fluxo futuro

Fluxo recomendado:

```text
/reset-password
-> criar client Supabase
-> tentar hidratar sessao de recovery
-> se necessario, exchangeCodeForSession()
-> getSession()
-> se sessao valida, liberar formulario
-> updateUser({ password })
-> sucesso
```

Fluxo de erro:

```text
sem sessao valida
-> nao liberar submit
-> informar que o link e invalido ou expirou
-> orientar a solicitar novo link
```

## 10. Conclusao

Hoje, a tela `reset-password-page.tsx` nao obtém a sessao de recovery de forma explicita. Ela apenas tenta atualizar a senha e depende implicitamente de `detectSessionInUrl: true`.

Isso deixa o fluxo fragil: se o SDK nao hidratar a sessao automaticamente, o app nao percebe a ausencia de sessao antes do submit e so responde com o erro amigavel generico.

A menor correcao futura e adicionar uma etapa explicita de confirmacao de sessao de recovery antes de chamar `supabase.auth.updateUser({ password })`.

## 11. Confirmacoes finais

- Apenas documentacao criada.
- Nenhum codigo alterado.
- Nenhuma rota alterada.
- Nenhum build executado.
- Nenhum lint executado.
- Nenhum typecheck executado.
- Nenhum servidor iniciado.
- Nenhuma variavel de ambiente alterada.
- Nenhum SQL executado.
- Nenhuma alteracao em Supabase, Vercel, producao, Auth users, profiles, CRM ou notas.
- O diretorio proibido `C:\Users\camil\Documents\Codex` nao foi usado.
