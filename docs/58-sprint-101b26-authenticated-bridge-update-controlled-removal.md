# Sprint 101B.26 - Authenticated Bridge Update Controlled Removal Package

## Objective

Prepare a controlled removal package for exactly one policy:

```text
Authenticated bridge update crm_leads
```

This sprint creates package files only. No SQL was executed, no production change was made, and no policy was removed.

## Approved Scope

Approved retirement candidate:

```text
Authenticated bridge update crm_leads
```

Command:

```text
UPDATE
```

Role:

```text
authenticated
```

Original definition:

```text
using (true)
with check (true)
```

## Explicitly Protected

This package must not alter:

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
- table data

Already retired and not recreated by this package:

- `Authenticated bridge read crm_leads`

## Execution Sequence for Future Manual Window

Do not execute as part of this sprint.

Future supervised sequence:

1. confirm operator approval;
2. confirm `CRM Source: Authenticated` before removal;
3. confirm CRM load/list/detail works before removal;
4. confirm a harmless lead edit/save works before removal;
5. execute `20260617_sprint101b26_bridge_update_retirement_apply.sql`;
6. execute `20260617_sprint101b26_bridge_update_retirement_validation.sql`;
7. run post-execution runtime smoke test;
8. decide keep or rollback.

## Validation Sequence

After future apply:

1. confirm `Authenticated bridge update crm_leads` no longer exists;
2. confirm `crm_leads authenticated update same organization` still exists;
3. confirm `crm_leads authenticated read same organization` still exists;
4. confirm anon read/update policies still exist;
5. confirm `Authenticated bridge read crm_leads` remains absent;
6. confirm RLS remains enabled on `crm_leads`;
7. execute runtime smoke test focused on update behavior.

## Runtime Smoke Test

Required post-execution:

- login;
- CRM load;
- open lead;
- edit a harmless field;
- save;
- refresh or reopen the lead;
- confirm the harmless update persisted;
- stage movement, if operationally acceptable;
- logout/login again.

Expected:

- `CRM Source: Authenticated`;
- no fallback to anon/localStorage;
- no 401/403;
- no RLS violation;
- lead update persists;
- stage movement persists if tested.

## Success Criteria

Success only if:

- targeted policy is absent;
- all protected policies remain present;
- RLS remains enabled on `crm_leads`;
- CRM source remains `Authenticated`;
- lead edit/save persists;
- stage movement passes or is explicitly skipped with reason;
- logout/login repeat works;
- no production data changes occur beyond the intentional harmless smoke-test edit.

## Failure Criteria

Fail and rollback if:

- CRM source falls back to `Anon` or `LocalStorage`;
- lead edit/save fails;
- saved value does not persist after refresh/reopen;
- stage movement fails unexpectedly;
- RLS or permission errors appear;
- any protected policy is missing or changed.

## Rollback Sequence

If future execution fails:

1. execute `20260617_sprint101b26_bridge_update_retirement_rollback.sql`;
2. execute validation SQL again;
3. confirm targeted policy exists again;
4. run minimal lead edit/save smoke test;
5. record sanitized evidence.

## Rollback Scope

Rollback recreates only:

```text
Authenticated bridge update crm_leads
```

Rollback must not touch:

- anon policies;
- organization-scoped policies;
- the already retired authenticated bridge read policy;
- tables;
- data;
- Auth;
- profiles;
- notes.

## Non-Execution Statement

This sprint did not:

- execute SQL;
- remove policies;
- alter policies;
- alter tables;
- alter Auth;
- alter profiles;
- alter production data.

The package is ready for review, not execution.
