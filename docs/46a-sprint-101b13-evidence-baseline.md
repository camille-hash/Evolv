# Sprint 101B.13 — Evidence Baseline

## Objetivo

Padronizar os campos esperados para registrar evidencia sanitizada da auditoria pos-deploy das funcoes organizacionais.

## Metadados da coleta

- Data:
- Hora:
- Operador:
- Ambiente:
- Backup disponivel:
- SQL executado manualmente:
- Evidencia sanitizada revisada:

## Funcoes organizacionais

### `public.evolv_current_organization_id()`

- Funcao existe:
- Retorno esperado:
- Tipo de retorno observado:
- Argumentos:
- Linguagem:
- Volatility:
- Security definer:
- Search path / function config:
- Grant para `authenticated`:
- Grant para `anon` ausente:
- Chamada direta retornou:
- Observacao sobre chamada direta:

### `public.evolv_current_role()`

- Funcao existe:
- Retorno esperado:
- Tipo de retorno observado:
- Argumentos:
- Linguagem:
- Volatility:
- Security definer:
- Search path / function config:
- Grant para `authenticated`:
- Grant para `anon` ausente:
- Chamada direta retornou:
- Observacao sobre chamada direta:

## Observacao sobre retorno nulo no SQL Editor

No SQL Editor, `current_organization_id` e `current_role` podem retornar `null` caso nao exista contexto de requisicao autenticada via JWT. Esse resultado deve ser diferenciado de falha estrutural da funcao.

## Baseline de `crm_leads`

- RLS permanece enabled:
- Policies permanecem inalteradas:
- Bridge policies ainda existem:
- Grants observados:
- Observacoes:

## Baseline de `profiles`

- RLS permanece enabled:
- Policies atuais:
- Grants observados:
- Integridade observada:
- `organization_id` nulo:
- Roles observados:

## Higiene de evidencia

Registrar apenas:

- metadados tecnicos;
- contagens;
- nomes de roles/policies;
- booleanos de permissao;
- conclusoes.

Nao registrar:

- tokens;
- headers;
- secrets;
- connection strings;
- dados pessoais desnecessarios.
