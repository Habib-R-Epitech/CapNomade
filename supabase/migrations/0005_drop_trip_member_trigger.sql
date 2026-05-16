-- =============================================================================
-- Fix: drop on_trip_created trigger — the AFTER INSERT trigger that auto-added
-- the owner as a trip_member was triggering an opaque RLS error on `trips`
-- (it actually failed on trip_members RLS, but Postgres re-reported it as
-- "violates row-level security policy for table trips").
--
-- Even though handle_new_trip() is SECURITY DEFINER owned by postgres (which
-- has BYPASSRLS), Supabase's PostgREST + AFTER INSERT trigger combo doesn't
-- effectively bypass RLS in this context. Empirically confirmed via the
-- /api/debug/auth probe: disabling the trigger makes the trip insert succeed.
--
-- New strategy: server actions insert trip_members explicitly right after
-- creating the trip. The trip_members INSERT policy already allows
-- self-insertion (`user_id = auth.uid()`), so no policy change is needed.
-- =============================================================================

drop trigger if exists on_trip_created on public.trips;
drop function if exists public.handle_new_trip();
