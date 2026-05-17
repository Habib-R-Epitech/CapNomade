'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ZodError } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { assertTripAccess, AuthorizationError } from '@/lib/auth/permissions';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { createTripSchema, updateTripSchema } from '@/lib/schemas/trip';
import { slugify } from '@/lib/utils';
import type { TripStatus } from '@/lib/types/database';

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createTripAction(input: unknown): Promise<ActionResult<{ slug: string }>> {
  const session = await requireSession();
  const parsed = createTripSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Validation', fieldErrors: zodToFieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const supabase = await getSupabaseServerClient();

  const baseSlug = slugify(data.title) || 'voyage';
  const slug = await uniqueSlug(supabase, session.userId, baseSlug);

  const rpcResp = await supabase
    .rpc('create_trip_secure', {
      p_title: data.title,
      p_slug: slug,
      p_description: data.description ?? null,
      p_status: data.status,
      p_visibility: data.visibility,
      p_start_date: data.start_date ?? null,
      p_end_date: data.end_date ?? null,
      p_primary_countries: data.primary_countries.map((c) => c.toUpperCase()),
      p_base_currency: data.base_currency.toUpperCase(),
      p_total_budget_cents: data.total_budget_cents ?? null,
    })
    .single();
  const trip = (rpcResp.data ?? null) as { id: string; slug: string } | null;
  if (rpcResp.error || !trip) return { ok: false, error: rpcResp.error?.message ?? 'unknown_error' };

  // Auto-create one trip_days row per date in the trip's range.
  await syncTripDays(supabase, trip.id, data.start_date, data.end_date);

  revalidatePath('/voyages');
  revalidatePath('/dashboard');
  return { ok: true, data: { slug: trip.slug } };
}

export async function updateTripAction(input: unknown): Promise<ActionResult> {
  const parsed = updateTripSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Validation', fieldErrors: zodToFieldErrors(parsed.error) };
  }
  const { id, ...patch } = parsed.data;
  try {
    await assertTripAccess(id, 'editor');
  } catch (e) {
    return authzToResult(e);
  }

  const supabase = await getSupabaseServerClient();

  // If start_date or end_date change, validate first that the new range
  // doesn't orphan any planned activities.
  if ('start_date' in patch || 'end_date' in patch) {
    const currentResp = await supabase
      .from('trips')
      .select('start_date, end_date')
      .eq('id', id)
      .single();
    const current = (currentResp.data ?? null) as
      | { start_date: string | null; end_date: string | null }
      | null;
    const nextStart = 'start_date' in patch ? patch.start_date : current?.start_date ?? null;
    const nextEnd = 'end_date' in patch ? patch.end_date : current?.end_date ?? null;
    const sync = await syncTripDays(supabase, id, nextStart, nextEnd);
    if (!sync.ok) {
      if (sync.error === 'days_have_activities') {
        return {
          ok: false,
          error: `Impossible de raccourcir le voyage : des activités sont planifiées les ${(sync.blockedDates ?? []).join(', ')}. Supprimez-les d'abord.`,
        };
      }
      return { ok: false, error: sync.error };
    }
  }

  const updateValues: Record<string, unknown> = { ...patch };
  if (patch.title) {
    const baseSlug = slugify(patch.title);
    const session = await requireSession();
    updateValues.slug = await uniqueSlug(supabase, session.userId, baseSlug, id);
  }
  const { error } = await supabase.from('trips').update(updateValues).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/voyages');
  revalidatePath('/dashboard');
  revalidatePath(`/voyages/${updateValues.slug ?? ''}`);
  return { ok: true };
}

