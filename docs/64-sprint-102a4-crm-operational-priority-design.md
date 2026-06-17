# Sprint 102A.4 - CRM Operational Priority Design

## Objective

Design the first version of `Prioridade Operacional` for the EVOLV CRM.

The goal is to help Bruno answer:

```text
Quem requer acao agora?
```

This sprint is design-only. No code was implemented, no SQL was created or executed, and no database, Auth, RLS, policy, repository or UI behavior was changed.

## Current Data Assessment

Files inspected:

- `modules/crm/crm-types.ts`
- `modules/crm/crm-engine.ts`
- `modules/crm/import/piperun-import-engine.ts`
- `modules/crm/crm-dashboard-engine.ts`
- `modules/crm/repositories/supabase-crm-repository.ts`
- `modules/crm/repositories/authenticated-supabase-crm-repository.ts`
- `components/crm/crm-page.tsx`
- `components/crm/crm-lead-detail.tsx`
- `docs/63-sprint-102a3-crm-intelligence-calibration-audit.md`

The current `CrmLead` model already contains the two strongest fields for operational prioritization:

- `proximaAcao`
- `dataProximaAcao`

They are stored directly on the lead and mapped to Supabase columns:

- `proxima_acao`
- `data_proxima_acao`

They are also preserved by the authenticated Supabase CRM repository.

Relevant supporting fields:

- `status`
- `temperatura`
- `updatedAt`
- `createdAt`
- `pipeline`
- `etapa`
- `consultor`

## Next Action Field Assessment

### Where they are stored

In TypeScript:

```text
CrmLead.proximaAcao
CrmLead.dataProximaAcao
```

In Supabase mapping:

```text
crm_leads.proxima_acao
crm_leads.data_proxima_acao
```

### How they are populated

They are populated by:

- lead creation/editing through the CRM form;
- repository update mapping;
- local lead normalization;
- existing dashboard and CRM grouping logic.

The lead form exposes:

- `Proxima acao`
- `Data da proxima acao`

The current dossier already displays a `Proxima Acao` card using `lead.proximaAcao`.

### Imported leads

PipeRun imports currently set:

```text
proximaAcao: ""
dataProximaAcao: ""
```

This means imported leads usually enter EVOLV without an operational next action.

This is not a data error. It is an important business signal:

```text
Lead importado sem proxima acao definida precisa de triagem.
```

### Existing usage

The CRM already uses these fields in operational logic:

- `Meu Dia` includes leads due today/past through `dataProximaAcao`;
- `Meu Dia` includes leads awaiting action when both fields are empty;
- `Foco Comercial` includes overdue actions;
- `Foco Comercial` includes hot leads without action;
- dashboard next actions are built from leads with both action text and date.

Conclusion:

Operational Priority can be derived using existing data only.

## Operational Priority Model

Recommended v1 internal model:

| Internal value | UI label | Meaning |
| --- | --- | --- |
| `overdue` | `Acao vencida` | Lead has a next action date before today |
| `today` | `Acao hoje` | Lead has a next action date today |
| `soon` | `Acao proxima` | Lead has a next action in the next 1-3 days |
| `scheduled` | `Agendado` | Lead has a future action beyond 3 days |
| `missing_action` | `Sem proxima acao` | Lead has no action text and no action date |
| `missing_date` | `Acao sem data` | Lead has action text but no date |
| `missing_description` | `Data sem acao` | Lead has date but no action text |
| `not_active` | `Fora da fila ativa` | Lead is won/lost or otherwise not active |

The model should be frontend-derived in v1.

Do not persist the calculated priority.

## Priority Hierarchy

Recommended ordering for operational work:

1. `Acao vencida`
2. `Acao hoje`
3. `Acao sem data`
4. `Data sem acao`
5. `Sem proxima acao`
6. `Acao proxima`
7. `Agendado`
8. `Fora da fila ativa`

Rationale:

- overdue and today are immediate operational risks;
- incomplete action records are also risky because they create ambiguity;
- imported/no-action leads need triage;
- near-future scheduled actions matter, but are less urgent than unresolved work;
- inactive opportunities should not pollute daily urgency.

