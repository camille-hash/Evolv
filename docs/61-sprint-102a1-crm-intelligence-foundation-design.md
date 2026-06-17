# Sprint 102A.1 - CRM Intelligence Foundation Architecture & UX Design

## Objective

Design the first CRM Intelligence Foundation layer for EVOLV, focused on helping Bruno answer:

```text
Quem devo priorizar hoje?
```

This sprint is architecture and UX design only. No code was implemented, no SQL was created or executed, and no Auth/RLS/Supabase behavior was changed.

## Product Rationale

The current EVOLV CRM already organizes leads by pipeline, stage, manual temperature, next action and operational focus. The next product step is to make the CRM more decisional than a conventional pipeline tool.

The first intelligence layer should not try to predict intent, automate sales judgment or introduce AI. It should provide a simple, explainable signal based on existing data:

```text
How recently did this lead show meaningful commercial movement?
```

This gives Bruno a quick prioritization lens without changing the CRM data model or creating operational risk.

## Data Model Inspection

Files inspected:

- `modules/crm/crm-types.ts`
- `modules/crm/crm-engine.ts`
- `modules/crm/crm-storage.ts`
- `modules/crm/crm-detail-storage.ts`
- `modules/crm/repositories/authenticated-supabase-crm-repository.ts`
- `modules/crm/repositories/supabase-crm-repository.ts`
- `components/crm/crm-page.tsx`
- `components/crm/crm-lead-detail.tsx`
- `modules/crm/crm-structured-notes.ts`
- Dual Pipeline planning docs and SQL references for `last_stage_changed_at`

Current `CrmLead` fields relevant to recency:

- `createdAt`
- `updatedAt`
- `closedAt`
- `dataProximaAcao`
- `pipeline`
- `etapa`
- `status`
- `temperatura`

Important distinction:

- `temperatura` currently exists as a manual/persisted CRM field with values `quente`, `morna`, `fria`.
- The new intelligence layer should not overwrite or reinterpret this field in v1.
- The new calculated signal should be conceptually named `engagementTemperature`, `leadActivityTemperature` or similar in a future implementation.

Repository mapping currently selects and maps:

- `created_at` -> `createdAt`
- `updated_at` -> `updatedAt`
- `closed_at` -> `closedAt`
- `data_proxima_acao` -> `dataProximaAcao`
- `temperatura` -> `temperatura`
- `pipeline` -> `pipeline`
- `etapa` -> `etapa`

Repository mapping does not currently select or map:

- `last_stage_changed_at`
- `pipeline_domain`
- `stage_domain`
- `crm_stage_events`
- note timestamps into the lead model

## Candidate Recency Fields

| Candidate | Current availability | Strength | Risk |
| --- | --- | --- | --- |
| `last_stage_changed_at` | Planned in Dual Pipeline SQL/docs, not present in current `CrmLead` type or repository mapping | Best semantic match for commercial movement | Cannot be assumed available in current runtime |
| Local `CrmStageChange.createdAt` | Exists in `evolv.crm.stage-changes.v1` localStorage helper | Meaningful when local history exists | Not reliable for Supabase production source and not organization-backed |
| `updatedAt` / `updated_at` | Present in type and repositories | Universal, already sorted by repositories, safe to derive in frontend | Can be changed by non-commercial edits |
| `createdAt` / `created_at` | Present in type and repositories | Reliable fallback for new/imported leads | May be old and does not represent engagement |
| `dataProximaAcao` | Present in type and UI | Useful for action planning | Future-facing task date, not true recency |
| Notes `created_at` | Available in notes services/repositories | Strong signal of relationship activity | Not loaded for every lead in list/pipeline; should not be queried broadly in v1 |
| `closedAt` | Present | Useful to suppress closed leads | Not a prioritization signal for active work |
| `imported_at` | Not found in current type/mappers | Would help import edge cases | Not currently available |

## Recommended Recency Field

Recommended v1 source:

```text
updatedAt
```

Reason:

- it is available on every `CrmLead`;
- it is already mapped from Supabase and localStorage;
- it changes on lead save and stage movement through existing CRM flows;
- it requires no schema change and no repository change;
- it supports a frontend-only derived signal.

Preferred future source:

```text
last_stage_changed_at
```

Reason:

- it is the cleanest commercial recency signal;
- it specifically represents pipeline/stage movement instead of any edit;
- it is already part of the Dual Pipeline target schema.

Decision:

- v1 should use `updatedAt` as the operational source.
- The algorithm should be written so a future sprint can switch the primary source to `lastStageChangedAt` when the field is safely mapped into `CrmLead`.

