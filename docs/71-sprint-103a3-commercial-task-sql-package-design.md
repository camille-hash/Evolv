# Sprint 103A.3 - Commercial Task SQL Package Design

## Objective

Design the future SQL package for Commercial Tasks without creating SQL files and without executing SQL.

This sprint is SQL package design only.

It does not:

- create `.sql` files;
- create migrations;
- execute SQL;
- alter Supabase;
- alter schema;
- alter Auth;
- alter RLS;
- alter policies;
- alter repositories;
- alter frontend/backend code.

## Context

Sprint 103A.1 defined the product rule:

```text
Notes remember. Tasks execute.
```

Sprint 103A.2 recommended:

- future table: `public.crm_tasks`;
- security model: authenticated-only, organization-scoped, no anon;
- helper-aware RLS using:
  - `public.evolv_current_organization_id()`;
  - `public.evolv_current_role()`;
- text + check constraints instead of PostgreSQL enum types;
- status cancellation instead of hard delete.

## Existing SQL Conventions Inspected

Inspected package conventions in:

- `supabase/sql/`
- `docs/48-sprint-101b15-controlled-apply-plan.md`
- `docs/55-sprint-101b23-authenticated-bridge-read-controlled-removal.md`
- `docs/69-sprint-103a1-commercial-task-system-design.md`
- `docs/70-sprint-103a2-commercial-task-schema-design.md`

Observed conventions:

- package files are named with date, sprint id and purpose;
- apply, validation and rollback are separate;
- validation files are read-only;
- rollback scope is explicitly narrow;
- documents distinguish future execution from current sprint work;
- sensitive Supabase changes require manual controlled execution;
- destructive rollback needs stronger warnings once real data exists.

Recent naming pattern examples:

- `20260617_sprint101b15_rls_apply.sql`
- `20260617_sprint101b15_rls_validation.sql`
- `20260617_sprint101b15_rls_rollback.sql`
- `20260617_sprint101b23_bridge_read_retirement_apply.sql`
- `20260617_sprint101b23_bridge_read_retirement_validation.sql`
- `20260617_sprint101b23_bridge_read_retirement_rollback.sql`

## Future Apply Package Design

Future apply package should eventually:

1. create `public.crm_tasks`;
2. add required v1 columns;
3. add optional v1 columns;
4. add check constraints for `task_type` and `status`;
5. add foreign keys;
6. add indexes;
7. enable RLS;
8. create authenticated organization-scoped policies;
9. avoid anon access;
10. avoid touching `crm_leads`, `crm_lead_notes`, `profiles`, `organizations`, Auth or existing helper functions;
11. avoid modifying existing lead/task-like data.

Package principle:

```text
Additive only. No data migration. No legacy field rewrite.
```

## Recommended Table Definition

Recommended table:

```text
public.crm_tasks
```

Purpose:

- store explicit future commercial actions;
- drive `Proxima Acao`;
- drive `Meu Dia`;
- support completion/cancellation workflow;
- support future CRM Intelligence.

Do not create this table in this sprint.

## Field-Level Design

