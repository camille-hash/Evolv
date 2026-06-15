# Investigacao tecnica - Recuperacao de acesso local da Camille

## Resumo executivo

Esta investigacao mapeia o login local do EVOLV para permitir uma recuperacao segura e exclusiva do acesso da Camille, sem alterar dados, codigo funcional, Supabase, CRM, Auth, RLS, policies, grants ou deploy.

Conclusao principal:

- O login local persiste usuarios em `localStorage`, na chave `evolv.users.v1`.
- As senhas locais ficam no proprio registro de usuario, no campo `senha`.
- A sessao atual fica em `sessionStorage`, na chave `evolv.current-user.v1`.
- O lockout local fica em `localStorage`, na chave `evolv.login-attempts.v1`.
- O lockout e calculado por identificador normalizado: `identifier.trim().toLowerCase()`.
- Apos 5 tentativas invalidas consecutivas, o identificador fica bloqueado por 15 minutos.
- Login bem-sucedido limpa somente as tentativas daquele identificador.
- No modo local, o campo de login e `usuario`, nao e-mail.
- O usuario master padrao da Camille e `usuario: "admin"`, nao `camille@temperlandia.com.br`.

Nenhuma alteracao foi realizada nesta sprint.

## Arquivos analisados

- `modules/access/access-storage.ts`
- `modules/access/access-engine.ts`
- `modules/access/access-types.ts`
- `modules/access/index.ts`
- `components/access/login-page.tsx`
- `components/access/access-settings-page.tsx`
- `app/page.tsx`

## Onde os usuarios locais sao persistidos

Arquivo:

`modules/access/access-storage.ts`

Chave:

`evolv.users.v1`

Storage:

`window.localStorage`

Funcao principal:

- `loadUsers()`
- `saveUsers(users)`
- `readStoredUsers()`

Comportamento:

- Se `evolv.users.v1` nao existir ou estiver vazio, `loadUsers()` cria os usuarios padrao a partir de `defaultAccessUsers`.
- Os usuarios existentes nao sao sobrescritos quando a chave ja possui dados validos.

## Onde as senhas locais sao persistidas

Tipo:

`modules/access/access-types.ts`

Campo:

`User.senha`

Storage:

Dentro do array JSON salvo em `localStorage["evolv.users.v1"]`.

Autenticacao local:

`authenticateUser(usuario, senha)` compara:

- `user.ativo === true`
- `user.usuario === usuario.trim()`
- `user.senha === senha.trim()`

Nao ha hash criptografico no login local atual. Esta e uma camada provisoria herdada do MVP.

## Usuario Camille no seed local

Arquivo:

`modules/access/access-engine.ts`

Usuario master padrao:

```ts
{
  id: "default-admin-bruno",
  nome: "Camille",
  usuario: "admin",
  senha: "123456",
  role: "admin",
  ativo: true,
  mustChangePassword: true
}
```

Observacao critica:

No modo local, o login espera `usuario`, nao e-mail. Portanto, se Camille tentar entrar com `camille@temperlandia.com.br`, esse identificador so autenticara se existir um usuario local com:

```ts
usuario: "camille@temperlandia.com.br"
```

Caso contrario, a tentativa sera invalida e incrementara o lockout para a chave normalizada `camille@temperlandia.com.br`.

## Onde o mecanismo de lockout esta implementado

Arquivo:

`modules/access/access-storage.ts`

Chave:

`evolv.login-attempts.v1`

Storage:

`window.localStorage`

Constantes:

```ts
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_DURATION_MS = 15 * 60 * 1000;
```

Tipo interno:

```ts
type LoginAttemptRecord = {
  blockedUntil?: number;
  failedAttempts: number;
  updatedAt: number;
};
```

Funcoes:

- `getLoginAttemptBlockStatus(identifier)`
- `registerFailedLoginAttempt(identifier)`
- `clearLoginAttempts(identifier)`
- `readLoginAttempts()`
- `saveLoginAttempts(attempts)`
- `normalizeLoginIdentifier(identifier)`

