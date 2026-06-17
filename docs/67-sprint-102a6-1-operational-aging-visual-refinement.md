# Sprint 102A.6.1 - Operational Aging Visual Refinement

## Objective

Refine Operational Aging so the CRM pipeline can be scanned visually without reading extra labels.

The goal is:

```text
Less reading. More perception.
```

## Summary

The existing aging calculation was preserved:

- `fresh`: 0-2 days
- `attention`: 3-5 days
- `stale`: 6+ days
- `unknown`: no reliable date

The visual treatment was strengthened on the full lead card container.

No new badge, filter or KPI was added.

## Files Created

- `docs/67-sprint-102a6-1-operational-aging-visual-refinement.md`

## Files Changed

- `components/crm/crm-page.tsx`

## Field Used

Operational Aging continues to use:

```text
CrmLead.updatedAt
```

This remains a frontend-only derived visual state.

## Visual States

### Fresh

Threshold:

```text
0-2 days
```

Treatment:

- default card color;
- no visual alarm.

### Attention

Threshold:

```text
3-5 days
```

Treatment:

- full-card soft warm cream;
- stronger border;
- subtle warm shadow;
- visually noticeable without becoming yellow alert.

### Stale

Threshold:

```text
6+ days
```

Treatment:

- full-card soft rose / terracotta tint;
- stronger border;
- subtle rose shadow;
- visually noticeable without becoming error red.

### Unknown

Treatment:

- neutral/subtle background;
- no over-alarm.

## Components Affected

Full-card aging is applied to:

- pipeline lead cards (`CompactLeadCard`);
- Meu Dia lead cards (`DailyLeadCard`).

Base table rows keep the existing subtle row aging from Sprint 102A.6.

## Badge Clutter Review

Pipeline and Meu Dia cards currently preserve only:

- manual `Temperatura`.

The following automatic badges remain removed from cards:

- `Sinal comercial`;
- `Prioridade operacional`.

Their logic, filters and higher-level indicators remain preserved where already implemented.

## Preserved Behavior

This sprint preserved:

- manual `temperatura`;
- Commercial Signal logic;
- Operational Priority logic;
- existing CRM filters/search;
- lead editing;
- drag and drop;
- dossier behavior;
- Supabase/Auth/RLS/policy behavior.

## Non-Persistence Confirmation

This sprint did not:

- create SQL;
- execute SQL;
- alter schema;
- alter Supabase;
- alter Auth;
- alter RLS;
- alter policies;
- alter repositories;
- persist aging state;
- create filters;
- create KPIs;
- create automations;
- create AI/ML logic;
- create external integrations.

## Validation Plan

Required commands:

```text
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Manual checks:

1. Open CRM pipeline.
2. Confirm fresh cards remain neutral.
3. Confirm attention cards are visibly warm cream across the full card.
4. Confirm stale cards are visibly rose/terracotta across the full card.
5. Confirm manual temperature remains visible.
6. Confirm automatic badges do not compete inside cards.
7. Confirm CRM search/filter behavior remains unchanged.

## Next Sprint Recommendation

Recommended next sprint:

```text
Sprint 102A.6.2 - Operational Aging Manual Visual QA
```

Goal:

- validate colors with Bruno on real CRM data;
- decide if Base row aging should remain or be toned down;
- decide whether `updatedAt` remains acceptable until a durable internal movement timestamp is available.

