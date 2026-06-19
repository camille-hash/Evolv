# Sprint 103A.44 - Lead Simulation Timeline Integration

## Objetivo

Integrar eventos persistidos de criacao de simulacoes na Timeline Operacional existente do Lead, sem criar uma timeline paralela ou uma nova fonte de verdade.

## Arquivos criados

- `docs/110-sprint-103a44-lead-simulation-timeline-integration.md`

## Arquivos alterados

- `modules/crm/crm-timeline.ts`
- `modules/crm/server/crm-timeline-service.ts`
- `components/crm/crm-lead-detail.tsx`

## Eventos implementados

### Simulacao Comercial criada

Derivado de:

- `crm_lead_simulations.simulation_type = commercial`
- `crm_lead_simulations.created_at`
- `crm_lead_simulations.created_by`

### Estudo Multi-Cotas criado

Derivado de:

- `crm_lead_simulations.simulation_type = multi_cotas`
- `crm_lead_simulations.created_at`
- `crm_lead_simulations.created_by`

## Read model server-side

O service da Timeline agora consulta tres fontes persistidas do lead:

- `crm_lead_notes`;
- `crm_tasks`;
- `crm_lead_simulations`.

As simulacoes sao mapeadas para eventos canonicos, recebem autoria resolvida por `profiles` e passam pela ordenacao existente de `occurredAt DESC`, com desempate deterministico.

Cada evento de simulacao inclui como descricao o titulo salvo, quando disponivel.

## Exibicao

Os novos eventos aparecem na Timeline Operacional ja existente, com labels discretos:

- `Simulacao Comercial criada`;
- `Estudo Multi-Cotas criado`.

Nenhuma tela de Timeline paralela foi criada.

## Pendencias deliberadas

### `MULTI_COTAS_VIEWED`

Nao foi implementado.

A visualizacao de um estudo nao possui timestamp, autoria ou fonte persistida no schema atual. Criar um evento apenas no client faria o registro desaparecer no reload; gravar em notes ou em JSONB alteraria a semantica e fragmentaria a auditoria.

Esse evento exige sprint futura especifica de modelagem de auditoria/eventos persistidos.

### `COMMERCIAL_PROPOSAL_GENERATED`

Nao foi integrado nesta sprint.

O schema possui `proposal_generated_at`, mas nao existe ponto de fluxo de proposta conectado que acione a atualizacao server-side de forma segura. A integracao fica para uma sprint propria do fluxo de proposta.

## Fora do escopo confirmado

- Nenhuma tabela, migration ou SQL foi criado.
- Nenhuma alteracao de Auth, RLS ou policy foi realizada.
- Nenhuma gravacao client-only foi criada.
- Nenhum evento retroativo foi produzido.
- Nenhuma arquitetura de `crm_lead_simulations` foi alterada.

## Validacao manual recomendada

1. Abrir um lead com Simulacao Comercial salva.
2. Abrir a Timeline Operacional e confirmar `Simulacao Comercial criada`.
3. Abrir um lead com estudo Multi-Cotas salvo.
4. Confirmar `Estudo Multi-Cotas criado` na mesma Timeline.
5. Confirmar ordem cronologica, autoria e titulo de cada estudo.
6. Abrir um estudo Multi-Cotas e confirmar que nenhum evento de visualizacao novo e criado nesta sprint.

## Validacoes tecnicas

Executar:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- `git status`
- `git diff --stat`

## Recomendacao para proxima sprint

Projetar a modelagem de auditoria persistida para eventos de visualizacao antes de implementar `MULTI_COTAS_VIEWED`.