## Lead Temperature Algorithm v1

Recommended labels:

| Internal value | Portuguese label | Meaning |
| --- | --- | --- |
| `hot` | `Quente` | Recent commercial movement |
| `warm` | `Morno` | Still fresh, but needs attention |
| `cold` | `Frio` | Cooling down |
| `abandoned` | `Abandonado` | Long time without useful movement |
| `no-signal` | `Sem sinal` | No reliable date |

Recommended thresholds for EVOLV/Patrion v1:

| Label | Rule |
| --- | --- |
| `Quente` | 0-7 days since recency signal |
| `Morno` | 8-21 days since recency signal |
| `Frio` | 22-45 days since recency signal |
| `Abandonado` | More than 45 days since recency signal |
| `Sem sinal` | No usable recency date |

Rationale for adjusting the suggested 30/60-day thresholds:

- the CRM is used for high-consideration commercial follow-up, but pipeline responsiveness still matters;
- 60 days is too late to first mark abandonment for a live sales operation;
- 45 days is a sharper executive signal without becoming noisy;
- `Frio` beginning at 22 days gives Bruno a clearer list of leads that need reactivation before becoming abandoned.

Suggested implementation formula:

```text
days = whole days between today and selected recency date

if no valid date -> Sem sinal
if lead is closed/won/lost -> do not treat as active priority
if days <= 7 -> Quente
if days <= 21 -> Morno
if days <= 45 -> Frio
else -> Abandonado
```

## Fallback Logic

Recommended fallback chain for v1:

1. Future-compatible primary: `lastStageChangedAt`, when mapped and valid.
2. Current production source: `updatedAt`, when valid.
3. Fallback: `createdAt`, when valid.
4. Optional local-only enhancement: latest local `CrmStageChange.createdAt`, only if already loaded in the component and not requiring broad localStorage coupling.
5. If none exists: `Sem sinal`.

Important caveat:

- v1 should not broadly read all notes for all leads just to calculate list temperature.
- notes timestamps can become a stronger signal in a later sprint if a server-side summary or lightweight aggregate is introduced.

## UI Placement Plan

## Pipeline/card/list

Add a compact intelligence badge near the existing manual `TemperatureBadge`.

Recommended label style:

```text
Atividade: Quente
Atividade: Morno
Atividade: Frio
Atividade: Abandonado
Sem sinal
```

Avoid replacing the existing manual temperature badge in v1. Use a distinct label such as `Atividade` or `Sinal` to prevent confusion.

Recommended placement:

- pipeline card: right side near the current temperature badge, compact;
- daily card: below existing phone/metadata or next to current temperature badge if space allows;
- base/list table: new compact column only if it does not cause horizontal clutter.

## Lead detail/dossier

Add the badge in the dossier header near pipeline/stage/value.

Suggested copy:

```text
Sinal comercial: Quente
Ultima movimentacao considerada: 5 dias
```

For `Sem sinal`:

```text
Sinal comercial: Sem sinal
```

Do not add explanatory paragraphs inside the dossier. The label should be self-explanatory and compact.

## Optional compact KPI area

Place in `Meu Dia` / operational support area:

- `Leads quentes`
- `Leads abandonados`

Optional:

- `Leads frios`, only if layout remains calm.

## Filter Plan

Add a new filter separate from existing manual `Temperatura`.

Recommended filter label:

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

Do not reuse the existing `temperatura` filter because that field is persisted and manually assigned.

## KPI Plan

Recommended v1 KPIs:

1. `Quentes`
   - Count active leads with calculated signal `Quente`.
   - Product meaning: talk to these first or keep momentum.

2. `Abandonados`
   - Count active leads with calculated signal `Abandonado`.
   - Product meaning: reactivation queue.

Optional:

3. `Frios`
   - Only if it does not clutter the UI.
   - Product meaning: leads becoming stale but not fully abandoned.

Closed/won/lost leads should not inflate active urgency KPIs unless a specific lost-reactivation view is being used.

## UX Copy in Portuguese

Recommended labels:

- `Sinal comercial`
- `Atividade recente`
- `Quente`
- `Morno`
- `Frio`
- `Abandonado`
- `Sem sinal`
- `Leads quentes`
- `Leads abandonados`
- `Prioridade de hoje`
- `Sem movimentacao recente`

Avoid:

- `Score`
- `IA`
- `Predicao`
- `Probabilidade de fechamento`
- `Lead ruim`
- `Lead morto`

The tone should be executive and calm: an operational signal, not a judgment.

## Edge Cases

## Missing recency date

