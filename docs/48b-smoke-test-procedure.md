# Sprint 101B.15 — Smoke Test Procedure

## Objetivo

Validar que a futura criacao das policies organization-scoped nao causou regressao operacional.

## CRM

Executar:

1. abrir CRM;
2. listar leads;
3. abrir lead;
4. editar lead;
5. salvar lead;
6. atualizar a pagina;
7. confirmar que o lead continua visivel.

Resultado esperado:

- nenhum erro de permissao;
- nenhum erro de RLS;
- lead salvo normalmente.

## Auth

Executar:

1. logout;
2. login;
3. navegar para o CRM;
4. logout novamente.

Resultado esperado:

- login e logout funcionam;
- app carrega profile normalmente;
- nenhum erro de acesso.

## Recovery

Executar:

1. iniciar fluxo de recuperacao;
2. confirmar que a tela/fluxo esperado permanece acessivel;
3. nao alterar senha em producao sem autorizacao operacional especifica.

Resultado esperado:

- fluxo continua acessivel;
- nenhuma regressao visual ou funcional.

## Lead Notes

Executar:

1. abrir lead;
2. visualizar notas;
3. criar nota;
4. confirmar nota na timeline;
5. editar nota, se o fluxo atual ja suportar edicao;
6. confirmar persistencia.

Resultado esperado:

- notas continuam sendo listadas;
- criacao funciona;
- edicao funciona quando disponivel no produto atual;
- nenhum erro de RLS.

## Banco

Registrar:

- `count crm_leads` antes;
- `count crm_leads` depois;
- `organization_id` nulo antes;
- `organization_id` nulo depois.

Resultado esperado:

- contagem antes = contagem depois;
- nulos antes = nulos depois;
- nenhuma alteracao de dados causada pela mudanca de policy.

## Criterios de sucesso

Todos os blocos precisam passar:

- CRM;
- Auth;
- Recovery;
- Lead Notes;
- Banco.

## Criterios de falha

Falha se houver:

- CRM indisponivel;
- Auth indisponivel;
- Recovery indisponivel;
- Lead Notes indisponivel;
- divergencia de contagem;
- erro de policy;
- erro de RLS;
- erro de organizacao.
