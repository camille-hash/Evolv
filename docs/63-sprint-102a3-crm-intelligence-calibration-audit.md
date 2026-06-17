# Sprint 102A.3 - CRM Intelligence Calibration Audit

## Objective

Audit the current CRM Intelligence v1 signal after production use and identify better commercial prioritization signals for EVOLV.

This sprint is audit and calibration only. No code was implemented, no SQL was created or executed, and no database, Auth, RLS, policy, repository or UI behavior was changed.

## Current v1 Signal Assessment

Sprint 102A.2 implemented `Sinal comercial` as a frontend-only derived value based on `CrmLead.updatedAt`.

Current behavior:

- `Quente`: 0-7 days since `updatedAt`
- `Morno`: 8-21 days
- `Frio`: 22-45 days
- `Abandonado`: more than 45 days
- `Sem sinal`: invalid or missing date

The implementation is technically safe because `updatedAt` already exists in `CrmLead`, is mapped by the Supabase and authenticated Supabase repositories, and does not require schema or RLS changes.

Business limitation:

`updatedAt` is a weak proxy for commercial activity. It can be refreshed by any lead update, including administrative edits, field corrections, stage saves, or future non-commercial updates. It answers:

```text
Quando o registro foi alterado?
```

It does not reliably answer:

```text
Quando houve uma interacao comercial relevante?
```

## Available Commercial Signals

Files inspected:

- `modules/crm/crm-types.ts`
- `modules/crm/crm-intelligence.ts`
- `modules/crm/crm-detail-storage.ts`
- `modules/crm/crm-detail-engine.ts`
- `modules/crm/crm-structured-notes.ts`
- `modules/crm/server/crm-lead-notes-service.ts`
- `modules/crm/repositories/supabase-crm-repository.ts`
- `modules/crm/repositories/authenticated-supabase-crm-repository.ts`
- `modules/crm/repositories/crm-lead-notes-repository.ts`
- `modules/proposal/proposal-history.ts`
- `components/crm/crm-page.tsx`
- `components/crm/crm-lead-detail.tsx`
- `docs/61-sprint-102a1-crm-intelligence-foundation-design.md`
- `docs/62-sprint-102a2-crm-intelligence-v1-frontend-derived-signal.md`

Current lead model signals:

- `updatedAt`
- `createdAt`
- `closedAt`
- `proximaAcao`
- `dataProximaAcao`
- `pipeline`
- `etapa`
- `status`
- manual `temperatura`

Current local detail signals:

- local notes with `createdAt`
- local activities with `data`, `hora`, `createdAt`, `completedAt`
- local stage changes with `createdAt`

Current persistent notes signals:

- `crm_lead_notes.created_at`
- `crm_lead_notes.updated_at`
- `crm_lead_notes.note_type`
- `crm_lead_notes.deleted_at`

Current proposal signals:

- generated proposal records include `generatedAt`, `leadId`, `commercialCredit`, `recommendedScenario`, `roiPercent` and optional `fileName`
- the current dossier presents proposals as session artifacts, not as a durable lead-wide activity source for list prioritization

Planned/future Dual Pipeline signals:

- `last_stage_changed_at`
- `crm_stage_events`
- `crm_green_flags`
- `pipeline_domain`
- `stage_domain`

These are architecturally strong but should not be assumed as active runtime signals until fully mapped and validated in the CRM model.

## Signal Ranking

| Rank | Signal | Quality | Current usability | Notes |
| --- | --- | --- | --- | --- |
| 1 | `dataProximaAcao` + `proximaAcao` | High for daily prioritization | Available now on `CrmLead` | Best answer to "what should Bruno do today?" |
| 2 | Persistent note `created_at` | High for real relationship activity | Available in lead notes, but not list-wide on every lead | Strong commercial interaction signal after safe aggregation |
| 3 | Stage movement timestamp | High for commercial momentum | Local stage changes exist; durable `last_stage_changed_at` is future/planned | Best future momentum signal when persistent and mapped |
| 4 | Activity completion/created timestamps | Medium-high | Local activity helpers exist, but not a current durable production source | Useful for future task engine if made persistent |
| 5 | Proposal `generatedAt` | Medium | Session proposal history exists | Good high-intent signal, but not sufficient alone |
| 6 | `updatedAt` | Medium-low | Available now | Useful fallback, but polluted by administrative edits |
| 7 | `createdAt` | Low-medium | Available now | Useful fallback for new/imported leads, not engagement |
| 8 | manual `temperatura` | Contextual | Available now | Strategic/manual heat, not recency or activity |
| 9 | `closedAt` / `status` | Suppression signal | Available now | Useful to exclude closed/won/lost from active urgency |

## Recommended Hierarchy

Recommended future hierarchy for CRM Intelligence v2:

### Level 1 - Next Action Urgency

Primary fields:

- `dataProximaAcao`
- `proximaAcao`

Use this to answer:

```text
Quem precisa de acao agora?
```

This should drive operational alerts:

- vencida
- hoje
- proximos dias
- sem proxima acao

### Level 2 - Last Commercial Interaction

Primary future source:

- latest active `crm_lead_notes.created_at`

Secondary future sources:

- completed activity timestamp, if activities become durable
- proposal `generatedAt`, if proposal history becomes durable

Use this to answer:

