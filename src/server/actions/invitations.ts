'use server';

import 'server-only';
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { assertTripAccess, AuthorizationError } from '@/lib/auth/permissions';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sendInvitationEmail } from '@/lib/email/sendInvitationEmail';
import { createInvitationSchema, respondInvitationSchema } from '@/lib/schemas/invitation';
import type { ActionResult } from '@/server/actions/trips';

export async function createInvitationAction(input: unknown): Promise<ActionResult> {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const { trip_id, email, role, message } = parsed.data;

  try {
    await assertTripAccess(trip_id, 'owner');
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.code };
    throw e;
  }

  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  // Idempotency: don't recreate a pending invite for the same email.
  const { data: existing } = await supabase
    .from('trip_invitations')
    .select('id, token, status')
    .eq('trip_id', trip_id)
    .eq('invited_email', email)
    .in('status', ['pending'])
    .maybeSingle();

  let token = existing?.token;
  let invitationId = existing?.id;

  if (!existing) {
    token = randomBytes(24).toString('base64url');
    const { data: created, error } = await supabase
      .from('trip_invitations')
      .insert({
        trip_id,
        invited_email: email,
        invited_by: session.userId,
        role,
        token,
        message: message ?? null,
      })
      .select('id')
      .single();
    if (error || !created) return { ok: false, error: error?.message ?? 'unknown_error' };
    invitationId = created.id;
  }

  // Trip info for the email
  const { data: trip } = await supabase.from('trips').select('title, slug').eq('id', trip_id).single();
  await sendInvitationEmail({
    toEmail: email,
    inviterName: session.profile.full_name ?? session.email,
    tripTitle: trip?.title ?? 'un voyage',
    token: token!,
    customMessage: message ?? null,
  }).catch((e) => {
    // Log but don't fail the action — the invitation row exists.
    console.error('Invitation email failed', e);
  });

  await supabase.from('audit_logs').insert({
    user_id: session.userId,
    trip_id,
    action: 'invitation.created',
    entity: 'trip_invitation',
    entity_id: invitationId,
    metadata: { email, role },
  });

  revalidatePath(`/voyages`);
  return { ok: true };
}

export async function respondInvitationAction(input: unknown): Promise<ActionResult<{ trip_slug?: string }>> {
  const parsed = respondInvitationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const { token, action } = parsed.data;

  const supabase = await getSupabaseServerClient();
  if (action === 'accept') {
    const { data: tripId, error } = await supabase.rpc('accept_trip_invitation', { p_token: token });
    if (error) return { ok: false, error: error.message };
    const { data: trip } = await supabase.from('trips').select('slug').eq('id', tripId as unknown as string).maybeSingle();
    revalidatePath('/invitations');
    revalidatePath('/dashboard');
    return { ok: true, data: { trip_slug: trip?.slug } };
  } else {
    const { error } = await supabase.rpc('decline_trip_invitation', { p_token: token });
    if (error) return { ok: false, error: error.message };
    revalidatePath('/invitations');
    return { ok: true };
  }
}

export async function cancelInvitationAction(invitationId: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const { data: inv } = await supabase
    .from('trip_invitations')
    .select('trip_id')
    .eq('id', invitationId)
    .maybeSingle();
  if (!inv) return { ok: false, error: 'not_found' };

  try {
    await assertTripAccess(inv.trip_id, 'owner');
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.code };
    throw e;
  }
  const { error } = await supabase
    .from('trip_invitations')
    .update({ status: 'cancelled', responded_at: new Date().toISOString() })
    .eq('id', invitationId);
  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_logs').insert({
    user_id: session.userId,
    trip_id: inv.trip_id,
    action: 'invitation.cancelled',
    entity: 'trip_invitation',
    entity_id: invitationId,
  });
  revalidatePath('/voyages');
  return { ok: true };
}
