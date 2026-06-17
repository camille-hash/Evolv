# Sprint 102A.6 - Operational Aging Visual System

## Objective

Implement a subtle visual aging system for CRM lead cards.

The goal is to reduce card clutter and give Bruno visual perception of lead inactivity without adding more labels inside each card.

## Implementation Summary

Created a frontend-only `operational aging` utility based on `CrmLead.updatedAt`.

The system applies subtle card and row background colors according to how many days have passed since the lead's latest internal movement signal.

No state is persisted.

## Files Created

- `modules/crm/crm-operational-aging.ts`
- `docs/66-sprint-102a6-operational-aging-visual-system.md`

## Files Changed

- `modules/crm/index.ts`
- `components/crm/crm-page.tsx`

## Field Used

Current v1 field:

```text
updatedAt
```

Reason:

- already exists in `CrmLead`;
- already mapped by current CRM repositories;
- changes when the lead is saved or moved;
- does not require SQL, schema change or repository change.

Known limitation:

`updatedAt` can still represent non-commercial edits. This sprint uses it as the safest available proxy for internal movement until a stronger durable movement timestamp is exposed.

## Thresholds Implemented

| Aging state | Threshold | Visual treatment |
| --- | --- | --- |
| `fresh` | 0-2 days | neutral/default card background |
| `attention` | 3-5 days | soft yellow background |
| `stale` | 6+ days | soft red background |
| `unknown` | no reliable date | neutral/subtle background |

## UI Placement

Background aging appears in:

- pipeline lead cards;
- `Meu Dia` lead cards;
- Base table rows.

The system does not over-color the full CRM. It only affects lead-level surfaces.

## Badge Clutter Reduction

Removed from lead cards:

- automatic `Sinal comercial` badge;
- automatic `Prioridade operacional` badge.

Preserved on lead cards:

- manual `Temperatura` badge.

Reason:

Manual `temperatura` remains Bruno's human/commercial judgment. Automatic signals should support perception without competing visually inside the card.

## Preserved Behavior

The sprint preserved:

- manual `temperatura`;
- Commercial Signal utility;
- Commercial Signal filter and KPI behavior already present;
- Operational Priority utility;
- Operational Priority filter and KPI behavior already present;
- lead editing;
- drag and drop;
- CRM search;
- dossier behavior;
- Auth/RLS/Supabase behavior.

## Non-Persistence Confirmation

This sprint did not:

- create SQL;
- execute SQL;
- alter database schema;
- alter Supabase;
- alter repositories;
- alter Auth;
- alter RLS;
- alter policies;
- persist aging state;
- add automations;
- add notifications;
- add schedulers;
- add AI/ML;
- add external integrations.

## Validation Plan

Required commands:

```text
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Manual checks:

1. Open CRM.
2. Confirm pipeline cards have subtle background aging.
3. Confirm `Meu Dia` cards have subtle background aging.
4. Confirm Base rows have subtle aging treatment.
5. Confirm manual `Temperatura` badge remains visible.
6. Confirm `Sinal comercial` no longer competes visually inside cards.
7. Confirm existing filters/search still work.
8. Confirm no data is persisted by aging calculation.

## Risks

| Risk | Mitigation |
| --- | --- |
| `updatedAt` may represent administrative edits | Treat as v1 internal movement proxy only |
| Color could feel alarming | Use soft yellow/red only |
| Loss of automatic badges on cards could hide details | Filters/KPIs and dossier still preserve deeper signals |
| Base rows may look too busy if many stale leads exist | Colors are intentionally pale |

## Next Sprint Recommendation

Recommended next sprint:

```text
Sprint 102A.7 - Operational Aging Manual QA and Color Calibration
```

Goal:

- validate thresholds with Bruno;
- calibrate softness of yellow/red;
- decide whether Base rows should keep aging or stay neutral;
- decide whether `updatedAt` remains acceptable until a durable movement timestamp is exposed.

