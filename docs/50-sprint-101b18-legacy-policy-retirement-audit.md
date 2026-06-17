# Sprint 101B.18 — Legacy Policy Retirement Audit

## Objective

Audit whether the legacy `public.crm_leads` policies are candidates for future retirement after organization-scoped authenticated policies were added successfully.

This sprint is audit/documentation only.

No policy was removed. No SQL was executed. No production behavior was changed.

## Current Production State

Confirmed context:

- `public.evolv_current_organization_id()` exists and was validated.
- `public.evolv_current_role()` exists and was validated.
- `SECURITY DEFINER` behavior was validated.
- `search_path = public, pg_temp` was validated.
- Function grants were validated:
  - `authenticated = true`
  - `anon = false`
  - `public = false`
- Organization-scoped `crm_leads` policies were applied:
  - `crm_leads authenticated read same organization`
  - `crm_leads authenticated update same organization`
- Existing bridge policies were preserved.
- Existing anon policies were preserved.
- Manual runtime smoke test passed in dual authorization mode.

## Policies under Audit

Legacy policies:

1. `Allow public read crm_leads`
2. `Allow public update crm_leads`
3. `Authenticated bridge read crm_leads`
4. `Authenticated bridge update crm_leads`

Current dual authorization mode:

- legacy anon/public access still exists;
- authenticated bridge access still exists;
- organization-scoped authenticated access now exists.

## Code Paths Inspected

### CRM repository selector

File:

- `modules/crm/repositories/index.ts`

Findings:

- `NEXT_PUBLIC_USE_SUPABASE_CRM` controls whether Supabase CRM is used at all.
- If Supabase CRM is disabled or unavailable, CRM uses `LocalCrmRepository`.
- `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW` controls whether authenticated shadow is tried first.
- If authenticated shadow fails, the code falls back to anon Supabase.
- If anon Supabase fails, the code falls back to localStorage.

### Anon Supabase CRM repository

File:

- `modules/crm/repositories/supabase-crm-repository.ts`

Findings:

- client is created with `persistSession: false`;
- operations use publishable key without user session;
- `list`, `getById`, and `updateLead` all access `crm_leads`;
- this is the current standard Supabase CRM path when authenticated shadow is off.

Implication:

- anon `SELECT` and `UPDATE` policies are still operationally relevant if this path is active in production.

### Authenticated shadow CRM repository

File:

- `modules/crm/repositories/authenticated-supabase-crm-repository.ts`

Findings:

- client is created with `persistSession: true`;
- each operation requires a valid Supabase session;
- `list`, `getById`, and `updateLead` access `crm_leads`;
- this path can exercise organization-scoped authenticated policies.

Implication:

- authenticated bridge policies may become removable only after authenticated shadow becomes the proven/default CRM path.

### Supabase Auth

File:

- `modules/access/supabase-auth.ts`

Findings:

- `NEXT_PUBLIC_USE_SUPABASE_AUTH` enables Supabase Auth.
- login validates `profiles`;
- recovery and password update are separate from `crm_leads`.

Implication:

- Auth must remain stable, but Auth alone does not prove CRM no longer depends on anon `crm_leads`.

### Lead Notes server-side validation

File:

- `modules/crm/server/crm-lead-notes-service.ts`

Findings:

- uses Bearer token;
- validates user and profile;
- reads `crm_leads.id, organization_id` to validate lead ownership;
- then lists or creates notes.

Implication:

- Lead Notes already exercises authenticated organization validation against `crm_leads`, but only for the note workflow, not all CRM read/update paths.

### CRM source observability

Files:

- `components/crm/crm-source-indicator.tsx`
- `modules/crm/crm-source-observability.ts`

Findings:

- UI can show active source:
  - `Authenticated`
  - `Anon`
  - `LocalStorage`
- this indicator is important evidence before retirement.

## Feature Flags Inspected

| Flag | Purpose | Retirement relevance |
| --- | --- | --- |
| `NEXT_PUBLIC_USE_SUPABASE_CRM` | Enables Supabase CRM repository | If false, policies are not exercised by CRM runtime |
| `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW` | Tries authenticated CRM repository before anon | Must be proven before retiring authenticated bridges |
| `NEXT_PUBLIC_USE_SUPABASE_AUTH` | Enables Supabase Auth | Required for authenticated CRM and notes paths |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser/server public Supabase key | Used by both anon and authenticated client paths |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Fallback public key | Used in some helper paths if publishable key is absent |

## Dependency Analysis

## Does the current default runtime path use anon?

Yes, if:

- `NEXT_PUBLIC_USE_SUPABASE_CRM=true`; and
- `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW` is absent or `false`.

In that state, `SupabaseCrmRepository` uses a client with `persistSession: false`, so `crm_leads` read/update depends on anon-compatible policies.

## Does the current runtime use authenticated Supabase client?

Only when:

- `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=true`; and
- a valid Supabase Auth session exists.

If this path fails, code intentionally falls back to anon Supabase.

## Does the current CRM runtime use service role?

