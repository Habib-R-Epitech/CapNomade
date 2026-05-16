-- =============================================================================
-- Cleanup: drop all debug functions created during the trips RLS investigation.
-- The route /api/debug/auth was also removed from the codebase.
--
-- Functions kept :
--   - public.app_uid()  → still used by RLS policies on profiles + trip_members
-- =============================================================================

drop function if exists public.debug_auth_uid();
drop function if exists public.debug_trip_policies();
drop function if exists public.debug_try_insert_trip();
drop function if exists public.debug_try_insert_trip_no_trigger();
drop function if exists public.debug_dump_env();
drop function if exists public.debug_trap_check(uuid);

notify pgrst, 'reload schema';
