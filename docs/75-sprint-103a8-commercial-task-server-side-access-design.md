# Sprint 103A.8 - Commercial Task Server-Side Access Design

## Objective

Design the server-side access model for Commercial Tasks before implementation.

This sprint is design-only. No code was implemented, no SQL was created or executed, no API route was created, no repository was changed, no UI was changed, and no database/Auth/RLS/policy/runtime behavior was altered.

Core product rule:

```text
Notas lembram. Tarefas executam.
```

Core security rule:

```text
The frontend must not decide trusted ownership fields.
```

## Context

Commercial Task foundation is approved for application development.

Completed chain reviewed:

- Sprint 103A.1: Commercial Task System Design
- Sprint 103A.2: Commercial Task Schema Design
- Sprint 103A.3: Commercial Task SQL Package Design
- Sprint 103A.4: Commercial Task SQL Package Creation
- Sprint 103A.5: SQL Package Review and Execution Readiness
- Sprint 103A.6: Controlled Apply Window
- Sprint 103A.7: Post-Apply Audit

Current production state, based on the sprint context:

- `public.crm_tasks` exists.
- RLS is enabled.
- Policies are authenticated-only and organization-scoped.
- No anon policy exists.
- No DELETE policy exists.
- No UI implementation exists yet.
- No repository implementation exists yet.
- No commercial tasks have been intentionally created by the app.

## Existing Server-Side Patterns Inspected

Inspected files:

- `app/api/crm/lead-notes/route.ts`
- `modules/crm/server/crm-lead-notes-service.ts`
- `modules/crm/crm-lead-notes.ts`
- `components/crm/crm-lead-detail.tsx`
- `modules/access/supabase-auth.ts`
- docs from Sprints 103A.1 through 103A.7

Current server-side pattern for lead notes:

1. Client reads Supabase access token from current browser session.
2. Client calls an internal API route with:
   - `Authorization: Bearer <access_token>`
3. API route extracts Bearer token.
4. Route delegates to a server-side service.
5. Service creates a Supabase client with:
   - publishable key;
   - `persistSession: false`;
   - `Authorization` header set to the user's Bearer token.
6. Service calls `supabase.auth.getUser(accessToken)`.
7. Service loads the matching `profiles` row.
8. Service validates:
   - profile exists;
   - `organization_id` exists;
   - role is `admin` or `sdr`;
   - `is_active = true`.
9. Service validates the target lead belongs to the same organization.
10. Service performs the operation with server-constructed trusted fields.

This is the safest current EVOLV pattern and should be reused for Commercial Tasks.

## Trusted Field Ownership

### Task Creation

Frontend may propose:

- `lead_id`
- `assigned_user_id`, if assignment is allowed in v1
- `task_type`
- `title`
- `notes`
- `due_date`
- `due_time`
- `source_note_id`, if created from a note

Server must resolve or force:

- `organization_id`
- `created_by`
- `status = 'pending'`
- `created_at` and `updated_at` through database defaults/triggers

Frontend must not send or control:

- `organization_id`
- `created_by`
- `status`
- `completed_at`
- `completed_by`
- `canceled_at`
- `canceled_by`

### Task Completion

Frontend may submit:

- `task_id`
- optional completion note/result

Server must resolve:

- task organization;
- current profile;
- `completed_by`;
- `completed_at`;
- `status = 'completed'`.

Frontend must not send or control:

- `completed_by`
- `completed_at`
- final status value beyond the dedicated completion operation

### Task Cancellation

Frontend may submit:

- `task_id`
- optional cancellation reason

Server must resolve:

- task organization;
- current profile;
- `canceled_by`;
- `canceled_at`;
- `status = 'canceled'`.

Frontend must not send or control:

- `canceled_by`
- `canceled_at`
- final status value beyond the dedicated cancellation operation

## Creation Rules

Creation must follow these rules:

1. Supabase session must be valid.
2. Profile must exist, be active and have role `admin` or `sdr`.
3. Profile must have `organization_id`.
4. Lead must exist.
5. Lead must belong to current profile organization.
6. `assigned_user_id`, if provided, must belong to the same organization.
7. `assigned_user_id`, if omitted, should default to current profile in v1.
8. `source_note_id`, if provided, must belong to the same lead and organization.
9. `task_type` must be one of the allowed values.
10. `title` must not be blank.
11. `due_date` is required.
12. `due_time` is optional.
13. Initial status must always be `pending`.
14. No client-provided `organization_id` may be accepted.
15. No client-provided `created_by` may be accepted.

Allowed `task_type` values:

- `call`
- `whatsapp`
- `send_simulation`
- `send_proposal`
- `schedule_meeting`
- `request_documents`
- `follow_up`
- `other`

## Completion Rules

Completion must be a dedicated operation, not a generic update.

Rules:

1. Supabase session must be valid.
2. Profile must be valid and active.
3. Task must exist.
4. Task must belong to current organization.
5. Task status should be `pending`.
6. Server sets:
   - `status = 'completed'`
   - `completed_at = now`
   - `completed_by = current profile id`