Recommended grouping for a compact UI:

```text
Agora
- Acao vencida
- Acao hoje

Resolver
- Acao sem data
- Data sem acao
- Sem proxima acao

Programado
- Acao proxima
- Agendado

Fora da fila ativa
- Ganha
- Perdida
```

## Edge Cases

### No next action

If both `proximaAcao` and `dataProximaAcao` are empty:

```text
Sem proxima acao
```

This is especially important for imported PipeRun leads.

### Next action in the past

If `dataProximaAcao` is before today:

```text
Acao vencida
```

This should outrank commercial signal and manual temperature.

### Next action today

If `dataProximaAcao` is today:

```text
Acao hoje
```

This is one of the highest operational priorities.

### Action text without date

If `proximaAcao` exists but `dataProximaAcao` is empty:

```text
Acao sem data
```

This should be treated as incomplete planning, not as scheduled work.

### Date without action text

If `dataProximaAcao` exists but `proximaAcao` is empty:

```text
Data sem acao
```

This should be surfaced because the date has no useful instruction.

### Imported leads without action

PipeRun imports currently create leads with empty next action fields.

These leads should be treated as:

```text
Sem proxima acao
```

This creates a triage queue.

### Completed opportunities

If `status = ganha`, the lead should not appear as urgent operational work by default.

Recommended label:

```text
Fora da fila ativa
```

### Lost opportunities

If `status = perdida`, the lead should not appear as urgent operational work by default.

Reactivation can be designed later as a separate queue.

### Archived situations

No explicit archive field was found in the current `CrmLead` model.

If archival is introduced later, archived leads should be excluded from active operational priority.

## UX Recommendations

### Badge

Add a compact badge named:

```text
Prioridade operacional
```

Short labels:

- `Vencida`
- `Hoje`
- `Proxima`
- `Sem acao`
- `Sem data`
- `Agendada`

Use calm but clear severity:

- overdue: high emphasis;
- today: high emphasis;
- incomplete/no action: warning emphasis;
- scheduled: quiet neutral;
- inactive: muted.

### Filter

Recommended filter:

```text
Prioridade operacional
```

Options:

- `Todas`
- `Vencidas`
- `Hoje`
- `Proximas`
- `Sem proxima acao`
- `Incompletas`
- `Agendadas`

### List indicator

Pipeline/list cards should show one compact line:

```text
Prioridade: Acao hoje
```

or:

```text
Sem proxima acao
```

Avoid long explanations inside cards.

### Dossier indicator

The lead dossier should show the operational priority near the existing `Proxima Acao` area.

Recommended copy:

```text
Prioridade operacional: Acao vencida
```

If there is no next action:

```text
Prioridade operacional: Sem proxima acao
```

### KPI placement

KPIs should appear in the operational area, not as a broad dashboard takeover.

Recommended first placement:

- near `Meu Dia`;
- near `Foco Comercial`;
- compact row of counts.

## KPI Recommendations

Recommended v1 KPIs:

1. `Acoes vencidas`
   - count active leads where `dataProximaAcao` is before today.

2. `Acoes hoje`
   - count active leads where `dataProximaAcao` is today.

3. `Sem proxima acao`
   - count active leads where both next action fields are empty.

4. `Planejamento incompleto`
   - count active leads with action text but no date, or date but no action text.

Optional v1 KPI:

5. `Proximas 72h`
   - count active leads with action due in the next 1-3 days.

Avoid too many counters. The first three are the most important.

## Dashboard Opportunities

Future dashboard modules:

### Painel de Acao

Recommended cards:

- `Acoes vencidas`
- `Acoes hoje`
- `Sem proxima acao`
- `Incompletas`
- `Proximas 72h`

### Triage Queue

Lead queue for:

- imported leads with no next action;
- hot manual temperature without next action;
- leads with commercial signal abandoned and no next action.

### Follow-up Quality

Potential metrics:

- percentage of active leads with next action defined;
- number of active hot leads without action;
- average days overdue;
- count of overdue actions by consultant.

