# Sprint 101B.22 — Authenticated Bridge Read Retirement Preflight Audit

## Objective

Determine whether `Authenticated bridge read crm_leads` is ready to become the first controlled legacy bridge policy retirement candidate.

This sprint is audit-only. No SQL was executed, no policy was altered, and no retirement was performed.

## Current Policy Topology

## Organization-scoped policies

Active policies:

- `crm_leads authenticated read same organization`
- `crm_leads authenticated update same organization`

These policies use:

```text
organization_id = public.evolv_current_organization_id()
```

## Legacy policies

Still active:

- `Allow public read crm_leads`
- `Allow public update crm_leads`
- `Authenticated bridge read crm_leads`
- `Authenticated bridge update crm_leads`

## Policy under preflight audit

Policy:

```text
Authenticated bridge read crm_leads
```

Role:

```text
authenticated
```

Command:

```text
SELECT
```

Current condition:

```text
qual = true
```

## Read Path Inventory

## 1. CRM list

Code path:

- `components/crm/crm-page.tsx`
- `modules/crm/repositories/index.ts`
- `modules/crm/repositories/authenticated-supabase-crm-repository.ts`

Runtime path when authenticated source is active:

```text
listCrmLeadsFromRepository()
↓
createAuthenticatedSupabaseCrmRepository().list()
↓
supabase.from("crm_leads").select(...)
```

Policy requirement after bridge read removal:

- organization-scoped authenticated read policy must allow the query.

Assessment:

- no code-level dependency on bridge read was found;
- runtime depends on the authenticated source using a valid session and matching `organization_id`.

## 2. Pipeline rendering

Code path:

- `components/crm/crm-page.tsx`

Runtime behavior:

- uses loaded leads from `listCrmLeadsFromRepository()`;
- filtering, grouping and pipeline rendering happen client-side after data is loaded.

Policy requirement after bridge read removal:

- same as CRM list.

Assessment:

- no separate `crm_leads` read path was found;
- dependency is inherited from CRM list.

## 3. Lead detail / dossier

Code path:

- `components/crm/crm-page.tsx`
- `components/crm/crm-lead-detail.tsx`

Runtime behavior:

- selected lead is usually resolved from the in-memory `leads` array;
- repository `getById` exists for direct lookup paths, using authenticated repository when shadow is enabled.

Policy requirement after bridge read removal:

- in-memory detail depends on list read;
- direct `getById` depends on organization-scoped read.

Assessment:

- no code-level dependency on bridge read was found;
- runtime proof should include opening a dossier with `CRM Source: Authenticated`.

## 4. Search and filtering

Code path:

- `components/crm/crm-page.tsx`

Runtime behavior:

- search/filtering is client-side over loaded leads.

Policy requirement after bridge read removal:

- same as CRM list.

Assessment:

- no separate `crm_leads` read path was found;
- dependency is inherited from CRM list.

## 5. Lead Notes read/create workflow

Code path:

- `components/crm/crm-lead-detail.tsx`
- `modules/crm/server/crm-lead-notes-service.ts`

Runtime behavior:

```text
UI reads Supabase access token
↓
API receives Authorization: Bearer token
↓
server validates user/profile
↓
server reads crm_leads.id, organization_id
↓
server lists/creates crm_lead_notes
```

Policy requirement after bridge read removal:

- server-side authenticated client must read `crm_leads` through organization-scoped authenticated read policy.

Assessment:

- this is the most important non-CRM-list read path;
- no code-level dependency on bridge read was found if the user profile organization matches the lead organization;
- runtime proof must include notes list/create.

## 6. Anon repository path

Code path:

- `modules/crm/repositories/supabase-crm-repository.ts`

Runtime behavior:

- uses `persistSession: false`;
- depends on anon policies, not authenticated bridge policies.

Assessment:

- not affected by retiring `Authenticated bridge read crm_leads`;
- anon policies remain untouched.

## Dependency Matrix

Policy under audit:

```text
Authenticated bridge read crm_leads
```

| Runtime path | Dependency classification | Reason |
| --- | --- | --- |
| CRM list with `CRM Source: Authenticated` | dependency not found | Authenticated repository can be satisfied by organization-scoped read policy if organization context is correct. |
| Pipeline rendering | dependency not found | Uses leads already loaded by CRM list. |
| Lead detail from selected lead | dependency not found | Uses in-memory selected lead from loaded list. |
| Direct lead `getById` authenticated path | dependency not found | Authenticated repository can use organization-scoped read. |
| Search/filtering | dependency not found | Client-side over loaded leads. |
| Notes lead validation | dependency not found | Uses authenticated Bearer token and validates organization; should be covered by organization-scoped read. |
| Anon CRM list/detail path | dependency not found for this policy | Uses anon policies, which remain active. |
| LocalStorage fallback | dependency not found | Bypasses Supabase RLS. |
| Unknown production-only edge case | uncertain | Any unobserved runtime path must be caught by pre-execution validation. |

## Review of Previous Findings

## Sprint 101B.17

Established that:

- authenticated shadow list/get/update directly exercises organization-scoped authenticated policies;
- notes workflow indirectly depends on authenticated read access to `crm_leads`;
- runtime success while bridges exist does not prove bridges are removable.

