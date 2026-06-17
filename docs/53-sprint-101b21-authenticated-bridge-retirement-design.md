# Sprint 101B.21 — Authenticated Bridge Retirement Design

## Objective

Design a controlled retirement strategy for the authenticated bridge policies on `public.crm_leads`.

This sprint is architecture/design only. No retirement was performed.

## Current Policy Topology

## Legacy policies

| Policy | Role | Command | Condition | Status |
| --- | --- | --- | --- | --- |
| `Allow public read crm_leads` | `anon` | `SELECT` | `true` | keep for now |
| `Allow public update crm_leads` | `anon` | `UPDATE` | `true` / `with_check true` | keep for now |
| `Authenticated bridge read crm_leads` | `authenticated` | `SELECT` | `true` | retirement candidate |
| `Authenticated bridge update crm_leads` | `authenticated` | `UPDATE` | `true` / `with_check true` | retirement candidate |

## Organization-scoped policies

| Policy | Role | Command | Condition | Status |
| --- | --- | --- | --- | --- |
| `crm_leads authenticated read same organization` | `authenticated` | `SELECT` | `organization_id = public.evolv_current_organization_id()` | active |
| `crm_leads authenticated update same organization` | `authenticated` | `UPDATE` | `organization_id = public.evolv_current_organization_id()` | active |

## Retirement Candidates

The first retirement candidates are:

1. `Authenticated bridge read crm_leads`
2. `Authenticated bridge update crm_leads`

The anon policies are not candidates in this sprint. They must remain until separate evidence proves the standard runtime no longer depends on anon access.

## Dependency Analysis

## Authenticated bridge read

Role today:

- permits authenticated users to read all `crm_leads` through `qual = true`;
- masks whether the organization-scoped read policy alone is sufficient.

Risk of keeping:

- authenticated users are not restricted by organization on read while this bridge remains active.

Risk of removing:

- authenticated CRM list/detail/notes validation may fail if organization context is incorrect or if some leads do not match the current user's organization.

Required evidence before removal:

- `CRM Source: Authenticated`;
- CRM list works;
- lead detail opens;
- notes list/create works;
- organization helper returns expected organization for test user;
- `crm_leads.organization_id` remains complete.

## Authenticated bridge update

Role today:

- permits authenticated users to update all `crm_leads` through `qual = true` and `with_check = true`;
- masks whether the organization-scoped update policy alone is sufficient.

Risk of keeping:

- authenticated users are not restricted by organization on update while this bridge remains active.

Risk of removing:

- lead edit/save and stage movement may fail if organization-scoped update path is not fully valid.

Required evidence before removal:

- all evidence required for read removal;
- lead edit/save persists;
- stage move persists, if available;
- no silent fallback to anon/localStorage;
- no RLS violation in update path.

## Retirement Mode Options

## Option 1 — One policy at a time

Recommended.

Pros:

- smallest blast radius;
- easier rollback;
- read behavior can be validated before update behavior;
- reduces ambiguity during incident analysis.

Cons:

- requires more than one sprint/window.

## Option 2 — Read first, then update

Recommended sequence.

Rationale:

- read failure is easier to detect;
- read path is exercised by CRM list, detail and notes validation;
- update removal is more sensitive because it affects persistence.

## Option 3 — Update first, then read

Not recommended.

Rationale:

- update path depends on stable read/list/detail flows;
- update failure can interrupt operational work more severely.

## Option 4 — Remove both together

Not recommended.

Rationale:

- larger blast radius;
- harder to isolate failure;
- rollback analysis becomes less precise.

## Risk Matrix

| Scenario | Action | Risk | Operational impact | Recommendation |
| --- | --- | --- | --- | --- |
| A | remove authenticated bridge read only | medium | CRM list/detail/notes may fail for authenticated path if organization scoping is wrong | safest first candidate |
| B | remove authenticated bridge update only | high | lead edit/save and stage movement may fail | do after read retirement passes |
| C | remove both together | high to critical | read and update failures may happen simultaneously | avoid |

## Recommended Sequence

## Phase 1 — Pre-retirement evidence