If no usable date exists:

- show `Sem sinal`;
- do not hide the lead;
- sort normally by existing CRM order.

## Imported leads with old dates

If `createdAt` or `updatedAt` came from import and is old:

- classify according to the date;
- allow `Abandonado`;
- this is useful because imported dormant leads should be visible as reactivation inventory.

## Leads with no stage change

If no stage-change-specific date exists:

- use `updatedAt`;
- then `createdAt`;
- do not infer movement from stage name alone.

## Recently edited but not commercially engaged

Risk:

- `updatedAt` can be refreshed by administrative edits.

Mitigation for v1:

- label the signal as `Atividade` or `Sinal comercial`, not definitive engagement;
- document that `last_stage_changed_at` should replace `updatedAt` when safely available.

## Closed/won/lost leads

If `status` is `ganha` or `perdida`, or if pipeline/stage represents final state:

- do not count in active `Quentes` KPI;
- allow badge display in detail for context;
- place lost/reactivation logic in a later dedicated sprint.

## Current manual temperature field

Manual `temperatura` can disagree with calculated activity.

Example:

- manual `Quente`;
- calculated `Abandonado`.

This is acceptable and useful. It means the lead was strategically hot but has gone stale operationally.

## Recommended Implementation Architecture

Recommended v1:

```text
frontend-only derived value
```

Why:

- no schema change;
- no SQL;
- no RLS impact;
- no repository behavior change required for the first implementation;
- fully reversible;
- low operational risk.

Recommended module shape for next sprint:

```text
modules/crm/crm-intelligence.ts
```

Suggested exports:

```text
type CrmLeadActivityTemperature =
  | "hot"
  | "warm"
  | "cold"
  | "abandoned"
  | "no-signal";

resolveCrmLeadRecencySignal(lead)
calculateCrmLeadActivityTemperature(lead, now?)
buildCrmIntelligenceSummary(leads, now?)
filterLeadsByActivityTemperature(leads, filter, now?)
```

Do not persist calculated values in v1.

Do not add database fields in v1.

Do not modify repository mapping in v1 unless the next sprint explicitly decides to expose already-existing `last_stage_changed_at`.

## Why Not Persist v1

Persisting would create avoidable risk:

- stale calculated values;
- extra RLS/policy considerations;
- migrations before the rule is proven;
- confusion with existing manual `temperatura`.

Derived frontend calculation is safer until Bruno validates whether the signal actually improves daily prioritization.

## Non-goals

This sprint does not design or authorize:

- AI or machine learning;
- OpenAI integration;
- external enrichment;
- automatic task creation;
- automatic stage movement;
- persisted scoring fields;
- Supabase schema changes;
- RLS changes;
- repository changes;
- changes to notes, proposals, simulator, recovery, profile or organization logic.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Confusion with manual `temperatura` | User may not understand why two temperatures exist | Use label `Sinal comercial` or `Atividade`, not `Temperatura` |
| `updatedAt` polluted by admin edits | False `Quente` after non-commercial edit | Document as v1 limitation; migrate to `last_stage_changed_at` later |
| Imported leads all look abandoned | Large abandoned count may feel alarming | Position as reactivation inventory, not failure |
| UI clutter | Too many badges/KPIs reduce clarity | Keep badge compact and KPIs limited to hot/abandoned |
| Closed leads counted as urgent | KPI becomes misleading | Exclude non-active leads from active urgency KPIs |

## Next Sprint Implementation Plan

Recommended next sprint:

```text
Sprint 102A.2 - CRM Intelligence v1 Frontend Derived Signal
```

Implementation steps:

1. Create `modules/crm/crm-intelligence.ts`.
2. Add pure calculation helpers and unit-like examples if the project pattern allows.
3. Add `Sinal comercial` filter to CRM advanced filters.
4. Add compact badge component for calculated activity signal.
5. Show badge on pipeline cards and daily cards.
6. Show badge in lead dossier header.
7. Add KPI counts for `Quentes` and `Abandonados`.
8. Keep existing manual `Temperatura` field and filter unchanged.
9. Run typecheck, lint and build.
10. Manually verify that Bruno sees improved prioritization without any change to persistence.

## Final Recommendation

Recommended recency source for immediate v1:

```text
updatedAt
```

Recommended future primary source:

```text
last_stage_changed_at
```

Recommended v1 algorithm:

```text
Quente: 0-7 days
Morno: 8-21 days
Frio: 22-45 days
Abandonado: more than 45 days
Sem sinal: no usable date
```

Recommended architecture:

```text
frontend-only derived CRM Intelligence signal
```
