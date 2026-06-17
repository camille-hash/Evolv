-- Sprint 101B.11
-- Context functions rollback
-- Manual execution only. Codex must not execute this file.
--
-- Scope:
-- - Remove only the functions introduced by Sprint 101B.11
--
-- Explicitly out of scope:
-- - No table changes
-- - No policy changes
-- - No data changes
-- - No grants on tables

drop function if exists public.evolv_current_organization_id();
drop function if exists public.evolv_current_role();
