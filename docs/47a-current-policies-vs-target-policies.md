# Sprint 101B.14 — Current Policies vs Target Policies

## Current State

Tabela:

- `public.crm_leads`

RLS:

- enabled

## Policies atuais

| Policy | Role | Command | Qual | With check | Risco |
| --- | --- | --- | --- | --- | --- |
| `Allow public read crm_leads` | `anon` | `SELECT` | `true` | n/a | leitura publica permissiva |
| `Allow public update crm_leads` | `anon` | `UPDATE` | n/a | `true` | update publico permissivo |
| `Authenticated bridge read crm_leads` | `authenticated` | `SELECT` | `true` | n/a | leitura autenticada sem escopo |
| `Authenticated bridge update crm_leads` | `authenticated` | `UPDATE` | n/a | `true` | update autenticado sem escopo |

## Problema central

As policies atuais preservam funcionamento, mas nao garantem isolamento por organizacao.

O risco nao esta nos dados atuais de `organization_id`, que ja foram confirmados integros. O risco esta nas conditions permissivas das policies.

## Target State

## Policies alvo

| Policy alvo | Role | Command | Qual | With check | Objetivo |
| --- | --- | --- | --- | --- | --- |
| `crm_leads authenticated read same organization` | `authenticated` | `SELECT` | `organization_id = public.evolv_current_organization_id()` | n/a | leitura apenas na organizacao atual |
| `crm_leads authenticated update same organization` | `authenticated` | `UPDATE` | `organization_id = public.evolv_current_organization_id()` | `organization_id = public.evolv_current_organization_id()` | update apenas na organizacao atual |

## O que deixa de existir no estado alvo

- policy `anon` para leitura operacional;
- policy `anon` para update operacional;
- bridge authenticated com `true`;
- qualquer caminho de `crm_leads` sem scoping organizacional.

## Transicao recomendada

```text
Estado atual permissivo
↓
Adicionar policies organization-scoped
↓
Validar convivencia
↓
Remover policies anon
↓
Remover bridge authenticated
↓
Estado final organization-scoped
```

## Observacao sobre `evolv_current_role()`

Nesta primeira etapa, o role pode nao ser necessario para `SELECT` e `UPDATE`, pois o escopo principal e organizacional.

Mesmo assim, a funcao fica preparada para futuras restricoes, por exemplo:

- delete somente para `admin`;
- operacoes administrativas;
- regras especificas do Dual Pipeline.
