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

-- Same as above but ALSO disables the AFTER INSERT trigger before trying.
-- If this version succeeds, the trigger is the actual culprit.
-- Note: only the trigger OWNER (typically postgres) can disable it, so this
-- function must be SECURITY DEFINER. The INSERT itself still uses auth.uid()
-- which is set from the caller's JWT.
create or replace function public.debug_try_insert_trip_no_trigger()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trip_id uuid;
begin
  alter table public.trips disable trigger on_trip_created;
  begin
    insert into public.trips (owner_id, title, slug, status, visibility)
    values (v_uid, 'debug no-trigger probe', 'debug-no-trig-' || gen_random_uuid()::text, 'draft', 'private')
    returning id into v_trip_id;
    delete from public.trips where id = v_trip_id;
    alter table public.trips enable trigger on_trip_created;
    return jsonb_build_object('ok', true, 'auth_uid', v_uid);
  exception
    when others then
      alter table public.trips enable trigger on_trip_created;
      return jsonb_build_object(
        'ok', false,
        'auth_uid', v_uid,
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      );
  end;
end;
$$;
grant execute on function public.debug_try_insert_trip_no_trigger() to anon, authenticated;

-- Dump the auth.uid() function source + the owner of the on_trip_created
-- trigger function. Helps detect a redefined auth.uid() or a trigger whose
-- SECURITY DEFINER doesn't bypass RLS because its owner is non-superuser.
create or replace function public.debug_dump_env()
  returns jsonb
  language sql
  security invoker
  stable
as $$
  select jsonb_build_object(
    'auth_uid_source', (select prosrc from pg_proc where proname = 'uid' and pronamespace = 'auth'::regnamespace),
    'handle_new_trip_owner', (
      select pg_get_userbyid(p.proowner)
      from pg_proc p
      where p.proname = 'handle_new_trip' and p.pronamespace = 'public'::regnamespace
    ),
    'handle_new_trip_is_definer', (
      select p.prosecdef
      from pg_proc p
      where p.proname = 'handle_new_trip' and p.pronamespace = 'public'::regnamespace
    ),
    'handle_new_trip_owner_has_bypassrls', (
      select r.rolbypassrls
      from pg_proc p
      join pg_roles r on r.oid = p.proowner
      where p.proname = 'handle_new_trip' and p.pronamespace = 'public'::regnamespace
    ),
    'trip_members_policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', polname,
        'cmd', case polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' when '*' then 'ALL' end,
        'with_check', pg_get_expr(polwithcheck, polrelid),
        'using', pg_get_expr(polqual, polrelid)
      )), '[]'::jsonb)
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      where c.relname = 'trip_members' and c.relnamespace = 'public'::regnamespace
    )
  );
$$;
grant execute on function public.debug_dump_env() to anon, authenticated;
