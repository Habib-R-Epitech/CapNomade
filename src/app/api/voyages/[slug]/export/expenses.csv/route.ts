import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { assertTripAccessBySlug, AuthorizationError } from '@/lib/auth/permissions';
import { asRows } from '@/lib/supabase/helpers';
import { toCsv } from '@/lib/exports/csv';
import type { ExpensePaymentStatus, ExpenseSplitMethod, ExpenseType } from '@/lib/types/database';

interface ExpenseExportRow {
  spent_on: string | null;
  type: ExpenseType;
  subtype: string | null;
  label: string;
  city: string | null;
  amount_cents: number;
  currency: string;
  fx_rate: number | null;
  amount_base_cents: number | null;
  payment_status: ExpensePaymentStatus;
  split_method: ExpenseSplitMethod;
  note: string | null;
  link: string | null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let ctx;
  try {
    ctx = await assertTripAccessBySlug(slug, 'viewer');
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.code }, { status: 403 });
    throw e;
  }
  const supabase = await getSupabaseServerClient();
  const resp = await supabase
    .from('expenses')
    .select(
      'spent_on, type, subtype, label, city, amount_cents, currency, fx_rate, amount_base_cents, payment_status, split_method, note, link',
    )
    .eq('trip_id', ctx.trip.id)
    .order('spent_on', { ascending: true, nullsFirst: true });

  const rows = asRows<ExpenseExportRow>(resp);

  const csv = toCsv(
    rows.map((r) => ({
      date: r.spent_on ?? '',
      type: r.type,
      subtype: r.subtype ?? '',
      label: r.label,
      city: r.city ?? '',
      amount: (r.amount_cents / 100).toFixed(2),
      currency: r.currency,
      fx_rate: r.fx_rate ?? '',
      base_amount: r.amount_base_cents != null ? (r.amount_base_cents / 100).toFixed(2) : '',
      payment_status: r.payment_status,
      split_method: r.split_method,
      note: (r.note ?? '').replace(/\n/g, ' '),
      link: r.link ?? '',
    })),
    ',',
  );

  return new NextResponse(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="capnomade-${slug}-depenses.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
