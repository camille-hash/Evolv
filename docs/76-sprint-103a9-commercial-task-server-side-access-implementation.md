# Sprint 103A.9 - Commercial Task Server-Side Access Implementation

## Objective

Implement the server-side foundation for Commercial Tasks without connecting any UI and without changing database schema, Auth, RLS or policies.

Core rule:

```text
Notas lembram. Tarefas executam.
```

## Files Created

- `modules/crm/crm-tasks.ts`
- `modules/crm/server/crm-tasks-service.ts`
- `app/api/crm/tasks/route.ts`
- `app/api/crm/tasks/[taskId]/complete/route.ts`
- `app/api/crm/tasks/[taskId]/cancel/route.ts`
- `docs/76-sprint-103a9-commercial-task-server-side-access-implementation.md`

## Files Changed

- `modules/crm/index.ts`

## Service Functions Implemented

Implemented in `modules/crm/server/crm-tasks-service.ts`:

- `listTasksForLead(accessToken, leadId)`
- `listMyTasksForDateWindow(accessToken, { fromDate, toDate })`
- `createCommercialTask(accessToken, input)`
- `completeCommercialTask(accessToken, taskId, input)`
- `cancelCommercialTask(accessToken, taskId, input)`

## API Routes Implemented

Implemented:

- `GET /api/crm/tasks?leadId=<leadId>`
- `GET /api/crm/tasks?fromDate=<yyyy-mm-dd>&toDate=<yyyy-mm-dd>`
- `POST /api/crm/tasks`
- `PATCH /api/crm/tasks/[taskId]/complete`
- `PATCH /api/crm/tasks/[taskId]/cancel`

All routes require a Bearer token.

## Trusted Fields Controlled Server-Side

The frontend may send:

- `leadId`
- `assignedUserId`
- `taskType`
- `title`
- `notes`
- `dueDate`
- `dueTime`
- `sourceNoteId`

The server resolves or forces:

- `organization_id`
- `created_by`
- `status = pending`
- `completed_by`
- `completed_at`
- `canceled_by`
- `canceled_at`

The implementation never trusts client-supplied:

- `organization_id`
- `created_by`
- `completed_by`
- `completed_at`
- `canceled_by`
- `canceled_at`
- arbitrary status transitions

## Validations Implemented

Authentication and profile:

- Bearer token required.
- Supabase user validated with `auth.getUser`.
- Profile loaded from `profiles`.
- Profile must be active.
- Profile must have `organization_id`.
- Role must be `admin` or `sdr`.

Creation:

- `leadId` required.
- Lead must exist in current organization.
- `title` must not be blank.
- `dueDate` is required as `yyyy-mm-dd`.
- `dueTime`, if provided, must be `hh:mm` or `hh:mm:ss`.
- `taskType` must be one of the approved task types.
- `assignedUserId`, if provided, must be an active profile in the same organization.
- `sourceNoteId`, if provided, must belong to the same lead and organization and must not be deleted.
- Initial status is forced to `pending`.

Completion:

- Task must exist in current organization.
- Task must be `pending`.
- Server sets `status = completed`.
- Server sets `completed_at`.
- Server sets `completed_by`.

Cancellation:

- Task must exist in current organization.
- Task must be `pending`.
- Server sets `status = canceled`.
- Server sets `canceled_at`.
- Server sets `canceled_by`.

## Non-Goals

This sprint did not:

- create SQL;
- execute SQL;
- alter database schema;
- alter Auth;
- alter RLS;
- alter policies;
- alter repositories;
- connect UI;
- modify CRM cards or pipeline UX;
- create seed data;
- insert production task data manually;
- create notes automatically from task completion/cancellation;
- implement hard delete.

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

Sprint 103A.10 - Commercial Task Server-Side Access Validation and Lead Detail Read Design.

Recommended next step:

- validate API behavior locally or in a controlled environment;
- then design the first read-only UI integration for the lead dossier.
