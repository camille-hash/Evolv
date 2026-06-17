# Sprint 101B.25 - Authenticated Bridge Update Retirement Preflight Audit

## Objective

Determine whether the remaining authenticated update bridge policy is ready for controlled retirement:

```text
Authenticated bridge update crm_leads
```

This sprint is audit-only. No SQL was executed, no policy was altered, and no retirement was performed.

## Current Policy Topology

## Organization-scoped policies

Active:

- `crm_leads authenticated read same organization`
- `crm_leads authenticated update same organization`

Both are expected to scope authenticated access through:

```text
organization_id = public.evolv_current_organization_id()
```

## Legacy policies still active

- `Allow public read crm_leads`
- `Allow public update crm_leads`
- `Authenticated bridge update crm_leads`

## Already retired

- `Authenticated bridge read crm_leads`

Bridge read retirement was manually executed, validation passed, runtime smoke test passed, and rollback was not required.

## Policy under Preflight Audit

Policy:

```text
Authenticated bridge update crm_leads
```

Role:

```text
authenticated
```

Command:

```text
UPDATE
```

Current broad bridge behavior:

```text
qual = true
with_check = true
```

Target replacement already active:

```text
crm_leads authenticated update same organization
```

Expected scoped behavior:

```text
using organization_id = public.evolv_current_organization_id()
with check organization_id = public.evolv_current_organization_id()
```

## Update Path Inventory

## 1. Lead edit/save from main edit flow

Code path:

- `components/crm/crm-page.tsx`
- `handleSubmit`
- `updateCrmLeadInRepository(editingLeadId, nextLead)`
- `modules/crm/repositories/index.ts`
- `AuthenticatedSupabaseCrmRepository.updateLead`

Authenticated repository behavior:

```text
supabase.from("crm_leads")
  .update(updatePayload)
  .eq("id", id)
  .select(...)
  .maybeSingle()
```

Fallback lookup:

```text
supabase.from("crm_leads")
  .update(updatePayload)
  .eq("external_id", patch.externalId)
  .select(...)
  .maybeSingle()
```

Assessment:

- no code-level dependency on the broad bridge policy was found;
- organization-scoped update should be sufficient when the lead belongs to the authenticated user's organization;
- runtime validation must confirm no fallback to anon/localStorage occurs.

## 2. Lead edit/save from operational dossier

Code path:

- `components/crm/crm-page.tsx`
- `handleSaveSelectedLead`
- `CrmLeadDetail.onSave`
- `updateCrmLeadInRepository(selectedLead.id, nextLead)`
- `AuthenticatedSupabaseCrmRepository.updateLead`

Fields potentially updated:

- stable lead fields;
- `pipeline`;
- `etapa`;
- `observacoes`;
- commercial metadata already present in the model;
- `updated_at`.

Assessment:

- this is the most important operational update path;
- no bridge-specific code path was found;
- success depends on scoped update policy accepting the existing row and returned row.

## 3. Stage changes / lead movement

Code path:

- `components/crm/crm-page.tsx`
- `handleMoveLead`
- `resolveCrmLeadMovement`
- `recordCrmStageChange`
- `updateCrmLeadInRepository(lead.id, nextLead)`

Important detail:

- `recordCrmStageChange` records local stage history before the lead update path;
- the persisted lead movement itself updates `crm_leads.pipeline`, `crm_leads.etapa`, and `updatedAt` through the same repository update path.

Assessment:

- no separate Supabase update path was found for stage movement;
- retiring the update bridge would test the same organization-scoped update policy;
- production validation should include a safe stage move only if operationally acceptable.

## 4. Lead field updates by authenticated repository

Code path:

- `modules/crm/repositories/authenticated-supabase-crm-repository.ts`
- `mapCrmLeadPatchToAuthenticatedSupabaseRow`
- `updateLead`

Mapped fields include:

- `external_id`
- `closed_at`
- `titulo_oportunidade`
- `nome`
- `telefone`
- `email`
- `pais`
- `origem`
- `consultor`
- `valor_pretendido`
- `observacoes`
- `pipeline`
- `etapa`
- `tags`
- `produto_interesse`
- `temperatura`
- `status`
- `proxima_acao`
- `data_proxima_acao`
- `created_at`
- `updated_at`

Assessment:

- the update payload does not set `organization_id`;
- this reduces risk of accidentally moving a lead across organizations;
- the scoped policy still needs the existing row's `organization_id` to match the authenticated user's organization.

## 5. Anon update fallback

Code path:

- `modules/crm/repositories/index.ts`
- fallback to `SupabaseCrmRepository.updateLead`
- `modules/crm/repositories/supabase-crm-repository.ts`

Policy dependency:

- depends on `Allow public update crm_leads`, not on `Authenticated bridge update crm_leads`.

Assessment:

- not blocked by retiring the authenticated update bridge;
- should remain available because anon policy retirement is not approved;
- if authenticated update fails and fallback succeeds, that is a failure signal for this retirement track, not a success.

## 6. LocalStorage fallback

Code path:

- `modules/crm/repositories/index.ts`
- `LocalCrmRepository.updateLead`

Policy dependency:

- none.

Assessment:

- not affected by the policy under audit;
- fallback must not mask production RLS failure during validation.

## 7. Notes workflows

Code path:

- `components/crm/crm-lead-detail.tsx`
- `/api/crm/lead-notes`
- `modules/crm/server/crm-lead-notes-service.ts`

Observed behavior:

- notes list/create validates the lead by reading `crm_leads.id, organization_id`;
- notes workflows write `crm_lead_notes`;
- no `crm_leads` update is performed by notes workflows.

Assessment:

- notes workflows are not dependent on `Authenticated bridge update crm_leads`;
- notes should still be smoke-tested because they are part of the lead detail workflow, but they are not a blocker for update bridge retirement unless they reveal broader session or organization issues.

## Dependency Matrix

Policy under audit:

```text
Authenticated bridge update crm_leads
```

| Update path | Dependency classification | Reason |
| --- | --- | --- |
| Main edit form save | dependency not found | Uses authenticated repository update; should be satisfied by organization-scoped update when organization context matches. |
| Operational dossier save | dependency not found | Same `updateCrmLeadInRepository` path; no bridge-specific code found. |
| Stage movement | dependency not found | Updates `pipeline` and `etapa` through same repository update path. |
| Field patch by id | dependency not found | Scoped update should permit same-organization row update. |
| Field patch by external_id fallback | uncertain | Code can update by `external_id`; should still be scoped by row `organization_id`, but needs runtime validation if this fallback is actually used. |
| Notes list/create | dependency not found | Notes validate `crm_leads` through read path only and write `crm_lead_notes`, not `crm_leads`. |
| Anon update fallback | dependency not found for this policy | Uses anon policy, which remains active and is outside this retirement. |
| LocalStorage fallback | dependency not found | Bypasses Supabase RLS. |
| Unknown production-only update path | uncertain | No additional path found in inspected code, but production validation must catch unobserved workflows. |

## Review of Previous Findings

## Sprint 101B.18

Findings relevant here:

- anon policies must remain because standard runtime may still use the anon repository;
- authenticated bridge policies require targeted runtime evidence before retirement;
- read and update should be retired independently.

## Sprint 101B.19

Findings relevant here:

- no new feature flag is needed;
- authenticated repository can be primary through:

```text
NEXT_PUBLIC_USE_SUPABASE_AUTH=true
NEXT_PUBLIC_USE_SUPABASE_CRM=true
NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=true
```

- expected source indicator:

```text
CRM Source: Authenticated
```

## Sprint 101B.20

Evidence requirements relevant here:

- lead edit/save must persist;
- stage move must persist or be explicitly skipped;
- no fallback to anon/localStorage should occur during authenticated runtime evidence.

## Sprint 101B.21

Retirement design recommended:

- retire bridge policies one at a time;
- read before update;
- update bridge retirement should only happen after read retirement passes.

## Sprint 101B.22

Preflight for read bridge returned GO, with notes path treated as a read dependency.

## Sprint 101B.23

Controlled removal package was created for read bridge only.

## Sprint 101B.24

Final execution readiness for read bridge returned GO.

## Current Post-Read-Retirement Evidence

The user-provided sprint context confirms:

- `Authenticated bridge read crm_leads` was retired successfully;
- validation passed;
- runtime smoke test passed;
- rollback was not required;
- CRM remains operational;
- lead detail works;
- notes read path works;
- authenticated runtime was validated.

This reduces risk for update bridge retirement because read paths are no longer dependent on the authenticated read bridge.

## Risk Assessment

## Risk of removing authenticated bridge update

Risk level:

```text
medium
```

Potential failure modes:

- lead save fails with RLS update error;
- stage movement fails;
- update returns no row because scoped update blocks the target row;
- UI silently falls back to anon or localStorage and masks failure;
- external_id fallback path behaves differently from id path;
- operator edits a real field and cannot persist it during the validation window.

Mitigations:

- remove only this single policy in a future controlled package;
- keep anon update policy active;
- keep organization-scoped update policy active;
- require `CRM Source: Authenticated`;
- use a harmless update field;
- immediately validate persistence after refresh/reopen;
- prepare rollback that recreates only `Authenticated bridge update crm_leads`.

