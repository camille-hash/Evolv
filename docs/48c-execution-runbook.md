# Sprint 101B.15 — Execution Runbook

## Objetivo

Orientar uma futura execucao manual supervisionada da primeira fase do hardening de `crm_leads`.

## Regra principal

Nesta fase, criar apenas as duas policies organization-scoped. Nao remover nenhuma bridge policy.

## Ordem de execucao futura

1. confirmar preflight em [48a-preflight-checklist.md](C:\Projetos\Evolv-Auth\docs\48a-preflight-checklist.md);
2. registrar `count crm_leads` antes;
3. executar manualmente `20260617_sprint101b15_rls_apply.sql`;
4. executar manualmente `20260617_sprint101b15_rls_validation.sql`;
5. executar smoke tests em [48b-smoke-test-procedure.md](C:\Projetos\Evolv-Auth\docs\48b-smoke-test-procedure.md);
6. registrar `count crm_leads` depois;
7. documentar evidencia sanitizada;
8. decidir manter ou acionar rollback.

## O que o apply deve criar

- `crm_leads authenticated read same organization`;
- `crm_leads authenticated update same organization`.

## O que o apply nao deve fazer

- nao remover policies anon;
- nao remover bridge authenticated;
- nao alterar dados;
- nao alterar tabelas;
- nao alterar `profiles`;
- nao alterar Auth;
- nao alterar Recovery;
- nao alterar Lead Notes.

## Criterios para manter o apply

Manter se:

- validation SQL confirmar as duas policies novas;
- bridge policies continuarem presentes;
- CRM passar;
- Auth passar;
- Recovery passar;
- Lead Notes passar;
- contagem de `crm_leads` nao divergir.

## Criterios para abortar a janela

Abortar se ocorrer:

- CRM indisponivel;
- Auth indisponivel;
- Lead Notes indisponivel;
- Recovery indisponivel;
- divergencia de contagem;
- erro de policy;
- erro de RLS;
- erro de organizacao;
- qualquer duvida sobre ambiente ou SQL executado.

## Evidencia a registrar

- data e hora;
- operadora;
- ambiente;
- count antes/depois;
- policies novas presentes;
- bridge policies presentes;
- resultado dos smoke tests;
- decisao final.
