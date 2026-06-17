# Sprint 101B.27 - Authenticated Bridge Update Final Execution Readiness

## Objective

Perform final execution readiness review for the existing Sprint 101B.26 package targeting controlled retirement of:

```text
Authenticated bridge update crm_leads
```

This sprint is readiness-only. No SQL was executed and no production object was changed.

## Package Reviewed

Documents and SQL package reviewed:

- `docs/58-sprint-101b26-authenticated-bridge-update-controlled-removal.md`
- `supabase/sql/20260617_sprint101b26_bridge_update_retirement_apply.sql`
- `supabase/sql/20260617_sprint101b26_bridge_update_retirement_validation.sql`
- `supabase/sql/20260617_sprint101b26_bridge_update_retirement_rollback.sql`

## Apply Review

Apply file:

```text
supabase/sql/20260617_sprint101b26_bridge_update_retirement_apply.sql
```

The apply SQL contains only:

```sql
drop policy if exists "Authenticated bridge update crm_leads" on public.crm_leads;
```

Review result:

- targets only `Authenticated bridge update crm_leads`;
- does not touch `Allow public read crm_leads`;
- does not touch `Allow public update crm_leads`;
- does not touch organization-scoped policies;
- does not recreate or touch the already retired `Authenticated bridge read crm_leads`;
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
supabase/sql/20260617_sprint101b26_bridge_update_retirement_validation.sql
```

The validation SQL is read-only and uses:

- `select`
- `with`
- catalog reads from `pg_policies` and `pg_class`
- count read from `public.crm_leads`

It validates:

- target update bridge should be absent after apply;
- already retired read bridge should remain absent;
- `Allow public read crm_leads` remains present;
- `Allow public update crm_leads` remains present;
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
supabase/sql/20260617_sprint101b26_bridge_update_retirement_rollback.sql
```

The rollback SQL recreates only:

```text
Authenticated bridge update crm_leads
```

Original definition:

```sql
create policy "Authenticated bridge update crm_leads"
on public.crm_leads
for update
to authenticated
using (true)
with check (true);
```

Review result:

- recreates the exact original update bridge policy;
- uses idempotent `if not exists` guard;
- does not touch anon policies;
- does not touch organization-scoped policies;
- does not recreate `Authenticated bridge read crm_leads`;
- does not alter data or tables.

Conclusion:

```text
ROLLBACK PACKAGE ACCEPTABLE
```

## Protected Scope

The following must remain untouched during execution:

- `Allow public read crm_leads`
- `Allow public update crm_leads`
- `crm_leads authenticated read same organization`
- `crm_leads authenticated update same organization`
- the already retired `Authenticated bridge read crm_leads`
- helper functions
- Auth
- profiles
- notes
- activities
- stage changes
- `crm_leads` data, except for intentional harmless smoke-test edits performed by the operator

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
- a harmless lead edit/save works before execution;
- notes path works before execution;
- no active production incident.

## Execution Order

If and only if all prerequisites are true:

1. execute apply:

```text
supabase/sql/20260617_sprint101b26_bridge_update_retirement_apply.sql
```

2. execute validation:

```text
supabase/sql/20260617_sprint101b26_bridge_update_retirement_validation.sql
```

3. run manual smoke test:

- login;
- CRM load;
- open lead;
- edit harmless field;
- save;
- refresh or reopen lead;
- confirm update persisted;
- stage movement, if operationally acceptable;
- logout/login again.

4. keep change only if validation and smoke test pass.

5. execute rollback only if failure occurs.

## Failure Signals

Trigger failure if any of these occur:

- validation shows target update bridge still present after apply;
- validation shows retired read bridge present again;
- validation shows any protected policy missing;
- RLS disabled unexpectedly;
- CRM Source changes to `Anon` or `LocalStorage`;
- lead edit/save fails;
- saved value does not persist after refresh/reopen;
- stage movement fails unexpectedly;
- 401/403 appears;
- RLS violation appears;
- production instability occurs.

## Rollback Trigger

Rollback should be triggered if:

- validation fails;
- smoke test fails;
- source falls back unexpectedly;
- any protected policy is missing;
- retired read bridge is recreated unexpectedly;
- operator cannot confirm expected state.

Rollback file:

```text
supabase/sql/20260617_sprint101b26_bridge_update_retirement_rollback.sql
```

After rollback:

- run validation again;
- confirm `Authenticated bridge update crm_leads` exists again;
- confirm `Authenticated bridge read crm_leads` remains absent;
- run minimal lead edit/save smoke test;
- record sanitized evidence.

## Go / No-Go Conclusion

Conclusion:

```text
GO FOR MANUAL CONTROLLED EXECUTION
```

Scope of GO:

- manual execution only;
- remove only `Authenticated bridge update crm_leads`;
- execute only during approved window;
- rollback ready.

Not approved:

- recreating `Authenticated bridge read crm_leads`;
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
