# Sprint 101B.17 — Runtime Validation after Organization-Scoped CRM Leads Policies

## Objective

Validate that the EVOLV application continues to work after adding the two organization-scoped `crm_leads` policies:

- `crm_leads authenticated read same organization`
- `crm_leads authenticated update same organization`

This sprint is validation and documentation only. It does not remove legacy policies, does not alter production, and does not claim that bridge policies are ready to retire.

## Production State before Validation

Confirmed production state:

- `public.evolv_current_organization_id()` exists and was validated.
- `public.evolv_current_role()` exists and was validated.
- Both functions use validated `SECURITY DEFINER` behavior.
- `search_path = public, pg_temp` was validated.
- Function grants were validated:
  - `authenticated = true`
  - `anon = false`
  - `public = false`
- The Sprint 101B.15 organization-scoped policies were applied.
- Existing bridge policies were preserved.
- Existing anon policies were not touched.

`public.crm_leads` is now in dual authorization mode:

- legacy/bridge authorization still exists;
- new organization-scoped authorization exists in parallel.

## Policies Currently Active

Expected active policies for `public.crm_leads`:

| Policy | Role | Command | Qual | With check |
| --- | --- | --- | --- | --- |
| `Allow public read crm_leads` | `anon` | `SELECT` | `true` | n/a |
| `Allow public update crm_leads` | `anon` | `UPDATE` | `true` | `true` |
| `Authenticated bridge read crm_leads` | `authenticated` | `SELECT` | `true` | n/a |
| `Authenticated bridge update crm_leads` | `authenticated` | `UPDATE` | `true` | `true` |
| `crm_leads authenticated read same organization` | `authenticated` | `SELECT` | `organization_id = public.evolv_current_organization_id()` | n/a |
| `crm_leads authenticated update same organization` | `authenticated` | `UPDATE` | `organization_id = public.evolv_current_organization_id()` | `organization_id = public.evolv_current_organization_id()` |

## Application Code Paths Inspected

### Repository selection

File:

- `modules/crm/repositories/index.ts`

Relevant behavior:

- if `NEXT_PUBLIC_USE_SUPABASE_CRM !== "true"`, CRM uses `localStorage`;
- if `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW === "true"`, CRM tries `AuthenticatedSupabaseCrmRepository` first;
- if authenticated shadow fails, CRM falls back to `SupabaseCrmRepository`;
- if Supabase fallback fails, CRM falls back to `localStorage`;
- repository source observability records `authenticated`, `anon`, or `localStorage`.

### Anonymous/public Supabase CRM repository

File:

- `modules/crm/repositories/supabase-crm-repository.ts`

Relevant behavior:

- creates Supabase client with `persistSession: false`;
- reads `crm_leads` through `.select(...)`;
- reads lead detail through `.eq("id", id).maybeSingle()`;
- updates lead through `.update(...).eq("id", id).select(...).maybeSingle()`;
- falls back to `external_id` update when needed.

Policy impact:

- currently protected by existing anon policies and bridge/public access;
- not proving organization-scoped policies yet while anon policies remain active.

### Authenticated shadow CRM repository

File:

- `modules/crm/repositories/authenticated-supabase-crm-repository.ts`

Relevant behavior:

- creates Supabase client with `persistSession: true`;
- requires `supabase.auth.getSession()` with access token before list/get/update;
- reads `crm_leads` as authenticated user;
- updates `crm_leads` as authenticated user.

Policy impact:

- directly exercises the new organization-scoped authenticated policies;
- still has authenticated bridge policies available, so runtime success alone does not prove bridges are removable.

### Supabase Auth profile validation

File:

- `modules/access/supabase-auth.ts`

Relevant behavior:

- `NEXT_PUBLIC_USE_SUPABASE_AUTH === "true"` enables Supabase Auth;
- login uses `signInWithPassword`;
- access validation reads `profiles`;
- recovery flow uses Supabase session hydration and password update.

Policy impact:

- not directly affected by `crm_leads` RLS;
- must remain stable during runtime validation.

### Lead notes server-side workflow

File:

- `modules/crm/server/crm-lead-notes-service.ts`

Relevant behavior:

- receives Bearer token from UI;
- validates Supabase user;
- loads profile;
- validates lead ownership by reading `crm_leads.id, organization_id`;
- then lists or creates `crm_lead_notes`.

Policy impact:

- lead note creation/listing indirectly depends on authenticated read access to `crm_leads`;
- this is a meaningful runtime check for organization-scoped `crm_leads` read behavior.

### Lead detail note token source

File:

- `components/crm/crm-lead-detail.tsx`

