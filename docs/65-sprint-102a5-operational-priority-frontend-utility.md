# Sprint 102A.5 - Operational Priority Frontend Utility

## Objective

Implement `Prioridade operacional` as a frontend-only derived utility for EVOLV CRM.

The feature helps Bruno answer:

```text
Quem requer acao agora?
```

No SQL was created or executed. No database schema, Auth, RLS, policy, Supabase, repository, automation, notification, scheduler, AI or integration behavior was changed.

## Files Created

- `modules/crm/crm-operational-priority.ts`
- `docs/65-sprint-102a5-operational-priority-frontend-utility.md`

## Files Changed

- `modules/crm/index.ts`
- `modules/crm/crm-engine.ts`
- `components/crm/crm-page.tsx`
- `components/crm/crm-lead-detail.tsx`

## Utility

Created:

```text
modules/crm/crm-operational-priority.ts
```

Main exports:

- `CrmOperationalPriority`
- `CrmOperationalPriorityFilter`
- `CrmLeadOperationalPriority`
- `crmOperationalPriorityLabels`
- `resolveCrmLeadOperationalPriority`
- `buildCrmOperationalPrioritySummary`
- `matchesCrmOperationalPriorityFilter`

The utility derives priority from existing `CrmLead` fields only:

- `status`
- `proximaAcao`
- `dataProximaAcao`

The calculation is not persisted.

## Priority States

Implemented states:

- `Acao vencida`
- `Acao hoje`
- `Acao sem data`
- `Data sem acao`
- `Sem proxima acao`
- `Acao proxima`
- `Agendado`
- `Fora da fila ativa`

Hierarchy:

1. `Acao vencida`
2. `Acao hoje`
3. `Acao sem data`
4. `Data sem acao`
5. `Sem proxima acao`
6. `Acao proxima`
7. `Agendado`
8. `Fora da fila ativa`

## UI Placement

Operational Priority now appears in:

- pipeline cards;
- Meu Dia cards;
- Base table;
- lead dossier header;
- `Proxima Acao` card inside the dossier.

Commercial Signal remains visible and unchanged.

## Filter

Added advanced filter:

```text
Prioridade operacional
```

Options:

- `Todas`
- `Acoes vencidas`
- `Acoes hoje`
- `Sem proxima acao`
- `Planejamento incompleto`

`Planejamento incompleto` groups:

- `Acao sem data`
- `Data sem acao`

## KPIs

Added compact KPI counters:

- `Acoes vencidas`
- `Acoes hoje`
- `Sem proxima acao`

These counters are derived from the currently filtered lead set.

## Commercial Signal Preservation

The existing `Sinal comercial` remains preserved:

- `Quente`
- `Morno`
- `Frio`
- `Abandonado`
- `Sem sinal`

Operational Priority is a second layer and does not replace or reinterpret Commercial Signal.

## Non-Persistence Confirmation

This sprint did not:

- create SQL;
- execute SQL;
- add database fields;
- write priority to Supabase;
- write priority to localStorage;
- alter repositories;
- alter Auth;
- alter RLS;
- alter policies;
- alter Supabase configuration;
- create automations;
- create notifications;
- create schedulers;
- create AI features;
- create external integrations.

## Validation Plan

Required commands:

```text
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Manual checks:

1. Open CRM.
2. Confirm pipeline cards show Operational Priority.
3. Confirm Meu Dia cards show Operational Priority.
4. Confirm Base table shows Operational Priority.
5. Confirm lead dossier header shows Operational Priority.
6. Confirm `Proxima Acao` card shows Operational Priority.
7. Filter by each priority option.
8. Confirm Commercial Signal remains visible.
9. Confirm no data is persisted by the priority calculation.

## Risks

| Risk | Mitigation |
| --- | --- |
| Imported leads create a large `Sem proxima acao` queue | Treat it as triage inventory |
| Additional badges clutter cards | Badges are compact and reuse the existing visual language |
| Users confuse Commercial Signal and Operational Priority | Labels remain distinct |
| Date without action or action without date feels noisy | Grouped as `Planejamento incompleto` in filter |

## Next Sprint Recommendation

Recommended next sprint:

```text
Sprint 102A.6 - Operational Priority Manual QA and Calibration
```

Goal:

- validate with Bruno whether the hierarchy improves daily use;
- decide if `Planejamento incompleto` deserves its own KPI;
- tune the 1-3 day `Acao proxima` window if needed.

