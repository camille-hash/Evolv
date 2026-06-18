# Sprint 103A.13 - Commercial Task Creation Modal Implementation

## Objective

Implement the first Commercial Task creation modal in the Lead Detail / Dossie `Proxima Acao` block.

This sprint adds task creation UI only. It does not implement task completion, task cancellation, `Meu Dia`, note-to-task prompt, SQL, schema changes, Auth changes, RLS changes or policy changes.

## Files Created

- `docs/80-sprint-103a13-commercial-task-creation-modal-implementation.md`

## Files Changed

- `components/crm/crm-lead-detail.tsx`
- `modules/crm/client/crm-tasks-client.ts`

## Modal Behavior

Entry points:

- empty `Proxima Acao` state shows `Criar proxima acao`;
- existing pending task state shows `Nova acao`.

On click:

1. modal opens;
2. user fills task fields;
3. client validates required fields;
4. UI calls `POST /api/crm/tasks`;
5. modal closes on success;
6. task list is updated locally;
7. the new task can appear immediately in `Proxima Acao`;
8. success message appears:

```text
Acao criada com sucesso.
```

Failure behavior:

- modal stays open;
- typed values are preserved;
- safe error is shown.

## Fields Implemented

Required:

- `Tipo da acao`
- `Titulo`
- `Data`

Optional:

- `Horario`
- `Observacao`

Defaults:

- task type: `follow_up`;
- title: `Fazer follow-up`;
- date: current local date;
- time: empty;
- observation: empty.

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

## API Used

Creation uses:

```text
POST /api/crm/tasks
```

The request includes the current Supabase access token:

```text
Authorization: Bearer <access_token>
```

## Trusted Fields Not Sent

The frontend sends only operational fields:

- `leadId`
- `taskType`
- `title`
- `notes`
- `dueDate`
- `dueTime`

The frontend does not send:

- `organization_id`
- `created_by`
- `assigned_user_id`
- `status`
- `completed_by`
- `completed_at`
- `canceled_by`
- `canceled_at`

Trusted ownership and lifecycle fields remain controlled by the server-side service.

## Validation UX

Client-side validation:

- missing task type: `Tipo da acao e obrigatorio.`
- missing title: `Titulo e obrigatorio.`
- missing date: `Data da acao e obrigatoria.`

Server remains the source of truth for:

- session;
- profile;
- organization;
- lead ownership;
- task type validity;
- database constraints.

## Non-Goals

This sprint did not implement:

- task completion;
- task cancellation;
- `Meu Dia`;
- note-to-task prompt;
- task history UI;
- notifications;
- reminders;
- recurrence;
- calendar integration;
- AI extraction;
- workflow automation;
- SQL or schema changes.

## Validation Results

Executed:

- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed with 4 preexisting warnings in `components/crm/crm-page.tsx`.
- `npm.cmd run build` - passed.

Preexisting lint warnings:

- `handleSubmit` is defined but never used.
- `handleCancelEdit` is defined but never used.
- `handlePipelineChange` is defined but never used.
- `LeadForm` is defined but never used.

## Recommended Next Sprint

Sprint 103A.14 - Commercial Task Completion Action.

Recommended scope:

- add `Concluir` action for pending task;
- call `PATCH /api/crm/tasks/[taskId]/complete`;
- refresh task list after success;
- do not introduce cancellation or note-to-task until completion is validated.