7. Server should not allow client to overwrite organization, lead, creator or assignment in the completion call.
8. Completed tasks should have restricted future edits.

Recommended v1 behavior:

- allow completion only from `pending`;
- do not implement reopening in the first implementation sprint;
- document reopening as future lifecycle work.

## Cancellation Rules

Cancellation must be a dedicated operation, not a hard delete.

Rules:

1. Supabase session must be valid.
2. Profile must be valid and active.
3. Task must exist.
4. Task must belong to current organization.
5. Task status should be `pending`.
6. Server sets:
   - `status = 'canceled'`
   - `canceled_at = now`
   - `canceled_by = current profile id`
7. Server should not hard-delete tasks.
8. Server should not allow client-side status bypass.

Recommended v1 behavior:

- no hard delete;
- no DELETE API;
- no DELETE repository method;
- cancellation reason can be captured later as task note/history if needed.

## Validation Rules

### Shared Request Context

Every server-side task operation should first resolve:

- Supabase user from Bearer token;
- profile row;
- organization id;
- role;
- active status.

Invalid context should return a generic access error.

### Lead Validation

For create/list-by-lead:

- lead must exist;
- lead must have `organization_id`;
- lead organization must equal profile organization.

### Task Validation

For complete/cancel/read task:

- task must exist;
- task organization must equal profile organization.

### Assignment Validation

If `assigned_user_id` is provided:

- profile must exist;
- profile must be active;
- profile organization must equal current organization;
- role must be valid.

If omitted:

- default to current profile id in v1.

### Source Note Validation

If `source_note_id` is provided:

- note must exist;
- note must not be deleted;
- note must belong to same lead;
- note organization must equal current organization.

### Status Validation

Server should not expose a generic "set status" endpoint in v1.

Allowed v1 transitions:

- create task: implicit `pending`;
- complete task: `pending -> completed`;
- cancel task: `pending -> canceled`.

No hard delete.

## Recommended Service Architecture

Recommendation:

```text
Next.js API route handlers + server-only service functions + internal mapping helpers
```

This matches the existing lead notes implementation and keeps task access behind a server-side validation layer.

Recommended future files:

```text
app/api/crm/tasks/route.ts
app/api/crm/tasks/[taskId]/complete/route.ts
app/api/crm/tasks/[taskId]/cancel/route.ts
modules/crm/server/crm-tasks-service.ts
modules/crm/crm-tasks.ts
```

Optional later, if complexity grows:

```text
modules/crm/server/crm-request-context.ts
```

Reason:

Lead notes and tasks will share request-context logic. A shared context helper can reduce duplication, but it should be introduced carefully in the implementation sprint only if it keeps the diff small.

### Why API Route Handlers

API route handlers fit the current EVOLV pattern because:

- lead notes already use `app/api/crm/lead-notes/route.ts`;
- the client already retrieves Supabase access token and sends Bearer token;
- route handlers make future UI integration straightforward;
- they keep database writes out of React components;
- they avoid trusting browser-sent ownership fields.

### Why Not Direct Browser Repository

Direct browser access to `crm_tasks` should be avoided for write operations because:

- browser payload can spoof `organization_id`;
- browser payload can spoof `created_by`;
- browser payload can spoof completion/cancellation fields;
- RLS is necessary but not enough for business workflow integrity;
- EVOLV needs server-side validation before task creation.

## Conceptual Service Functions

Recommended future service functions:

```ts
listTasksForLead(accessToken, leadId)
listMyTasksForToday(accessToken)
listMyTasksForNextSevenDays(accessToken)
listOverdueTasks(accessToken)
createCommercialTask(accessToken, input)
completeCommercialTask(accessToken, taskId, input)
cancelCommercialTask(accessToken, taskId, input)
```

Recommended internal helpers:

```ts
resolveTaskRequestContext(accessToken)
validateLeadBelongsToOrganization(context, leadId)
validateTaskBelongsToOrganization(context, taskId)
validateAssignedProfileBelongsToOrganization(context, assignedUserId)
validateSourceNoteBelongsToLeadAndOrganization(context, sourceNoteId, leadId)
mapCrmTaskRow(row)
normalizeTaskType(value)
normalizeTaskStatus(value)
```

Recommended result style:

Reuse the lead-notes service pattern:

```ts
{ ok: true, task }
{ ok: false, error, status }
```

## Read / Query Patterns

### Lead Detail: Next Pending Task

Purpose:

Power the future `Proxima Acao` block.

Conceptual query:

```text
lead_id = leadId
status = pending
order by due_date asc, due_time asc nulls last, created_at asc
limit 1
```

### Lead Detail: Task History

Purpose:

Show pending, completed and canceled tasks for the lead.

Conceptual query:

```text
lead_id = leadId
order by due_date desc, created_at desc
```

### Meu Dia: Overdue

Purpose:

Show pending tasks requiring immediate attention.

Conceptual query:

```text
status = pending
due_date < today
assigned_user_id = current profile id
```

### Meu Dia: Today

Purpose:

