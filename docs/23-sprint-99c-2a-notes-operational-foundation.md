# Sprint 99C.2A - Fundacao Operacional Das Notas

## Objetivo

Preparar a camada tecnica minima para acesso futuro a `public.crm_lead_notes`, sem conectar essa camada a UI e sem permitir criacao de notas pela interface nesta sprint.

## Arquitetura Criada

Foram adicionados:

- tipos persistentes de nota em `modules/crm/crm-lead-notes.ts`;
- repository isolado em `modules/crm/repositories/crm-lead-notes-repository.ts`;
- exports controlados no modulo CRM.

## Contrato Preparado

Contrato minimo:

```ts
listCrmLeadNotesByLeadId(leadId: string): Promise<CrmLeadNote[]>
createCrmLeadNote(input: CreateCrmLeadNoteInput): Promise<CrmLeadNote>
```

`createCrmLeadNote` existe apenas como fundacao tecnica e nao foi conectado a nenhum botao, modal ou fluxo visual.

## Regras Respeitadas

- Notas sao internas por padrao.
- Notas pertencem a um lead.
- Notas pertencem a uma organizacao.
- Autoria fica preparada por `authorProfileId`.
- Soft delete e respeitado na listagem via `deleted_at is null`.
- Ordenacao padrao: notas mais recentes primeiro.
- Nao ha filtros nesta sprint.
- Nao ha edicao nesta sprint.
- Nao ha exclusao nesta sprint.

## Seguranca

O repository exige sessao Supabase autenticada antes de listar ou criar notas.

Como a tabela ainda nao possui RLS final validado para uso visual amplo, nenhuma chamada foi conectada a UI nesta sprint. A conexao visual definitiva deve acontecer apenas em sprint posterior, com controle de acesso revisado e validado.

## Impacto Operacional

Impacto para Bruno:

- zero mudanca visual;
- nenhum botao novo;
- nenhum modal novo;
- nenhuma nota criada pela UI;
- nenhum fluxo do CRM alterado.

## Fora Do Escopo

Nao foi alterado:

- Supabase;
- RLS;
- policies;
- grants;
- Auth;
- Shadow Runtime;
- Ownership;
- Observabilidade;
- simulador;
- fallback do CRM;
- `crm_leads`;
- Vercel/deploy.

## Confirmacoes

- Nenhum SQL foi executado.
- Nenhuma migration foi criada.
- Nenhum dado foi alterado.
- Nenhuma policy foi alterada.
- Nenhum grant foi alterado.
- Nenhum RLS foi alterado.
- Nenhum deploy foi realizado.
- Nenhum botao funcional novo foi criado.
- Nenhum modal novo foi criado.
- Nenhuma nota pode ser criada pela interface apos esta sprint.
