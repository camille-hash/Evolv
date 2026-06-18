# Sprint 102A.6.2 - CRM Card Visual Simplification

## Objective

Simplify CRM lead cards so Bruno can scan the pipeline faster with less reading and more visual perception.

## User Feedback Summary

The previous CRM Intelligence layers worked technically, but the cards became visually crowded when multiple automatic signals appeared near the lead name.

The clarified direction:

- keep manual temperature visible;
- remove automatic signal competition from the card header;
- preserve full-card aging as the main visual diagnostic;
- move operational status to a secondary area.

## Before / After Card Structure

### Before

Top area could visually compete with multiple signals:

```text
Lead name
[Morna] [Quente] [Sem proxima acao]
```

This mixed:

- manual commercial temperature;
- automatic commercial signal;
- operational priority.

### After

Top area:

```text
Lead name
[Morna]
```

Middle area:

```text
Value / compact metadata
```

Footer area:

```text
Sem proxima acao     Edit
```

Card container:

```text
Background color indicates operational aging.
```

## What Was Removed From Cards

Automatic `Sinal comercial` badges remain removed from lead cards.

Examples no longer competing in card headers:

- `Quente`
- `Morno`
- `Frio`
- `Abandonado`
- `Sem sinal`

This only affects card presentation. The commercial signal logic, filters and metrics remain available elsewhere where already implemented.

## What Was Preserved

Preserved on cards:

- manual `temperatura`;
- lead name;
- compact value/action metadata;
- edit behavior;
- click/open behavior;
- drag and drop behavior;
- full-card operational aging.

Manual temperature remains untouched and continues to represent human/commercial judgment.

## What Was Moved To Footer

Operational priority/status now appears in the lower part of lead cards, near the edit action.

Examples:

- `Sem proxima acao`
- `Acao vencida`
- `Acao hoje`
- `Acao sem data`
- `Data sem acao`
- `Fora da fila ativa`

This keeps the operational diagnosis available without competing with manual temperature in the header.

## Operational Aging

Operational Aging remains applied to the full lead card container.

Thresholds remain unchanged:

- `0-2 days`: neutral/default card;
- `3-5 days`: soft cream / attention;
- `6+ days`: soft rose / terracotta / stale;
- `unknown`: neutral.

The field remains:

```text
updatedAt
```

No aging state is persisted.

## Scope Confirmation

This sprint did not:

- create SQL;
- execute SQL;
- alter database schema;
- alter Supabase;
- alter Auth;
- alter RLS;
- alter policies;
- alter repositories;
- persist new state;
- create filters;
- create KPIs;
- create automations;
- create notifications;
- create schedulers;
- create AI/ML logic;
- touch simulator, proposals, notes server logic, recovery, profiles, organizations or auth helpers.

## Validation Results

Required commands:

```text
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Results are recorded in the sprint completion report.

