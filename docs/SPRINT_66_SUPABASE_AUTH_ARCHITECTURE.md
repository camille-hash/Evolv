# Sprint 66 - Arquitetura para Supabase Auth

## Diagnostico atual da autenticacao local

O EVOLV possui uma autenticacao local funcional, baseada em armazenamento do navegador.

Atualmente:

- os usuarios cadastrados ficam em `localStorage`, na chave `evolv.users.v1`;
- a sessao atual fica em `sessionStorage`, na chave `evolv.current-user.v1`;
- o login compara usuario e senha localmente;
- a troca obrigatoria de senha altera o registro local do usuario;
- as permissoes sao derivadas do campo `role`, com os perfis `admin` e `sdr`;
- o usuario `admin` e tratado como Administrador Master protegido;
- nao existe `middleware.ts` no projeto;
- a protecao de acesso acontece no cliente, principalmente em `app/page.tsx`.

Esse modelo atende a validacao operacional inicial, mas nao sincroniza usuarios entre navegadores ou maquinas. Usuarios criados em uma maquina nao aparecem automaticamente para Bruno ou SDRs em outros dispositivos.

## Arquivos impactados

Arquivos principais da camada de acesso atual:

- `modules/access/access-types.ts`
- `modules/access/access-engine.ts`
- `modules/access/access-storage.ts`
- `modules/access/index.ts`
- `components/access/login-page.tsx`
- `components/access/access-settings-page.tsx`
- `components/layout/app-sidebar.tsx`
- `app/page.tsx`

Observacao:

- `components/access/demo-access-gate.tsx` tambem utiliza `sessionStorage`, mas pertence a barreira provisoria de demo, nao ao modelo principal de usuarios.
- Outros modulos usam `localStorage` para dados operacionais, mas estao fora do escopo desta migracao de autenticacao.

## Proposta Supabase Auth + profiles

A migracao recomendada e mover exclusivamente identidade, senha, sessao e usuarios para Supabase Auth, mantendo CRM, Multi-Cotas, Simulacao Comercial, PipeRun e calculos intactos.

### Supabase Auth

Responsabilidades futuras:

- login;
- logout;
- sessao;
- senha;
- recuperacao futura de senha;
- criacao de usuarios autenticaveis;
- seguranca centralizada.

### Tabela `profiles`

Criar uma tabela complementar para dados operacionais do usuario:

```sql
profiles
```

Campos sugeridos:

- `id uuid primary key references auth.users(id)`
- `nome text`
- `role text`
- `ativo boolean`
- `is_master_admin boolean`
- `must_change_password boolean`
- `created_at timestamptz`
- `updated_at timestamptz`

Regras conceituais:

- `auth.users` controla identidade e credenciais;
- `profiles` controla papel operacional, status e flags internas;
- `role` deve continuar suportando `admin` e `sdr`;
- o usuario tecnico master deve ser preservado;
- a gestao de usuarios deve ocorrer por fluxo server-side/API com service role;
- nenhuma chave service role deve ser exposta no navegador.

## Plano reversivel

### Fase 1 - Schema

Criar a tabela `profiles` e politicas RLS planejadas, sem conectar o app.

### Fase 2 - Camada de abstracao

Criar uma camada futura de acesso/repository para separar componentes visuais da fonte de dados.

Inicialmente:

- implementation local continua usando `localStorage` e `sessionStorage`;
- comportamento atual permanece funcionando.

### Fase 3 - Supabase Auth em paralelo

Adicionar Supabase Auth atras de configuracao/feature flag, sem remover a autenticacao local.

### Fase 4 - Migrar login e sessao

Substituir gradualmente:

- `authenticateUser`;
- `saveCurrentUser`;
- `loadCurrentUser`;
- `clearCurrentUser`;
- `changeUserPassword`.

### Fase 5 - Migrar gestao de usuarios

Mover criacao, edicao, ativacao, reset de senha e perfis para rotas server-side/API.

### Fase 6 - Middleware

Adicionar `middleware.ts` para protecao real de rotas/sessao.

### Fase 7 - Validacao operacional

Validar:

- Camille admin master;
- Bruno admin;
- SDRs com acesso restrito;
- troca obrigatoria de senha;
- logout;
- permissao por perfil;
- acesso ao CRM.

### Fase 8 - Remocao do modelo local

Somente apos validacao completa:

- remover seed local;
- remover autenticacao local;
- manter apenas Supabase Auth.

## Confirmacao de escopo

Esta preparacao arquitetural nao altera:

- CRM;
- dados importados do PipeRun;
- Simulacao Comercial;
- Multi-Cotas;
- PDFs;
- Supabase em runtime;
- calculos financeiros;
- engines patrimoniais;
- dados dos 763 leads.

Esta sprint nao implementa Supabase Auth e nao remove a autenticacao local existente.

## Validacoes executadas

Na auditoria da Sprint 66, foram executados:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Resultado:

- lint aprovado;
- typecheck aprovado;
- build aprovado.
