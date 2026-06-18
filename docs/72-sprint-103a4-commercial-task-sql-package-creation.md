# Sprint 103A.4 - Commercial Task SQL Package Creation

## Objective

Create a controlled SQL package for the future introduction of `public.crm_tasks`, the database foundation for EVOLV's Commercial Task System.

This sprint creates reviewable files only. No SQL was executed by Codex, no production database was altered, and no application code, UI, repository or API route was changed.

## Files Created

- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_apply.sql`
- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_validation.sql`
- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_rollback.sql`
- `docs/72-sprint-103a4-commercial-task-sql-package-creation.md`

## Apply Package Summary

The apply package is designed for future manual execution and creates only `public.crm_tasks` and crm_tasks-specific objects:

- `public.crm_tasks`
- crm_tasks indexes
- `crm_tasks_set_updated_at` trigger using existing `public.set_updated_at()`
- RLS enabled on `public.crm_tasks`
- authenticated-only RLS policies
- authenticated table grants for `SELECT`, `INSERT` and `UPDATE`
- explicit revocation of table grants from `anon` and `PUBLIC`

The package does not touch:

- `public.crm_leads`
- `public.crm_lead_notes`
- `public.crm_notes`
- `public.profiles`
- `public.organizations`
- existing helper functions
- Auth
- existing RLS or policies on other tables
- existing production data

## Schema Summary

`public.crm_tasks` is designed to represent explicit future commercial actions.

Core columns:

- `id`
- `organization_id`
- `lead_id`
- `assigned_user_id`
- `created_by`
- `task_type`
- `title`
- `notes`
- `due_date`
- `due_time`
- `status`
- `completed_at`
- `completed_by`
- `canceled_at`
- `canceled_by`
- `source_note_id`
- `created_at`
- `updated_at`

Allowed `task_type` values:

- `call`
- `whatsapp`
- `send_simulation`
- `send_proposal`
- `schedule_meeting`
- `request_documents`
- `follow_up`
- `other`

Allowed `status` values:

- `pending`
- `completed`
- `canceled`

## Design Decisions

### Notes Relationship

The package links `source_note_id` to `public.crm_lead_notes(id)`.

Reason: the current EVOLV structured notes system is `public.crm_lead_notes`. The older `public.crm_notes` table exists in an early shared schema foundation, but the recent operational notes work and server-side notes flow use `crm_lead_notes`.

### Lead Deletion Behavior

`lead_id` uses `on delete restrict`.

Reason: tasks are commercial execution history. The Sprint 103A.2 and 103A.3 designs recommend avoiding silent task loss. If lead deletion behavior needs cascade later, it should be reviewed explicitly in a separate sprint.

### Updated At

The package reuses the existing `public.set_updated_at()` helper through a crm_tasks-specific trigger.

Reason: `public.set_updated_at()` is already used by EVOLV SQL packages for `organizations`, `profiles`, `crm_leads`, `crm_lead_notes` and `crm_green_flags`. No new global helper function is created.

## RLS Model

RLS is enabled on `public.crm_tasks`.

Policies created:

1. `crm_tasks authenticated read same organization`
2. `crm_tasks authenticated insert same organization`
3. `crm_tasks authenticated update same organization`

All policies are:

- `authenticated` only;
- organization-scoped;
- based on `organization_id = public.evolv_current_organization_id()`;
- not available to `anon`;
- not bridge policies;
- not permissive `using (true)` policies.

No DELETE policy is created.

## Grant Model

The package:

- revokes all table grants from `anon`;
- revokes all table grants from `PUBLIC`;
- grants `SELECT`, `INSERT` and `UPDATE` to `authenticated`.

Actual access remains governed by RLS.

No `DELETE` grant is provided.

## Validation Package Summary

The validation package is read-only and uses only `SELECT`/`WITH`-style checks.

It validates:

- table existence;
- expected columns;
- check constraints;
- foreign keys;
- indexes;
- RLS status;
- expected policies;
- absence of DELETE policy;
- absence of anon policy;
- grants;
- required helper functions;
- `crm_tasks_set_updated_at` trigger;
- row count of `crm_tasks`;
- current reference counts for `crm_leads` and `crm_lead_notes`.

The validation package cannot prove that `crm_leads` and `crm_lead_notes` counts are unchanged unless the operator compares the returned counts with preflight counts. This limitation is documented inside the validation SQL.

## Rollback Package Summary

The rollback package is manual and destructive for `public.crm_tasks` only.

It removes:

- crm_tasks RLS policies;
- `crm_tasks_set_updated_at` trigger;
- `public.crm_tasks`.

It does not remove or alter:

- `crm_leads`;
- `crm_lead_notes`;
- `crm_notes`;
- `profiles`;
- `organizations`;
- helper functions;
- Auth;
- RLS or policies on other tables;
- production data outside `crm_tasks`.

Rollback should only be used before real tasks are created or after verified backup and explicit business approval.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| RLS misconfiguration | Tasks blocked or exposed across organizations | Organization-scoped policies and validation checks. |
| `organization_id` mismatch between task and lead | Task may be attached to a lead outside the intended organization | Future server-side API must resolve and validate organization from the lead before insert/update. |
| Accidental anon exposure | Public task access | No anon policies, revoked anon grants and validation checks. |
| Rollback after real task creation | Task data loss | Rollback warning requires backup and explicit approval. |
| UI assumes table exists before API is implemented | Runtime errors | This sprint does not connect UI or repositories. |

## Manual Execution Order

Future manual execution should follow this order:

1. Confirm production stability.
2. Capture preflight counts for `crm_leads` and `crm_lead_notes`.
3. Open the apply SQL.
4. Open the validation SQL.
5. Open the rollback SQL.
6. Execute apply manually only after approval.
7. Execute validation manually.
8. Run application smoke tests.
9. Use rollback only if validation or smoke tests fail and the rollback criteria are met.

## Explicit Confirmations

- SQL was not executed by Codex.
- No migration was applied.
- No production data was altered.
- No application code was changed.
- No UI was changed.
- No repository was changed.
- No API route was created.
- No Auth/RLS/policy on existing tables was altered.
- No anon policy was created.
- No bridge policy was created.
- No DELETE policy was created.

## Recommended Next Sprint

Sprint 103A.5 - Commercial Task SQL Package Review and Execution Readiness.

The next sprint should review the generated package, verify operator preconditions and decide whether the schema package is ready for a controlled manual apply window.
