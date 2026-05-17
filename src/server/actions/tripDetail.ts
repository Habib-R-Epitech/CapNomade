'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { assertTripAccess, AuthorizationError } from '@/lib/auth/permissions';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  expenseFormSchema,
  transportFormSchema,
  stopFormSchema,
  accommodationFormSchema,
  activityFormSchema,
  dayFormSchema,
  mediaFormSchema,
} from '@/lib/schemas/tripDetail';
import type { ActionResult } from './trips';

async function revalidateTripPath(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, tripId: string) {
  const resp = await supabase.from('trips').select('slug').eq('id', tripId).single();
  const t = (resp.data ?? null) as { slug: string } | null;
  if (t?.slug) revalidatePath(`/voyages/${t.slug}`);
}

async function withEditorAccess(tripId: string): Promise<ActionResult | null> {
  try {
    await assertTripAccess(tripId, 'editor');
    return null;
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.code };
    throw e;
  }
}

// --- Expenses ---------------------------------------------------------------

export async function upsertExpenseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = expenseFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const d = parsed.data;
  const guard = await withEditorAccess(d.trip_id);
  if (guard) return guard as ActionResult<{ id: string }>;
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const payload = {
    trip_id: d.trip_id,
    type: d.type,
    label: d.label,
    amount_cents: d.amount_cents,
    currency: d.currency,
    spent_on: d.spent_on ?? null,
    city: d.city ?? null,
    note: d.note ?? null,
    payment_status: 'paid' as const,
    split_method: 'equal' as const,
    created_by: session.userId,
  };
  if (d.id) {
    const { error } = await supabase.from('expenses').update(payload).eq('id', d.id);
    if (error) return { ok: false, error: error.message };
    await revalidateTripPath(supabase, d.trip_id);
    return { ok: true, data: { id: d.id } };
  }
  const resp = await supabase.from('expenses').insert(payload).select('id').single();
  const row = (resp.data ?? null) as { id: string } | null;
  if (resp.error || !row) return { ok: false, error: resp.error?.message ?? 'unknown' };
  await revalidateTripPath(supabase, d.trip_id);
  return { ok: true, data: { id: row.id } };
}

export async function deleteExpenseRowAction(expenseId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const resp = await supabase.from('expenses').select('trip_id').eq('id', expenseId).single();
  const row = (resp.data ?? null) as { trip_id: string } | null;
  if (!row) return { ok: false, error: 'not_found' };
  const guard = await withEditorAccess(row.trip_id);
  if (guard) return guard;
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) return { ok: false, error: error.message };
  await revalidateTripPath(supabase, row.trip_id);
  return { ok: true };
}

// --- Transports -------------------------------------------------------------

export async function upsertTransportAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = transportFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const d = parsed.data;
  const guard = await withEditorAccess(d.trip_id);
  if (guard) return guard as ActionResult<{ id: string }>;
  const supabase = await getSupabaseServerClient();
  const payload = {
    trip_id: d.trip_id,
    mode: d.mode,
    origin_label: d.origin_label ?? null,
    destination_label: d.destination_label ?? null,
    depart_at: d.depart_at || null,
    arrive_at: d.arrive_at || null,
    carrier: d.carrier ?? null,
    reference: d.reference ?? null,
    cost_cents: d.cost_cents ?? null,
    cost_currency: d.cost_currency ?? null,
    notes: d.notes ?? null,
  };
  if (d.id) {
    const { error } = await supabase.from('transport_segments').update(payload).eq('id', d.id);
    if (error) return { ok: false, error: error.message };
    await revalidateTripPath(supabase, d.trip_id);
    return { ok: true, data: { id: d.id } };
  }
  const resp = await supabase.from('transport_segments').insert(payload).select('id').single();
  const row = (resp.data ?? null) as { id: string } | null;
  if (resp.error || !row) return { ok: false, error: resp.error?.message ?? 'unknown' };
  await revalidateTripPath(supabase, d.trip_id);
  return { ok: true, data: { id: row.id } };
}

