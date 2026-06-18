# Sprint 103A.5 - Commercial Task SQL Package Readiness

## Objective

Review the Sprint 103A.4 Commercial Task SQL package and determine whether it is ready for a future manual controlled execution window.

This sprint is review-only. No SQL was executed, no production database was altered, and no application code, UI, repository, Auth, RLS or runtime policy was changed.

## Files Reviewed

- `docs/72-sprint-103a4-commercial-task-sql-package-creation.md`
- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_apply.sql`
- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_validation.sql`
- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_rollback.sql`

## Apply Review

Reviewed file:

`supabase/sql/20260618_sprint103a4_crm_tasks_schema_apply.sql`

Result: passed readiness review.

Confirmed:

- creates `public.crm_tasks`;
- creates only `crm_tasks`-specific indexes;
- creates only `crm_tasks_set_updated_at` trigger for the new table;
- reuses existing `public.set_updated_at()`;
- checks required existing dependencies before creating the table;
- does not alter `public.crm_leads`;
- does not alter `public.crm_notes`;
- does not alter `public.crm_lead_notes`;
- does not alter `public.profiles`;
- does not alter `public.organizations`;
- does not insert, update, delete or backfill existing data;
- enables RLS on `public.crm_tasks`;
- creates authenticated organization-scoped policies only;
- uses `public.evolv_current_organization_id()`;
- uses text columns with check constraints for `task_type` and `status`;
- models cancellation through `status = 'canceled'`;
- creates no DELETE policy;
- creates no anon policy;
- creates no bridge policy;
- avoids `using (true)`;
- avoids `with check (true)`.

Policies proposed by the apply package:

1. `crm_tasks authenticated read same organization`
2. `crm_tasks authenticated insert same organization`
3. `crm_tasks authenticated update same organization`

All are scoped by:

```sql
organization_id = public.evolv_current_organization_id()
```

## Validation Review

Reviewed file:

`supabase/sql/20260618_sprint103a4_crm_tasks_schema_validation.sql`

Result: passed readiness review.

Confirmed:

- read-only only;
- validates table existence;
- validates expected columns;
- validates constraints;
- validates foreign keys;
- validates indexes;
- validates RLS status;
- validates expected policies;
- validates absence of DELETE policy;
- validates absence of anon policy;
- validates grants;
- validates absence of anon grants;
- validates authenticated grants;
- validates helper functions;
- validates `crm_tasks_set_updated_at` trigger;
- checks `crm_tasks` row count;
- provides current reference counts for `crm_leads` and `crm_lead_notes`;
- documents that count comparison requires operator preflight counts.

No mutation statement was found in the validation package.

## Rollback Review

Reviewed file:

`supabase/sql/20260618_sprint103a4_crm_tasks_schema_rollback.sql`

Result: passed readiness review.

Confirmed:

- removes only `crm_tasks` policies;
- removes only the `crm_tasks_set_updated_at` trigger;
- drops only `public.crm_tasks`;
- does not touch `crm_leads`;
- does not touch `crm_notes`;
- does not touch `crm_lead_notes`;
- does not touch `profiles`;
- does not touch `organizations`;
- does not touch helper functions;
- does not recreate or alter existing policies;
- clearly warns that rollback is destructive to `crm_tasks` data.

Rollback should only be used before real tasks are created, or after verified backup and explicit business approval.

## Forbidden Pattern Inspection

Package files searched:

- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_apply.sql`
- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_validation.sql`
- `supabase/sql/20260618_sprint103a4_crm_tasks_schema_rollback.sql`

Search patterns:

- `anon`
- `using (true)`
- `with check (true)`
- `alter table public.crm_leads`
- `update public.crm_leads`
- `delete from public.crm_leads`
- `insert into public.crm_leads`
- `drop table public.crm_leads`
- `create policy ... for delete`

Findings:

| Pattern | Result | Interpretation |
| --- | --- | --- |
| `anon` | Found only in comments, `revoke all on table public.crm_tasks from anon`, and negative validation checks | Non-blocking. This explicitly prevents anon access. |
| `using (true)` | Not found | Passed. |
| `with check (true)` | Not found | Passed. |
| `alter table public.crm_leads` | Not found | Passed. |
| `update public.crm_leads` | Not found | Passed. |
| `delete from public.crm_leads` | Not found | Passed. |
| `insert into public.crm_leads` | Not found | Passed. |
| `drop table public.crm_leads` | Not found | Passed. |
| `create policy ... for delete` | Not found | Passed. |

## Risk Assessment

| Risk | Severity | Readiness impact | Mitigation |
| --- | --- | --- | --- |
| Future UI/API sends mismatched `organization_id` | Medium | Non-blocking for schema package | Future server-side task API must resolve organization from the authenticated profile and validate lead ownership. |
| `crm_tasks` rollback after real task creation | High | Non-blocking if execution occurs before feature use | Rollback warning is explicit; require backup and approval after real task creation. |
| Insert/update policy allows authenticated users in same organization, without role-specific task rules | Medium | Non-blocking for v1 foundation | Future API should enforce assignee/creator/role semantics before UI activation. |
| Data API exposure before UI/API hardening | Medium | Non-blocking if execution remains controlled | No anon grants/policies; authenticated access is RLS-scoped. UI remains disconnected in this package. |
| `crm_tasks.organization_id` relies on caller/API correctness | Medium | Non-blocking for schema package | Future implementation should validate lead organization server-side before insert/update. |

## Blocking Issues

None found.

## Non-Blocking Observations

1. `source_note_id` references `public.crm_lead_notes(id)` rather than legacy `public.crm_notes(id)`.

   This is intentional and aligned with the current EVOLV structured notes implementation.

2. `lead_id` uses `on delete restrict`.

   This is more conservative than cascade and aligns with prior Commercial Task schema design: tasks are commercial execution history and should not disappear silently with lead deletion.

3. The validation package can show current counts for `crm_leads` and `crm_lead_notes`, but cannot prove unchanged counts unless the operator captures and compares preflight counts.

4. The package creates schema only. It does not create API routes, frontend integration, repositories, seed data or backfill.

## GO / NO-GO Recommendation

GO FOR MANUAL CONTROLLED EXECUTION.

The package is ready for a future controlled manual execution window, provided the operator follows the preflight, validation and rollback discipline below.

## Manual Execution Order If GO

1. Confirm production is stable.
2. Confirm Auth, CRM, Lead Notes and Recovery are operational.
3. Capture preflight counts for:
   - `crm_leads`
   - `crm_lead_notes`
4. Open apply, validation and rollback files before execution.
5. Execute `20260618_sprint103a4_crm_tasks_schema_apply.sql` manually.
6. Execute `20260618_sprint103a4_crm_tasks_schema_validation.sql` manually.
7. Confirm validation results:
   - table exists;
   - expected columns exist;
   - RLS enabled;
   - authenticated policies exist;
   - no anon policy;
   - no DELETE policy;
   - authenticated grants exist;
   - anon grants absent;
   - helper functions exist;
   - `crm_tasks` row count is zero;
   - `crm_leads` and `crm_lead_notes` counts match preflight.
8. Run application smoke tests:
   - login;
   - CRM load;
   - lead detail;
   - notes read/create;
   - logout/login.
9. Do not connect UI or API to `crm_tasks` until a later implementation sprint.

## Rollback Conditions

Rollback should be considered only if:

- apply fails partially;
- validation fails;
- RLS or grants differ from expected state;
- Auth, CRM or Lead Notes smoke tests fail after apply;
- `crm_leads` or `crm_lead_notes` counts differ from preflight unexpectedly;
- operator cannot confirm package state.

Rollback should not be used after real task data exists unless there is verified backup and explicit business approval.

## Explicit Confirmations

- No SQL was executed in this sprint.
- Apply SQL was not executed.
- Validation SQL was not executed.
- Rollback SQL was not executed.
- Production was not altered.
- Database schema was not altered.
- No data was altered.
- No code was changed.
- No UI was changed.
- No repository was changed.
- Auth/RLS/runtime policies were not changed.
- `crm_leads`, `crm_notes`, `crm_lead_notes`, `profiles` and `organizations` were not touched.

## Recommended Next Sprint

Sprint 103A.6 - Commercial Task Schema Controlled Apply Window.

That sprint should be a manually operated execution window with preflight counts, apply, validation, smoke tests and rollback readiness.
