# Sprint 103A.2 - Commercial Task Schema Design

## Objective

Design the future database schema and RLS model for Commercial Tasks in EVOLV.

This sprint is schema design only. It does not implement code, create SQL, execute SQL, create migrations, alter schema, alter Supabase, alter Auth, alter RLS, alter policies, alter repositories or touch production data.

## Context From 103A.1

Sprint 103A.1 established the product rule:

```text
Notes remember. Tasks execute.
```

The CRM already has:

- leads;
- notes;
- dossier;
- `Proxima Acao` lead fields;
- `Meu Dia`;
- operational priority indicators.

The missing piece is a real task entity that can drive:

- the `Proxima Acao` block in the lead dossier;
- `Meu Dia`;
- overdue actions;
- actions for today;
- next 7 days;
- completion workflow;
- note-to-task workflow;
- future CRM Intelligence.

## Existing Conventions Inspected

Documents and conventions inspected:

- `docs/69-sprint-103a1-commercial-task-system-design.md`
- `docs/07-schema-oficial-auth-rls.md`
- `docs/60-sprint-101b29-bridge-retirement-closure-audit.md`
- `docs/21-sprint-99b-1-persistent-notes.md`
- existing Supabase SQL/docs references for `organizations`, `profiles`, `crm_leads`, `crm_lead_notes`, RLS helper functions and validation package patterns.

Relevant EVOLV conventions:

- tenant root: `public.organizations`;
- tenant key: `organization_id`;
- profile pattern: `profiles.id = auth.users.id`;
- initial roles: `admin`, `sdr`;
- RLS should be organization-scoped;
- authenticated runtime should use helper functions:
  - `public.evolv_current_organization_id()`;
  - `public.evolv_current_role()`;
- no new broad policy using `using (true)`;
- no browser `service_role`;
- no new `company_id` / `companies` pattern;
- avoid editing old migrations.

## Recommended Table Name

Recommended table:

```text
public.crm_tasks
```

Why this is the best name:

- matches CRM module naming;
- clearly represents executable commercial work;
- does not overload notes or activities;
- leaves room for future `crm_task_history`;
- follows existing table style such as `crm_leads` and `crm_lead_notes`.

Rejected alternatives:

- `crm_activities`: already exists as a local/frontend concept and can cause ambiguity.
- `crm_next_actions`: too narrow; tasks must support completion, cancellation, ownership and multiple future actions.
- `lead_tasks`: less consistent with current CRM table namespace.

## Proposed Schema

Future table:

```text
public.crm_tasks
```

Conceptual fields:

- `id`
- `organization_id`
- `lead_id`
- `assigned_user_id`
- `created_by`
- `completed_by`
- `canceled_by`
- `source_note_id`
- `task_type`
- `title`
- `notes`
- `due_date`
- `due_time`
- `status`
- `completed_at`
- `canceled_at`
- `created_at`
- `updated_at`
- `metadata`

Do not create SQL in this sprint.

## Field Classification

| Field | Classification | Recommendation |
| --- | --- | --- |
| `id` | required v1 | UUID primary key. |
| `organization_id` | required v1 | Tenant isolation key. Must match lead organization. |
| `lead_id` | required v1 | Task belongs to a lead. |
| `assigned_user_id` | required v1 | Responsible profile. Can default to current user in UI/API. |
| `created_by` | required v1 | Profile that created the task. |
| `completed_by` | optional v1 | Null until completion. |
| `canceled_by` | optional v1 | Null until cancellation. |
| `source_note_id` | optional v1 | Connects note-to-task workflow without requiring notes. |
| `task_type` | required v1 | Controlled task category. |
| `title` | required v1 | Short actionable label. |
| `notes` | optional v1 | Operational context for the task. |
| `due_date` | required v1 | Drives `Meu Dia` and overdue views. |
| `due_time` | optional v1 | Useful for meetings/calls without forcing every task into time slots. |
| `status` | required v1 | `pending`, `completed`, `canceled`. |
| `completed_at` | optional v1 | Completion timestamp. |
| `canceled_at` | optional v1 | Cancellation timestamp. |
| `created_at` | required v1 | Creation timestamp. |
| `updated_at` | required v1 | Last update timestamp. |
| `metadata` | future | Keep for extensibility if safe, but can be deferred if v1 should stay strict. |

