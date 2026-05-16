import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { asRows } from '@/lib/supabase/helpers';
import type { ExpensePaymentStatus, ExpenseType, TransportMode } from '@/lib/types/database';

export interface TripStats {
  totals: {
    overall_cents: number;
    accommodation_cents: number;
    plane_cents: number;
    car_cents: number;
    activities_cents: number;
    food_cents: number;
    other_cents: number;
    paid_cents: number;
    pending_cents: number;
    per_person_cents: number;
  };
  transport: {
    total_distance_km: number;
    plane_distance_km: number;
    car_distance_km: number;
    total_duration_minutes: number;
    total_emission_kgco2e: number;
  };
  members_count: number;
  days_count: number;
}

interface ExpenseRow {
  id: string;
  type: ExpenseType;
  subtype: string | null;
  amount_cents: number;
  amount_base_cents: number | null;
  payment_status: ExpensePaymentStatus;
}
interface PaymentRow {
  paid_cents: number;
  expense_id: string;
}
interface MemberCountRow {
  user_id: string;
}
interface TransportRow {
  mode: TransportMode;
  distance_km: number | string | null;
  duration_minutes: number | null;
  emission_kgco2e: number | string | null;
  cost_cents: number | null;
}
interface DayCountRow {
  id: string;
}

const TYPE_TO_FIELD: Record<ExpenseType, keyof TripStats['totals']> = {
  accommodation: 'accommodation_cents',
  transport: 'plane_cents', // refined below using transport_segments
  activity: 'activities_cents',
  food: 'food_cents',
  other: 'other_cents',
};

export async function loadTripStats(tripId: string): Promise<TripStats> {
  const supabase = await getSupabaseServerClient();

  const [expensesResp, paymentsResp, membersResp, transportsResp, daysResp] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, type, subtype, amount_cents, amount_base_cents, payment_status')
      .eq('trip_id', tripId),
    supabase
      .from('expense_payments')
      .select('paid_cents, expense_id, expenses!inner(trip_id)')
      .eq('expenses.trip_id', tripId),
    supabase.from('trip_members').select('user_id').eq('trip_id', tripId),
    supabase
      .from('transport_segments')
      .select('mode, distance_km, duration_minutes, emission_kgco2e, cost_cents')
      .eq('trip_id', tripId),
    supabase.from('trip_days').select('id').eq('trip_id', tripId),
  ]);

  const expenses = asRows<ExpenseRow>(expensesResp);
  const payments = asRows<PaymentRow>(paymentsResp);
  const members = asRows<MemberCountRow>(membersResp);
  const transports = asRows<TransportRow>(transportsResp);
  const days = asRows<DayCountRow>(daysResp);

  const totals = {
    overall_cents: 0,
    accommodation_cents: 0,
    plane_cents: 0,
    car_cents: 0,
    activities_cents: 0,
    food_cents: 0,
    other_cents: 0,
    paid_cents: 0,
    pending_cents: 0,
    per_person_cents: 0,
  };

  for (const exp of expenses) {
    const cents = Number(exp.amount_base_cents ?? exp.amount_cents ?? 0);
    totals.overall_cents += cents;
    if (exp.type === 'transport') {
      const sub = (exp.subtype ?? '').toLowerCase();
      if (sub.includes('voiture') || sub.includes('car') || sub.includes('taxi') || sub.includes('train') || sub.includes('bus')) {
        totals.car_cents += cents;
      } else {
        totals.plane_cents += cents;
      }
    } else {
      const field = TYPE_TO_FIELD[exp.type];
      (totals as Record<string, number>)[field] += cents;
    }
    if (exp.payment_status === 'unpaid') totals.pending_cents += cents;
  }

  for (const p of payments) {
    totals.paid_cents += Number(p.paid_cents ?? 0);
  }

  const transport = {
    total_distance_km: 0,
    plane_distance_km: 0,
    car_distance_km: 0,
    total_duration_minutes: 0,
    total_emission_kgco2e: 0,
  };
  for (const s of transports) {
    const km = Number(s.distance_km ?? 0);
    const m = Number(s.duration_minutes ?? 0);
    transport.total_distance_km += km;
    transport.total_duration_minutes += m;
    transport.total_emission_kgco2e += Number(s.emission_kgco2e ?? 0);
    if (s.mode === 'plane') transport.plane_distance_km += km;
    if (s.mode === 'car') transport.car_distance_km += km;
    if (s.cost_cents) totals.overall_cents += Number(s.cost_cents);
  }

  const membersCount = members.length || 1;
  totals.per_person_cents = Math.round(totals.overall_cents / membersCount);

  return {
    totals,
    transport: {
      total_distance_km: Math.round(transport.total_distance_km),
      plane_distance_km: Math.round(transport.plane_distance_km),
      car_distance_km: Math.round(transport.car_distance_km),
      total_duration_minutes: transport.total_duration_minutes,
      total_emission_kgco2e: Math.round(transport.total_emission_kgco2e * 10) / 10,
    },
    members_count: membersCount,
    days_count: days.length,
  };
}
