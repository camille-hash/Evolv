# Sprint 103A.10 - Commercial Task Validation and Lead Detail Read Design

## Objective

Validate the Sprint 103A.9 server-side Commercial Task implementation and design how the Lead Detail dossier should read and display commercial tasks in the next UI sprint.

This sprint is validation and design only. No SQL was created or executed. No database, Auth, RLS, policy, schema, simulator, proposal, recovery, profile or organization behavior was changed. No full UI was implemented and no task creation modal was connected.

## Server-Side Files Reviewed

- `modules/crm/crm-tasks.ts`
- `modules/crm/server/crm-tasks-service.ts`
- `app/api/crm/tasks/route.ts`
- `app/api/crm/tasks/[taskId]/complete/route.ts`
- `app/api/crm/tasks/[taskId]/cancel/route.ts`
- `docs/75-sprint-103a8-commercial-task-server-side-access-design.md`
- `docs/76-sprint-103a9-commercial-task-server-side-access-implementation.md`

## Server-Side Validation Findings

The server-side implementation aligns with the 103A.8 design.

Confirmed:

- API routes require Bearer token.
- Supabase user is validated with `auth.getUser`.
- Current profile is loaded from `profiles`.
- Profile must be active.
- Profile must have `organization_id`.
- Profile role must be `admin` or `sdr`.
- Client does not control `organization_id`.
- Client does not control `created_by`.
- Client does not control `completed_by`.
- Client does not control `canceled_by`.
- Initial status is forced to `pending`.
- Completion status is set only by `completeCommercialTask`.
- Cancellation status is set only by `cancelCommercialTask`.
- Lead ownership is validated before creating/listing tasks for a lead.
- Task ownership is validated before completing/canceling.
- `assigned_user_id` is validated when supplied.
- `source_note_id` is validated when supplied.
- No hard delete exists.
- No DELETE route exists.
- No automatic note creation exists.
- UI is not connected to task creation yet.

Implemented routes confirmed:

- `GET /api/crm/tasks?leadId=...`
- `GET /api/crm/tasks?fromDate=...&toDate=...`
- `POST /api/crm/tasks`
- `PATCH /api/crm/tasks/[taskId]/complete`
- `PATCH /api/crm/tasks/[taskId]/cancel`

## Security Findings

No blocking security gap was found during this sprint.

Security posture confirmed:

- trusted ownership fields are resolved server-side;
- `organization_id` is resolved from the authenticated profile;
- task creation validates the lead belongs to the current organization;
- assignment validates the assigned profile belongs to the current organization;
- source note validation checks same lead, same organization and not deleted;
- task mutation validates the task belongs to the current organization;
- status transitions are not exposed through a generic update route;
- completed/canceled tasks cannot be completed/canceled again through the service because only `pending` tasks are accepted.

Non-blocking observations:

1. `dueDate` and `dueTime` use shape validation before insert. Invalid calendar values would still be rejected by the database and returned as a generic creation failure. This is acceptable for the server foundation and can be refined when the UI form is implemented.
2. Completion and cancellation input currently reserves optional `result` / `reason` but does not persist them. This is intentional; note/history integration remains out of scope.
3. `listMyTasksForDateWindow` is available for future `Meu Dia` but no UI consumes it yet.

## Corrections Made

No code correction was required in Sprint 103A.10.

## Lead Detail Read Model

The next UI sprint should load commercial tasks from the Lead Detail dossier with:

```text
GET /api/crm/tasks?leadId=<leadId>
Authorization: Bearer <access_token>
```

Client read flow:

1. Lead detail opens.
2. Browser reads Supabase access token from the active Supabase session.
3. Browser calls `GET /api/crm/tasks?leadId=...`.
4. API validates session/profile/organization.
5. API validates lead belongs to the current organization.
6. API returns tasks for the lead.
7. Lead Detail derives the next pending task client-side from returned tasks.

Recommended local state:

- `tasksState: { leadId: string; tasks: CrmTask[] } | null`
- `isLoadingTasks`
- `taskLoadError`

Recommended refresh triggers:

- lead id changes;
- task is completed;
- task is canceled;
- future task creation succeeds.

## Next Pending Task Logic

Pending task filter:

```text
status = pending
```

Sort:

```text
dueDate asc
dueTime asc, nulls last
createdAt asc
```

The first sorted pending task becomes the Lead Detail `Proxima Acao`.

Completed and canceled tasks:

- should not drive the `Proxima Acao` block;
- may appear later in a compact history section;
- should remain visually secondary to the active next action.

## Proxima Acao Block Design

### If Next Pending Task Exists

Show:

- task type label;
- due date;
- due time, if available;
- title;
- notes, if available;
- responsible user, if available;
- status;
- actions:
  - `Concluir`;
  - `Cancelar`;
  - `Criar proxima acao` later.

Recommended visual hierarchy:

1. due status: `Atrasada`, `Hoje`, `Agendada`;
2. title;
3. type label and due date/time;
4. notes/responsible metadata;
5. actions.

Example:

```text
Proxima acao
Hoje, 15:00
WhatsApp
Enviar simulacao revisada
Responsavel: Bruno

Concluir   Cancelar
```

### If No Pending Task Exists

Show:

```text
Sem proxima acao
```

CTA for a future sprint:

```text
Criar proxima acao
```

The empty state should be useful but not alarming.

## Completion / Cancellation Design

### Completion

Future UI behavior:

1. User clicks `Concluir`.
2. UI calls:

```text
PATCH /api/crm/tasks/[taskId]/complete
```

3. Server validates session/profile/organization/task.
4. Server sets:
   - `status = completed`
   - `completed_at`
   - `completed_by`
5. UI refreshes task list.
6. Optional later prompt:
   - `Deseja registrar uma nota?`
   - `Deseja criar a proxima acao?`

### Cancellation

Future UI behavior:

1. User clicks `Cancelar`.
2. UI calls:

```text
PATCH /api/crm/tasks/[taskId]/cancel
```

3. Server validates session/profile/organization/task.
4. Server sets:
   - `status = canceled`
   - `canceled_at`
   - `canceled_by`
5. UI refreshes task list.

No hard delete should be introduced.

## UX Copy

Use clean EVOLV language:

- `Proxima acao`
- `Criar proxima acao`
- `Concluir`
- `Cancelar`
- `Atrasada`
- `Hoje`
- `Agendada`
- `Sem proxima acao`
- `Nao foi possivel carregar as tarefas.`
- `Nao foi possivel concluir a tarefa.`
- `Nao foi possivel cancelar a tarefa.`

The project currently uses ASCII Portuguese in many user-facing strings, so the first implementation should keep this style unless the broader UI is normalized later.

## What Should Not Appear Yet

Do not include in the next UI sprint:

- complex calendar integration;
- recurring tasks;
- automatic note parsing;
- AI extraction from notes;
- notification system;
- dashboard;
- task automation;
- task history table UI;
- bulk assignment;
- admin task management surface.

## Non-Goals

This sprint does not authorize:

- SQL creation;
- SQL execution;
- database changes;
- Auth changes;
- RLS changes;
- policy changes;
- schema changes;
- full UI implementation;
- task creation modal;
- production task insertion;
- seed data;
- simulator/proposals/recovery/profile/organization changes.

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

Sprint 103A.11 - Lead Detail Task Read Integration.

Recommended scope:

- read-only task loading in Lead Detail;
- display `Proxima acao` from existing tasks;
- show empty state when no pending task exists;
- support completion/cancellation buttons only if explicitly approved for the sprint;
- no create modal yet unless separately authorized.
