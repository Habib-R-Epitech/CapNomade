-- TEMPORARY: helper RPC to inspect auth.uid() from the current session.
-- Drop this migration once the RLS investigation is over.
create or replace function public.debug_auth_uid()
  returns table (auth_uid uuid)
  language sql
  security invoker
  stable
as $$
  select auth.uid();
$$;

grant execute on function public.debug_auth_uid() to anon, authenticated;
