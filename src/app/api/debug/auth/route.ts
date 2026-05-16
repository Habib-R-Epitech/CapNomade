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
  //    We use a tiny SELECT that runs as the current user.
  const uidResp = await supabase.rpc('debug_auth_uid').single();

  // 3. Try a real insert into trips with owner_id = user.id, then rollback by
  //    deleting if it succeeded. This tells us whether RLS would accept it
  //    *right now*.
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
    trip_insert_probe: {
      success: !!probedTripId,
      error: tripResp.error?.message ?? null,
      error_code: tripResp.error?.code ?? null,
    },
  });
}

export const dynamic = 'force-dynamic';
