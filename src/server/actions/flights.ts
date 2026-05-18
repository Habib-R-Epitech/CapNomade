'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertTripAccess, AuthorizationError } from '@/lib/auth/permissions';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { estimateCarbon, haversineKm } from '@/lib/carbon';
import type { ActionResult } from './trips';

const UUID = z.string().uuid();
const DIRECTION = z.enum(['outbound', 'return']);

const waypointSchema = z.object({
  name: z.string().min(1).max(120),
  lng: z.number().finite(),
  lat: z.number().finite(),
});

const flightSchema = z.object({
  direction: DIRECTION,
  waypoints: z.array(waypointSchema).max(10),
});

const setSchema = z.object({
  trip_id: UUID,
  flights: z.array(flightSchema).max(2),
});

interface FlightTotals {
  total_distance_km: number;
  total_duration_minutes: number;
  total_emission_kgco2e: number;
}

/**
 * Compute distance + flight time + CO₂ across the chain of legs (waypoints
 * pair-by-pair). Time model:
 *   - cruise speed 800 km/h between any two waypoints
 *   - +30 min fixed overhead per leg (push-back, taxi, landing)
 *   - +90 min once for check-in / security (outbound = at first airport)
 * CO₂ uses the standard plane factor table (short/medium/long-haul) with the
 * configured radiative-forcing multiplier.
 */
function computeFlightTotals(
  waypoints: Array<{ name: string; lng: number; lat: number }>,
): FlightTotals {
  if (waypoints.length < 2) {
    return { total_distance_km: 0, total_duration_minutes: 0, total_emission_kgco2e: 0 };
  }
  let totalKm = 0;
  let totalMinutes = 90; // one-time check-in / boarding before first leg
  let totalCo2 = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1]!;
    const b = waypoints[i]!;
    const km = haversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
    totalKm += km;
    totalMinutes += (km / 800) * 60 + 30;
    const est = estimateCarbon({ mode: 'plane', distance_km: km });
    totalCo2 += est.emission_kgco2e;
  }
  return {
    total_distance_km: Math.round(totalKm * 10) / 10,
    total_duration_minutes: Math.round(totalMinutes),
    total_emission_kgco2e: Math.round(totalCo2 * 10) / 10,
  };
}

export async function setTripFlightsAction(input: unknown): Promise<ActionResult> {
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const { trip_id, flights } = parsed.data;

  try {
    await assertTripAccess(trip_id, 'editor');
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.code };
    throw e;
  }

  const supabase = await getSupabaseServerClient();

  // Always wipe + reinsert : a flight is the user's mental "package", we
  // don't want partial-update semantics.
  const wipe = await supabase.from('trip_flights').delete().eq('trip_id', trip_id);
  if (wipe.error) return { ok: false, error: wipe.error.message };

  const nonEmpty = flights.filter((f) => f.waypoints.length >= 2);
  if (nonEmpty.length === 0) {
    revalidateTrip(supabase, trip_id);
    return { ok: true };
  }

  const rows = nonEmpty.map((f) => ({
    trip_id,
    direction: f.direction,
    waypoints: f.waypoints,
    ...computeFlightTotals(f.waypoints),
  }));

  const insert = await supabase.from('trip_flights').insert(rows);
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
