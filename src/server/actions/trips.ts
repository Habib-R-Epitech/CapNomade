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

  const insertResp = await supabase
    .from('trips')
    .insert({
      owner_id: session.userId,
      title: data.title,
      slug,
      description: data.description ?? null,
      status: data.status,
      visibility: data.visibility,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      primary_countries: data.primary_countries.map((c) => c.toUpperCase()),
      base_currency: data.base_currency.toUpperCase(),
      total_budget_cents: data.total_budget_cents ?? null,
    })
    .select('slug')
    .single();
  const trip = (insertResp.data ?? null) as { slug: string } | null;

  if (insertResp.error || !trip) return { ok: false, error: insertResp.error?.message ?? 'unknown_error' };

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
    .from('trips')
    .insert({
      owner_id: session.userId,
      title: `${original.title} (copie)`,
      slug: newSlug,
      description: original.description,
      status: 'draft',
      visibility: 'private',
      start_date: original.start_date,
      end_date: original.end_date,
      primary_countries: original.primary_countries,
      base_currency: original.base_currency,
      total_budget_cents: original.total_budget_cents,
    })
    .select('slug')
    .single();
  const dup = (dupResp.data ?? null) as { slug: string } | null;
  if (dupResp.error || !dup) return { ok: false, error: dupResp.error?.message ?? 'unknown' };

  revalidatePath('/voyages');
  return { ok: true, data: { slug: dup.slug } };
}

// --- helpers -----------------------------------------------------------------

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
