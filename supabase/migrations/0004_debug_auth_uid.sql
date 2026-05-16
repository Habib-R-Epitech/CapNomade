-- TEMPORARY: helpers to investigate the trips RLS issue.
-- Drop this migration once the issue is fixed.

create or replace function public.debug_auth_uid()
  returns table (auth_uid uuid)
  language sql
  security invoker
  stable
as $$
  select auth.uid();
$$;
grant execute on function public.debug_auth_uid() to anon, authenticated;

-- Returns the WITH CHECK / USING expression of every policy attached to trips,
-- so we can confirm the migration actually applied what we think it did.
create or replace function public.debug_trip_policies()
  returns table (
    policy_name name,
    command text,
    using_expr text,
    with_check_expr text
  )
  language sql
  security invoker
  stable
as $$
  select
    p.polname,
    case p.polcmd
      when 'r' then 'SELECT'
      when 'a' then 'INSERT'
      when 'w' then 'UPDATE'
      when 'd' then 'DELETE'
      when '*' then 'ALL'
    end as command,
    pg_get_expr(p.polqual, p.polrelid)        as using_expr,
    pg_get_expr(p.polwithcheck, p.polrelid)   as with_check_expr
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  where c.relname = 'trips' and c.relnamespace = 'public'::regnamespace;
$$;
grant execute on function public.debug_trip_policies() to anon, authenticated;

-- Performs the insert *server-side*, so we know auth.uid() inside the
-- function and at the policy evaluation are guaranteed identical. Useful
-- to isolate whether the bug is at the PostgREST request boundary or
-- somewhere else.
create or replace function public.debug_try_insert_trip()
  returns jsonb
  language plpgsql
  security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_trip_id uuid;
begin
  insert into public.trips (owner_id, title, slug, status, visibility)
  values (v_uid, 'debug rpc probe', 'debug-rpc-' || gen_random_uuid()::text, 'draft', 'private')
  returning id into v_trip_id;
  delete from public.trips where id = v_trip_id;
  return jsonb_build_object('ok', true, 'auth_uid', v_uid);
exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'auth_uid', v_uid,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
end;
$$;
grant execute on function public.debug_try_insert_trip() to anon, authenticated;
