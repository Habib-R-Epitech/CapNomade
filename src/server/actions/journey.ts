'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertTripAccess, AuthorizationError } from '@/lib/auth/permissions';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { estimateLeg } from '@/lib/transport/profiles';
import { extractLngLat } from '@/lib/geo/extractLngLat';
import type { ActionResult } from './trips';

const UUID = z.string().uuid();
const MODE = z.enum(['plane', 'car', 'train', 'bus', 'ferry', 'motorcycle', 'other']);

const legSchema = z.object({
  origin_stop_id: UUID,
  destination_stop_id: UUID,
  mode: MODE,
});

const journeySchema = z.object({
  trip_id: UUID,
  legs: z.array(legSchema).max(50),
});

interface StopRow {
  id: string;
  location: unknown;
}

/**
 * Replace the trip's journey. Anything previously written with an
 * origin_stop_id (i.e. created by this builder) is wiped first; segments that
 * have only labels (manual entries via the Transports tab) are left alone.
 */
export async function setTripJourneyAction(input: unknown): Promise<ActionResult> {
  const parsed = journeySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const { trip_id, legs } = parsed.data;

  try {
    await assertTripAccess(trip_id, 'editor');
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.code };
    throw e;
  }

  const supabase = await getSupabaseServerClient();

  // Pull coords for every stop referenced in the journey so we can compute
  // distance + duration estimates on the server (the client can do it too but
  // we don't want to trust it — and a single round-trip is cheap).
  const referencedIds = Array.from(
    new Set(legs.flatMap((l) => [l.origin_stop_id, l.destination_stop_id])),
  );

  let stopsById = new Map<string, { lng: number; lat: number }>();
  if (referencedIds.length > 0) {
    const stopsResp = await supabase
      .from('trip_stops')
      .select('id, location')
      .eq('trip_id', trip_id)
      .in('id', referencedIds);
    const stops = (Array.isArray(stopsResp.data) ? stopsResp.data : []) as StopRow[];
    for (const s of stops) {
      const c = extractLngLat(s.location);
      if (c) stopsById.set(s.id, c);
    }
  }

  // Wipe the previous journey-built segments only.
  const wipe = await supabase
    .from('transport_segments')
    .delete()
    .eq('trip_id', trip_id)
    .not('origin_stop_id', 'is', null);
  if (wipe.error) return { ok: false, error: wipe.error.message };

  if (legs.length === 0) {
    revalidateTrip(supabase, trip_id);
    return { ok: true };
  }

  const rows = legs.map((leg, i) => {
    const from = stopsById.get(leg.origin_stop_id);
    const to = stopsById.get(leg.destination_stop_id);
    let distanceKm: number | null = null;
    let durationMinutes: number | null = null;
    if (from && to) {
      const est = estimateLeg(leg.mode, from.lng, from.lat, to.lng, to.lat);
      distanceKm = est.distanceKm;
      durationMinutes = est.durationMinutes;
    }
    return {
      trip_id,
      mode: leg.mode,
      origin_stop_id: leg.origin_stop_id,
      destination_stop_id: leg.destination_stop_id,
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      order_index: i,
    };
  });

  const insert = await supabase.from('transport_segments').insert(rows);
  if (insert.error) return { ok: false, error: insert.error.message };

  await revalidateTrip(supabase, trip_id);
  return { ok: true };
}

async function revalidateTrip(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  tripId: string,
) {
  const resp = await supabase.from('trips').select('slug').eq('id', tripId).single();
  const t = (resp.data ?? null) as { slug: string } | null;
  if (t?.slug) revalidatePath(`/voyages/${t.slug}`);
}