## Sprint 101B.18

Established that:

- anon policies must remain because the standard runtime may still use anon repository;
- authenticated bridge policies are possible future candidates;
- read and update should be retired independently.

## Sprint 101B.19

Established that:

- no new flag is needed;
- `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=true` makes authenticated repository the first attempted runtime path;
- rollback is toggling the flag back to `false`.

## Sprint 101B.20

Defined manual evidence requirements:

- `CRM Source: Authenticated`;
- login;
- CRM load;
- list rendering;
- lead detail;
- edit/save;
- stage movement if present;
- notes list/create;
- logout/login again.

## Sprint 101B.21

Recommended:

- retire bridge policies one at a time;
- read before update;
- avoid retiring both together.

## Risk Assessment

## Risk of removing authenticated bridge read

Risk level:

- medium

Potential failure modes:

- CRM authenticated list fails with RLS error;
- lead detail fails if direct `getById` is used;
- notes validation fails when reading `crm_leads.id, organization_id`;
- app silently falls back to anon, masking the failure.

Mitigations:

- require `CRM Source: Authenticated`;
- monitor for fallback;
- keep anon policies active;
- keep authenticated bridge update active;
- prepare rollback that restores only authenticated bridge read.

## Risk of not removing authenticated bridge read

Risk level:

- medium to high over time

Reason:

- authenticated users still retain a broad read path with `qual = true`;
- organization-scoped read policy remains masked by bridge read.

## Go / No-Go Analysis

## A. Is retirement technically blocked?

No technical code-level blocker was found for a controlled retirement of `Authenticated bridge read crm_leads`.

The authenticated read paths identified in code should be satisfiable by:

```text
crm_leads authenticated read same organization
```

provided that:

- authenticated runtime is active;
- user has valid profile;
- profile `organization_id` matches lead `organization_id`;
- helper function returns the expected organization.

## B. Is more evidence required?

No additional architecture evidence is required before preparing the controlled removal package.

However, immediate pre-execution runtime evidence is still required in the future execution window:

- source must show `CRM Source: Authenticated`;
- CRM list/detail must pass;
- notes list/create must pass;
- no fallback to anon/localStorage may occur.

## C. Is the policy a valid candidate for retirement?

Yes.

`Authenticated bridge read crm_leads` is a valid first candidate because:

- organization-scoped read policy already exists;
- read is lower risk than update;
- anon policies remain active as a separate legacy path;
- update bridge remains active;
- runtime read paths have identifiable validation checks.

## D. Is a controlled removal package justified?

Yes.

A narrow controlled removal package is justified for this single policy only:

```text
Authenticated bridge read crm_leads
```

It should include:

- preflight read-only validation;
- apply SQL removing only this policy;
- validation SQL;
- rollback SQL recreating only this policy;
- manual smoke test checklist.

## Required Rollback Behavior

Rollback must recreate only:

```text
Authenticated bridge read crm_leads
```

Rollback must not alter:

- anon policies;
- authenticated bridge update;
- organization-scoped policies;
- tables;
- data;
- Auth;
- profiles;
- Recovery;
- Lead Notes.

Post-rollback validation:

- CRM list works;
- lead detail opens;
- notes list/create works;
- source behavior documented.

## Production Validation Required after Retirement

Immediately after future retirement:

1. confirm policy absence for `Authenticated bridge read crm_leads`;
2. confirm organization-scoped read policy still exists;
3. login with Supabase Auth;
4. confirm `CRM Source: Authenticated`;
5. load CRM;
6. confirm leads render;
7. open lead dossier;
8. list notes;
9. create harmless note if acceptable;
10. logout/login again;
11. confirm source remains authenticated;
12. confirm no fallback to anon/localStorage occurred.

## Success Criteria

GO result is valid only if:

- authenticated source stays active;
- CRM list renders;
- lead detail opens;
- notes list/create works;
- no RLS error appears;
- no 401/403 appears;
- no silent fallback appears.

## Failure Criteria

Fail and rollback if:

- `CRM Source` becomes `Anon` or `LocalStorage`;
- CRM list is empty unexpectedly;
- lead detail fails;
- notes fail with 401/403 or organization mismatch;
- RLS error appears;
- any production-only read path breaks.

## Recommendation

Recommendation:

```text
GO
```

Scope of GO:

- GO to create a controlled removal package for `Authenticated bridge read crm_leads`;
- not GO to remove it in this sprint;
- not GO to remove authenticated bridge update;
- not GO to remove anon policies.

## Explicit Non-Retirement Statement

This sprint did not:

- execute SQL;
- create executable SQL;
- remove policies;
- alter policies;
- alter RLS;
- alter Auth;
- alter tables;
- alter production data.

No retirement was performed.

## Recommended Next Sprint

Sprint 101B.23 — Authenticated Bridge Read Controlled Removal Package.

That sprint should prepare:

- preflight SQL;
- apply SQL removing only `Authenticated bridge read crm_leads`;
- validation SQL;
- rollback SQL recreating only `Authenticated bridge read crm_leads`;
- manual execution runbook.
