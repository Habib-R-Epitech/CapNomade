-- =============================================================================
-- Revert the debug trap from 0006: restore the real trips_owner_insert policy.
-- Run this AFTER reading the trap's error message.
-- =============================================================================

drop policy if exists "trips_owner_insert" on public.trips;
create policy "trips_owner_insert" on public.trips
  for insert
  with check (owner_id = auth.uid());

drop function if exists public.debug_trap_check(uuid);
