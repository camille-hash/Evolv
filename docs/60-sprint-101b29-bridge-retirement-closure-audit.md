# Sprint 101B.29 - Bridge Retirement Closure Audit

## Objective

Document the closure of the authenticated bridge policy retirement initiative for `public.crm_leads`.

This sprint is documentation-only. No SQL was executed, no policy was altered, and no production object was changed by Codex.

## Timeline

## Preparation and design

1. Sprint 101B.21 designed the authenticated bridge retirement strategy.
2. Sprint 101B.22 audited the read bridge retirement candidate and returned `GO`.
3. Sprint 101B.23 created the controlled removal package for `Authenticated bridge read crm_leads`.
4. Sprint 101B.24 reviewed final readiness for the read bridge and returned `GO FOR MANUAL CONTROLLED EXECUTION`.

## Read bridge retirement

Retired policy:

```text
Authenticated bridge read crm_leads
```

Execution result supplied in the sprint context:

- read bridge retirement executed manually;
- validation passed;
- runtime smoke test passed;
- rollback was not required.

## Update bridge preparation

1. Sprint 101B.25 audited the update bridge retirement candidate and returned `GO`.
2. Sprint 101B.26 created the controlled removal package for `Authenticated bridge update crm_leads`.
3. Sprint 101B.27 reviewed final readiness for the update bridge and returned `GO FOR MANUAL CONTROLLED EXECUTION`.

## Update bridge retirement

Retired policy:

```text
Authenticated bridge update crm_leads
```

Execution result supplied in the sprint context:

- update bridge retirement executed manually;
- validation passed;
- runtime smoke test passed;
- rollback was not required.

## Policies Retired

Authenticated bridge policies now retired:

- `Authenticated bridge read crm_leads`
- `Authenticated bridge update crm_leads`

These policies previously allowed authenticated access with broad conditions:

- read bridge: `using (true)`;
- update bridge: `using (true)` and `with check (true)`.

## Policies Remaining

Organization-scoped policies active:

- `crm_leads authenticated read same organization`
- `crm_leads authenticated update same organization`

Remaining legacy anon policies:

- `Allow public read crm_leads`
- `Allow public update crm_leads`

## Final Policy Topology

Expected final topology after authenticated bridge retirement:

| Policy | Role | Command | Status |
| --- | --- | --- | --- |
| `crm_leads authenticated read same organization` | `authenticated` | `SELECT` | active |
| `crm_leads authenticated update same organization` | `authenticated` | `UPDATE` | active |
| `Allow public read crm_leads` | `anon` | `SELECT` | active legacy scope |
| `Allow public update crm_leads` | `anon` | `UPDATE` | active legacy scope |
| `Authenticated bridge read crm_leads` | `authenticated` | `SELECT` | retired |
| `Authenticated bridge update crm_leads` | `authenticated` | `UPDATE` | retired |

## Validation Evidence

Evidence provided by execution context:

- read bridge retirement validation passed;
- update bridge retirement validation passed;
- both targeted bridge policies were absent after their respective executions;
- organization-scoped policies remained active;
- protected anon policies remained active;
- RLS remained enabled on `crm_leads`;
- rollback was not required for either retirement.

## Runtime Evidence

Evidence provided by execution context:

- runtime smoke test passed after read bridge retirement;
- runtime smoke test passed after update bridge retirement;
- CRM remained operational;
- leads loaded correctly;
- lead detail worked;
- notes read path worked;
- authenticated runtime remained validated;
- no rollback was required.

## Security Posture

The authenticated runtime no longer depends on broad authenticated bridge policies for `crm_leads`.

Security improvement achieved:

- authenticated read access is now expected to be governed by organization scope;
- authenticated update access is now expected to be governed by organization scope;
- broad authenticated `using (true)` and `with check (true)` bridge access has been retired;
- the hardening path now has a clear separation between authenticated scoped access and remaining anon legacy access.

## Risks Removed

Retiring the authenticated bridge policies removes these risks:

- authenticated users broadly reading all `crm_leads` through `using (true)`;
- authenticated users broadly updating all `crm_leads` through `using (true)` and `with check (true)`;
- organization-scoped policies being masked by authenticated bridge policies;
- ambiguity when validating whether authenticated runtime works through organization scope;
- higher blast radius for future multi-organization operation.

## Remaining Legacy Scope

The bridge retirement initiative is complete, but legacy anon scope remains:

- `Allow public read crm_leads`
- `Allow public update crm_leads`

These policies are explicitly outside the authenticated bridge retirement scope.

They should not be removed without a separate anon retirement track because previous audits identified that anon/public runtime paths may still be operationally relevant.

## Recommendations

Recommended next track:

```text
Anon Policy Retirement Readiness
```

Recommended future sequence:

1. audit whether production still uses anon `SupabaseCrmRepository`;
2. collect runtime evidence with authenticated source as the only successful intended source;
3. confirm fallback behavior and rollback-by-configuration;
4. design anon read retirement separately;
5. prepare controlled package for `Allow public read crm_leads`;
6. execute only after readiness and manual approval;
7. then repeat separately for `Allow public update crm_leads`.

Do not remove anon read and anon update together.

## Closure Questions

## A. Were authenticated bridge policies successfully retired?

Yes.

Both authenticated bridge policies were retired successfully:

- `Authenticated bridge read crm_leads`;
- `Authenticated bridge update crm_leads`.

## B. Is authenticated runtime operational without bridge policies?

Yes, based on the execution context supplied for this closure audit.

The runtime smoke tests passed after both retirements, and rollback was not required.

## C. Is the bridge retirement initiative complete?

Yes.

The authenticated bridge retirement initiative is complete.

## D. What legacy scope remains?

Remaining legacy scope:

- `Allow public read crm_leads`;
- `Allow public update crm_leads`.

This is a separate anon retirement track and is not closed by this sprint.

## Closure Conclusion

Conclusion:

```text
AUTHENTICATED BRIDGE RETIREMENT COMPLETE
```

The EVOLV Auth / RLS hardening track has completed retirement of the authenticated bridge policies for `crm_leads`.

The next security frontier is the controlled audit and eventual retirement of anon policies, subject to separate evidence, readiness review, rollback planning and manual approval.

## Explicit Non-Execution Statement

This sprint did not:

- execute SQL;
- create SQL;
- alter policies;
- alter RLS;
- alter Auth;
- alter tables;
- alter production data.

No production change was performed by Codex.