export async function deleteTransportAction(id: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const resp = await supabase.from('transport_segments').select('trip_id').eq('id', id).single();
  const row = (resp.data ?? null) as { trip_id: string } | null;
  if (!row) return { ok: false, error: 'not_found' };
  const guard = await withEditorAccess(row.trip_id);
  if (guard) return guard;
  const { error } = await supabase.from('transport_segments').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await revalidateTripPath(supabase, row.trip_id);
  return { ok: true };
}

// --- Stops ------------------------------------------------------------------

export async function upsertStopAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = stopFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const d = parsed.data;
  const guard = await withEditorAccess(d.trip_id);
  if (guard) return guard as ActionResult<{ id: string }>;
  const supabase = await getSupabaseServerClient();
  const payload = {
    trip_id: d.trip_id,
    name: d.name,
    city: d.city ?? null,
    country_code: d.country_code ? d.country_code.toUpperCase() : null,
    arrival_date: d.arrival_date ?? null,
    departure_date: d.departure_date ?? null,
    notes: d.notes ?? null,
  };
  if (d.id) {
    const { error } = await supabase.from('trip_stops').update(payload).eq('id', d.id);
    if (error) return { ok: false, error: error.message };
    await revalidateTripPath(supabase, d.trip_id);
    return { ok: true, data: { id: d.id } };
  }
  const resp = await supabase.from('trip_stops').insert(payload).select('id').single();
  const row = (resp.data ?? null) as { id: string } | null;
  if (resp.error || !row) return { ok: false, error: resp.error?.message ?? 'unknown' };
  await revalidateTripPath(supabase, d.trip_id);
  return { ok: true, data: { id: row.id } };
}

export async function deleteStopAction(id: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const resp = await supabase.from('trip_stops').select('trip_id').eq('id', id).single();
  const row = (resp.data ?? null) as { trip_id: string } | null;
  if (!row) return { ok: false, error: 'not_found' };
  const guard = await withEditorAccess(row.trip_id);
  if (guard) return guard;
  const { error } = await supabase.from('trip_stops').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await revalidateTripPath(supabase, row.trip_id);
  return { ok: true };
}

/**
 * Quick-add a city/stop to a trip. Minimal payload : just a name.
 * Used by the "+ Ajouter une ville" button on the trip detail header.
 */
export async function quickAddCityAction(input: {
  trip_id: string;
  name: string;
}): Promise<ActionResult<{ id: string; name: string }>> {
  const name = input?.name?.trim();
  if (!input?.trip_id || !name) return { ok: false, error: 'Validation' };
  const guard = await withEditorAccess(input.trip_id);
  if (guard) return guard as ActionResult<{ id: string; name: string }>;
  const supabase = await getSupabaseServerClient();
  const resp = await supabase
    .from('trip_stops')
    .insert({ trip_id: input.trip_id, name: name.slice(0, 120), city: name.slice(0, 120) })
    .select('id, name')
    .single();
  const row = (resp.data ?? null) as { id: string; name: string } | null;
  if (resp.error || !row) return { ok: false, error: resp.error?.message ?? 'unknown' };
  await revalidateTripPath(supabase, input.trip_id);
  return { ok: true, data: row };
}

/**
 * Assign a city (trip_stop) to a day, or clear it if stop_id is null.
 */
export async function setDayCityAction(input: {
  day_id: string;
  trip_id: string;
  stop_id: string | null;
}): Promise<ActionResult> {
  if (!input?.day_id || !input?.trip_id) return { ok: false, error: 'Validation' };
  const guard = await withEditorAccess(input.trip_id);
  if (guard) return guard;
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from('trip_days')
    .update({ stop_id: input.stop_id })
    .eq('id', input.day_id);
  if (error) return { ok: false, error: error.message };
  await revalidateTripPath(supabase, input.trip_id);
  return { ok: true };
}

// --- Accommodations ---------------------------------------------------------