export async function changeTripStatusAction(
  tripId: string,
  status: TripStatus,
): Promise<ActionResult> {
  try {
    await assertTripAccess(tripId, 'editor');
  } catch (e) {
    return authzToResult(e);
  }
  const supabase = await getSupabaseServerClient();
  const patch: Record<string, unknown> = { status };
  if (status === 'archived') patch.archived_at = new Date().toISOString();
  const { error } = await supabase.from('trips').update(patch).eq('id', tripId);
  if (error) return { ok: false, error: error.message };

  // Audit log
  const session = await requireSession();
  await supabase.from('audit_logs').insert({
    user_id: session.userId,
    trip_id: tripId,
    action: 'trip.status_changed',
    entity: 'trip',
    entity_id: tripId,
    metadata: { status },
  });

  revalidatePath('/voyages');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function deleteTripAction(tripId: string): Promise<ActionResult> {
  try {
    await assertTripAccess(tripId, 'owner');
  } catch (e) {
    return authzToResult(e);
  }
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/voyages');
  revalidatePath('/dashboard');
  redirect('/voyages');
}

export async function duplicateTripAction(tripId: string): Promise<ActionResult<{ slug: string }>> {
  try {
    await assertTripAccess(tripId, 'editor');
  } catch (e) {
    return authzToResult(e);
  }
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const originalResp = await supabase.from('trips').select('*').eq('id', tripId).single();
  const original = (originalResp.data ?? null) as
    | {
        slug: string;
        title: string;
        description: string | null;
        start_date: string | null;
        end_date: string | null;
        primary_countries: string[];
        base_currency: string;
        total_budget_cents: number | null;
      }
    | null;
  if (!original) return { ok: false, error: 'not_found' };

  const newSlug = await uniqueSlug(supabase, session.userId, `${original.slug}-copie`);
  const dupResp = await supabase
    .rpc('create_trip_secure', {
      p_title: `${original.title} (copie)`,
      p_slug: newSlug,
      p_description: original.description,
      p_status: 'draft',
      p_visibility: 'private',
      p_start_date: original.start_date,
      p_end_date: original.end_date,
      p_primary_countries: original.primary_countries,
      p_base_currency: original.base_currency,
      p_total_budget_cents: original.total_budget_cents,
    })
    .single();
  const dup = (dupResp.data ?? null) as { id: string; slug: string } | null;
  if (dupResp.error || !dup) return { ok: false, error: dupResp.error?.message ?? 'unknown' };

  revalidatePath('/voyages');
  return { ok: true, data: { slug: dup.slug } };
}

// --- helpers -----------------------------------------------------------------

/**
 * Returns each ISO date (YYYY-MM-DD) from start to end inclusive.
 * Capped at 365 days to avoid runaway loops on bad input.
 */
function enumerateDates(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) return out;
  for (let d = new Date(s); d <= e && out.length < 365; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Sync the trip_days rows so they match the trip's start_date / end_date range.
 *  - Adds days that are missing.
 *  - Removes days that fall outside the range, BUT refuses if any of those
 *    days has activities (the user must delete the activities first).
 *
 * Returns { ok: true } on success.
 * Returns { ok: false, error: 'days_have_activities', blockedDates: [...] } when
 * the range shrinkage would orphan activities.
 */
async function syncTripDays(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  tripId: string,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): Promise<{ ok: true } | { ok: false; error: string; blockedDates?: string[] }> {
  if (!startDate || !endDate) return { ok: true };
  const desired = enumerateDates(startDate, endDate);
  if (desired.length === 0) return { ok: true };
  const desiredSet = new Set(desired);

  const currentResp = await supabase
    .from('trip_days')
    .select('id, date')
    .eq('trip_id', tripId);
  const current = (currentResp.data ?? []) as Array<{ id: string; date: string }>;
  const currentDates = new Set(current.map((d) => d.date));

  const toRemove = current.filter((d) => !desiredSet.has(d.date));
  if (toRemove.length > 0) {
    const removeIds = toRemove.map((d) => d.id);
    const activitiesResp = await supabase
      .from('activities')
      .select('day_id')
      .in('day_id', removeIds);
    const activities = (activitiesResp.data ?? []) as Array<{ day_id: string }>;
    const blockedIds = new Set(activities.map((a) => a.day_id));
    const blockedDates = toRemove
      .filter((d) => blockedIds.has(d.id))
      .map((d) => d.date)
      .sort();
    if (blockedDates.length > 0) {
      return { ok: false, error: 'days_have_activities', blockedDates };
    }
    const del = await supabase.from('trip_days').delete().in('id', removeIds);
    if (del.error) return { ok: false, error: del.error.message };
  }

  const toAdd = desired.filter((d) => !currentDates.has(d));
  if (toAdd.length > 0) {
    const ins = await supabase.from('trip_days').insert(
      toAdd.map((date, i) => ({
        trip_id: tripId,
        date,
        order_index: desired.indexOf(date) >= 0 ? desired.indexOf(date) : i,
      })),
    );
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  return { ok: true };
}

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  ownerId: string,
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  let slug = baseSlug || 'voyage';
  let i = 1;
  while (true) {
    let q = supabase.from('trips').select('id').eq('owner_id', ownerId).eq('slug', slug);
    if (excludeId) q = q.neq('id', excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
    i += 1;
    slug = `${baseSlug}-${i}`;
  }
}

function zodToFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.errors) {
    const key = issue.path.join('.') || '_root';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function authzToResult<T = unknown>(e: unknown): ActionResult<T> {
  if (e instanceof AuthorizationError) return { ok: false, error: e.code };
  return { ok: false, error: 'unknown_error' };
}