## Como o contador de tentativas invalidas funciona

Fluxo na tela:

`components/access/login-page.tsx`

1. Ao submeter login local, a tela chama `getLoginAttemptBlockStatus(usuario)`.
2. Se o identificador estiver bloqueado, nao chama `authenticateUser`.
3. Se nao estiver bloqueado, chama `authenticateUser(usuario, senha)`.
4. Se a autenticacao falhar, chama `registerFailedLoginAttempt(usuario)`.
5. Se a autenticacao funcionar, chama `clearLoginAttempts(usuario)` e `saveCurrentUser(user)`.

Regra do contador:

- A chave do contador e `identifier.trim().toLowerCase()`.
- Se o usuario digitado for `camille@temperlandia.com.br`, a chave sera `camille@temperlandia.com.br`.
- Se o usuario digitado for `admin`, a chave sera `admin`.
- Se o campo estiver vazio, a chave sera `__empty__`.

Portanto, o bloqueio de `camille@temperlandia.com.br` nao bloqueia automaticamente `admin`, e vice-versa.

## Como o tempo de bloqueio e calculado

Ao registrar falha:

```ts
const failedAttempts = (currentAttempt?.failedAttempts ?? 0) + 1;
const blockedUntil =
  failedAttempts >= MAX_LOGIN_ATTEMPTS
    ? now + LOGIN_BLOCK_DURATION_MS
    : undefined;
```

Com valores atuais:

- maximo: 5 tentativas invalidas;
- duracao: 15 minutos;
- `blockedUntil`: timestamp em milissegundos baseado em `Date.now()`.

Ao consultar status:

```ts
remainingMinutes = Math.max(1, Math.ceil((blockedUntil - now) / 60000))
```

Se `blockedUntil` ja passou:

- retorna `{ blocked: false, remainingMinutes: 0 }`;
- o registro antigo pode continuar salvo, mas nao bloqueia.

## Sessao local

Chave:

`evolv.current-user.v1`

Storage atual:

`window.sessionStorage`

Comportamento:

- `loadCurrentUser()` remove qualquer sessao antiga em `localStorage`.
- Depois busca `sessionStorage["evolv.current-user.v1"]`.
- Logout remove a chave de `sessionStorage` e tambem limpa eventual chave antiga em `localStorage`.

Isso significa que fechar aba/navegador exige novo login, conforme sprint de sessao temporaria.

## Existe mecanismo interno de reset seguro?

Sim, mas com limites importantes.

### Reset por gestao de usuarios

Arquivo:

`components/access/access-settings-page.tsx`

A tela de configuracoes permite `Redefinir` para usuarios comuns, chamando:

```ts
resetUserPassword(user.id, "123456")
```

Arquivo:

`modules/access/access-storage.ts`

`resetUserPassword(userId, senha)`:

- redefine `senha`;
- marca `mustChangePassword: true`;
- salva em `evolv.users.v1`.

### Limite do reset

`resetUserPassword()` bloqueia o master admin:

```ts
if (!targetUser || isMasterAdmin(targetUser)) {
  return users;
}
```

E `isMasterAdmin(user)` retorna verdadeiro quando:

```ts
user.usuario === "admin"
```

Portanto:

- Bruno ou outro admin podem resetar usuarios comuns.
- O usuario master `admin` nao pode ser resetado pela UI atual.
- A UI atual tambem nao oferece limpeza especifica do lockout.

## Diagnostico provavel para Camille

Ha dois cenarios possiveis:

### Cenario A - Lockout por identificador errado

Camille tentou login local usando:

`camille@temperlandia.com.br`

Mas o usuario master local padrao e:

`admin`

Nesse caso:

- `camille@temperlandia.com.br` pode estar bloqueado em `evolv.login-attempts.v1`;
- `admin` pode continuar desbloqueado;
- entrar com `admin` e a senha correta deve funcionar, salvo se `admin` tambem estiver bloqueado ou a senha tiver sido alterada.