export async function upsertAccommodationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = accommodationFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const d = parsed.data;
  const guard = await withEditorAccess(d.trip_id);
  if (guard) return guard as ActionResult<{ id: string }>;
  const supabase = await getSupabaseServerClient();
  const payload = {
    trip_id: d.trip_id,
    name: d.name,
    kind: d.kind,
    check_in_date: d.check_in_date ?? null,
    check_out_date: d.check_out_date ?? null,
    address: d.address ?? null,
    booking_url: d.booking_url ?? null,
    cost_cents: d.cost_cents ?? null,
    cost_currency: d.cost_currency ?? null,
    notes: d.notes ?? null,
  };
  if (d.id) {
    const { error } = await supabase.from('accommodations').update(payload).eq('id', d.id);
    if (error) return { ok: false, error: error.message };
    await revalidateTripPath(supabase, d.trip_id);
    return { ok: true, data: { id: d.id } };
  }
  const resp = await supabase.from('accommodations').insert(payload).select('id').single();
  const row = (resp.data ?? null) as { id: string } | null;
  if (resp.error || !row) return { ok: false, error: resp.error?.message ?? 'unknown' };
  await revalidateTripPath(supabase, d.trip_id);
  return { ok: true, data: { id: row.id } };
}

export async function deleteAccommodationAction(id: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const resp = await supabase.from('accommodations').select('trip_id').eq('id', id).single();
  const row = (resp.data ?? null) as { trip_id: string } | null;
  if (!row) return { ok: false, error: 'not_found' };
  const guard = await withEditorAccess(row.trip_id);
  if (guard) return guard;
  const { error } = await supabase.from('accommodations').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await revalidateTripPath(supabase, row.trip_id);
  return { ok: true };
}

// --- Activities -------------------------------------------------------------

export async function upsertActivityAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = activityFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const d = parsed.data;
  const guard = await withEditorAccess(d.trip_id);
  if (guard) return guard as ActionResult<{ id: string }>;
  const supabase = await getSupabaseServerClient();
  const payload = {
    trip_id: d.trip_id,
    title: d.title,
    description: d.description ?? null,
    category: d.category ?? null,
    starts_at: d.starts_at || null,
    ends_at: d.ends_at || null,
    address: d.address ?? null,
    url: d.url ?? null,
    cost_cents: d.cost_cents ?? null,
    cost_currency: d.cost_currency ?? null,
  };
  if (d.id) {
    const { error } = await supabase.from('activities').update(payload).eq('id', d.id);
    if (error) return { ok: false, error: error.message };
    await revalidateTripPath(supabase, d.trip_id);
    return { ok: true, data: { id: d.id } };
  }
  const resp = await supabase.from('activities').insert(payload).select('id').single();
  const row = (resp.data ?? null) as { id: string } | null;
  if (resp.error || !row) return { ok: false, error: resp.error?.message ?? 'unknown' };
  await revalidateTripPath(supabase, d.trip_id);
  return { ok: true, data: { id: row.id } };
}

/**
 * Quick-add a todo-style activity inside a day. Defaults to time_slot='day'.
 * Used by the planning board.
 */
export async function quickAddActivityAction(input: {
  trip_id: string;
  day_id: string;
  title: string;
}): Promise<ActionResult<{ id: string }>> {
  if (!input?.trip_id || !input?.day_id || !input?.title?.trim()) {
    return { ok: false, error: 'Validation' };
  }
  const guard = await withEditorAccess(input.trip_id);
  if (guard) return guard as ActionResult<{ id: string }>;
  const supabase = await getSupabaseServerClient();
  const resp = await supabase
    .from('activities')
    .insert({
      trip_id: input.trip_id,
      day_id: input.day_id,
      title: input.title.trim().slice(0, 200),
      time_slot: 'day',
    })
    .select('id')
    .single();
  const row = (resp.data ?? null) as { id: string } | null;
  if (resp.error || !row) return { ok: false, error: resp.error?.message ?? 'unknown' };
  await revalidateTripPath(supabase, input.trip_id);
  return { ok: true, data: { id: row.id } };
}

/**
 * Move an activity between slots (Matin / Après-midi / Journée) or between days.
 * Used by the planning board's drag-and-drop.
 */
