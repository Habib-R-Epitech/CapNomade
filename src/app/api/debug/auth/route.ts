import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * TEMPORARY DEBUG ENDPOINT — to be deleted once the RLS issue is resolved.
 *
 * Reports:
 *  - auth.users row for the current session (id, email)
 *  - profiles row for the current session (id, email)
 *  - whether ids match
 *  - whether auth.uid() inside Postgres returns the same id as the session
 *  - whether a dummy trip insert would succeed (without actually committing it)
 */
export async function GET() {
  const supabase = await getSupabaseServerClient();

  const userResp = await supabase.auth.getUser();
  if (userResp.error || !userResp.data.user) {
    return NextResponse.json(
      { stage: 'getUser', error: userResp.error?.message ?? 'no_user' },
      { status: 401 },
    );
  }
  const user = userResp.data.user;

  // 1. Is there a profile row matching this user?
  const profileResp = await supabase
    .from('profiles')
    .select('id, email')
    .eq('id', user.id)
    .maybeSingle();

  // 2. What does auth.uid() return inside the Postgres session?
  const uidResp = await supabase.rpc('debug_auth_uid').single();

  // 3. What policies are actually defined on `trips` in the database?
  //    This catches the case where migration 0003 was only partially applied.
  const policiesResp = await supabase.rpc('debug_trip_policies');

  // 4. Try the insert via PostgREST (the path our app uses).
  const probeSlug = `debug-probe-${Date.now()}`;
  const tripResp = await supabase
    .from('trips')
    .insert({
      owner_id: user.id,
      title: 'debug probe',
      slug: probeSlug,
      status: 'draft',
      visibility: 'private',
    })
    .select('id')
    .maybeSingle();
  const probedTripId = (tripResp.data as { id: string } | null)?.id ?? null;
  if (probedTripId) {
    await supabase.from('trips').delete().eq('id', probedTripId);
  }

  // 5. Try the same insert *inside Postgres* via an RPC.
  const rpcInsertResp = await supabase.rpc('debug_try_insert_trip').single();

  // 6. Try with the AFTER INSERT trigger disabled. If this succeeds, the
  //    trigger is the actual culprit (not the trips_owner_insert policy).
  const rpcInsertNoTrigResp = await supabase
    .rpc('debug_try_insert_trip_no_trigger')
    .single();

  // 7. Dump the environment: auth.uid() source, handle_new_trip owner, BYPASSRLS,
  //    and trip_members policies.
  const envResp = await supabase.rpc('debug_dump_env').single();

  return NextResponse.json({
    session: { user_id: user.id, email: user.email },
    profile: {
      found: !!profileResp.data,
      data: profileResp.data,
      error: profileResp.error?.message ?? null,
    },
    auth_uid_in_postgres: {
      value: uidResp.error ? null : (uidResp.data as { auth_uid: string | null } | null),
      error: uidResp.error?.message ?? null,
    },
    actual_trip_policies: {
      data: policiesResp.data ?? null,
      error: policiesResp.error?.message ?? null,
    },
    trip_insert_via_postgrest: {
      success: !!probedTripId,
      error: tripResp.error?.message ?? null,
      error_code: tripResp.error?.code ?? null,
    },
    trip_insert_via_rpc: {
      data: rpcInsertResp.data ?? null,
      error: rpcInsertResp.error?.message ?? null,
    },
    trip_insert_with_trigger_disabled: {
      data: rpcInsertNoTrigResp.data ?? null,
      error: rpcInsertNoTrigResp.error?.message ?? null,
    },
    env_dump: {
      data: envResp.data ?? null,
      error: envResp.error?.message ?? null,
    },
  });
}

export const dynamic = 'force-dynamic';
