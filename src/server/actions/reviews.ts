'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { assertTripAccess, AuthorizationError } from '@/lib/auth/permissions';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { reviewSchema } from '@/lib/schemas/trip';
import type { ActionResult } from '@/server/actions/trips';

export async function upsertReviewAction(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const data = parsed.data;

  try {
    await assertTripAccess(data.trip_id, 'viewer');
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.code };
    throw e;
  }
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.from('trip_reviews').upsert(
    {
      trip_id: data.trip_id,
      author_id: session.userId,
      overall: data.overall,
      accommodation: data.accommodation ?? null,
      transport: data.transport ?? null,
      activities_score: data.activities_score ?? null,
      value_for_money: data.value_for_money ?? null,
      pace: data.pace ?? null,
      destination: data.destination ?? null,
      would_return_score: data.would_return_score ?? null,
      comment: data.comment ?? null,
      feeling_tags: data.feeling_tags,
    },
    { onConflict: 'trip_id,author_id' },
  );
  if (error) return { ok: false, error: error.message };

  // If this is a transition from "planning/booked" to "completed", flip status.
  const { data: trip } = await supabase.from('trips').select('status, slug').eq('id', data.trip_id).single();
  if (trip && trip.status !== 'completed' && trip.status !== 'archived') {
    await supabase.from('trips').update({ status: 'completed' }).eq('id', data.trip_id);
    await supabase.from('audit_logs').insert({
      user_id: session.userId,
      trip_id: data.trip_id,
      action: 'trip.completed',
      entity: 'trip',
      entity_id: data.trip_id,
    });
  }
  revalidatePath(`/voyages/${trip?.slug ?? ''}`);
  revalidatePath('/dashboard');
  return { ok: true };
}