export async function moveActivityAction(input: {
  activity_id: string;
  trip_id: string;
  day_id: string;
  time_slot: 'morning' | 'afternoon' | 'day';
}): Promise<ActionResult> {
  if (!input?.activity_id || !input?.trip_id || !input?.day_id) {
    return { ok: false, error: 'Validation' };
  }
  if (!['morning', 'afternoon', 'day'].includes(input.time_slot)) {
    return { ok: false, error: 'Validation' };
  }
  const guard = await withEditorAccess(input.trip_id);
  if (guard) return guard;
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from('activities')
    .update({ day_id: input.day_id, time_slot: input.time_slot })
    .eq('id', input.activity_id);
  if (error) return { ok: false, error: error.message };
  await revalidateTripPath(supabase, input.trip_id);
  return { ok: true };
}

export async function deleteActivityAction(id: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const resp = await supabase.from('activities').select('trip_id').eq('id', id).single();
  const row = (resp.data ?? null) as { trip_id: string } | null;
  if (!row) return { ok: false, error: 'not_found' };
  const guard = await withEditorAccess(row.trip_id);
  if (guard) return guard;
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await revalidateTripPath(supabase, row.trip_id);
  return { ok: true };
}

// --- Days -------------------------------------------------------------------

export async function upsertDayAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = dayFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const d = parsed.data;
  const guard = await withEditorAccess(d.trip_id);
  if (guard) return guard as ActionResult<{ id: string }>;
  const supabase = await getSupabaseServerClient();
  const payload = {
    trip_id: d.trip_id,
    date: d.date,
    title: d.title ?? null,
    notes: d.notes ?? null,
  };
  if (d.id) {
    const { error } = await supabase.from('trip_days').update(payload).eq('id', d.id);
    if (error) return { ok: false, error: error.message };
    await revalidateTripPath(supabase, d.trip_id);
    return { ok: true, data: { id: d.id } };
  }
  const resp = await supabase.from('trip_days').insert(payload).select('id').single();
  const row = (resp.data ?? null) as { id: string } | null;
  if (resp.error || !row) return { ok: false, error: resp.error?.message ?? 'unknown' };
  await revalidateTripPath(supabase, d.trip_id);
  return { ok: true, data: { id: row.id } };
}

export async function deleteDayAction(id: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const resp = await supabase.from('trip_days').select('trip_id').eq('id', id).single();
  const row = (resp.data ?? null) as { trip_id: string } | null;
  if (!row) return { ok: false, error: 'not_found' };
  const guard = await withEditorAccess(row.trip_id);
  if (guard) return guard;
  const { error } = await supabase.from('trip_days').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await revalidateTripPath(supabase, row.trip_id);
  return { ok: true };
}

// --- Media links ------------------------------------------------------------

export async function upsertMediaAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = mediaFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const d = parsed.data;
  const guard = await withEditorAccess(d.trip_id);
  if (guard) return guard as ActionResult<{ id: string }>;
  const supabase = await getSupabaseServerClient();
  const payload = {
    trip_id: d.trip_id,
    kind: d.kind,
    url: d.url,
    title: d.title ?? null,
    description: d.description ?? null,
  };
  if (d.id) {
    const { error } = await supabase.from('media_links').update(payload).eq('id', d.id);
    if (error) return { ok: false, error: error.message };
    await revalidateTripPath(supabase, d.trip_id);
    return { ok: true, data: { id: d.id } };
  }
  const resp = await supabase.from('media_links').insert(payload).select('id').single();
  const row = (resp.data ?? null) as { id: string } | null;
  if (resp.error || !row) return { ok: false, error: resp.error?.message ?? 'unknown' };
  await revalidateTripPath(supabase, d.trip_id);
  return { ok: true, data: { id: row.id } };
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const resp = await supabase.from('media_links').select('trip_id').eq('id', id).single();
  const row = (resp.data ?? null) as { trip_id: string } | null;
  if (!row) return { ok: false, error: 'not_found' };
  const guard = await withEditorAccess(row.trip_id);
  if (guard) return guard;
  const { error } = await supabase.from('media_links').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await revalidateTripPath(supabase, row.trip_id);
  return { ok: true };
}
