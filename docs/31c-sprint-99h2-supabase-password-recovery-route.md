# Sprint 99H.2 - Supabase Password Recovery Route Implementation

## 1. Resumo executivo

Esta sprint implementou localmente a rota minima `/reset-password` para concluir o fluxo de recuperacao de senha do Supabase Auth no checkout de teste `C:\Projetos\Evolv-Auth`.

A implementacao nao altera producao, Vercel, SQL, RLS, profiles, CRM, notas ou integracoes. O objetivo e permitir que o link enviado pelo Supabase direcione o usuario para uma tela dedicada de nova senha, em vez de cair no login normal.

## 2. Mudancas implementadas

### Redirect do e-mail de recuperacao

`requestSupabasePasswordReset()` agora usa:

```ts
redirectTo: `${window.location.origin}/reset-password`
```

Assim, o link de recovery passa a apontar para a rota local dedicada.

### Rota dedicada

Criada rota:

```text
/reset-password
```

Arquivo:

```text
app/reset-password/page.tsx
```

### Tela de redefinicao

Criado componente:

```text
components/access/reset-password-page.tsx
```

Campos:

- Nova senha;
- Confirmar nova senha.

Validacoes:

- senha obrigatoria;
- minimo de 8 caracteres;
- pelo menos uma letra;
- pelo menos um numero;
- confirmacao igual a nova senha.

Estados visuais:

- carregamento em `Salvar nova senha`;
- erro amigavel;
- sucesso;
- botao `Voltar ao login`.

### Atualizacao de senha

Criado helper:

```ts
updateSupabasePasswordForRecovery(password)
```

Ele chama:

```ts
supabase.auth.updateUser({ password })
```

Esse helper depende do contexto de recovery/sessao processado pelo Supabase Auth no navegador.

## 3. Arquivos criados

- `app/reset-password/page.tsx`
- `components/access/reset-password-page.tsx`
- `docs/31c-sprint-99h2-supabase-password-recovery-route.md`

## 4. Arquivos alterados

- `modules/access/supabase-auth.ts`

## 5. Fluxo esperado apos a implementacao

```text
Login Supabase Auth
-> Esqueci minha senha
-> resetPasswordForEmail(email, redirectTo /reset-password)
-> Supabase envia e-mail
-> usuario clica Reset password
-> EVOLV abre /reset-password
-> usuario informa nova senha e confirmacao
-> supabase.auth.updateUser({ password })
-> sucesso
-> usuario volta ao login
```

## 6. Fora do escopo preservado

Nao foi alterado:

- producao;
- Vercel;
- Supabase remoto;
- Auth users;
- profiles;
- RLS;
- policies;
- grants;
- CRM;
- notas;
- Shadow Runtime;
- Ownership;
- Observabilidade;
- integracoes;
- migrations;
- SQL.

## 7. Teste manual ainda necessario

Para liberar 99I, ainda e necessario testar localmente com link real do Supabase:

1. Rodar localmente com `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`.
2. Solicitar `Esqueci minha senha`.
3. Abrir o link recebido por e-mail.
4. Confirmar que abre `/reset-password`.
5. Definir nova senha.
6. Voltar ao login.
7. Entrar com a nova senha.
8. Acessar CRM.
9. Abrir lead.
10. Criar nota.
11. Testar refresh.
12. Testar logout/login.

## 8. Riscos restantes

- Redirect URL local precisa estar autorizada no Supabase.
- O link pode expirar antes do teste.
- O projeto Supabase pode usar fluxo PKCE/callback diferente dependendo da configuracao.
- Se a sessao de recovery nao for estabelecida pelo Supabase JS, `updateUser` retornara erro amigavel.
- A liberacao da 99I ainda depende de smoke test real.

## 9. Status da 99I

Status: **bloqueada ate teste manual real passar**.

A implementacao minima foi criada, mas a 99I so deve ser desbloqueada quando o fluxo com e-mail real for validado de ponta a ponta.