## Risk of keeping authenticated bridge update

Risk level:

```text
medium to high over time
```

Reason:

- authenticated users retain broad update permission through `using true` and `with_check true`;
- organization-scoped update policy remains masked;
- multi-tenant hardening remains incomplete while this bridge exists.

## Risk to Auth and Recovery

Risk level:

```text
low
```

Reason:

- Auth and recovery do not update `crm_leads`;
- this retirement candidate is limited to a `crm_leads` update policy.

## Risk to Lead Notes

Risk level:

```text
low
```

Reason:

- notes validate lead ownership through read access and write `crm_lead_notes`;
- read bridge has already been retired successfully;
- notes are not expected to depend on the update bridge.

## Go / No-Go Analysis

## A. Is retirement technically blocked?

No code-level technical blocker was found.

Known update paths are centralized through `updateCrmLeadInRepository`, and the authenticated implementation should be covered by:

```text
crm_leads authenticated update same organization
```

provided that:

- authenticated runtime is active;
- the user's profile organization matches the lead organization;
- helper functions return the expected organization;
- `crm_leads.organization_id` remains complete.

## B. Is more evidence required?

Yes, but only immediate pre-execution/runtime evidence for the future removal window.

Required evidence before actual removal:

- `CRM Source: Authenticated`;
- edit/save succeeds before removal;
- safe update persists after refresh/reopen;
- stage movement passes or is explicitly skipped;
- no fallback to anon/localStorage;
- rollback file prepared and reviewed.

No additional architecture sprint is required before creating a controlled removal package.

## C. Is the policy a valid retirement candidate?

Yes.

The policy is a valid candidate because:

- read bridge retirement has already passed;
- organization-scoped update policy exists;
- update paths are centralized and auditable;
- notes do not depend on this update policy;
- anon fallback remains preserved for rollback-by-configuration, but must not be treated as success during validation.

## D. Is a controlled removal package justified?

Yes.

A controlled removal package is justified for this single policy only:

```text
Authenticated bridge update crm_leads
```

The package should include:

- apply SQL removing only this policy;
- read-only validation SQL;
- rollback SQL recreating only this policy;
- operational runbook;
- smoke test focused on edit/save and stage movement.

## Rollback Requirements

Rollback must recreate only:

```text
Authenticated bridge update crm_leads
```

Original expected definition:

```sql
create policy "Authenticated bridge update crm_leads"
on public.crm_leads
for update
to authenticated
using (true)
with check (true);
```

Rollback must not alter:

- `Allow public read crm_leads`;
- `Allow public update crm_leads`;
- organization-scoped read policy;
- organization-scoped update policy;
- helper functions;
- Auth;
- profiles;
- notes;
- `crm_leads` data.

Post-rollback validation:

- confirm policy exists again;
- confirm organization-scoped policies still exist;
- confirm lead edit/save works;
- confirm CRM source behavior is documented.

## Production Validation Requirements

Immediately after future removal:

1. confirm `Authenticated bridge update crm_leads` is absent;
2. confirm `crm_leads authenticated update same organization` is present;
3. confirm protected policies remain present;
4. login with Supabase Auth;
5. confirm `CRM Source: Authenticated`;
6. open CRM;
7. open lead detail;
8. edit a harmless lead field;
9. save;
10. refresh or reopen lead;
11. confirm the update persisted;
12. move stage only if operationally acceptable;
13. confirm no unexpected fallback to anon/localStorage;
14. confirm notes list/create still works as a regression check;
15. run rollback only if failure occurs.

## Success Criteria

Future removal succeeds only if:

- authenticated source remains active;
- lead edit/save persists;
- stage movement passes or is explicitly skipped with reason;
- notes still work;
- no RLS error appears;
- no 401/403 appears;
- no silent fallback appears.

## Failure Criteria

Fail and rollback if:

- lead edit/save fails;
- update returns no row unexpectedly;
- RLS update error appears;
- source falls back to `Anon` or `LocalStorage`;
- lead disappears after update;
- stage movement fails unexpectedly;
- protected policies are missing;
- production instability appears.

## Recommendation

Recommendation:

```text
GO
```

Scope of GO:

- GO to create a controlled removal package for `Authenticated bridge update crm_leads`;
- not GO to remove it in this sprint;
- not GO to remove anon policies;
- not GO to alter organization-scoped policies.

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

Sprint 101B.26 - Authenticated Bridge Update Controlled Removal Package.

That sprint should create:

- operational document;
- apply SQL removing only `Authenticated bridge update crm_leads`;
- read-only validation SQL;
- rollback SQL recreating only `Authenticated bridge update crm_leads`;
- manual smoke test checklist focused on edit/save and stage movement.
