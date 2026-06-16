-- EVOLV Sprint 99H.3C - Profiles Data API + RLS self-select apply.
-- Manual review only. Do not execute through Codex.
--
-- IMPORTANT:
-- - Data API for public.profiles must be enabled manually in the Supabase panel.
-- - This script only enables RLS and creates a minimal authenticated SELECT policy.
-- - This script does not alter data in public.profiles.
-- - This script does not create anon access.
-- - This script does not create INSERT/UPDATE/DELETE policies.

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles can read own profile'
  ) then
    create policy "Profiles can read own profile"
      on public.profiles
      for select
      to authenticated
      using (auth.uid() = id);
  end if;
end;
$$;
