-- EVOLV Sprint 99H.3C - Profiles Data API + RLS self-select rollback.
-- Manual review only. Do not execute through Codex.
--
-- CAUTION:
-- - Use this rollback only if the Sprint 99H.3C policy must be removed.
-- - Disabling RLS should be re-evaluated carefully if other flows start depending on it.
-- - This rollback does not alter profile data, auth.users, CRM or notes.
-- - Data API enablement in the Supabase panel must be reverted manually if needed.

drop policy if exists "Profiles can read own profile"
  on public.profiles;

alter table public.profiles disable row level security;