Recommended v1 minimum:

- `id`
- `organization_id`
- `lead_id`
- `assigned_user_id`
- `created_by`
- `task_type`
- `title`
- `due_date`
- `due_time`
- `status`
- `completed_at`
- `completed_by`
- `canceled_at`
- `canceled_by`
- `source_note_id`
- `notes`
- `created_at`
- `updated_at`

## Task Type Model

Recommended allowed values:

| Value | Portuguese UI label | Purpose |
| --- | --- | --- |
| `call` | Ligar | Direct phone follow-up. |
| `whatsapp` | WhatsApp | Main operational messaging channel. |
| `send_simulation` | Enviar Simulacao | Follow-up around simulator output. |
| `send_proposal` | Enviar Proposta | Follow-up around proposal/PDF. |
| `schedule_meeting` | Agendar Reuniao | Sales cycle scheduling. |
| `request_documents` | Solicitar Documentacao | Administrative/commercial handoff. |
| `follow_up` | Follow-up | Generic follow-up. |
| `other` | Outro | Escape hatch. |

Recommendation:

Use a text column with a check constraint in the future SQL package. Do not create a PostgreSQL enum in v1. Text + check is easier to extend in controlled migrations.

## Status Model

Recommended allowed values:

| Value | Portuguese UI label | Meaning |
| --- | --- | --- |
| `pending` | Pendente | Open task. |
| `completed` | Concluida | Task was executed. |
| `canceled` | Cancelada | Task is no longer relevant. |

`postponed` / `rescheduled` should not be a v1 status.

Recommendation:

Treat postponement/rescheduling as a future task history event:

```text
due_date changed
due_time changed
```

Reason:

The task is still pending after being rescheduled. A separate `postponed` status would complicate `Meu Dia` without adding enough value in v1.

## Relationships

Recommended relationships:

| Relationship | Recommendation |
| --- | --- |
| `crm_tasks.organization_id -> organizations.id` | Required. Prefer `on delete restrict` or no cascade for safety. |
| `crm_tasks.lead_id -> crm_leads.id` | Required. Prefer `on delete restrict` or no cascade to avoid destructive task loss. |
| `crm_tasks.assigned_user_id -> profiles.id` | Required in v1; `on delete set null` only if business wants tasks to survive profile deletion. |
| `crm_tasks.created_by -> profiles.id` | Required; prefer `on delete set null` only if historical survivability is more important than strict FK. |
| `crm_tasks.completed_by -> profiles.id` | Optional; `on delete set null`. |
| `crm_tasks.canceled_by -> profiles.id` | Optional; `on delete set null`. |
| `crm_tasks.source_note_id -> crm_lead_notes.id` | Optional; `on delete set null`. |

Recommended FK posture:

- Do not cascade-delete tasks from organization or lead in operational flows.
- Tasks are execution history and should not disappear silently.
- If physical deletion is ever needed, it should be an admin-controlled maintenance operation with backup.

Organization consistency rule:

`crm_tasks.organization_id` must match `crm_leads.organization_id`.

Future implementation options:

1. Server-side API resolves `organization_id` from the lead and current profile.
2. Database trigger validates that task organization equals lead organization.
3. RLS also enforces organization-scoped access.

Recommendation:

Use all three for defense in depth when implementation begins.

## Indexing Strategy

Recommended v1 indexes:

