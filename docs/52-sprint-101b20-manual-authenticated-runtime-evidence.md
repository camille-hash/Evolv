# Sprint 101B.20 — Manual Authenticated Runtime Evidence Collection

## Objective

Define the manual evidence collection checklist required to prove that EVOLV CRM runs correctly with the authenticated Supabase CRM repository as the active runtime source.

This sprint is documentation-only. It does not retire policies, execute SQL, alter RLS, change database objects, or change runtime behavior.

## Current Context

Production status:

- organization-scoped `crm_leads` policies are active:
  - `crm_leads authenticated read same organization`
  - `crm_leads authenticated update same organization`
- bridge policies are still active;
- anon policies are still active;
- no legacy policy retirement has been approved.

Sprint 101B.19 concluded:

- no new feature flag is needed;
- authenticated primary CRM runtime can be activated through existing flags;
- expected UI indicator is `CRM Source: Authenticated`;
- rollback is done by setting `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=false`.

## Required Environment Flags

Required for the evidence window:

```text
NEXT_PUBLIC_USE_SUPABASE_AUTH=true
NEXT_PUBLIC_USE_SUPABASE_CRM=true
NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=true
```

Required Supabase public configuration:

```text
NEXT_PUBLIC_SUPABASE_URL=<configured>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<configured>
```

Do not capture or share secret values. Screenshots of environment configuration must hide values and show only variable names and boolean states where safe.

## Expected CRM Source

Expected runtime indicator:

```text
CRM Source: Authenticated
```

This indicator is the primary runtime evidence that the authenticated CRM repository is being used as the first successful source.

## Manual Smoke Test Sequence

## 1. Prepare Environment

Steps:

1. deploy or run EVOLV with the required flags;
2. confirm no policy, RLS, schema, or data changes are being made in this sprint;
3. confirm rollback flag value is known:

```text
NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=false
```

Evidence to collect:

- safe screenshot or written note confirming required flags are enabled;
- no secret values exposed.

## 2. Login

Steps:

1. open EVOLV;
2. login with a valid Supabase Auth user;
3. confirm the app loads normally.

Expected result:

- login succeeds;
- profile validation succeeds;
- CRM is reachable.

Failure signals:

- login loop;
- profile access error;
- `Nao foi possivel concluir seu acesso`;
- session disappears after refresh.

## 3. Confirm CRM Source

Steps:

1. open CRM;
2. wait for lead loading;
3. inspect the technical source indicator.

Expected result:

```text
CRM Source: Authenticated
```

Evidence to collect:

- screenshot of the source indicator.

Failure signals:

- `CRM Source: Anon`;
- `CRM Source: LocalStorage`;
- `CRM Source: Detectando` does not resolve;
- source changes after refresh without explanation.

## 4. CRM Load and Lead List Rendering

Steps:

1. confirm CRM loads;
2. confirm leads render in pipeline/list views;
3. confirm no unexpected empty state appears.

Expected result:

- leads are visible;
- pipeline/list rendering is normal;
- source remains `Authenticated`.

Evidence to collect:

- screenshot of CRM loaded with leads;
- note of source label after load.

Failure signals:

- empty list after login;
- 401/403 network response;
- RLS policy violation;
- fallback to anon/localStorage.

## 5. Lead Detail / Dossier Opening

Steps:

1. open a lead detail/dossier;
2. verify lead fields render;
3. verify commercial actions remain available as before.

Expected result:

- dossier opens normally;
- no access error;
- source remains `Authenticated`.

Evidence to collect:

- screenshot of lead detail opened, with sensitive data minimized if needed.

Failure signals:

- lead detail not found;
- permission error;
- source fallback after opening detail.

## 6. Lead Edit and Save

Steps:

1. edit a harmless lead field;
2. save;
3. reopen or refresh the lead;
4. confirm the value persisted.

Recommended harmless fields:

- temporary note-like text in existing observation field, if acceptable;
- next action text, if operationally safe;
- a test suffix that can be reverted immediately by the operator.

Expected result:

- save succeeds;
- success feedback appears;
- value persists;
- source remains `Authenticated`.

Evidence to collect:

- screenshot or written note confirming edit/save persisted.

Failure signals:

- save silently fails;
- value reverts after refresh;
- RLS violation;
- update returns no row;
- fallback to anon/localStorage.

## 7. Stage Movement, If Present

Steps:

1. move a lead between stages only if operationally acceptable;
2. confirm visual move;
3. refresh or reopen CRM;
4. confirm persistence.

Expected result:

- move succeeds;
- lead remains visible;
- source remains `Authenticated`.

Evidence to collect:

- note confirming stage move persisted, or note explaining why this test was skipped.

Failure signals:

- lead disappears;
- move fails;
- source fallback;
- RLS/update error.

## 8. Lead Notes List/Create

Steps:

1. open lead notes/history area;
2. confirm existing notes list if present;
3. create a harmless test note if acceptable;
4. confirm note appears.

Expected result:

- notes list works;
- note creation works;
- no organization mismatch;
- source remains `Authenticated` for CRM operations.

Evidence to collect:

- screenshot or written note confirming notes list/create works.

Failure signals:

- notes fail with 401/403;
- organization mismatch;
- session unavailable;
- note creation fails while CRM source is authenticated.

## 9. Logout and Login Again

Steps:

1. logout;
2. login again with the same authenticated user;
3. open CRM;
4. confirm source indicator again.

Expected result:

```text
CRM Source: Authenticated
```

Evidence to collect:

- note confirming source remains authenticated after logout/login.

Failure signals:

- source changes to anon/localStorage;
- CRM empty after relogin;
- profile/session failure.

## Evidence Checklist

Collect:

- safe screenshot or note confirming required flags;
- screenshot of `CRM Source: Authenticated`;
- screenshot of CRM loaded with leads;
- screenshot or note confirming lead detail opened;
- screenshot or note confirming edit/save persisted;
- screenshot or note confirming notes list/create works;
- note confirming logout/login still returns to authenticated source;
- note of any skipped test with reason.

Do not collect:

- tokens;
- secrets;
- full environment values;
- sensitive customer data beyond what is necessary for evidence.

## Pass Criteria

Pass only if:

- source indicator shows `CRM Source: Authenticated`;
- login works;
- CRM loads;
- leads render;
- lead detail opens;
- lead edit/save persists;
- stage move passes or is explicitly skipped with reason;
- notes list/create passes if tested;
- logout/login returns to authenticated source;
- no unexpected fallback occurs.

## Fail Criteria

Fail if:

- source is not `Authenticated`;
- source falls back to `Anon` or `LocalStorage`;
- CRM list is empty unexpectedly;
- 401/403 responses occur;
- RLS policy violation occurs;
- save silently fails;
- notes fail with organization mismatch;
- source changes after reload/logout/login;
- any critical flow requires the anon path.

## Rollback

Rollback is configuration-only:

```text
NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW=false
```

After rollback:

1. redeploy or restart if required by the hosting/runtime environment;
2. open CRM;
3. confirm CRM returns to the prior source;
4. confirm CRM load/list/detail still works.

Rollback must not remove policies, alter RLS, alter data, or change database schema.

## What This Sprint Does Not Authorize

This sprint does not authorize:

- legacy policy retirement;
- bridge policy removal;
- anon policy removal;
- SQL execution;
- RLS changes;
- database changes;
- irreversible runtime changes.

## Recommended Next Sprint

If the manual evidence passes, the next sprint should be a narrow retirement design for authenticated bridge policies only.

Do not retire anon policies yet unless separate evidence proves the standard CRM runtime no longer depends on anon access.
