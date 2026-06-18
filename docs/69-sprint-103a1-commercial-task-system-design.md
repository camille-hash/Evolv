# Sprint 103A.1 - Commercial Task System Design

## Objective

Design the future Commercial Task System for EVOLV.

The CRM currently stores lead history well through notes, dossier data and pipeline movement, but it does not yet operationalize future actions as first-class work items.

The product objective is to transform `Proxima Acao` into the operational engine of EVOLV, without implementing anything in this sprint.

This sprint is design-only:

- no code implementation;
- no SQL;
- no migration;
- no schema change;
- no UI coding;
- no Supabase/Auth/RLS/policy/repository/API change.

## Current State Assessment

Files inspected:

- `modules/crm/crm-types.ts`
- `modules/crm/crm-detail-storage.ts`
- `modules/crm/server/crm-lead-notes-service.ts`
- `components/crm/crm-lead-detail.tsx`
- `components/crm/crm-page.tsx`
- `modules/crm/crm-dashboard-engine.ts`
- `modules/crm/crm-operational-priority.ts`

Current relevant structures:

- `CrmLead.proximaAcao`
- `CrmLead.dataProximaAcao`
- `CrmNote`
- `CrmLeadNote`
- local `CrmActivity`
- `MyDayPanel`
- Operational Priority indicators

Current limitation:

`proximaAcao` and `dataProximaAcao` are fields on the lead, not true tasks. They can describe a next action, but they do not support assignment, completion, cancellation, task history, ownership, due time, or a reliable work queue.

## Section 1 - Product Principles

### Why tasks exist

Tasks exist to turn commercial intent into executable work.

Notes answer:

```text
O que aconteceu?
```

Tasks answer:

```text
O que precisa acontecer agora?
```

The CRM should keep historical memory and operational execution separate.

### Difference between Notes and Tasks

| Concept | Purpose | Example |
| --- | --- | --- |
| Note | Historical/contextual record | Cliente pediu para falar com a esposa antes de decidir. |
| Task | Future executable commitment | Ligar para cliente sexta as 10h. |

A note can inform a task, but should not become a task automatically.

### Why free-text notes should not automatically become tasks

Free-text notes are narrative. They may contain:

- context;
- objections;
- emotional signals;
- historical facts;
- internal impressions;
- meeting summaries.

Automatically converting every note into a task would create noise, false obligations and a cluttered `Meu Dia`.

Recommendation:

After saving a note, EVOLV may offer the option to create a task, but the user must explicitly decide.

### Why commercial execution should be driven by explicit actions

Explicit tasks create:

- clear accountability;
- reliable due dates;
- a real work queue;
- completion history;
- better CRM Intelligence;
- measurable follow-up discipline.

## Section 2 - Task Types

Recommended standard categories:

| Type | Label | Rationale |
| --- | --- | --- |
| `call` | Ligar | Common direct follow-up action |
| `whatsapp` | WhatsApp | Core operational channel |
| `send_simulation` | Enviar Simulacao | Connects CRM to simulator output |
| `send_proposal` | Enviar Proposta | Connects CRM to proposal flow |
| `schedule_meeting` | Agendar Reuniao | Sales cycle anchor |
| `request_documents` | Solicitar Documentacao | Administrative/commercial handoff |
| `follow_up` | Follow-up | Generic follow-up without channel specificity |
| `other` | Outro | Escape hatch for real-world cases |

Recommendation:

Keep the list short in v1. A task system wins by being easy to use, not by having too many categories.

## Section 3 - Task Data Model

Future entity:

```text
crm_tasks
```

Recommended fields:

| Field | Purpose |
| --- | --- |
| `id` | Unique task id |
| `organization_id` | Multi-tenant isolation |
| `lead_id` | Lead relationship |
| `assigned_user_id` | Responsible profile/user |
| `created_by_profile_id` | Author of task |
| `task_type` | Category of action |
| `title` | Short actionable label |
| `notes` | Optional task context |
| `due_date` | Required or strongly encouraged action date |
| `due_time` | Optional time |
| `status` | `pending`, `completed`, `canceled` |
| `completed_at` | Completion timestamp |
| `completed_by_profile_id` | User who completed |
| `canceled_at` | Cancellation timestamp |
| `canceled_by_profile_id` | User who canceled |
| `source_note_id` | Optional note that originated task |
| `metadata` | Future extensibility |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |
| `deleted_at` | Optional soft delete if needed later |

Do not create SQL in this sprint.

### Future task history

Future entity:

```text
crm_task_history
```

Purpose:

- audit status transitions;
- record assignment changes;
- preserve due date changes;
- support compliance and coaching.

Recommended fields:

- `id`
- `organization_id`
- `task_id`
- `lead_id`
- `actor_profile_id`
- `event_type`
- `from_value`
- `to_value`
- `created_at`

## Section 4 - Task Lifecycle

Recommended v1 states:

| State | Label | Meaning |
| --- | --- | --- |
| `pending` | Pendente | Task is open |
| `completed` | Concluida | Task was executed |
| `canceled` | Cancelada | Task is no longer relevant |

### Transitions

Allowed transitions:

```text
pending -> completed
pending -> canceled
canceled -> pending
completed -> pending
```

Recommendation:

Allow reopening in v1, but record it in future task history.

Do not allow silent deletion as the main workflow. Commercial execution needs traceability.

## Section 5 - Lead Detail UX

### Future note-to-task workflow

Proposed flow:

