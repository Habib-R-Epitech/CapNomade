-- =============================================================================
-- Fix attempt #2: the (select auth.uid()) workaround isn't enough — Postgres
-- still inlines it in this context. PL/pgSQL functions however are NEVER
-- inlined (proven empirically via the 0006 trap which returned match=t).
--
-- This migration:
--  1. Creates public.app_uid() — a PL/pgSQL wrapper around auth.uid()
--  2. Rewrites all RLS policies that compared against auth.uid() directly
--     to use app_uid() instead.
-- =============================================================================

create or replace function public.app_uid() returns uuid
language plpgsql stable security invoker
as $$
begin
  return auth.uid();
end;
$$;

grant execute on function public.app_uid() to anon, authenticated;

-- trips
drop policy if exists "trips_owner_insert" on public.trips;
create policy "trips_owner_insert" on public.trips
  for insert with check (owner_id = public.app_uid());

-- profiles
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (id = public.app_uid());

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert with check (id = public.app_uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (id = public.app_uid()) with check (id = public.app_uid());

-- trip_members
drop policy if exists "members_read_co_members" on public.trip_members;
create policy "members_read_co_members" on public.trip_members
  for select using (user_id = public.app_uid() OR public.is_trip_member(trip_id));

drop policy if exists "members_owner_insert" on public.trip_members;
create policy "members_owner_insert" on public.trip_members
  for insert with check (public.is_trip_owner(trip_id) OR user_id = public.app_uid());

drop policy if exists "members_owner_or_self_delete" on public.trip_members;
create policy "members_owner_or_self_delete" on public.trip_members
  for delete using (public.is_trip_owner(trip_id) OR user_id = public.app_uid());

-- Clean up the trap remnant if it's still hanging around
drop function if exists public.debug_trap_check(uuid);
