import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface GlobalStats {
  countriesVisited: number;
  tripsCompleted: number;
  tripsPlanned: number;
  totalFlightHours: number;
  totalFlightKm: number;
  totalCarKm: number;
  totalCarHours: number;
  totalCarbonKg: number;
  totalSpentCents: number;
  averageTripSpendCents: number;
  mostExpensiveTrip: { trip_id: string; title: string; amount: number } | null;
  cheapestTrip: { trip_id: string; title: string; amount: number } | null;
  averageDailyCents: number;
  averagePerPersonCents: number;
  topCountries: Array<{ country: string; count: number }>;
  topExpenseCategories: Array<{ type: string; total_cents: number }>;
  annualTimeline: Array<{ year: number; trips: number }>;
}

export async function loadGlobalStats(userId: string): Promise<GlobalStats> {
  const supabase = await getSupabaseServerClient();

  // Only count trips where the user is a member.
  const { data: trips } = await supabase
    .from('trips')
    .select('id, title, status, start_date, end_date, primary_countries, base_currency, total_budget_cents, trip_members!inner(user_id)')
    .eq('trip_members.user_id', userId);

  const tripsArr = trips ?? [];
  const completedTrips = tripsArr.filter((t) => t.status === 'completed');
  const plannedTrips = tripsArr.filter((t) => t.status === 'planning' || t.status === 'booked');
  const tripIds = tripsArr.map((t) => t.id);

  // Country aggregation
  const countrySet = new Set<string>();
  const countryCount = new Map<string, number>();
  for (const t of completedTrips) {
    for (const c of t.primary_countries ?? []) {
      countrySet.add(c);
      countryCount.set(c, (countryCount.get(c) ?? 0) + 1);
    }
  }
  const annualMap = new Map<number, number>();
  for (const t of completedTrips) {
    if (t.start_date) {
      const year = new Date(t.start_date).getFullYear();
      annualMap.set(year, (annualMap.get(year) ?? 0) + 1);
    }
  }

  // Transports
  const transportsRes = tripIds.length
    ? await supabase
        .from('transport_segments')
        .select('mode, duration_minutes, distance_km, emission_kgco2e, trip_id')
        .in('trip_id', tripIds)
    : { data: [] as any[] };
  const transports = transportsRes.data ?? [];

  let flightMinutes = 0;
  let flightKm = 0;
  let carKm = 0;
  let carMinutes = 0;
  let carbonKg = 0;
  for (const seg of transports) {
    carbonKg += Number(seg.emission_kgco2e ?? 0);
    if (seg.mode === 'plane') {
      flightMinutes += Number(seg.duration_minutes ?? 0);
      flightKm += Number(seg.distance_km ?? 0);
    } else if (seg.mode === 'car') {
      carMinutes += Number(seg.duration_minutes ?? 0);
      carKm += Number(seg.distance_km ?? 0);
    }
  }

  // Expenses (only completed trips)
  const completedIds = completedTrips.map((t) => t.id);
  const expensesRes = completedIds.length
    ? await supabase
        .from('expenses')
        .select('trip_id, type, amount_cents, amount_base_cents, currency')
        .in('trip_id', completedIds)
    : { data: [] as any[] };
  const expenses = expensesRes.data ?? [];

  const totalsByTrip = new Map<string, number>();
  const totalsByType = new Map<string, number>();
  let totalSpentCents = 0;
  for (const e of expenses) {
    const cents = Number(e.amount_base_cents ?? e.amount_cents ?? 0);
    totalSpentCents += cents;
    totalsByTrip.set(e.trip_id, (totalsByTrip.get(e.trip_id) ?? 0) + cents);
    totalsByType.set(e.type, (totalsByType.get(e.type) ?? 0) + cents);
  }

  let mostExpensive: GlobalStats['mostExpensiveTrip'] = null;
  let cheapest: GlobalStats['cheapestTrip'] = null;
  for (const [tripId, total] of totalsByTrip) {
    const t = completedTrips.find((x) => x.id === tripId);
    if (!t) continue;
    if (!mostExpensive || total > mostExpensive.amount) {
      mostExpensive = { trip_id: tripId, title: t.title, amount: total };
    }
    if (!cheapest || total < cheapest.amount) {
      cheapest = { trip_id: tripId, title: t.title, amount: total };
    }
  }

  const avgTrip =
    completedTrips.length > 0 ? Math.round(totalSpentCents / completedTrips.length) : 0;

  let totalDays = 0;
  for (const t of completedTrips) {
    if (t.start_date && t.end_date) {
      const s = new Date(t.start_date).getTime();
      const e = new Date(t.end_date).getTime();
      totalDays += Math.max(1, Math.round((e - s) / 86400000) + 1);
    }
  }
  const avgDaily = totalDays > 0 ? Math.round(totalSpentCents / totalDays) : 0;

  // Per-person — count members of completed trips
  const memberRes = completedIds.length
    ? await supabase.from('trip_members').select('trip_id, user_id').in('trip_id', completedIds)
    : { data: [] as any[] };
  const memberCounts = new Map<string, number>();
  for (const m of memberRes.data ?? []) {
    memberCounts.set(m.trip_id, (memberCounts.get(m.trip_id) ?? 0) + 1);
  }
  let perPersonSum = 0;
  let perPersonTripCount = 0;
  for (const [tripId, total] of totalsByTrip) {
    const members = memberCounts.get(tripId) ?? 1;
    perPersonSum += total / members;
    perPersonTripCount += 1;
  }
  const avgPerPerson =
    perPersonTripCount > 0 ? Math.round(perPersonSum / perPersonTripCount) : 0;

  return {
    countriesVisited: countrySet.size,
    tripsCompleted: completedTrips.length,
    tripsPlanned: plannedTrips.length,
    totalFlightHours: Math.round((flightMinutes / 60) * 10) / 10,
    totalFlightKm: Math.round(flightKm),
    totalCarKm: Math.round(carKm),
    totalCarHours: Math.round((carMinutes / 60) * 10) / 10,
    totalCarbonKg: Math.round(carbonKg * 10) / 10,
    totalSpentCents,
    averageTripSpendCents: avgTrip,
    mostExpensiveTrip: mostExpensive,
    cheapestTrip: cheapest,
    averageDailyCents: avgDaily,
    averagePerPersonCents: avgPerPerson,
    topCountries: [...countryCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, count })),
    topExpenseCategories: [...totalsByType.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, total_cents]) => ({ type, total_cents })),
    annualTimeline: [...annualMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, trips]) => ({ year, trips })),
  };
}