Collect evidence from Sprint 101B.20:

- `CRM Source: Authenticated`;
- login works;
- CRM load works;
- list rendering works;
- lead detail opens;
- lead edit/save works;
- stage move works or is explicitly skipped with reason;
- notes list/create works;
- logout/login again preserves authenticated source.

## Phase 2 — Retire authenticated bridge read only

Future execution sprint should remove only:

- `Authenticated bridge read crm_leads`

Keep:

- anon policies;
- authenticated bridge update;
- organization-scoped read/update.

Validate:

- CRM load;
- lead list;
- lead detail;
- notes list/create;
- no fallback to anon/localStorage.

## Phase 3 — Evidence review

Review:

- errors;
- source indicator;
- note flow;
- CRM read stability;
- count stability.

Only continue if all evidence is clean.

## Phase 4 — Retire authenticated bridge update only

Future sprint should remove only:

- `Authenticated bridge update crm_leads`

Keep:

- anon policies until separate anon retirement track;
- organization-scoped read/update.

Validate:

- edit/save;
- stage movement;
- notes still working;
- no RLS/update error.

## Rollback Design Requirements

## Scenario A rollback

If removing authenticated bridge read fails, rollback must recreate only:

- `Authenticated bridge read crm_leads`

Rollback validation:

- CRM list loads;
- lead detail opens;
- notes flow recovers;
- source behavior is documented.

## Scenario B rollback

If removing authenticated bridge update fails, rollback must recreate only:

- `Authenticated bridge update crm_leads`

Rollback validation:

- lead edit/save recovers;
- stage move recovers;
- no data correction required.

## Scenario C rollback

If both were removed together and failure occurs, rollback must restore both policies. This is not recommended because it increases ambiguity and operational risk.

## Runtime Validation Requirements

Before any bridge retirement:

- authenticated runtime must be active;
- source indicator must show `CRM Source: Authenticated`;
- no silent fallback is acceptable;
- CRM list/detail must pass;
- lead save must pass;
- notes list/create must pass;
- logout/login repeat must pass.

Immediately after retirement:

- repeat the same smoke test matrix;
- capture source indicator;
- capture errors, if any;
- compare expected lead counts;
- document pass/fail before proceeding.

## Go / No-Go Criteria

## GO for authenticated bridge read retirement

All must be true:

- Sprint 101B.20 evidence passed;
- source was `Authenticated`;
- CRM list/detail passed;
- notes list/create passed;
- rollback SQL is prepared and reviewed;
- operator window is approved.

## NO-GO for authenticated bridge read retirement

Any of these:

- source is `Anon` or `LocalStorage`;
- authenticated runtime has not been proven;
- notes fail;
- CRM list/detail fails;
- organization helper evidence is missing.

## GO for authenticated bridge update retirement

All must be true:

- authenticated bridge read was already retired successfully, or read retirement evidence remains clean;
- lead edit/save passed without bridge read;
- stage movement passed or was explicitly not applicable;
- rollback SQL is prepared and reviewed.

## NO-GO for authenticated bridge update retirement

Any of these:

- save silently fails;
- RLS update error occurs;
- source falls back;
- read path is unstable.

## Should a Dedicated Retirement Audit Sprint Exist Before Execution?

Yes.

Before executing the first removal, run a short dedicated audit sprint to confirm:

- 101B.20 evidence exists and is complete;
- current `pg_policies` still matches expected topology;
- rollback text is ready;
- operator window is approved;
- no new runtime dependency on bridge appeared.

## Explicit Non-Retirement Statement

This sprint did not:

- execute SQL;
- remove policies;
- alter policies;
- alter RLS;
- alter Auth;
- alter tables;
- alter production data;
- approve legacy policy retirement.

## Final Recommendation

Safest first retirement candidate:

- `Authenticated bridge read crm_leads`

Recommended next sprint:

- Sprint 101B.22 — Authenticated Bridge Read Retirement Preflight Audit.

Do not remove `Authenticated bridge update crm_leads` until read retirement has passed and update-specific runtime evidence is clean.
