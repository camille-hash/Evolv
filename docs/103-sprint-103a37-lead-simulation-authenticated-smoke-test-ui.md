# Sprint 103A.37 - Lead-Centric Simulation Authenticated Smoke Test UI

## Objetivo

Criar uma pagina temporaria interna para validar o fluxo completo de `crm_lead_simulations` com usuario Supabase autenticado, sem alterar CRM, Simulador Comercial, Multi-Cotas, Timeline ou PDF.

## Arquivos criados

- `app/internal/lead-simulation-smoke-test/page.tsx`
- `docs/103-sprint-103a37-lead-simulation-authenticated-smoke-test-ui.md`

## Arquivos alterados

- Nenhum arquivo existente foi alterado nesta sprint.

## Rota criada

```text
/internal/lead-simulation-smoke-test
```

## Protecao

A pagina verifica a sessao Supabase no client com:

```text
supabase.auth.getSession()
```

Sem sessao Supabase ativa, a pagina bloqueia os controles e orienta o usuario a fazer login no EVOLV antes de executar o smoke test.

## Comportamento implementado

A pagina permite:

- carregar leads existentes via sessao autenticada;
- selecionar um lead;
- clicar em `Criar Simulacao Teste`;
- executar `POST /api/crm/lead-simulations`;
- exibir JSON completo do POST;
- capturar `simulation.id` retornado;
- executar `GET /api/crm/lead-simulations?leadId=<leadId>`;
- executar `GET /api/crm/lead-simulations?simulationId=<simulationId>`;
- exibir JSON completo dos GETs;
- exibir erros completos.

## Campos nao confiaveis

O POST experimental envia intencionalmente:

- `organizationId`;
- `createdBy`.

Esses campos sao enviados para validar que a API/server nao confia neles. A route/server da Sprint 103A.35 nao repassa esses campos para o insert e resolve `organization_id` e `created_by` server-side.

## Escopo preservado

- CRM existente nao foi alterado.
- Simulador Comercial nao foi alterado.
- Multi-Cotas nao foi alterado.
- Timeline nao foi alterada.
- PDF nao foi alterado.
- Nenhum SQL foi criado.
- Nenhum SQL foi executado.
- Banco/Auth/RLS/policies nao foram alterados.

## Validacoes executadas

```text
npm.cmd run typecheck
```

Resultado: passou.

```text
npm.cmd run lint
```

Resultado: passou com 4 warnings preexistentes em `components/crm/crm-page.tsx`.

```text
npm.cmd run build
```

Resultado: passou e confirmou a rota `/internal/lead-simulation-smoke-test`.

## Limitacoes conhecidas

- A pagina nao faz login por conta propria.
- A pagina depende de sessao Supabase ja ativa no navegador.
- A pagina nao foi conectada ao menu principal.
- A pagina nao deve ser removida ao final da sprint.

## Recomendacao para Sprint 103A.38

Executar o smoke test autenticado com Camille/Bruno em ambiente controlado e registrar evidencias sanitizadas:

- lead selecionado;
- POST com sucesso;
- GET por lead;
- GET por simulationId;
- verificacao de que `organizationId` e `createdBy` falsos nao foram gravados.
