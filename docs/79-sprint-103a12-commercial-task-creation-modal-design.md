# Sprint 103A.12 - Commercial Task Creation Modal Design

## Objective

Design the Commercial Task creation experience before implementation.

This sprint is design-only. No code was implemented, no UI was modified, no modal was created, no SQL was created or executed, and no database/Auth/RLS/policy/repository/API/server-side behavior was changed.

Core product rule:

```text
Notas lembram. Tarefas executam.
```

## Current State

Commercial Task foundation is available:

- `public.crm_tasks` exists.
- Server-side service exists.
- API routes exist.
- Lead Detail reads tasks through `GET /api/crm/tasks?leadId=...`.
- `Proxima Acao` block displays the next pending task when one exists.
- Empty state exists when no pending task exists.

Missing:

- no task creation modal;
- no create task UI;
- no note-to-task prompt;
- no completion UI;
- no cancellation UI;
- no `Meu Dia` task runtime.

## Entry Points

### A. Empty State Entry

When the `Proxima Acao` block has no pending task:

```text
Sem proxima acao
Nenhuma acao programada.
Criar proxima acao
```

Recommendation:

This should be the primary v1 entry point.

Why:

- it directly solves the operational gap;
- it keeps the UI contextual;
- it avoids introducing a broad task surface too early;
- Bruno sees the prompt exactly where the missing action matters.

### B. Existing Pending Task Entry

When a pending task already exists:

```text
Nova acao
```

Recommendation:

Include this as a secondary v1 entry point, visually quieter than the task itself.

Why:

- some leads legitimately need multiple future actions;
- it avoids forcing users to complete/cancel before planning another action;
- it should not compete visually with the current next action.

### C. After Saving a Note

After a note is saved:

```text
Nota salva. Deseja criar uma proxima acao?
Criar acao
Agora nao
```

Recommendation:

Defer to a follow-up sprint after the standalone modal is validated.

Why:

- note-to-task is important, but it introduces a second workflow path;
- first, the modal should be proven from the `Proxima Acao` block;
- this keeps v1 focused and reduces risk.

## Preferred V1 Approach

Implement creation first from the Lead Detail `Proxima Acao` block:

1. Empty state: `Criar proxima acao`.
2. Existing pending task: secondary `Nova acao`.
3. Note-to-task prompt: future sprint.

This gives Bruno a clear way to plan the next action without adding more complexity to notes yet.

## Modal Structure

Recommended modal title:

```text
Criar proxima acao
```

Recommended supporting copy:

```text
Defina uma tarefa comercial clara para este lead.
```

Fields:

| Field | Required | Input | Notes |
| --- | --- | --- | --- |
| `Tipo da acao` | yes | select | Uses approved task types. |
| `Titulo` | yes | text input | Short actionable label. |
| `Data` | yes | date input | Drives `Meu Dia` and overdue logic. |
| `Horario` | no | time input | Optional. |
| `Observacao` | no | textarea | Context for execution, not historical note. |

Fields not exposed:

- `organization_id`
- `created_by`
- `status`
- `completed_at`
- `completed_by`
- `canceled_at`
- `canceled_by`

Buttons:

- `Cancelar`
- `Criar acao`

Loading state:

- disable fields and submit button;
- button text: `Criando...`.

Error state:

- keep modal open;
- preserve typed data;
- show safe message near footer.

## Field Design

### Tipo da Acao

Required.

Use a select with the approved options:

- `Ligar`
- `WhatsApp`
- `Enviar simulacao`
- `Enviar proposta`
- `Agendar reuniao`
- `Solicitar documentacao`
- `Follow-up`
- `Outro`

Default recommendation:

```text
Follow-up
```

Why:

- generic enough for most first use;
- does not assume channel;
- avoids blank select friction.

### Titulo

Required.

Recommended v1:

```text
Free text title, optionally prefilled from task type.
```

This combines Option A and Option B safely:

- user can edit the title;
- selecting a type can suggest a reasonable default only when title is empty.

Suggested defaults:

| Task type | Suggested title |
| --- | --- |
| `call` | `Entrar em contato` |
| `whatsapp` | `Enviar WhatsApp` |
| `send_simulation` | `Enviar simulacao` |
| `send_proposal` | `Enviar proposta` |
| `schedule_meeting` | `Agendar reuniao` |
| `request_documents` | `Solicitar documentacao` |
| `follow_up` | `Fazer follow-up` |
| `other` | empty |

Why this is safest:

- avoids robotic task titles;
- gives speed without hiding responsibility;
- keeps task intent explicit.

### Data

Required.

Recommended default:

```text
today
```

Why:

- encourages immediate operational planning;
- avoids accidental task creation without queue date;
- user can move it forward if needed.

### Horario

Optional.

Recommended default:

```text
empty
```

Why:

- many commercial actions need a date but not a precise time;
- forcing time increases friction;
- tasks without time can sort later in the selected day.

### Observacao

Optional.

Recommended placeholder:

```text
Contexto rapido para executar esta acao.
```

Important:

This field is not a historical note. It is execution context for the task. If Bruno wants to preserve a relationship event, he should still use notes.

