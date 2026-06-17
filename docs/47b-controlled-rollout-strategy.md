# Sprint 101B.14 — Controlled Rollout Strategy

## Objetivo

Definir uma estrategia segura para aplicar futuramente o hardening de RLS de `crm_leads` sem interromper CRM, Auth, Recovery ou Lead Notes.

## Fase 0 — Preflight

Confirmar antes de qualquer execucao:

- backup disponivel;
- producao estavel;
- Auth funcionando;
- Recovery funcionando;
- CRM funcionando;
- Lead Notes funcionando;
- funcoes organizacionais presentes;
- grants das funcoes corretos;
- bridge policies atuais mapeadas.

## Fase 1 — Criar policies organization-scoped

Adicionar novas policies para `authenticated`:

- `SELECT` por mesma organizacao;
- `UPDATE` por mesma organizacao.

Nao remover nada nesta fase.

## Fase 2 — Convivencia controlada

Manter temporariamente:

- bridge policies atuais;
- policies novas organization-scoped.

Validar fluxos:

- login;
- listar leads;
- abrir lead;
- editar lead;
- criar/listar notas;
- recovery;
- refresh de pagina.

## Fase 3 — Remover policies anon

Se a validacao passar, remover primeiro:

- `Allow public read crm_leads`;
- `Allow public update crm_leads`.

Validar novamente todos os fluxos operacionais.

## Fase 4 — Remover bridge authenticated

Se a validacao apos remover `anon` passar, remover:

- `Authenticated bridge read crm_leads`;
- `Authenticated bridge update crm_leads`.

Validar novamente.

## Fase 5 — Baseline final

Registrar evidencia:

- policies finais;
- RLS enabled;
- grants;
- CRM operacional;
- Auth operacional;
- Recovery operacional;
- Lead Notes operacional.

## Criterios objetivos para continuar

Continuar entre fases apenas se:

- nenhum erro de permissao surgir;
- CRM seguir operacional;
- Auth seguir operacional;
- Recovery seguir operacional;
- Lead Notes seguir operacional;
- os dados nao forem alterados indevidamente.

## Criterios objetivos para abortar

Abortar se:

- qualquer fluxo operacional falhar;
- houver erro de RLS inesperado;
- `organization_id` retornar nulo para usuario valido;
- `authenticated` nao conseguir operar o CRM;
- existir evidencia de acesso fora da organizacao.

## Observacao sobre Dual Pipeline

O Dual Pipeline deve aguardar o baseline final de `crm_leads`, porque `crm_stage_events` e `crm_green_flags` devem herdar o modelo final, nao o modelo bridge.