| Index | Purpose |
| --- | --- |
| `crm_tasks_organization_id_idx` | Tenant scoping. |
| `crm_tasks_lead_id_idx` | Load lead dossier tasks. |
| `crm_tasks_assigned_user_id_idx` | User task queue. |
| `crm_tasks_status_idx` | Filter pending/completed/canceled. |
| `crm_tasks_due_date_idx` | Meu Dia and overdue queries. |
| `crm_tasks_due_time_idx` | Optional ordering within day. |
| `crm_tasks_status_due_date_idx` | Pending task queues. |
| `crm_tasks_org_status_due_date_idx` | Organization-scoped Meu Dia. |
| `crm_tasks_org_assignee_status_due_date_idx` | User-specific daily queue. |
| `crm_tasks_lead_status_due_date_idx` | Next pending task for lead dossier. |

Recommended partial index for v1:

```text
organization_id, assigned_user_id, due_date
where status = 'pending'
```

Do not create SQL in this sprint.

## RLS Design

Recommended model:

- RLS enabled on `public.crm_tasks`;
- authenticated users only;
- no anon access;
- organization-scoped policies;
- use existing helper functions where appropriate:
  - `public.evolv_current_organization_id()`;
  - `public.evolv_current_role()`.

### SELECT policy concept

Authenticated active users should read tasks where:

```text
crm_tasks.organization_id = public.evolv_current_organization_id()
```

v1 can allow both `admin` and `sdr` to read tasks in their organization, unless product later requires assignee-only views.

### INSERT policy concept

Authenticated active users should insert tasks only when:

- task `organization_id` equals `public.evolv_current_organization_id()`;
- referenced `lead_id` belongs to the same organization;
- `created_by` equals current profile id, or is resolved server-side;
- `assigned_user_id` belongs to the same organization;
- status starts as `pending`.

Recommendation:

Prefer server-side creation to resolve `organization_id`, `created_by` and default status. Browser should not be trusted to choose tenant or author.

### UPDATE policy concept

Authenticated active users should update tasks in their organization.

Recommended v1:

- `admin`: can update any task in organization;
- `sdr`: can update tasks assigned to self or created by self, unless product wants all SDRs to share queue.

If the initial team remains small and operationally shared, v1 can allow `sdr` update within organization, but this should be a conscious product decision.

### DELETE policy concept

Do not allow hard delete in v1.

Recommended:

- no DELETE policy;
- use `canceled` status instead of delete;
- consider future soft delete only if required.

## Grants / Access Recommendations

Future SQL package should ensure:

- no table access for `anon`;
- required access for `authenticated` only;
- no browser `service_role`;
- RLS remains the enforcement layer;
- grants do not exceed policies.

Conceptual posture:

```text
authenticated can SELECT/INSERT/UPDATE through RLS
anon cannot access crm_tasks
service_role remains backend-only and not used in browser
```

Do not create SQL in this sprint.

## Future Validation Strategy

Future executable package should validate:

1. `public.crm_tasks` exists.
2. Required columns exist.
3. Required check constraints exist.
4. Required foreign keys exist.
5. Required indexes exist.
6. RLS is enabled.
7. Policies exist.
8. No policy targets `anon`.
9. Grants for `anon` are absent.
10. Grants for `authenticated` match intended operations.
11. `organization_id` is not nullable.
12. `status` values are restricted.
13. `task_type` values are restricted.
14. `lead_id` points to an existing lead.
15. Assigned/created/completed/canceled profile references are valid.
16. Existing `crm_leads` count is unchanged.
17. Existing `crm_lead_notes` count is unchanged.

Recommended validation queries should be read-only.

## Future Rollback Strategy

Rollback depends on execution phase.

### Before real tasks exist

Rollback can drop:

- policies;
- indexes;
- table;
- helper trigger/function if created exclusively for tasks.

### After real tasks exist

Rollback must not blindly drop the table.

Required posture:

- backup first;
- export `crm_tasks`;
- disable UI/API usage if needed;
- only drop schema after explicit business approval;
- prefer rollback of policies or feature flags before destructive table rollback.

Documentation must clearly warn:

```text
Do not drop crm_tasks after real task data exists unless backup and business approval are confirmed.
```

## Migration / Backfill Considerations

### PipeRun dependency