```text
Quando foi a ultima interacao comercial registrada?
```

### Level 3 - Last Stage Movement

Primary future source:

- `last_stage_changed_at`

Audit source:

- `crm_stage_events`

Use this to answer:

```text
Quando a oportunidade realmente avancou?
```

### Level 4 - Record Lifecycle Fallback

Fallback fields:

- `updatedAt`
- `createdAt`

Use only when the stronger signals are absent.

## Threshold Assessment

The current thresholds are acceptable for a generic recency badge:

- 0-7 days: `Quente`
- 8-21 days: `Morno`
- 22-45 days: `Frio`
- more than 45 days: `Abandonado`

However, they are not enough for the main business question:

```text
Quem devo falar hoje?
```

Recommended calibration:

### For commercial recency

Keep current thresholds temporarily:

- `Quente`: 0-7 days
- `Morno`: 8-21 days
- `Frio`: 22-45 days
- `Abandonado`: more than 45 days

But apply them to a better source when available:

1. last interaction date
2. last stage movement date
3. `updatedAt` fallback

### For next action urgency

Use separate action thresholds:

- `Vencida`: `dataProximaAcao` before today
- `Hoje`: `dataProximaAcao` equals today
- `Proxima`: 1-3 days ahead
- `Sem acao`: no `proximaAcao` and no `dataProximaAcao`
- `Monitorar`: future action beyond 3 days

This should be separate from `Sinal comercial`, because urgency and temperature are different product concepts.

## Future Opportunities

### CRM Intelligence v2

Recommended evolution:

- keep v1 frontend-only signal as a fallback;
- add a derived "prioridade operacional" concept using `dataProximaAcao`;
- add a future aggregated "ultima interacao comercial" based on persistent notes;
- later replace `updatedAt` as primary recency with `last_stage_changed_at` or `crm_stage_events`.

### Commercial Prioritization

A stronger prioritization model should combine:

1. due/overdue next action;
2. recent commercial note or proposal;
3. stage movement recency;
4. manual `temperatura`;
5. active/won/lost status.

Example v2 labels:

- `Agir agora`
- `Manter ritmo`
- `Reativar`
- `Sem proxima acao`
- `Monitorar`

This is more useful than a pure hot/warm/cold recency scale because it connects directly to Bruno's daily workflow.

### Follow-up Alerts

Feasible alerts from current data:

- active leads with overdue `dataProximaAcao`;
- active leads with no `proximaAcao`;
- manual `temperatura = quente` with no next action;
- stale active leads where `updatedAt` is older than a calibrated threshold.

Better future alerts after durable interaction aggregation:

- no commercial note in 7/14/21 days;
- no stage movement in 14/30 days;
- proposal generated but no follow-up note;
- high-value lead without next action.

## Next Action Feasibility

A v1 Next Action engine is feasible from existing `CrmLead` fields:

- `proximaAcao`
- `dataProximaAcao`
- `status`
- `temperatura`
- `updatedAt`

The current CRM already uses similar logic in operational groups:

- due today or past;
- awaiting action;
- hot leads without action;
- overdue actions;
- stale leads based on `updatedAt`.

Recommended caution:

Do not implement a heavy task engine yet. The safest next step is to formalize this existing logic into a small frontend-only helper and present it as `Prioridade operacional`, while leaving persistence unchanged.

## Recommendations

1. Do not abandon `Sinal comercial`; keep it as a lightweight v1 badge.
2. Do not treat `updatedAt` as the definitive measure of engagement.
3. Promote `dataProximaAcao` + `proximaAcao` as the best current signal for daily prioritization.
4. Prepare a v2 derived helper that separates:
   - commercial recency;
   - next action urgency;
   - manual temperature;
   - lifecycle status.
5. Use persistent notes `created_at` as the next strongest source only after a safe list-level aggregation strategy is designed.
6. Use `last_stage_changed_at` or `crm_stage_events` for momentum only after Dual Pipeline schema/runtime exposure is complete.
7. Keep all calculations frontend-derived until Bruno validates that the prioritization improves real workflow.
8. Avoid AI, scoring black boxes or external enrichment in this phase.

## Next Sprint Recommendation

Recommended next sprint:

```text
Sprint 102A.4 - CRM Intelligence v2 Prioridade Operacional Design
```

Scope:

- design a frontend-only `Prioridade operacional` model;
- use `dataProximaAcao`, `proximaAcao`, manual `temperatura`, `status` and `updatedAt`;
- define labels, filters and KPIs;
- do not implement code yet unless explicitly approved.

Recommended implementation sprint after that:

```text
Sprint 102A.5 - CRM Intelligence v2 Frontend Prioridade Operacional
```

Potential implementation:

- pure helper module;
- no SQL;
- no persistence;
- no Auth/RLS changes;
- compact UI additions focused on "quem falar hoje".

## Final Calibration

Best signal discovered for immediate business value:

```text
dataProximaAcao + proximaAcao
```

Best future signal for true commercial interaction:

```text
latest crm_lead_notes.created_at, with safe list-level aggregation
```

Best future signal for commercial momentum:

```text
last_stage_changed_at / crm_stage_events
```

Recommended hierarchy:

1. Next action urgency.
2. Last commercial interaction.
3. Last stage movement.
4. `updatedAt`.
5. `createdAt`.

