# Sprint 99C.2C - Server Action/API Foundation

## Objetivo

Criar a fundacao server-side minima para notas do Dossie Executivo Vivo, sem conectar nenhuma UI e sem permitir criacao de notas pela interface.

## Arquitetura Implementada

Foi criada uma API route isolada:

```text
app/api/crm/lead-notes/route.ts
```

Ela chama um servico server-side:

```text
modules/crm/server/crm-lead-notes-service.ts
```

Fluxo arquitetural:

```text
Frontend futuro
-> API server-side
-> validar Bearer token Supabase
-> resolver profile
-> validar organization_id
-> validar lead na mesma organizacao
-> listar/criar crm_lead_notes
```

## Operacoes Preparadas

### Listagem

Endpoint preparado:

```text
GET /api/crm/lead-notes?leadId=...
```

Regras:

- exige `Authorization: Bearer <token>`;
- valida sessao Supabase;
- resolve profile ativo;
- valida lead na mesma organizacao;
- ignora notas com `deleted_at`;
- ordena por `created_at desc`.

### Criacao

Endpoint preparado:

```text
POST /api/crm/lead-notes
```

Regras:

- exige `Authorization: Bearer <token>`;
- valida sessao Supabase;
- resolve profile ativo;
- valida lead na mesma organizacao;
- preenche `author_profile_id` no servidor;
- preenche `organization_id` no servidor;
- cria nota como interna.

## UI Nao Conectada

Nenhum componente chama a API nesta sprint.

Portanto:

- Bruno nao ve botao novo;
- Bruno nao ve modal novo;
- nenhuma nota pode ser criada pela interface;
- nenhuma nota pode ser visualizada pela interface.

## Fora Do Escopo

Nao foi alterado:

- Auth;
- Shadow Runtime;
- Ownership;
- Observabilidade;
- simulador;
- fallback do CRM;
- `crm_leads`;
- RLS;
- grants;
- policies;
- banco;
- deploy.

## Proxima Sprint

A Sprint 99C.3 podera conectar o Dossie Executivo Vivo a esta API, desde que a experiencia visual, mensagens de erro e carregamento sejam aprovados antes da implementacao.

## Confirmacoes

- Nenhum SQL foi executado.
- Nenhuma migration foi criada.
- Nenhum dado foi alterado fora de ambiente de desenvolvimento.
- Nenhum deploy foi realizado.
- Nenhuma UI foi conectada.
- Nenhum modal foi criado.
- Nenhum botao funcional novo foi criado.
