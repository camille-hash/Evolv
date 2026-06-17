# Sprint 101B.15 — Preflight Checklist

## Objetivo

Confirmar que a janela futura de apply pode comecar com baixo risco operacional.

## Checklist de ambiente

- Branch correta confirmada:
- Ambiente correto confirmado:
- Operadora responsavel definida:
- Janela operacional aprovada:
- Backup disponivel:
- Plano de rollback revisado:
- SQL de apply revisado:
- SQL de validation revisado:
- SQL de rollback revisado:

## Checklist de produto

- Producao estavel:
- CRM funcionando:
- Auth funcionando:
- Recovery funcionando:
- Lead Notes funcionando:

## Checklist de banco

- `crm_leads` existe:
- `crm_leads` RLS enabled:
- `profiles` RLS enabled:
- `public.evolv_current_organization_id()` existe:
- `public.evolv_current_role()` existe:
- `crm_leads` count antes:
- `crm_leads.organization_id` nulo antes:

## Checklist de policies atuais

Confirmar que ainda existem antes da execucao:

- `Allow public read crm_leads`:
- `Allow public update crm_leads`:
- `Authenticated bridge read crm_leads`:
- `Authenticated bridge update crm_leads`:

## Checklist de abortar antes de executar

Abortar se:

- ambiente estiver incerto;
- backup nao estiver disponivel;
- CRM apresentar instabilidade;
- Auth apresentar instabilidade;
- Recovery apresentar instabilidade;
- Lead Notes apresentar instabilidade;
- funcoes organizacionais nao forem confirmadas;
- contagem de `crm_leads` divergir do baseline esperado.
