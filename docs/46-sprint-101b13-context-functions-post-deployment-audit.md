# Sprint 101B.13 — Context Functions Post-Deployment Audit

## Contexto

A Sprint 101B.12 foi executada manualmente pela operadora e introduziu em producao as funcoes organizacionais canonicas:

- `public.evolv_current_organization_id()`
- `public.evolv_current_role()`

Esta sprint registra a auditoria pos-deploy dessas funcoes e prepara uma linha de base antes de qualquer endurecimento futuro das policies de `crm_leads`.

## O que foi aplicado na 101B.12

Aplicacao manual supervisionada das funcoes:

- resolucao da organizacao atual via `auth.uid()` e `public.profiles`;
- resolucao do papel atual via `auth.uid()` e `public.profiles`;
- grants minimos esperados para uso por `authenticated`;
- sem mudanca nas policies de `crm_leads`.

## Escopo auditado

Esta sprint prepara auditoria read-only para:

- existencia das funcoes;
- tipo de retorno;
- argumentos;
- linguagem;
- volatilidade;
- modo de seguranca;
- `search_path`;
- grants das funcoes;
- chamada direta das funcoes;
- baseline de RLS, policies e grants de `crm_leads` e `profiles`.

## O que nao foi alterado

Esta sprint nao altera:

- policies;
- bridge policies;
- tabelas;
- dados;
- CRM;
- Auth;
- Recovery;
- UI;
- Vercel;
- `.env`;
- funcoes;
- Supabase pelo Codex.

## Riscos restantes

### Policies permissivas em `crm_leads`

As bridge policies ainda nao foram removidas e continuam sendo o principal risco residual antes do hardening final.

### Dependencia de validacao real

As funcoes precisam ter evidencia sanitizada de existencia, grants e comportamento esperado antes de qualquer policy passar a depender delas.

### Risco de SQL Editor retornar nulo

Chamadas diretas em SQL Editor podem retornar `null` se nao houver contexto de JWT autenticado. Isso nao significa necessariamente falha da funcao; deve ser interpretado com cautela.

## Conclusao pos-deploy

O objetivo desta sprint e formar baseline, nao alterar comportamento. A proxima etapa so deve avancar para desenho/execucao de hardening de `crm_leads` se a evidencia pos-deploy confirmar:

- funcoes presentes;
- metadados corretos;
- grants corretos;
- ausencia de grant para `anon`;
- CRM, Auth, Recovery e Lead Notes estaveis;
- bridge policies ainda intactas ate a janela correta.