No PipeRun dependency is recommended for v1.

Reason:

- imported PipeRun leads currently do not contain reliable task/action data;
- creating tasks from imported text would generate noise;
- task creation should be explicit and operational.

### Existing lead fields

Existing fields:

- `crm_leads.proxima_acao`
- `crm_leads.data_proxima_acao`

Recommended strategy:

1. Keep them as legacy fallback initially.
2. Do not backfill tasks automatically from them in the first schema sprint.
3. After task UI is validated, consider a controlled optional backfill for leads where both fields are present.
4. Never delete or clear lead fields until the task runtime is proven.

### Backfill recommendation

Avoid backfill initially.

Why:

- current `proxima_acao` is free text;
- action ownership may be ambiguous;
- due time is missing;
- some imported leads have empty fields;
- automated task creation could flood `Meu Dia`.

Recommended later approach:

- produce a read-only audit of how many leads have `proxima_acao` and `data_proxima_acao`;
- decide whether a manual review/backfill is worth it;
- if approved, create tasks only from records with clear action and date.

## Frontend Integration Implications

Future schema supports:

### Proxima Acao block

The block should load the next pending task for the lead, sorted by:

```text
due_date asc, due_time asc, created_at asc
```

It should display:

- task type;
- title;
- due date/time;
- responsible user;
- status;
- completion action.

### Meu Dia

`Meu Dia` should become task-driven:

- overdue pending tasks;
- tasks due today;
- next 7 days;
- tasks without owner;
- active leads without pending task.

### Completion flow

Completing a task should update:

- `status = completed`;
- `completed_at`;
- `completed_by`.

Then UI should offer:

- create note;
- create next task;
- finish without next action.

### Note-to-task flow

After saving a note:

```text
Nota salva. Criar proxima acao?
```

If accepted:

- create task;
- optionally set `source_note_id`;
- do not convert note automatically.

## Non-goals

This sprint does not authorize:

- code implementation;
- UI changes;
- repository changes;
- API changes;
- SQL creation;
- SQL execution;
- migrations;
- schema changes;
- Auth changes;
- RLS changes;
- policy changes;
- Supabase changes;
- touching `crm_leads` data;
- touching notes server logic;
- touching proposals, simulator, recovery, profiles or organizations logic.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Overbuilding tasks | Slows adoption | Keep v1 fields and task types small. |
| Backfill noise | Meu Dia becomes cluttered | Avoid automatic backfill initially. |
| Weak RLS | Cross-organization data exposure | Use organization-scoped policies and no anon access. |
| Ambiguous ownership | Tasks become nobody's responsibility | Require `assigned_user_id`. |
| Deleting tasks | Loss of execution history | Prefer status cancellation over hard delete. |
| Duplicating notes | Confused history | Keep notes historical and tasks executable. |

## Recommended Next Sprint

Recommended next sprint:

```text
Sprint 103A.3 - Commercial Task SQL Package Design
```

Scope:

- create non-executed SQL package files for future review;
- include apply, validation and rollback scripts;
- do not execute SQL;
- do not alter Supabase;
- include strong warnings around rollback after real task data exists.

Alternative if the team wants one more architecture step:

```text
Sprint 103A.3 - Commercial Task Server/API Design
```

Recommended order:

1. SQL package design.
2. Server/API design.
3. Foundation implementation.
4. UI task creation.
5. Meu Dia task runtime.

## Final Recommendation

Recommended table name:

```text
public.crm_tasks
```

Required v1 fields:

- `id`
- `organization_id`
- `lead_id`
- `assigned_user_id`
- `created_by`
- `task_type`
- `title`
- `due_date`
- `due_time`
- `status`
- `completed_at`
- `completed_by`
- `canceled_at`
- `canceled_by`
- `source_note_id`
- `notes`
- `created_at`
- `updated_at`

Recommended RLS model:

```text
authenticated-only, organization-scoped, no anon, no using(true), no service_role in browser
```

The schema should make tasks explicit, assigned, dated, completable and auditable.

