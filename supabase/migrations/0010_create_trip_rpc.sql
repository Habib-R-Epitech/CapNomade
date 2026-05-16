-- =============================================================================
-- Workaround: SECURITY DEFINER RPC for trip creation.
--
-- We've exhausted the "fix the policy" approach. PL/pgSQL wrappers, (select …),
-- direct auth.uid() — all fail the WITH CHECK clause despite empirical proof
-- (the 0006 trap) that the comparison evaluates to TRUE inside PL/pgSQL.
--
-- This RPC runs as `postgres` (BYPASSRLS) and self-validates that the caller
-- is the owner being inserted. So the security guarantee is preserved:
--  - the function checks auth.uid() = owner_id internally before inserting
--  - external roles can call the function (grant execute) but can't pick a
--    different owner
-- =============================================================================

create or replace function public.create_trip_secure(
  p_title text,
  p_slug text,
  p_description text,
  p_status trip_status,
  p_visibility trip_visibility,
  p_start_date date,
  p_end_date date,
  p_primary_countries text[],
  p_base_currency char(3),
  p_total_budget_cents bigint
) returns table (id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trip_id uuid;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  insert into public.trips (
    owner_id, title, slug, description, status, visibility,
    start_date, end_date, primary_countries, base_currency, total_budget_cents
  )
  values (
    v_uid, p_title, p_slug, p_description, p_status, p_visibility,
    p_start_date, p_end_date, p_primary_countries, p_base_currency, p_total_budget_cents
  )
  returning trips.id, trips.slug into v_trip_id, v_slug;

  -- also self-add as owner member
  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, v_uid, 'owner')
  on conflict do nothing;

  return query select v_trip_id, v_slug;
end;
$$;

grant execute on function public.create_trip_secure(text, text, text, trip_status, trip_visibility, date, date, text[], char, bigint) to authenticated;

notify pgrst, 'reload schema';
