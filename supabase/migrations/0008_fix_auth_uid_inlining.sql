-- =============================================================================
-- Fix: wrap auth.uid() in a (select …) sub-query to prevent SQL function
-- inlining.
--
-- The trap from 0006 proved that auth.uid() returns the correct UUID inside
-- a PL/pgSQL function called from WITH CHECK, but the inlined expression
-- `owner_id = auth.uid()` doesn't behave the same way. This is a known
-- Supabase / PostgREST pattern — wrapping in `(select auth.uid())` forces
-- an InitPlan evaluation that always reads the JWT claims correctly.
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#use-security-definer-functions
-- (the same docs recommend `(select auth.uid())` for performance + correctness).
--
-- Apply this AFTER restoring the policy via 0007.
-- =============================================================================

drop policy if exists "trips_owner_insert" on public.trips;
create policy "trips_owner_insert" on public.trips
  for insert
  with check (owner_id = (select auth.uid()));

-- While we're at it, fix every other policy that compares against auth.uid()
-- directly in an inlined position. We only touch the comparisons; helper
-- function calls (is_trip_owner, is_trip_member, etc.) stay as-is because
-- they're already calls (not inlined).

-- profiles
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (id = (select auth.uid()));

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert with check (id = (select auth.uid()));

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- trip_members
drop policy if exists "members_read_co_members" on public.trip_members;
create policy "members_read_co_members" on public.trip_members
  for select using (
    user_id = (select auth.uid()) OR public.is_trip_member(trip_id)
  );

drop policy if exists "members_owner_insert" on public.trip_members;
create policy "members_owner_insert" on public.trip_members
  for insert with check (
    public.is_trip_owner(trip_id) OR user_id = (select auth.uid())
  );

drop policy if exists "members_owner_or_self_delete" on public.trip_members;
create policy "members_owner_or_self_delete" on public.trip_members
  for delete using (public.is_trip_owner(trip_id) OR user_id = (select auth.uid()));
