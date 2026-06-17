# Sprint 101B.23 — Authenticated Bridge Read Controlled Removal Package

## Objective

Prepare a controlled removal package for exactly one policy:

```text
Authenticated bridge read crm_leads
```

This sprint creates package files only. No SQL was executed, no production change was made, and no policy was removed.

## Approved Scope

Approved retirement candidate:

```text
Authenticated bridge read crm_leads
```

Command:

```text
SELECT
```

Role:

```text
authenticated
```

Original condition:

```text
using (true)
```

## Explicitly Protected

This package must not alter:

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
- table data

## Execution Sequence for Future Manual Window

Do not execute as part of this sprint.

Future supervised sequence:

1. confirm operator approval;
2. confirm `CRM Source: Authenticated` before removal;
3. confirm CRM load/list/detail works before removal;
4. execute `20260617_sprint101b23_bridge_read_retirement_apply.sql`;
5. execute `20260617_sprint101b23_bridge_read_retirement_validation.sql`;
6. run post-execution runtime smoke test;
7. decide keep or rollback.

## Validation Sequence

After future apply:

1. confirm `Authenticated bridge read crm_leads` no longer exists;
2. confirm `crm_leads authenticated read same organization` still exists;
3. confirm `Authenticated bridge update crm_leads` still exists;
4. confirm anon read/update policies still exist;
5. confirm organization-scoped update policy still exists;
6. execute runtime smoke test.

## Runtime Smoke Test

Required post-execution:

- login;
- CRM load;
- lead list;
- lead detail;
- notes read path;
- logout/login again.

Expected:

- `CRM Source: Authenticated`;
- no fallback to anon/localStorage;
- no 401/403;
- no RLS violation;
- notes read path succeeds.

## Success Criteria

Success only if:

- targeted policy is absent;
- all protected policies remain present;
- CRM source remains `Authenticated`;
- CRM list renders;
- lead detail opens;
- notes read path works;
- logout/login repeat works;
- no production data changes occur.

## Failure Criteria

Fail and rollback if:

- CRM source falls back to `Anon` or `LocalStorage`;
- CRM list becomes empty unexpectedly;
- lead detail fails;
- notes read path fails;
- RLS or permission errors appear;
- any protected policy is missing or changed.

## Rollback Sequence

If future execution fails:

1. execute `20260617_sprint101b23_bridge_read_retirement_rollback.sql`;
2. execute validation SQL again;
3. confirm targeted policy exists again;
4. run minimal CRM read smoke test;
5. record sanitized evidence.

## Rollback Scope

Rollback recreates only:

```text
Authenticated bridge read crm_leads
```

Rollback must not touch:

- update bridge;
- anon policies;
- organization-scoped policies;
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