Daily execution queue.

Conceptual query:

```text
status = pending
due_date = today
assigned_user_id = current profile id
```

### Meu Dia: Next 7 Days

Purpose:

Planning horizon.

Conceptual query:

```text
status = pending
due_date between tomorrow and today + 7 days
assigned_user_id = current profile id
```

### Management / Admin View

For admin users only, later versions may allow:

- tasks by assigned user;
- tasks without responsible user;
- overdue by user;
- completion rate by user.

This should not be part of the first implementation sprint unless explicitly approved.

## Error Handling

Recommended UX-safe messages:

| Situation | Message |
| --- | --- |
| Missing session | `Sessao indisponivel.` |
| Invalid access/profile | `Nao foi possivel concluir a operacao. Entre em contato com o administrador.` |
| Missing lead id | `Informe o lead da tarefa.` |
| Lead not found/outside organization | `Lead nao encontrado.` |
| Missing title | `Informe o titulo da tarefa.` |
| Missing due date | `Data da acao e obrigatoria.` |
| Invalid task type | `Tipo de tarefa invalido.` |
| Invalid assigned user | `Responsavel invalido.` |
| Invalid source note | `Nota de origem invalida.` |
| Task not found/outside organization | `Tarefa nao encontrada.` |
| Generic create failure | `Nao foi possivel criar a tarefa.` |
| Generic completion failure | `Nao foi possivel concluir a tarefa.` |
| Generic cancellation failure | `Nao foi possivel cancelar a tarefa.` |

Security posture:

- do not reveal whether a task exists in another organization;
- do not reveal whether a profile exists in another organization;
- use generic errors for access failures;
- keep detailed errors out of UI.

## Audit / History Strategy

Recommendation for v1:

```text
Use fields on crm_tasks only initially.
```

Do not create `crm_task_history` in the first implementation sprint.

Reason:

- `crm_tasks` already captures creation, completion and cancellation fields;
- the first product value is task creation and execution;
- adding history too early increases implementation and RLS complexity;
- a separate history table can be added after real task usage proves which events matter.

Future `crm_task_history` should track:

- task creation;
- assignment changes;
- due date/time changes;
- status transitions;
- completion;
- cancellation;
- reopening, if introduced.

## Security Risks

| Risk | Impact | Required mitigation |
| --- | --- | --- |
| Client spoofs `organization_id` | Cross-tenant task creation | Server resolves organization from profile and lead. |
| Client spoofs `created_by` | False authorship | Server sets `created_by` from profile. |
| Task assigned to user from another organization | Cross-tenant leakage or broken queue | Server validates assigned profile organization. |
| Task created for lead outside organization | Cross-tenant association | Server validates lead organization before insert. |
| `source_note_id` belongs to another lead | False note-to-task relationship | Server validates note lead and organization. |
| Client bypasses lifecycle by sending status directly | Invalid task state | Use dedicated complete/cancel endpoints, not generic status updates. |
| RLS gives false sense of security | Business rules may still be spoofed inside same org | Server validates ownership and workflow fields before DB write. |
| Hard delete removes execution history | Loss of accountability | No DELETE endpoint or policy in v1. |

## Rollout Plan

### Sprint 103A.9 - Commercial Task Server-Side Access Implementation

Implement:

- task types;
- task API routes;
- server-side service;
- request context resolution;
- create task;
- list tasks for lead;
- complete task;
- cancel task;
- no UI connection yet or only internal smoke if explicitly approved.

### Sprint 103A.10 - Lead Detail Task Read Integration

Implement:

- read-only `Proxima Acao` block powered by `crm_tasks`;
- fallback to legacy lead fields if no task exists;
- no task creation modal yet.

### Sprint 103A.11 - Create Task Modal

Implement:

- create task from lead dossier;
- server-side creation API;
- validation feedback;
- immediate refresh of `Proxima Acao`.

### Sprint 103A.12 - Note-to-Task Bridge

Implement:

- after note creation, offer `Criar proxima acao`;
- link task to `source_note_id`;
- do not auto-create tasks from notes.

### Sprint 103A.13 - Meu Dia Task Runtime

Implement:

- overdue tasks;
- today's tasks;
- next 7 days;
- assigned-to-me queue;
- task completion workflow.

## Non-goals

This sprint does not authorize:

- implementation;
- code changes;
- UI changes;
- repository changes;
- API route creation;
- SQL creation;
- SQL execution;
- migrations;
- database changes;
- Auth changes;
- RLS changes;
- policy changes;
- task data insertion;
- touching `crm_leads`;
- touching `crm_lead_notes`;
- touching simulator, proposals, recovery, auth helpers, profile logic or organization logic.

## Recommended Next Sprint

Sprint 103A.9 - Commercial Task Server-Side Access Implementation.

Recommended scope:

- implement server-only task service and route handlers;
- no visible UI yet;
- no direct browser writes to `crm_tasks`;
- no SQL;
- no schema change;
- no RLS/policy change.

The first implementation sprint should make the backend contract safe before Bruno sees task creation controls.
