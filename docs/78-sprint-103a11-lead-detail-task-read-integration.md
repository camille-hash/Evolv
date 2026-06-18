# Sprint 103A.11 - Lead Detail Task Read Integration

## Objective

Integrate read-only Commercial Task display into the Lead Detail / Dossie `Proxima Acao` block.

This sprint only reads tasks. It does not create, complete, cancel or mutate tasks from the UI.

## Files Created

- `modules/crm/client/crm-tasks-client.ts`
- `docs/78-sprint-103a11-lead-detail-task-read-integration.md`

## Files Changed

- `components/crm/crm-lead-detail.tsx`

## API Used

Lead Detail now reads tasks through the existing server-side API:

```text
GET /api/crm/tasks?leadId=<leadId>
```

The component reuses the current Supabase session token pattern already used for Lead Notes:

```text
Authorization: Bearer <access_token>
```

No direct Supabase query for `crm_tasks` was added to the frontend.

## Read-Only Nature

Implemented:

- fetch tasks for the current lead;
- store task list in local component state;
- derive the next pending task;
- show loading state;
- show safe error state;
- show empty state;
- render next pending task when present.

Not implemented:

- create task modal;
- complete task button;
- cancel task button;
- task mutation UI;
- Meu Dia integration;
- pipeline card changes.

## Next Pending Task Logic

The UI derives the next pending task by:

1. filtering `status === "pending"`;
2. sorting by:
   - earliest `dueDate`;
   - earliest `dueTime`, with tasks without time sorted later in the day;
   - earliest `createdAt`.

The first item becomes the `Proxima Acao` displayed in the dossier.

## Displayed Fields

When a pending task exists, the block displays:

- due status:
  - `Atrasada`
  - `Hoje`
  - `Agendada`
- task type label;
- status label `Pendente`;
- title;
- due date;
- due time, if present;
- notes, if present.

Task type labels:

| Value | Label |
| --- | --- |
| `call` | `Ligar` |
| `whatsapp` | `WhatsApp` |
| `send_simulation` | `Enviar simulacao` |
| `send_proposal` | `Enviar proposta` |
| `schedule_meeting` | `Agendar reuniao` |
| `request_documents` | `Solicitar documentacao` |
| `follow_up` | `Follow-up` |
| `other` | `Outro` |

## Empty / Loading / Error States

Loading:

```text
Carregando proxima acao...
```

No pending task:

```text
Sem proxima acao
Nenhuma acao programada.
```

Task fetch failure:

```text
Sem proxima acao
Nao foi possivel carregar as tarefas.
```

The dossier remains usable even if task loading fails.

## Non-Goals

This sprint does not authorize:

- SQL creation;
- SQL execution;
- database changes;
- Auth changes;
- RLS changes;
- policy changes;
- repository changes;
- task creation UI;
- task completion UI;
- task cancellation UI;
- CRM pipeline card changes;
- Meu Dia integration;
- seed data;
- production task insertion;
- simulator/proposals/recovery/profile/organization changes.

## Validation Results

Executed sequentially:

- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed with 4 preexisting warnings in `components/crm/crm-page.tsx`.
- `npm.cmd run build` - passed.

Preexisting lint warnings:

- `handleSubmit` is defined but never used.
- `handleCancelEdit` is defined but never used.
- `handlePipelineChange` is defined but never used.
- `LeadForm` is defined but never used.

## Recommended Next Sprint

Sprint 103A.12 - Commercial Task Creation Modal Design.

Recommended scope:

- design the task creation modal and form behavior;
- keep server-side trusted fields unchanged;
- do not add completion/cancellation until creation flow is validated.