## Task Type Labels

| Value | UI label |
| --- | --- |
| `call` | `Ligar` |
| `whatsapp` | `WhatsApp` |
| `send_simulation` | `Enviar simulacao` |
| `send_proposal` | `Enviar proposta` |
| `schedule_meeting` | `Agendar reuniao` |
| `request_documents` | `Solicitar documentacao` |
| `follow_up` | `Follow-up` |
| `other` | `Outro` |

The current project often uses ASCII Portuguese. Keep this convention unless the whole UI is normalized later.

## Assignee Strategy

Options evaluated:

### Option 1 - Default Current User, No Selector

The server defaults `assigned_user_id` to current profile when none is provided.

Pros:

- simplest usable v1;
- avoids needing user/profile picker;
- reduces risk of assigning to wrong person;
- matches the immediate operational goal.

Cons:

- cannot delegate from the modal yet;
- admin assignment workflows are deferred.

### Option 2 - Optional Reassignment Selector

Pros:

- supports team delegation;
- useful for admin workflows.

Cons:

- requires listing eligible profiles;
- adds another API/read concern;
- raises UX and permission questions;
- can slow first adoption.

Recommendation:

```text
V1 should use current user as default and expose no assignee selector.
```

Reason:

The first value is getting tasks into the workflow. Delegation can be introduced after task creation and `Meu Dia` behavior are validated.

Future assignee selector should only list active profiles in the same organization.

## Due Date Strategy

Recommended v1:

- `Data` required;
- default to today;
- `Horario` optional;
- no recurring dates;
- no reminder date;
- no calendar sync.

Validation:

- if date is empty: `Data da acao e obrigatoria.`
- if invalid: `Data da acao e invalida.`
- if time invalid: `Horario da acao invalido.`

Past dates:

Allow past dates only if the user intentionally selects them.

Reason:

- sometimes a user may log an overdue commitment;
- blocking past dates could make recovery workflows harder.

The UI should visually show overdue after creation.

## Validation UX

Required validations:

| Field | Error |
| --- | --- |
| Tipo da acao | `Tipo de acao invalido.` |
| Titulo | `Informe o titulo da tarefa.` |
| Data | `Data da acao e obrigatoria.` |

Generic failure:

```text
Nao foi possivel criar a tarefa.
```

Access/session failure:

```text
Sessao invalida.
```

UX behavior:

- keep modal open on validation/server error;
- preserve typed values;
- focus should remain in the modal;
- do not clear form until creation succeeds.

## Success Flow

Options evaluated:

### A. Success toast + refresh Proxima Acao block

Good, but modal state remains ambiguous.

### B. Success toast + close modal + refresh task list

Best v1.

### C. Open task details

Too much for v1 because no task detail view exists.

Recommendation:

```text
Success toast + close modal + refresh task list.
```

Expected flow:

1. User opens modal.
2. User fills required fields.
3. User clicks `Criar acao`.
4. UI calls `POST /api/crm/tasks`.
5. Server creates task with trusted fields.
6. Modal closes.
7. `Proxima Acao` block refreshes.
8. Success message appears:

```text
Acao criada com sucesso.
```

If created task is the earliest pending task, it appears immediately in the block.

## Non-Goals

Explicitly excluded from v1:

- recurring tasks;
- reminders;
- notifications;
- AI-generated tasks;
- note parsing;
- automatic task extraction from notes;
- calendar integrations;
- workflow automations;
- task history UI;
- task dashboard;
- profile assignment selector;
- task completion UX;
- task cancellation UX;
- `Meu Dia` task runtime;
- task bulk actions.

## Rollout Plan

### Sprint 103A.13 - Commercial Task Creation Modal Implementation

Implement:

- modal from `Proxima Acao` block;
- type selector;
- title;
- date;
- optional time;
- optional observation;
- `POST /api/crm/tasks`;
- success close + refresh;
- validation and error states.

Do not implement:

- completion;
- cancellation;
- note-to-task prompt;
- assignee selector;
- `Meu Dia`.

### Sprint 103A.14 - Task Completion Action

Implement:

- `Concluir` button;
- `PATCH /api/crm/tasks/[taskId]/complete`;
- refresh task list;
- optional prompt design for note/next action.

### Sprint 103A.15 - Task Cancellation Action

Implement:

- `Cancelar` button;
- `PATCH /api/crm/tasks/[taskId]/cancel`;
- refresh task list.

### Sprint 103A.16 - Note-to-Task Bridge

Implement:

- after note save prompt;
- `Criar proxima acao`;
- pass `sourceNoteId`;
- no automatic task creation.

### Sprint 103A.17 - Meu Dia Task Runtime

Implement:

- overdue tasks;
- today's tasks;
- next 7 days;
- assigned to current user.

## Recommended Next Sprint

Sprint 103A.13 - Commercial Task Creation Modal Implementation.

Recommended scope:

- create the modal;
- wire `POST /api/crm/tasks`;
- refresh read-only task list after success;
- keep trusted fields server-side;
- no completion/cancellation yet.