```text
User saves note
↓
System asks: "Deseja criar uma proxima acao?"
↓
User chooses yes/no
↓
If yes, task creation form opens
↓
User selects type, date, time, owner and title
↓
Task is created
```

### Advantages

- encourages action after context capture;
- avoids automatic task noise;
- keeps user in control;
- connects historical memory to future execution.

### Disadvantages

- adds one more step after note creation;
- could slow fast note-taking if too prominent;
- must not feel mandatory.

Recommendation:

Use a lightweight prompt after successful note creation:

```text
Nota salva. Criar proxima acao?
```

Options:

- `Criar acao`
- `Agora nao`

Default should not force task creation.

## Section 6 - Proxima Acao Block

Current block:

- displays `lead.proximaAcao` or empty placeholder;
- has no task lifecycle;
- has no completion flow;
- has no assignment model.

Future block:

Display the next pending task for the lead.

Recommended content:

- task type;
- title;
- due date;
- due time;
- status;
- responsible user;
- quick action: complete;
- quick action: create next task.

### Conceptual examples

Example 1:

```text
Proxima Acao
WhatsApp
Enviar simulacao revisada
Hoje, 15:00
Responsavel: Bruno
Status: Pendente
```

Example 2:

```text
Proxima Acao
Ligar
Retomar objecao sobre entrada
Atrasada desde 17/06
Responsavel: Camille
Status: Pendente
```

Empty state:

```text
Nenhuma proxima acao criada.
Criar acao
```

## Section 7 - Meu Dia Evolution

This is the critical product shift.

Current `Meu Dia` is derived from lead fields and commercial priority helpers.

Future `Meu Dia` should be task-driven.

Recommended sections:

### Atrasadas

Pending tasks with `due_date < today`.

Purpose:

- rescue missed commitments;
- prevent leads from being forgotten.

### Hoje

Pending tasks with `due_date = today`.

Purpose:

- daily execution queue.

### Proximos 7 dias

Pending tasks with due dates in the next seven days.

Purpose:

- planning horizon without overwhelming the user.

### Sem responsavel

Tasks without assigned owner.

Purpose:

- operational hygiene and accountability.

### Sem proxima acao

Active leads with no pending task.

Purpose:

- triage queue.

Recommendation:

`Meu Dia` should eventually become:

```text
Tasks first, leads second.
```

Lead cards remain useful, but the primary unit of work becomes the task.

## Section 8 - Completion Workflow

Recommended completion flow:

```text
User completes task
↓
System marks task completed
↓
System asks: "Deseja registrar uma nota?"
↓
System asks: "Deseja criar a proxima acao?"
```

Recommendation:

Completion should show a compact post-action panel:

1. `Registrar nota` optional.
2. `Criar proxima acao` recommended.
3. `Concluir sem nova acao` allowed.

Why:

- sales work rarely ends with one action;
- completion is the best moment to capture context;
- next action discipline prevents silent lead abandonment.

Do not automatically create notes or next tasks.

## Section 9 - CRM Intelligence Integration

Future intelligence opportunities:

| Signal | Product meaning |
| --- | --- |
| Leads without pending task | Active opportunities with no operational owner/action |
| Overdue tasks | Immediate execution risk |
| Task completion rate | Follow-up discipline |
| Average response cycle | Time between task creation and completion |
| Repeated canceled tasks | Possible low-fit or stalled lead |
| Hot manual temperature without task | High commercial intent without execution plan |
| Proposal sent without follow-up task | Revenue leakage risk |

Recommended future metrics:

- pending tasks by owner;
- overdue tasks by owner;
- active leads without task;
- tasks completed today;
- average delay on overdue completion;
- next-action coverage percentage.

No AI or automation is required for v1.

## Section 10 - Future Database Strategy

Recommended future entities:

```text
crm_tasks
crm_task_history
```

### crm_tasks

Primary operational entity.

Must be:

- organization-scoped;
- authenticated-only;
- connected to `profiles`;
- connected to `crm_leads`;
- designed for RLS from the start.

### crm_task_history

Audit trail for task changes.

Should record:

- creation;
- assignment changes;
- due date changes;
- status transitions;
- completion;
- cancellation;
- reopening.

### Relationship with notes

Tasks may optionally reference notes through:

```text
source_note_id
```

Notes should not depend on tasks.

Tasks should not require notes.

### Relationship with current lead fields

Future migration strategy:

1. Keep `lead.proximaAcao` and `lead.dataProximaAcao` as legacy/display fallback initially.
2. Introduce `crm_tasks` in parallel.
3. Use pending tasks to power `Proxima Acao`.
4. Later decide whether lead-level next action fields become deprecated, derived, or retained as cached summaries.

## Recommended Implementation Roadmap

### Sprint 103A.2 - Commercial Task Schema Design

Design SQL, RLS, rollback and validation scripts only.

No execution.

### Sprint 103A.3 - Commercial Task Server/API Design

Design server-side access pattern.

No implementation.

### Sprint 103A.4 - Commercial Task Foundation

Create types/repository/server foundation if approved.

No UI connection yet.

### Sprint 103A.5 - Add Task Modal

Create first UI flow from lead dossier.

### Sprint 103A.6 - Meu Dia Task Runtime

Shift `Meu Dia` from lead-derived queues to task-driven queues.

## Final Recommendation

EVOLV should introduce a dedicated Commercial Task System.

The key product rule:

```text
Notes remember. Tasks execute.
```

Do not overload notes.

Do not rely only on `proximaAcao` as lead text.

Make future commercial execution explicit, assigned, dated, completable and auditable.

