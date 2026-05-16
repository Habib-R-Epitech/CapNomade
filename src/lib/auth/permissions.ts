import 'server-only';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import type { TripRole } from '@/lib/types/database';

export class AuthorizationError extends Error {
  constructor(
    message = 'Forbidden',
    readonly code:
      | 'unauthenticated'
      | 'not_member'
      | 'insufficient_role'
      | 'not_found' = 'insufficient_role',
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export interface TripContext {
  tripId: string;
  role: TripRole;
  isOwner: boolean;
  canEdit: boolean;
}

const ROLE_RANK: Record<TripRole, number> = { owner: 3, editor: 2, viewer: 1 };

/**
 * Loads the membership row for the current user / given trip.
 * Returns `null` if not a member (RLS would also block, but we want a clean code path).
 */
export async function getTripMembership(
  tripId: string,
): Promise<{ role: TripRole } | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', session.userId)
    .maybeSingle();

  return data ? { role: data.role as TripRole } : null;
}

export async function assertTripAccess(
  tripId: string,
  minRole: TripRole = 'viewer',
): Promise<TripContext> {
  const session = await getSession();
  if (!session) throw new AuthorizationError('Not authenticated', 'unauthenticated');

  const membership = await getTripMembership(tripId);
  if (!membership) throw new AuthorizationError('Not a member of this trip', 'not_member');

  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw new AuthorizationError(
      `Requires at least ${minRole} role`,
      'insufficient_role',
    );
  }

  return {
    tripId,
    role: membership.role,
    isOwner: membership.role === 'owner',
    canEdit: membership.role === 'owner' || membership.role === 'editor',
  };
}

export async function assertTripAccessBySlug(
  slug: string,
  minRole: TripRole = 'viewer',
): Promise<TripContext & { trip: { id: string; owner_id: string; title: string } }> {
  const session = await getSession();
  if (!session) throw new AuthorizationError('Not authenticated', 'unauthenticated');

  const supabase = await getSupabaseServerClient();
  const { data: trip } = await supabase
    .from('trips')
    .select('id, owner_id, title')
    .eq('slug', slug)
    .or(`owner_id.eq.${session.userId},id.in.(select trip_id from trip_members where user_id = ${session.userId})`)
    .maybeSingle();

  if (!trip) {
    // Fallback: explicit join (some Postgres versions don't accept that .or shape).
    const fallback = await supabase
      .from('trips')
      .select('id, owner_id, title, trip_members!inner(user_id)')
      .eq('slug', slug)
      .eq('trip_members.user_id', session.userId)
      .maybeSingle();
    if (!fallback.data) throw new AuthorizationError('Trip not found', 'not_found');
    const ctx = await assertTripAccess(fallback.data.id, minRole);
    return { ...ctx, trip: { id: fallback.data.id, owner_id: fallback.data.owner_id, title: fallback.data.title } };
  }

  const ctx = await assertTripAccess(trip.id, minRole);
  return { ...ctx, trip };
}
