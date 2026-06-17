# Sprint 101B.19 — Authenticated CRM Primary Runtime Evidence

## Objective

Produce a runtime evidence plan to prove that EVOLV CRM can run with the authenticated Supabase CRM repository as the primary runtime path.

This sprint is evidence/instrumentation only. No SQL is executed, no policies are changed, and no production data is modified.

## Current Context

Production already has:

- organization-scoped `crm_leads` policies:
  - `crm_leads authenticated read same organization`
  - `crm_leads authenticated update same organization`
- bridge policies still active;
- anon policies still active;
- runtime smoke test passed in dual authorization mode;
- no legacy policy retirement approved.

Sprint 101B.18 concluded:

- anon policies must be kept for now because the standard runtime may still use `SupabaseCrmRepository` with `persistSession: false`;
- authenticated bridge policies need more runtime evidence before retirement.

## Repository Selection Logic Inspected

File:

- `modules/crm/repositories/index.ts`

Current behavior:

1. If `NEXT_PUBLIC_USE_SUPABASE_CRM !== "true"`, CRM uses `LocalCrmRepository`.
2. If `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW === "true"`, CRM tries `AuthenticatedSupabaseCrmRepository` first.
3. If authenticated repository succeeds, source is recorded as `authenticated`.
4. If authenticated repository fails, CRM falls back to `SupabaseCrmRepository` anon path.
5. If anon path fails, CRM falls back to localStorage.

Conclusion:

- authenticated CRM can already be promoted to first runtime attempt through the existing flag;
- no new feature flag is needed;
- rollback remains simple by turning the flag off.

## Feature Flags

| Flag | Role | Required value for authenticated primary evidence |
| --- | --- | --- |
| `NEXT_PUBLIC_USE_SUPABASE_AUTH` | Enables Supabase Auth login/session | `true` |
| `NEXT_PUBLIC_USE_SUPABASE_CRM` | Enables Supabase CRM repository path | `true` |
| `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW` | Tries authenticated CRM repository before anon | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | configured |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase key used by browser clients | configured |

## Was a New Flag Needed?

No.

The existing `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW` flag is sufficient for this evidence sprint because it:

- promotes the authenticated repository to the first attempted CRM path;
- preserves fallback to anon;
- preserves fallback to localStorage;
- can be rolled back by setting the flag back to `false`.

## Active CRM Source Indicator

Files:

- `components/crm/crm-source-indicator.tsx`
- `modules/crm/crm-source-observability.ts`

The UI already displays:

- `CRM Source: Authenticated`
- `CRM Source: Anon`
- `CRM Source: LocalStorage`
- `CRM Source: Detectando`

For this sprint, the required evidence is:

```text
CRM Source: Authenticated
```

That label means `AuthenticatedSupabaseCrmRepository` completed successfully for the current operation.

## Runtime Paths under Evidence

### Authenticated primary path

File:

- `modules/crm/repositories/authenticated-supabase-crm-repository.ts`

Behavior:

- uses Supabase client with `persistSession: true`;
- requires `supabase.auth.getSession()`;
- reads and updates `crm_leads` as authenticated user;
- exercises organization-scoped authenticated policies.

### Anon fallback path

File:

- `modules/crm/repositories/supabase-crm-repository.ts`

Behavior:

- uses Supabase client with `persistSession: false`;
- remains available if authenticated path fails;
- depends on anon-compatible policies while those policies exist.

### Local fallback path

File:

- `modules/crm/repositories/local-crm-repository.ts`

Behavior:

- remains available if Supabase CRM is disabled or Supabase paths fail.

## Manual Smoke Test Checklist

Before test:

- set `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`;
- set `NEXT_PUBLIC_USE_SUPABASE_CRM=true`;
- set `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=true`;
- confirm `NEXT_PUBLIC_SUPABASE_URL` is configured;
- confirm `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is configured.

### 1. Login

Steps:

- open EVOLV;
- login with Supabase Auth user;
- confirm app opens normally.

Expected:

- login succeeds;
- profile loads;
- no access error.

### 2. CRM load

Steps:

- open CRM;
- wait for lead load.

Expected:

- leads render;
- `CRM Source: Authenticated` appears.

### 3. List rendering

Steps:

- inspect pipeline columns;
- inspect base/list view if available.

Expected:

- leads appear in expected lists;
- no unexpected zero state;
- source remains `Authenticated`.

### 4. Lead detail opening

Steps:

- open a lead dossier.

Expected:

- detail opens;
- lead fields render;
- no 401/403/RLS error.

### 5. Lead edit/save

Steps:

- edit a safe non-critical field;
- save lead.

Expected:

- save succeeds;
- success feedback appears;
- source remains `Authenticated`;
- value persists after reopening.

### 6. Stage move

Steps:

- move a lead between stages if available in the current workflow.

Expected:

- move succeeds;
- lead remains visible;
- no RLS policy violation;
- source remains `Authenticated`.

### 7. Notes list/create

Steps:

- open lead notes/history area;
- list existing notes;
- create a small internal note.

Expected:

- notes load;
- note creation succeeds;
- no organization mismatch error.

### 8. Logout/login again

Steps:

- logout;
- login again;
- reopen CRM.

Expected:

- session restores normally;
- CRM loads;
- source returns to `Authenticated`.

## Failure Signals

Treat any of these as failure:

- empty CRM after successful login;
- `CRM Source: Anon` when authenticated source is expected;
- `CRM Source: LocalStorage` when Supabase source is expected;
- 401/403 errors;
- RLS policy violation;
- save silently failing;
- lead disappears after save or stage move;
- notes fail due to organization mismatch;
- notes fail due to missing session;
- source label never reaches `Authenticated`.

## Rollback

Rollback does not require code changes.

Set:

```text
NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=false
```

This returns CRM to the existing standard Supabase CRM path while preserving:

- anon fallback;
- local fallback;
- all existing policies.

## Evidence Required before Future Bridge Retirement

Before any authenticated bridge policy retirement sprint:

- screenshots or notes showing `CRM Source: Authenticated`;
- successful login;
- successful CRM load;
- successful list rendering;
- successful lead detail opening;
- successful lead edit/save;
- successful stage move if present;
- successful notes list/create;
- successful logout/login again;
- no unexpected fallback to anon/localStorage.

## What This Sprint Does Not Authorize

This sprint does not authorize:

- SQL execution;
- policy removal;
- bridge policy removal;
- anon policy removal;
- RLS changes;
- production data changes;
- irreversible authenticated runtime change;
- claiming bridge policies are removable.

## Conclusion

The existing flag `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=true` is sufficient to run authenticated CRM as the first attempted runtime path while preserving rollback and fallbacks.

The next step is not policy retirement. The next step is to collect runtime evidence with `CRM Source: Authenticated` across the full CRM smoke test matrix.
