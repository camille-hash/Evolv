# Sprint 101B.24 - Bridge Read Retirement Final Execution Readiness

## Objective

Perform final execution readiness review for the existing Sprint 101B.23 package targeting controlled retirement of:

```text
Authenticated bridge read crm_leads
```

This sprint is readiness-only. No SQL was executed and no production object was changed.

## Package Reviewed

Documents and SQL package reviewed:

- `docs/55-sprint-101b23-authenticated-bridge-read-controlled-removal.md`
- `supabase/sql/20260617_sprint101b23_bridge_read_retirement_apply.sql`
- `supabase/sql/20260617_sprint101b23_bridge_read_retirement_validation.sql`
- `supabase/sql/20260617_sprint101b23_bridge_read_retirement_rollback.sql`

## Apply Review

Apply file:

```text
supabase/sql/20260617_sprint101b23_bridge_read_retirement_apply.sql
```

The apply SQL contains only:

```sql
drop policy if exists "Authenticated bridge read crm_leads" on public.crm_leads;
```

Review result:

- targets only `Authenticated bridge read crm_leads`;
- does not touch `Authenticated bridge update crm_leads`;
- does not touch anon policies;
- does not touch organization-scoped policies;
- does not alter tables;
- does not alter data;
- does not alter Auth or profiles.

Conclusion:

```text
APPLY PACKAGE ACCEPTABLE FOR MANUAL CONTROLLED EXECUTION
```

## Validation Review

Validation file:

```text
supabase/sql/20260617_sprint101b23_bridge_read_retirement_validation.sql
```

The validation SQL is read-only and uses:

- `select`
- `with`
- catalog reads from `pg_policies` and `pg_class`
- count read from `public.crm_leads`

It validates:

- target policy should be absent after apply;
- `Allow public read crm_leads` remains present;
- `Allow public update crm_leads` remains present;
- `Authenticated bridge update crm_leads` remains present;
- `crm_leads authenticated read same organization` remains present;
- `crm_leads authenticated update same organization` remains present;
- RLS remains enabled on `crm_leads`;
- `crm_leads` count and `organization_id` null count can be recorded.

Conclusion:

```text
VALIDATION PACKAGE ACCEPTABLE
```

## Rollback Review

Rollback file:

```text
supabase/sql/20260617_sprint101b23_bridge_read_retirement_rollback.sql
```

The rollback SQL recreates only:

```text
Authenticated bridge read crm_leads
```

Original definition:

```sql
create policy "Authenticated bridge read crm_leads"
on public.crm_leads
for select
to authenticated
using (true);
```

Review result:

- recreates the exact original read bridge policy;
- uses idempotent `if not exists` guard;
- does not touch anon policies;
- does not touch authenticated update bridge;
- does not touch organization-scoped policies;
- does not alter data or tables.

Conclusion:

```text
ROLLBACK PACKAGE ACCEPTABLE
```

## Protected Scope

The following must remain untouched during execution:

- `Authenticated bridge update crm_leads`
- `Allow public read crm_leads`
- `Allow public update crm_leads`
- `crm_leads authenticated read same organization`
- `crm_leads authenticated update same organization`
- helper functions
- Auth
- profiles
- notes
- activities
- stage changes
- `crm_leads` data

## Operational Prerequisites

Before manual execution, all items must be true:

- operator approval received;
- production window approved;
- rollback file open and ready;
- validation file open and ready;
- manual smoke test checklist open and ready;
- `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`;
- `NEXT_PUBLIC_USE_SUPABASE_CRM=true`;
- `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=true`;
- authenticated runtime active;
- UI shows:

```text
CRM Source: Authenticated
```

- CRM load/list/detail works before execution;
- notes read path works before execution;
- no active production incident.

## Execution Order

If and only if all prerequisites are true:

1. execute apply:

```text
supabase/sql/20260617_sprint101b23_bridge_read_retirement_apply.sql
```

2. execute validation:

```text
supabase/sql/20260617_sprint101b23_bridge_read_retirement_validation.sql
```

3. run manual smoke test:

- login;
- CRM load;
- lead list;
- lead detail;
- notes read path;
- logout/login again.

4. keep change only if validation and smoke test pass.

5. execute rollback only if failure occurs.

## Failure Signals

Trigger failure if any of these occur:

- validation shows target policy still present after apply;
- validation shows any protected policy missing;
- RLS disabled unexpectedly;
- CRM Source changes to `Anon` or `LocalStorage`;
- CRM list becomes empty unexpectedly;
- lead detail fails;
- notes read path fails;
- 401/403 appears;
- RLS violation appears;
- production instability occurs.

## Rollback Trigger

Rollback should be triggered if:

- validation fails;
- smoke test fails;
- source falls back unexpectedly;
- any protected policy is missing;
- operator cannot confirm expected state.

Rollback file:

```text
supabase/sql/20260617_sprint101b23_bridge_read_retirement_rollback.sql
```

After rollback:

- run validation again;
- confirm `Authenticated bridge read crm_leads` exists again;
- run minimal CRM read smoke test;
- record sanitized evidence.

## Go / No-Go Conclusion

Conclusion:

```text
GO FOR MANUAL CONTROLLED EXECUTION
```

Scope of GO:

- manual execution only;
- remove only `Authenticated bridge read crm_leads`;
- execute only during approved window;
- rollback ready.

Not approved:

- removing `Authenticated bridge update crm_leads`;
- removing anon policies;
- changing organization-scoped policies;
- changing Auth, profiles, data or helper functions.

## Explicit Non-Execution Statement

This sprint did not:

- execute SQL;
- alter policies;
- remove policies;
- alter RLS;
- alter Auth;
- alter tables;
- alter production data.

No production change was performed by Codex.
