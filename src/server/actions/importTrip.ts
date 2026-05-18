'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';
import { extractPastTrip, type ExtractedTripData } from '@/lib/imports/pastTripExtractor';
import type { ActionResult } from './trips';

const MAX_BYTES = 5 * 1024 * 1024;

const expenseTypeEnum = z.enum(['accommodation', 'transport', 'activity', 'food', 'other']);
const transportModeEnum = z.enum(['plane', 'car', 'train', 'bus', 'ferry', 'motorcycle', 'other']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO2 = /^[A-Z]{2}$/;
const CCY = /^[A-Z]{3}$/;

const confirmSchema = z.object({
  meta: z.object({
    title: z.string().min(2).max(120),
    start_date: z.string().regex(ISO_DATE).nullable(),
    end_date: z.string().regex(ISO_DATE).nullable(),
    base_currency: z.string().regex(CCY),
    primary_countries: z.array(z.string().regex(ISO2)).max(20),
    total_budget_cents: z.number().int().nonnegative().nullable(),
  }),
  stops: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        city: z.string().max(120).nullable(),
        country_code: z.string().regex(ISO2).nullable(),
      }),
    )
    .max(100),
  transports: z
    .array(
      z.object({
        mode: transportModeEnum,
        label: z.string().min(1).max(200),
        origin_label: z.string().max(120).nullable(),
        destination_label: z.string().max(120).nullable(),
        depart_date: z.string().regex(ISO_DATE).nullable(),
        cost_amount: z.number().nullable(),
        cost_currency: z.string().regex(CCY).nullable(),
      }),
    )
    .max(200),
  expenses: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        type: expenseTypeEnum,
        amount: z.number(),
        currency: z.string().regex(CCY),
        date: z.string().regex(ISO_DATE).nullable(),
        city: z.string().max(120).nullable(),
      }),
    )
    .max(500),
});

export type ConfirmImportInput = z.infer<typeof confirmSchema>;

export async function analyzePastTripAction(
  formData: FormData,
): Promise<ActionResult<ExtractedTripData>> {
  await requireSession();
  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'Aucun fichier reçu.' };
  if (file.size > MAX_BYTES) return { ok: false, error: 'Fichier trop volumineux (max 5 Mo).' };
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return { ok: false, error: 'Format non supporté. Utilisez .xlsx, .xls ou .csv.' };
  }
  try {
    const buffer = await file.arrayBuffer();
    const data = await extractPastTrip(buffer, file.name);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'parse_failed' };
  }
}

export async function confirmImportedTripAction(
  input: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const session = await requireSession();
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Validation', fieldErrors: zodErrors(parsed.error) };
  }
  const data = parsed.data;
  const supabase = await getSupabaseServerClient();

  const baseSlug = slugify(data.meta.title) || 'voyage';
  const slug = await uniqueSlug(supabase, session.userId, baseSlug);

  const tripResp = await supabase
    .rpc('create_trip_secure', {
      p_title: data.meta.title,
      p_slug: slug,
      p_description: null,
      p_status: 'completed',
      p_visibility: 'private',
      p_start_date: data.meta.start_date,
      p_end_date: data.meta.end_date,
      p_primary_countries: data.meta.primary_countries.map((c) => c.toUpperCase()),
      p_base_currency: data.meta.base_currency.toUpperCase(),
      p_total_budget_cents: data.meta.total_budget_cents,
    })
    .single();

  const trip = (tripResp.data ?? null) as { id: string; slug: string } | null;
  if (tripResp.error || !trip) {
    return { ok: false, error: tripResp.error?.message ?? 'create_trip_failed' };
  }

  const stopsByName = new Map<string, string>();
  if (data.stops.length > 0) {
    const stopRows = data.stops.map((s, i) => ({
      trip_id: trip.id,
      name: s.name,
      city: s.city,
      country_code: s.country_code,
      order_index: i,
    }));
    const stopsResp = await supabase.from('trip_stops').insert(stopRows).select('id, name, city');
    const inserted = (stopsResp.data ?? []) as Array<{ id: string; name: string; city: string | null }>;
    for (const row of inserted) {
      stopsByName.set(row.name, row.id);
      if (row.city) stopsByName.set(row.city, row.id);
    }
  }

  if (data.transports.length > 0) {
    const transportRows = data.transports.map((t, i) => ({
      trip_id: trip.id,
      mode: t.mode,
      origin_label: t.origin_label,
      destination_label: t.destination_label,
      cost_cents: t.cost_amount != null ? Math.round(t.cost_amount * 100) : null,
      cost_currency: t.cost_currency,
      notes: t.label,
      order_index: i,
    }));
    await supabase.from('transport_segments').insert(transportRows);
  }

  if (data.expenses.length > 0) {
    const expenseRows = data.expenses.map((e) => ({
      trip_id: trip.id,
      stop_id: e.city ? stopsByName.get(e.city) ?? null : null,
      type: e.type,
      label: e.label,
      amount_cents: Math.round(e.amount * 100),
      currency: e.currency.toUpperCase(),
      spent_on: e.date,
      city: e.city,
      created_by: session.userId,
    }));
    await supabase.from('expenses').insert(expenseRows);
  }

  revalidatePath('/voyages');
  revalidatePath('/dashboard');
  return { ok: true, data: { slug: trip.slug } };
}

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  ownerId: string,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug || 'voyage';
  let i = 1;
  while (true) {
    const { data } = await supabase
      .from('trips')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('slug', slug)
      .maybeSingle();
    if (!data) return slug;
    i += 1;
    slug = `${baseSlug}-${i}`;
  }
}

function zodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.errors) {
    const key = issue.path.join('.') || '_root';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
