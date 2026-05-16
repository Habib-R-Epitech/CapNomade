-- =============================================================================
-- TEMPORARY DEBUG: replace the trips_owner_insert policy with a function that
-- RAISES with auth.uid()'s value at WITH CHECK evaluation time. Lets us see
-- whether auth.uid() returns NULL or the right UUID inside the RLS check.
--
-- Every insert into trips will fail with a custom error message containing
-- the values. Apply ONLY to debug, then run 0007 to restore.
-- =============================================================================

create or replace function public.debug_trap_check(p_owner uuid) returns boolean
language plpgsql stable
as $$
declare
  v_uid uuid := auth.uid();
  v_claims_present boolean := current_setting('request.jwt.claims', true) is not null
                              and current_setting('request.jwt.claims', true) <> '';
  v_claim_sub_present boolean := current_setting('request.jwt.claim.sub', true) is not null
                                 and current_setting('request.jwt.claim.sub', true) <> '';
  v_role text := current_setting('role', true);
  v_session_user text := session_user;
  v_current_user text := current_user;
begin
  raise exception
    'TRAP: auth_uid=% owner_id=% match=% claims_present=% claim_sub_present=% role=% session_user=% current_user=%',
    v_uid, p_owner, (p_owner = v_uid),
    v_claims_present, v_claim_sub_present,
    v_role, v_session_user, v_current_user;
end;
$$;

grant execute on function public.debug_trap_check(uuid) to anon, authenticated;

drop policy if exists "trips_owner_insert" on public.trips;
create policy "trips_owner_insert" on public.trips
  for insert
  with check (public.debug_trap_check(owner_id));
