# Sprint 102A.2 - CRM Intelligence v1 Frontend Derived Signal

## Objective

Implement the first visible CRM Intelligence layer in the EVOLV frontend, helping Bruno identify which leads deserve attention today through a derived commercial signal.

## Implementation Summary

Created a frontend-only derived signal called:

```text
Sinal comercial
```

The signal is calculated from `CrmLead.updatedAt` and is not persisted.

No database, Supabase, Auth, RLS, policy, repository or server-side notes behavior was changed.

## Files Created

- `modules/crm/crm-intelligence.ts`
- `docs/62-sprint-102a2-crm-intelligence-v1-frontend-derived-signal.md`

## Files Changed

- `modules/crm/index.ts`
- `modules/crm/crm-engine.ts`
- `components/crm/crm-page.tsx`
- `components/crm/crm-lead-detail.tsx`

## Signal Model

Internal values:

- `hot`
- `warm`
- `cold`
- `abandoned`
- `unknown`

Portuguese labels:

- `Quente`
- `Morno`
- `Frio`
- `Abandonado`
- `Sem sinal`

## Algorithm

Recency source:

```text
updatedAt
```

Thresholds:

- `Quente`: 0-7 days
- `Morno`: 8-21 days
- `Frio`: 22-45 days
- `Abandonado`: more than 45 days
- `Sem sinal`: no reliable date

The calculation compares UTC calendar days to avoid most frontend timezone drift.

## UI Placement

The signal appears in:

- pipeline lead cards;
- daily lead cards;
- base table;
- lead dossier header.

The existing manual `temperatura` badge remains unchanged.

## Filter Added

Added a new advanced search filter:

```text
Sinal comercial
```

Options:

- `Todos`
- `Quentes`
- `Mornos`
- `Frios`
- `Abandonados`
- `Sem sinal`

The existing manual `Temperatura` filter remains unchanged.

## KPIs Added

Added compact KPI counters:

- `Sinal quente`
- `Abandonados`

The counters use only active leads from the currently filtered result set.

## Architecture

The implementation uses a pure utility module:

```text
modules/crm/crm-intelligence.ts
```

Exports include:

- `CrmCommercialSignal`
- `CrmCommercialSignalFilter`
- `resolveCrmLeadCommercialSignal`
- `buildCrmCommercialSignalSummary`
- `crmCommercialSignalLabels`

The calculated signal is derived at render/filter time.

## Non-Persistence Confirmation

This sprint did not:

- add a database field;
- create SQL;
- execute SQL;
- write calculated signal to Supabase;
- write calculated signal to localStorage;
- overwrite `temperatura`;
- reinterpret manual `temperatura`.

## Validation Plan

Required validations:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

Manual checks:

1. open CRM;
2. confirm lead cards show commercial signal;
3. confirm dossier header shows commercial signal;
4. filter by each signal option;
5. confirm manual `Temperatura` still exists and behaves independently;
6. confirm no Auth/RLS/database behavior changed.

## Risks

| Risk | Mitigation |
| --- | --- |
| `updatedAt` may reflect administrative edits | Label is `Sinal comercial`, not a prediction |
| Confusion with manual `temperatura` | Existing badge/filter remains separate |
| More visual density in cards | Badge is compact and uses current visual language |
| Imported old leads may show abandoned | Treat as reactivation inventory |

## Next Sprint Recommendation

Recommended next sprint:

```text
Sprint 102A.3 - CRM Intelligence Calibration and Manual QA
```

Goal:

- validate thresholds with real EVOLV usage;
- decide whether `Frio` KPI should be shown;
- prepare future migration from `updatedAt` to `last_stage_changed_at` only after that field is safely exposed.