Relevant behavior:

- reads Supabase session with `supabase.auth.getSession()`;
- sends `Authorization: Bearer <access_token>` to `/api/crm/lead-notes`;
- note creation depends on a valid Supabase Auth session.

Policy impact:

- note creation is part of the lead detail workflow and should be included in runtime smoke tests.

## Which Code Paths Are Affected by the New Policies

Directly affected:

- authenticated shadow list/get/update in `AuthenticatedSupabaseCrmRepository`;
- server-side lead ownership validation in `crm-lead-notes-service.ts`.

Indirectly affected:

- lead detail note loading and creation, because they depend on server-side lead validation;
- stage change, because it uses the same `updateCrmLeadInRepository` update path.

Not meaningfully proving the new policies while bridges remain:

- anon/public `SupabaseCrmRepository`, because anon policies still exist;
- localStorage fallback, because it bypasses Supabase RLS entirely.

## Minimum Runtime Smoke Test Matrix

| Area | Test | Expected result | Failure signals |
| --- | --- | --- | --- |
| Login | Login with Supabase Auth user | User enters app and profile loads | profile access error, login loop, session missing |
| Logout | Logout and return to login | Session ends cleanly | stale session, app remains authenticated |
| Recovery | Open recovery flow | Recovery remains available | reset screen broken, session hydration failure |
| CRM load | Open CRM | Leads render and source indicator appears | empty list unexpectedly, RLS error, fallback not expected |
| Pipeline/list | View pipeline columns and base list | Leads appear in expected columns/lists | missing leads, zero counts, console RLS errors |
| Lead detail | Open a lead dossier | Dossier opens with existing fields | 404, empty detail, permission error |
| Lead edit | Change a safe non-critical field | Save succeeds and feedback appears | update denied, fallback unexpected, stale UI |
| Lead save | Refresh/reopen lead after save | Saved value remains | update not persisted, count changed unexpectedly |
| Stage change | Move lead between stages if present | Lead moves and success feedback appears | RLS/update error, lead disappears, wrong stage |
| Lead notes list | Open history/notes area | Existing notes load if present | notes API 401/403/500 |
| Lead notes create | Create a small internal note | Note appears in timeline | API error, lead validation failure, session unavailable |
| Counts | Compare `crm_leads` count before/after | Count remains unchanged | divergence, unexpected delete/update side effect |

## Expected Results

The application should:

- continue allowing login/logout/recovery;
- load CRM leads normally;
- open lead detail normally;
- save lead edits normally;
- move stages through the same update path, when tested;
- create and show notes normally;
- preserve `crm_leads` count;
- show no unexpected RLS or policy errors.

## Failure Signals

Treat any of these as a validation failure:

- `permission denied`;
- `new row violates row-level security policy`;
- Supabase `PGRST` errors related to `crm_leads`;
- notes API returning 401/403/500 during valid authenticated session;
- CRM silently falling back to localStorage when Supabase path should work;
- authenticated shadow failure when `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=true`;
- lead disappears after edit or stage move;
- `crm_leads` count diverges.

## Readiness for Later Legacy Policy Retirement Audit

This sprint does not prove legacy policies are removable.

It can only prove:

- the app remains operational in dual authorization mode;
- organization-scoped policies can coexist with legacy policies;
- runtime journeys are stable after policy addition.

A later retirement audit must separately test behavior after disabling/removing:

- `Allow public read crm_leads`;
- `Allow public update crm_leads`;
- `Authenticated bridge read crm_leads`;
- `Authenticated bridge update crm_leads`.

## Rollback Guidance

Do not perform rollback as part of this sprint.

If runtime validation fails during a supervised window, rollback should remove only the two organization-scoped policies added by Sprint 101B.15:

- `crm_leads authenticated read same organization`;
- `crm_leads authenticated update same organization`.

Rollback must not alter:

- bridge policies;
- anon policies;
- `profiles`;
- Auth;
- Recovery;
- Lead Notes;
- `crm_leads` data.

## Do Not Execute Destructive Changes

This validation package does not authorize:

- SQL execution by Codex;
- policy removal;
- bridge policy removal;
- anon policy removal;
- table alteration;
- data mutation;
- production changes.

## Conclusion

The key runtime proof points are:

1. CRM still works in the default current path.
2. Notes still work because they validate lead organization through `crm_leads`.
3. Authenticated shadow, when enabled for a controlled test, exercises the new organization-scoped authenticated policies more directly.

The system is not yet ready to retire legacy policies solely based on this sprint. It is ready for a later, separate legacy policy retirement audit only after the runtime matrix passes and evidence is recorded.