### Executive Focus

Simple daily headline:

```text
Hoje: X acoes vencidas, Y acoes para hoje, Z leads sem proxima acao.
```

## Commercial Signal vs Operational Priority

These concepts should coexist.

### Commercial Signal

Current concept:

```text
Sinal comercial
```

Purpose:

- indicates recency of record/commercial movement;
- currently based on `updatedAt`;
- useful for stale/reactivation awareness.

Question answered:

```text
Este lead parece recente ou abandonado?
```

### Operational Priority

New concept:

```text
Prioridade operacional
```

Purpose:

- indicates what needs action now;
- based on next action fields;
- useful for daily execution.

Question answered:

```text
O que preciso fazer hoje?
```

### Recommendation

Keep both.

Do not merge them.

Example:

- a lead can be `Sinal comercial: Abandonado` and `Prioridade operacional: Acao hoje`;
- a lead can be `Sinal comercial: Quente` but `Prioridade operacional: Sem proxima acao`.

That contrast is valuable because it exposes operational gaps.

## Recommended Architecture

Recommended v1:

```text
frontend-only derived helper
```

Suggested future module:

```text
modules/crm/crm-operational-priority.ts
```

Suggested exports:

```text
type CrmOperationalPriority =
  | "overdue"
  | "today"
  | "soon"
  | "scheduled"
  | "missing_action"
  | "missing_date"
  | "missing_description"
  | "not_active";

resolveCrmOperationalPriority(lead, now?)
buildCrmOperationalPrioritySummary(leads, now?)
filterLeadsByOperationalPriority(leads, filter, now?)
sortLeadsByOperationalPriority(leads, now?)
```

Do not persist the value in v1.

Do not alter repositories.

Do not alter Supabase schema.

Use existing `CrmLead` fields only.

## Rollout Plan

### Sprint 102A.5 - Operational Priority Frontend Utility

Recommended scope:

- create pure helper module;
- add typed labels;
- add summary calculation;
- add tests/examples if project pattern supports it;
- no UI changes yet if a separate UI sprint is desired.

### Sprint 102A.6 - Operational Priority UI

Recommended scope:

- add badge to CRM cards/list;
- add dossier indicator;
- add filter;
- add compact KPIs;
- preserve existing `Sinal comercial`.

### Sprint 102A.7 - Operational Priority Calibration

Recommended scope:

- validate with Bruno;
- measure whether `Sem proxima acao` queue is useful or noisy;
- decide whether to show `Planejamento incompleto` as KPI or only filter.

## Non-goals

This design does not authorize:

- code implementation;
- SQL;
- schema changes;
- Auth/RLS/policy changes;
- repository changes;
- UI changes;
- automations;
- notifications;
- schedulers;
- AI;
- external integrations;
- task persistence;
- calendar integration;
- WhatsApp integration.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Imported leads flood `Sem proxima acao` | Queue may look large at first | Treat as triage inventory and filter by active status/pipeline |
| Action text without date creates ambiguity | Bruno may not know when to act | Surface as `Acao sem data` |
| Date without action text creates ambiguity | Date is not actionable | Surface as `Data sem acao` |
| Too many badges clutter CRM | Operational value gets buried | Keep one compact badge and limited KPIs |
| Confusion with `Sinal comercial` | User may think both are the same | Keep distinct labels and explain in documentation |
| Closed/lost leads pollute daily work | KPIs become misleading | Exclude non-active leads from active priority counts |

## Final Recommendation

Recommended priority hierarchy:

1. `Acao vencida`
2. `Acao hoje`
3. `Acao sem data`
4. `Data sem acao`
5. `Sem proxima acao`
6. `Acao proxima`
7. `Agendado`
8. `Fora da fila ativa`

Recommended KPIs:

1. `Acoes vencidas`
2. `Acoes hoje`
3. `Sem proxima acao`
4. `Planejamento incompleto`

Recommended next sprint:

```text
Sprint 102A.5 - Operational Priority Frontend Utility
```

The safest implementation path is frontend-only, derived from existing `CrmLead` fields, with no persistence and no repository changes.

