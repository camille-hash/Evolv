# Sprint 101B.15 — CRM Leads RLS Hardening Controlled Apply Plan

## Objetivo

Montar o pacote operacional completo para uma futura execucao controlada da primeira fase de hardening de RLS em `public.crm_leads`.

Esta sprint nao executa SQL e nao altera Supabase. Ela apenas prepara:

- plano de apply;
- checklist de preflight;
- procedimento de smoke test;
- runbook de execucao;
- runbook de rollback;
- SQLs futuros de apply, validation e rollback.

## Estado confirmado

- producao estavel;
- CRM funcionando;
- Auth funcionando;
- Recovery funcionando;
- Lead Notes funcionando;
- `public.evolv_current_organization_id()` existe em producao;
- `public.evolv_current_role()` existe em producao;
- nenhuma policy de `crm_leads` foi alterada ate o momento.

## Escopo da futura execucao

A futura execucao deve criar apenas duas policies novas:

- organization-scoped `SELECT`;
- organization-scoped `UPDATE`.

Ambas baseadas em:

```text
organization_id = public.evolv_current_organization_id()
```

## Fora do escopo da futura execucao

Nao remover nesta fase:

- `Allow public read crm_leads`;
- `Allow public update crm_leads`;
- `Authenticated bridge read crm_leads`;
- `Authenticated bridge update crm_leads`.

As novas policies devem coexistir temporariamente com as policies atuais.

## Racional da convivencia

Como `crm_leads` e a tabela operacional central do CRM, a primeira fase deve reduzir risco introduzindo o caminho seguro sem desligar o caminho legado. A remocao das bridges deve ser feita apenas em uma sprint posterior, depois de smoke tests e baseline positivos.

## Resultado esperado

Apos uma futura execucao bem-sucedida:

- as duas policies organization-scoped existem;
- bridge policies continuam intactas;
- CRM continua funcionando;
- Auth continua funcionando;
- Recovery continua funcionando;
- Lead Notes continua funcionando;
- contagem de `crm_leads` nao diverge.

## Criterio para avancar apos esta fase

So avancar para remocao de bridge policies se:

- todos os smoke tests passarem;
- validation SQL confirmar policies novas;
- nenhuma regressao operacional ocorrer;
- contagem de `crm_leads` antes e depois for consistente;
- rollback estiver disponivel e revisado.
