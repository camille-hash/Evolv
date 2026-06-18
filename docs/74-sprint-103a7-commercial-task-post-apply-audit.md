# Sprint 103A.7 - Commercial Task Schema Post-Apply Audit

## Objective

Register a permanent post-apply audit for the Commercial Task schema created from the Sprint 103A.4 SQL package and manually executed in Sprint 103A.6.

This sprint is audit-only. Codex did not execute apply SQL, validation SQL or rollback SQL. Codex did not query production directly, modify schema, modify policies, alter data, change code or change UI.

## Execution Summary

Manual production execution reported for Sprint 103A.6:

- Apply executed:
  - `supabase/sql/20260618_sprint103a4_crm_tasks_schema_apply.sql`
- Validation executed:
  - `supabase/sql/20260618_sprint103a4_crm_tasks_schema_validation.sql`
- Rollback:
  - not executed

Reviewed evidence and package files:

- `docs/72-sprint-103a4-commercial-task-sql-package-creation.md`
- `docs/73-sprint-103a5-commercial-task-sql-package-readiness.md`
- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_apply.sql`
- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_validation.sql`
- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_rollback.sql`

Evidence basis:

- Sprint 103A.4 created the package.
- Sprint 103A.5 reviewed the package and returned `GO FOR MANUAL CONTROLLED EXECUTION`.
- Sprint 103A.6 was reported as manually executed in production with validation executed and rollback not required.

## Production State Audit

Expected post-apply table:

- `public.crm_tasks`

Expected post-apply row state:

- schema-only creation;
- no seed;
- no backfill;
- no data migration;
- expected `crm_tasks` count immediately after creation: `0`, unless an operator manually inserted rows after the apply window.

No live database query was executed by Codex in this sprint. The audit records the expected and reported post-apply state from the manually executed package.

## Schema Audit

Expected columns in `public.crm_tasks`:

| Column | Expected |
| --- | --- |
| `id` | present |
| `organization_id` | present |
| `lead_id` | present |
| `assigned_user_id` | present |
| `created_by` | present |
| `task_type` | present |
| `title` | present |
| `notes` | present |
| `due_date` | present |
| `due_time` | present |
| `status` | present |
| `completed_at` | present |
| `completed_by` | present |
| `canceled_at` | present |
| `canceled_by` | present |
| `source_note_id` | present |
| `created_at` | present |
| `updated_at` | present |

Expected indexes:

| Index | Expected |
| --- | --- |
| `crm_tasks_organization_id_idx` | present |
| `crm_tasks_lead_id_idx` | present |
| `crm_tasks_assigned_user_id_idx` | present |
| `crm_tasks_status_idx` | present |
| `crm_tasks_due_date_idx` | present |
| `crm_tasks_due_time_idx` | present |
| `crm_tasks_status_due_date_idx` | present |
| `crm_tasks_org_status_due_date_idx` | present |
| `crm_tasks_org_assignee_status_due_date_idx` | present |
| `crm_tasks_lead_status_due_date_idx` | present |

Expected trigger:

| Trigger | Expected |
| --- | --- |
| `crm_tasks_set_updated_at` | present |

Expected constraints:

| Constraint | Expected |
| --- | --- |
| `crm_tasks_task_type_check` | present |
| `crm_tasks_status_check` | present |
| `crm_tasks_title_not_blank_check` | present |
| `crm_tasks_completed_fields_check` | present |
| `crm_tasks_canceled_fields_check` | present |

Schema design observations:

- `task_type` uses text + check constraints, not PostgreSQL enum types.
- `status` uses text + check constraints.
- cancellation is represented by `status = 'canceled'`, `canceled_at` and `canceled_by`.
- no hard-delete behavior is exposed through a DELETE policy.
- `source_note_id` references `public.crm_lead_notes(id)`, aligned with the current structured notes implementation.
- `lead_id` uses `on delete restrict`, preserving task history from silent deletion.

## Security Audit

Expected RLS state:

- RLS enabled on `public.crm_tasks`.

Expected policies:

1. `crm_tasks authenticated read same organization`
2. `crm_tasks authenticated insert same organization`
3. `crm_tasks authenticated update same organization`

Expected policy scope:

```sql
organization_id = public.evolv_current_organization_id()
```

Expected absence:

| Item | Expected |
| --- | --- |
| anon policy | absent |
| DELETE policy | absent |
| bridge policy | absent |
| `using (true)` | absent |
| `with check (true)` | absent |

Expected grants:

| Role | Expected grants |
| --- | --- |
| `authenticated` | `SELECT`, `INSERT`, `UPDATE` |
| `anon` | none |

Security assessment:

- The schema matches the EVOLV direction of authenticated-only, organization-scoped access.
- No public/anon access is expected.
- No bridge policy is expected.
- No delete policy is expected.
- Access is gated by RLS and the existing canonical organization helper.

## Integration Safety Audit

The Sprint 103A.4 apply package explicitly scoped itself to `public.crm_tasks` and crm_tasks-specific objects.

Expected unchanged objects:

- `public.crm_leads`
- `public.crm_lead_notes`
- `public.crm_notes`
- `public.profiles`
- `public.organizations`
- existing helper functions
- Auth
- existing RLS/policies on other tables

Expected data movement:

- no data migration;
- no backfill;
- no seed data;
- no changes to existing lead, note, profile or organization records.

Integration safety assessment:

- The table is currently infrastructure only.
- No frontend or backend feature uses `crm_tasks` yet.
- No CRM runtime path was changed by this schema package.
- Rollback remains available but should be treated as destructive to future task data.

## Runtime Readiness Audit

`public.crm_tasks` is approved as a foundation for future application development.

Ready for future work:

- repository layer design;
- server-side API or server action design;
- task creation workflow;
- task list by lead;
- `Proxima Acao` block powered by real tasks;
- `Meu Dia` integration;
- completion and cancellation workflow;
- note-to-task workflow using `source_note_id`;
- future operational intelligence based on pending, overdue and completed tasks.

Not implemented yet:

- task repository;
- task API;
- task UI;
- task creation modal;
- task completion workflow;
- task-driven `Meu Dia`;
- task notifications;
- automations;
- dashboard metrics.

Recommended next development posture:

1. Build server-side access first.
2. Resolve `organization_id` server-side.
3. Resolve `created_by` from authenticated profile.
4. Validate `lead_id` belongs to the same organization before insert/update.
5. Keep browser payload from controlling organization or author identity.

## Risks

| Risk | Severity | Status | Recommendation |
| --- | --- | --- | --- |
| UI/API sends incorrect `organization_id` | Medium | Future implementation risk | Server-side API must resolve organization and validate lead ownership. |
| Authenticated users can insert/update same-organization tasks if a future client calls the table directly | Medium | Controlled by RLS but not role-specific | Future API should enforce role, assignment and creator rules. |
| Rollback after real tasks exist would destroy task data | High | Documented | Require backup and explicit approval after task creation begins. |
| `crm_tasks` table exists before UI is ready | Low | Expected | Do not expose UI until server-side layer exists. |
| No task history table yet | Low/Medium | Future feature gap | Defer `crm_task_history` until lifecycle behavior is proven. |

## Observations

- The schema is intentionally foundation-only.
- The package avoids anon, bridge and delete policies.
- The package aligns with the product rule: notes remember, tasks execute.
- The schema is suitable for future Commercial Task application development.
- The future implementation should not let the browser provide trusted tenant or author fields.

## Final Status

APPROVED FOR APPLICATION DEVELOPMENT.

The Commercial Task schema foundation is considered ready for the next application-layer sprint, based on the reported manual apply/validation success and the reviewed package contents.

This approval does not authorize direct UI access to `crm_tasks` without a server-side validation layer.

## Explicit Confirmations

- Codex did not execute SQL in this sprint.
- Codex did not execute apply.
- Codex did not execute validation.
- Codex did not execute rollback.
- Codex did not modify production.
- Codex did not modify schema.
- Codex did not modify policies.
- Codex did not modify data.
- Codex did not modify code.
- Codex did not modify UI.
- Codex did not modify repositories.

## Recommended Next Sprint

Sprint 103A.8 - Commercial Task Server-Side Access Design.

The next sprint should design the server-side access layer for listing and creating tasks safely, before any UI is connected.