### Cenario B - Senha local desconhecida ou usuario alterado

Se `admin` teve a senha alterada e Camille nao sabe a senha atual, o reset pela UI nao resolve porque master admin e protegido.

Nesse caso, uma recuperacao segura exige procedimento excepcional e exclusivo para Camille, aprovado em sprint separada.

## Estrategia recomendada de recuperacao exclusiva para camille@temperlandia.com.br

### Etapa 1 - Confirmacao operacional sem alterar dados

Antes de qualquer mudanca:

1. Confirmar se `NEXT_PUBLIC_USE_SUPABASE_AUTH=false`.
2. Confirmar se a tela mostra `Usuario`, nao `E-mail`.
3. Confirmar qual identificador Camille esta digitando:
   - `admin`;
   - `camille@temperlandia.com.br`;
   - outro.
4. Aguardar 15 minutos se houver bloqueio e testar o identificador correto `admin`.

Esta etapa nao altera dados.

### Etapa 2 - Desbloqueio local exclusivo do identificador

Se for confirmado que apenas `camille@temperlandia.com.br` esta bloqueado, a recuperacao mais conservadora e remover somente a entrada desse identificador em:

`localStorage["evolv.login-attempts.v1"]`

Chave interna:

`camille@temperlandia.com.br`

Isso nao altera usuarios, senhas, Bruno, SDRs, CRM, Supabase ou dados comerciais.

Esta operacao deve ser feita somente apos aprovacao explicita da Camille, idealmente como Sprint 97.3F.1.

### Etapa 3 - Se a senha do master admin estiver perdida

Se o problema nao for apenas lockout, mas senha perdida do master admin `admin`, existem duas opcoes:

1. Criar uma Sprint 97.3F.1 com procedimento manual e auditavel para ajustar apenas o usuario master Camille no `evolv.users.v1`, definindo senha temporaria e `mustChangePassword: true`.
2. Evitar alterar Bruno, SDRs e qualquer outro usuario.

Recomendacao de seguranca:

- O procedimento deve ser restrito ao usuario:
  - `usuario: "admin"`; ou
  - `usuario: "camille@temperlandia.com.br"`, se esse usuario existir localmente.
- Deve preservar `id`, `role`, `ativo`, `createdAt` e demais usuarios.
- Deve definir `mustChangePassword: true`.
- Deve limpar apenas o lockout do mesmo identificador.

## Proposta para futura Sprint 97.3F.1

Se Camille aprovar implementacao futura, a sprint deve ser cirurgica:

1. Criar um runbook/documento de recuperacao local.
2. Gerar um snippet manual para o navegador da Camille, sem tocar codigo do app.
3. O snippet deve:
   - ler `evolv.users.v1`;
   - localizar exclusivamente `usuario === "admin"` ou `usuario === "camille@temperlandia.com.br"`;
   - atualizar apenas `senha` e `mustChangePassword`;
   - limpar apenas `evolv.login-attempts.v1["camille@temperlandia.com.br"]` e/ou `["admin"]`, conforme o caso aprovado;
   - nao alterar Bruno;
   - nao alterar SDRs;
   - nao alterar outros campos;
   - nao tocar CRM.

Nada disso foi implementado nesta sprint.

## Arquivos que nao devem ser tocados para esta recuperacao

- `modules/crm/*`
- `components/crm/*`
- `modules/crm/repositories/*`
- `supabase/*`
- `.env`
- `.env.example`
- `app/page.tsx`
- qualquer arquivo de migrations

## Confirmacoes

- Nenhuma alteracao funcional foi realizada.
- Nenhum dado foi alterado.
- Nenhum SQL foi executado.
- Nenhum deploy foi realizado.
- Bruno deve perceber zero diferenca operacional.
- Esta sprint e exclusivamente investigativa.