No service role CRM runtime path was found in the inspected files.

## Does the current CRM runtime use local fallback?

Yes. `LocalCrmRepository` remains fallback when Supabase CRM is disabled or Supabase calls fail.

## What would break if anon policies were removed now?

Likely breakage:

- default CRM list/load path if production still uses anon Supabase repository;
- lead detail fetch through default path;
- lead edit/save through default path;
- stage change through default update path;
- fallback from authenticated shadow to anon would fail.

Risk:

- high, unless production is first proven to run successfully with authenticated source as primary and anon disabled or unused.

## What would break if authenticated bridge policies were removed now?

Potential impact:

- authenticated shadow path would rely exclusively on organization-scoped policies;
- Lead Notes lead validation would continue to rely on organization-scoped authenticated access;
- if `organization_id` and functions are correct, this may work.

Remaining uncertainty:

- because bridge policies are still present, current runtime success does not prove organization-scoped policies are solely responsible for success.

Risk:

- medium, requiring targeted authenticated-only runtime evidence.

## Can read and update be retired independently?

Yes.

Recommended split:

1. read policies first;
2. update policies later.

Reason:

- read failure is easier to detect and less likely to mutate data;
- update failure affects editing, stage change, and lead save workflows;
- separate retirement limits blast radius.

## Should anon and bridge policies be retired in separate sprints?

Yes.

Recommended:

- retire anon policies only after authenticated CRM is default and proven;
- retire authenticated bridge policies separately after authenticated organization-scoped access is proven without bridge support.

Do not mix anon retirement and authenticated bridge retirement in the same execution sprint.

## Retirement Risk Matrix

| Legacy policy | Classification | Reason |
| --- | --- | --- |
| `Allow public read crm_leads` | keep for now | Current standard Supabase CRM path may still read as anon when authenticated shadow is off. |
| `Allow public update crm_leads` | keep for now | Current standard Supabase CRM update path may still update as anon when authenticated shadow is off. |
| `Authenticated bridge read crm_leads` | needs more runtime evidence | Candidate later, but current success is masked by bridge coexistence. Need authenticated-only read proof. |
| `Authenticated bridge update crm_leads` | needs more runtime evidence | Candidate later, but update path must be proven under organization-scoped policy alone. |

## Recommended Retirement Order

### Phase 1 — Evidence only

- confirm production source indicator over normal CRM usage;
- confirm whether source is `Anon` or `Authenticated`;
- capture evidence for list, detail, edit/save, stage move and notes.

### Phase 2 — Make authenticated CRM primary in a controlled runtime test

- enable authenticated shadow in a supervised environment/window;
- verify source indicator shows `Authenticated`;
- verify list/get/update paths;
- verify notes.

### Phase 3 — Controlled removal of authenticated bridge read

- remove only `Authenticated bridge read crm_leads`;
- keep anon policies;
- keep authenticated update bridge;
- validate read-only CRM journeys.

### Phase 4 — Controlled removal of authenticated bridge update

- remove only `Authenticated bridge update crm_leads`;
- validate edit/save and stage movement.

### Phase 5 — Plan anon retirement

- only after authenticated CRM becomes default and no runtime path depends on anon;
- remove anon read first;
- remove anon update later.

## Required Evidence before Removal

Before removing any legacy policy:

- source indicator evidence;
- Supabase Auth login evidence;
- CRM load evidence;
- lead detail evidence;
- lead edit/save evidence;
- stage move evidence, if present;
- Lead Notes create/list evidence;
- `crm_leads` count before/after;
- validation SQL confirming target policy state;
- rollback SQL prepared and reviewed.

Before removing anon policies specifically:

- prove default CRM path no longer uses `SupabaseCrmRepository` anon client;
- prove fallback to anon is not required for production operation;
- prove authenticated path handles list/get/update reliably.

Before removing authenticated bridge policies specifically:

- prove organization-scoped authenticated policies work without being masked by bridge policies;
- ideally test one bridge removal at a time.

## Future Rollback Strategy

Rollback for future removal sprint must recreate only the policy removed in that sprint.

Suggested rule:

- one removed policy per sprint;
- one rollback SQL per removed policy;
- validate immediately after rollback;
- do not alter data during rollback.

Rollback must not alter:

- `profiles`;
- Auth;
- Recovery;
- Lead Notes;
- `crm_leads` data;
- organization functions.

## Explicit Non-Execution Statement

This sprint did not:

- execute SQL;
- remove policies;
- alter policies;
- create policies;
- alter tables;
- alter Auth;
- alter `profiles`;
- alter `crm_leads` data;
- modify runtime behavior;
- implement retirement.

## Conclusion

The anon policies are **not ready for retirement** while the current standard CRM repository path can still operate as anon.

The authenticated bridge policies are **possible future candidates**, but require more targeted evidence proving that authenticated organization-scoped access works without bridge support.

Recommended next step:

- collect source-indicator evidence and run an authenticated-primary runtime validation before any policy retirement sprint.