| Column | Type | Nullability | Default | Constraint notes | Purpose |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | not null | `gen_random_uuid()` | primary key | Task identity. |
| `organization_id` | `uuid` | not null | none | FK to `public.organizations(id)` | Tenant isolation. |
| `lead_id` | `uuid` | not null | none | FK to `public.crm_leads(id)` | Lead relationship. |
| `assigned_user_id` | `uuid` | not null | none | FK to `public.profiles(id)` | Responsible user. |
| `created_by` | `uuid` | not null | none | FK to `public.profiles(id)` | Creator profile. |
| `completed_by` | `uuid` | null | none | FK to `public.profiles(id)` | Completion profile. |
| `canceled_by` | `uuid` | null | none | FK to `public.profiles(id)` | Cancellation profile. |
| `source_note_id` | `uuid` | null | none | FK to `public.crm_lead_notes(id)` | Optional note-to-task origin. |
| `task_type` | `text` | not null | none | check allowed values | Task category. |
| `title` | `text` | not null | none | non-empty recommended | Short actionable label. |
| `notes` | `text` | null | none | optional | Operational context. |
| `due_date` | `date` | not null | none | required for task queue | Meu Dia and overdue logic. |
| `due_time` | `time` | null | none | optional | Time of day. |
| `status` | `text` | not null | `pending` | check allowed values | Lifecycle. |
| `completed_at` | `timestamptz` | null | none | required when completed in app/API | Completion timestamp. |
| `canceled_at` | `timestamptz` | null | none | required when canceled in app/API | Cancellation timestamp. |
| `created_at` | `timestamptz` | not null | `now()` | none | Creation timestamp. |
| `updated_at` | `timestamptz` | not null | `now()` | updated by trigger or API | Last update timestamp. |
| `metadata` | `jsonb` | not null | `'{}'::jsonb` | optional/future | Extensibility. |

Recommended v1 adjustment:

Keep `metadata` if the implementation package already has a standard JSONB pattern. Otherwise, it can be deferred to keep v1 tighter.

## Constraint / Check Strategy

Recommendation:

```text
Use text columns with check constraints in v1.
```

Do not use PostgreSQL enum types in v1.

Why:

- check constraints are easier to extend in controlled migrations;
- enum changes are more operationally rigid;
- EVOLV task types may evolve after Bruno uses the workflow;
- a text + check model is explicit and reviewable.

### task_type check

Allowed values:

- `call`
- `whatsapp`
- `send_simulation`
- `send_proposal`
- `schedule_meeting`
- `request_documents`
- `follow_up`
- `other`

### status check

Allowed values:

- `pending`
- `completed`
- `canceled`

### Completion consistency

Future package should evaluate consistency checks or API-level enforcement:

- if `status = completed`, then `completed_at` should be present;
- if `status = completed`, then `completed_by` should be present;
- if `status = canceled`, then `canceled_at` should be present;
- if `status = canceled`, then `canceled_by` should be present.

Recommendation:

Enforce simple status/task_type checks in SQL v1. Enforce completion/cancellation field consistency in server logic first, then consider SQL constraints after runtime behavior is proven.

## Foreign Key Strategy

Recommended FK posture:

| Relationship | Future SQL posture |
| --- | --- |
| `organization_id -> organizations.id` | `on delete restrict` or default no cascade. |
| `lead_id -> crm_leads.id` | `on delete restrict` or default no cascade. |
| `assigned_user_id -> profiles.id` | Prefer `on delete restrict` in v1, or `set null` only if field becomes nullable. |
| `created_by -> profiles.id` | Prefer `on delete restrict`; if historical survivability is prioritized, use `set null` and make nullable. |
| `completed_by -> profiles.id` | `on delete set null`. |
| `canceled_by -> profiles.id` | `on delete set null`. |
| `source_note_id -> crm_lead_notes.id` | `on delete set null`. |

Recommendation:

Avoid cascade for tasks. A task is operational history and should not disappear silently because a lead/profile relationship changes.

Organization consistency:

Future SQL package should include either:

- a validation trigger that ensures `crm_tasks.organization_id = crm_leads.organization_id`; or
- a strict server-side creation/update flow plus validation SQL.

Best future design:

```text
server resolves organization_id + DB validates organization_id + RLS scopes organization_id
```

## Index Strategy

Recommended indexes for future apply package:

| Index | Purpose |
| --- | --- |
| `crm_tasks_organization_id_idx` | Tenant isolation and RLS filtering. |
| `crm_tasks_lead_id_idx` | Lead dossier task list. |
| `crm_tasks_assigned_user_id_idx` | User task queues. |
| `crm_tasks_status_idx` | Lifecycle filtering. |
| `crm_tasks_due_date_idx` | Date-based queues. |
| `crm_tasks_due_time_idx` | In-day ordering. |
| `crm_tasks_status_due_date_idx` | Pending/overdue/today queries. |
| `crm_tasks_org_status_due_date_idx` | Organization-scoped Meu Dia. |
| `crm_tasks_org_assignee_status_due_date_idx` | Responsible-user daily queue. |
| `crm_tasks_lead_status_due_date_idx` | Next pending task for dossier. |

Recommended partial index:

```text
organization_id, assigned_user_id, due_date
where status = 'pending'
```

This supports the most important v1 runtime:

```text
Meu Dia = pending tasks by organization/user/date
```

## RLS Policy Design

RLS should be enabled on:

```text
public.crm_tasks
```

Policies should be:

- authenticated-only;
- organization-scoped;
- no anon;
- no bridge policies;
- no `using (true)`;
- no `with check (true)` without organization guard.

### Authenticated read same organization

Concept:

Authenticated users can read tasks when:

```text
organization_id = public.evolv_current_organization_id()
```

Recommended v1:

- `admin`: read all tasks in own organization;
- `sdr`: read all tasks in own organization initially, unless product chooses assignee-only.

### Authenticated insert same organization

Concept:

Authenticated users can insert tasks only when:

- `organization_id = public.evolv_current_organization_id()`;
- `lead_id` belongs to that organization;
- `assigned_user_id` belongs to that organization;
- `created_by` is the current user/profile;
- `status = pending` initially.

Important:

Prefer server-side API to resolve `organization_id` and `created_by`; do not trust the browser payload for tenant or author.

### Authenticated update same organization

Concept:

Authenticated users can update tasks in their organization.

Recommended v1 role posture:

- `admin`: update any task in organization;
- `sdr`: update task if assigned to self or created by self.

If Bruno wants a shared operational queue, allow `sdr` organization-wide update in v1, but document that decision explicitly before implementation.

### Delete / cancel strategy

Recommendation:

Do not allow hard delete in v1.

Do not create DELETE policy.

Use:

```text
status = canceled
canceled_at
canceled_by
```

Why:

- preserves commercial execution history;
- avoids accidental loss of task records;
- supports audit and coaching;
- matches the product rule that tasks are execution history.

## Grants / Access Model

Future apply package should ensure:

- no anon access to `crm_tasks`;
- authenticated access only as needed for RLS-backed operations;
- no service role usage in browser;
- grants and policies are aligned.

Conceptual access:

| Role | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `anon` | no | no | no | no |
| `authenticated` | yes via RLS | yes via RLS | yes via RLS | no |
| `service_role` | Supabase-internal/backend only | Supabase-internal/backend only | Supabase-internal/backend only | controlled only |

## Validation Package Design

Future validation package should be read-only.

It should verify:

1. table exists;
2. all expected columns exist;
3. `task_type` check constraint exists;
4. `status` check constraint exists;
5. all expected FKs exist;
6. indexes exist;
7. RLS is enabled;
8. expected policies exist;
9. no anon policy exists;
10. anon grants are absent;
11. authenticated grants match intended operations;
12. helper functions are present;
13. `crm_leads` count unchanged;
14. `crm_lead_notes` count unchanged;
15. profiles and organizations are untouched;
16. task table row count is zero immediately after schema-only creation, unless a later backfill sprint explicitly changes that.

Validation should also include a checklist, not just SQL:

- Auth still works;
- CRM still loads;
- notes still work;
- no UI references tasks before feature flag/API exists.

## Rollback Package Design

Rollback should target only `crm_tasks` package artifacts.

Before real task data exists, rollback may:

1. drop `crm_tasks` policies;
2. drop `crm_tasks` indexes if needed;
3. drop triggers/functions created exclusively for `crm_tasks`;
4. drop `public.crm_tasks`.

Rollback must not touch:

- `crm_leads`;
- `crm_lead_notes`;
- `profiles`;
- `organizations`;
- existing helper functions;
- Auth;
- existing RLS/policies on other tables;
- simulator/proposals/recovery.

After real task data exists:

Rollback must not drop `crm_tasks` without:

- backup;
- explicit business approval;
- export of task data;
- clear production downtime/feature rollback plan.

Recommended warning text for future rollback:

```text
Use destructive rollback only before real tasks are created or after verified backup and explicit approval.
```

## Risk Matrix

| Risk | Impact | Mitigation |
| --- | --- | --- |
| RLS misconfiguration | Cross-organization task exposure or blocked CRM tasks | Use helper-based organization-scoped policies and read-only validation. |
| `organization_id` mismatch | Task appears under wrong tenant or becomes inaccessible | Server resolves org from lead; DB validates lead organization; RLS scopes org. |
| `lead_id` FK issues | Tasks created for missing/wrong leads | FK to `crm_leads`; validate lead belongs to org before insert. |
| Profile assignment issues | Task assigned to inactive/wrong-org user | Validate assigned profile belongs to same organization and is active. |
| Accidental anon exposure | Public task access | No anon grants, no anon policies, validation checks. |
| Future UI assumes tasks exist before deploy | Runtime errors or empty Meu Dia | Gate implementation after schema validation; keep legacy lead fields as fallback. |
| Hard delete of tasks | Loss of commercial execution history | No DELETE policy; use `canceled` status. |
| Backfill flood | Meu Dia becomes noisy | No backfill in schema package. |

## Execution Readiness Criteria

Future execution package is not ready until:

1. apply, validation and rollback files exist and are reviewed;
2. rollback warning is explicit;
3. no current production feature depends on `crm_tasks`;
4. Authenticated runtime is stable;
5. helper functions exist and are validated;
6. profiles and organization IDs are healthy;
7. `crm_leads.organization_id` is complete;
8. operator has manual SQL execution plan;
9. validation file is read-only;
10. smoke test checklist is prepared;
11. decision is made on `sdr` update scope;
12. decision is made on task organization consistency trigger.

## Future File Naming

Recommended future files:

```text
supabase/sql/20260618_sprint103a4_crm_tasks_schema_apply.sql
supabase/sql/20260618_sprint103a4_crm_tasks_schema_validation.sql
supabase/sql/20260618_sprint103a4_crm_tasks_schema_rollback.sql
```

Optional documentation package:

```text
docs/72-sprint-103a4-commercial-task-sql-package.md
docs/72a-sprint-103a4-commercial-task-validation-plan.md
docs/72b-sprint-103a4-commercial-task-rollback-plan.md
```

Do not create these files in Sprint 103A.3.

## Non-goals

This sprint does not authorize:

- creating SQL files;
- executing SQL;
- creating migrations;
- altering Supabase;
- altering Auth/RLS/policies;
- altering `crm_leads`;
- altering `crm_lead_notes`;
- altering profiles or organizations;
- altering helper functions;
- creating anon policies;
- creating bridge policies;
- implementing UI;
- implementing API routes;
- touching simulator, proposals, recovery, auth helpers, profile logic or organization logic.

## Recommended Next Sprint

Recommended next sprint:

```text
Sprint 103A.4 - Commercial Task SQL Package Creation
```

Scope:

- create future apply/validation/rollback SQL files;
- do not execute them;
- create package documentation;
- include warnings around rollback after real task data exists.

Required open decisions before or during 103A.4:

1. Should `sdr` update all organization tasks or only assigned/created tasks?
2. Should v1 include a DB trigger for task organization consistency?
3. Should `metadata` be included immediately or deferred?

## Final Recommendation

Recommended check/enum strategy:

```text
text + check constraints
```

Recommended delete/cancel strategy:

```text
no hard delete in v1; use status = canceled
```

Recommended package posture:

```text
schema-only, additive, authenticated-only, organization-scoped, no anon, no backfill
```

