'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { assertTripAccess, AuthorizationError } from '@/lib/auth/permissions';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { createExpenseSchema } from '@/lib/schemas/expense';
import { computeSplit } from '@/lib/stats/expenseSplit';
import type { ActionResult } from '@/server/actions/trips';

export async function createExpenseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const data = parsed.data;

  try {
    await assertTripAccess(data.trip_id, 'editor');
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.code };
    throw e;
  }
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  // Compute payment status based on payments vs total
  const paidTotal = (data.payments ?? []).reduce((acc, p) => acc + p.paid_cents, 0);
  const status =
    paidTotal === 0 ? 'unpaid' : paidTotal >= data.amount_cents ? 'paid' : 'partial';

  const insertResp = await supabase
    .from('expenses')
    .insert({
      trip_id: data.trip_id,
      day_id: data.day_id ?? null,
      stop_id: data.stop_id ?? null,
      type: data.type,
      subtype: data.subtype ?? null,
      label: data.label,
      city: data.city ?? null,
      amount_cents: data.amount_cents,
      currency: data.currency.toUpperCase(),
      fx_rate: data.fx_rate ?? null,
      amount_base_cents: data.amount_base_cents ?? data.amount_cents,
      spent_on: data.spent_on ?? null,
      payment_status: status,
      split_method: data.split_method,
      link: data.link ?? null,
      note: data.note ?? null,
      created_by: session.userId,
    })
    .select('id')
    .single();
  const expense = (insertResp.data ?? null) as { id: string } | null;
  if (insertResp.error || !expense) {
    return { ok: false, error: insertResp.error?.message ?? 'unknown_error' };
  }

  // Allocations
  const shares = computeSplit({
    total_cents: data.amount_cents,
    method: data.split_method,
    members: data.allocations.map((a) => ({ user_id: a.user_id, value: a.value })),
  });
  if (shares.length > 0) {
    const { error: errAlloc } = await supabase.from('expense_allocations').insert(
      shares.map((s) => ({
        expense_id: expense.id,
        user_id: s.user_id,
        share_cents: s.share_cents,
        share_percentage: s.share_percentage,
      })),
    );
    if (errAlloc) return { ok: false, error: errAlloc.message };
  }

  if ((data.payments ?? []).length > 0) {
    const { error: errPay } = await supabase.from('expense_payments').insert(
      (data.payments ?? []).map((p) => ({
        expense_id: expense.id,
        user_id: p.user_id,
        paid_cents: p.paid_cents,
        paid_on: p.paid_on ?? null,
        method: p.method ?? null,
      })),
    );
    if (errPay) return { ok: false, error: errPay.message };
  }

  // Audit log for substantial expenses (> 200 €).
  if (data.amount_cents >= 20000) {
    await supabase.from('audit_logs').insert({
      user_id: session.userId,
      trip_id: data.trip_id,
      action: 'expense.created.large',
      entity: 'expense',
      entity_id: expense.id,
      metadata: { amount_cents: data.amount_cents, currency: data.currency },
    });
  }

  const tripResp = await supabase.from('trips').select('slug').eq('id', data.trip_id).single();
  const trip = (tripResp.data ?? null) as { slug: string } | null;
  if (trip?.slug) revalidatePath(`/voyages/${trip.slug}/depenses`);
  return { ok: true, data: { id: expense.id } };
}

export async function deleteExpenseAction(expenseId: string): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const resp = await supabase
    .from('expenses')
    .select('trip_id, trips!inner(slug)')
    .eq('id', expenseId)
    .single();
  const exp = (resp.data ?? null) as { trip_id: string; trips: { slug: string } | null } | null;
  if (!exp) return { ok: false, error: 'not_found' };
  try {
    await assertTripAccess(exp.trip_id, 'editor');
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.code };
    throw e;
  }
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) return { ok: false, error: error.message };

  if (exp.trips?.slug) revalidatePath(`/voyages/${exp.trips.slug}/depenses`);
  return { ok: true };
}
