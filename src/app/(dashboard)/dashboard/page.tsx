import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Plane,
  MapPinned,
  Heart,
  Mail,
  CalendarClock,
  Sparkles,
} from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { loadGlobalStats } from '@/lib/stats/globalStats';
import { StatsTiles } from '@/components/dashboard/StatsTiles';
import { UpcomingTripCard } from '@/components/dashboard/UpcomingTripCard';
import { WidgetCard } from '@/components/dashboard/WidgetCard';
import { WorldMap, type MapTripPoint } from '@/components/dashboard/WorldMap';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Dashboard', robots: { index: false, follow: false } };

export default async function DashboardHome() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [
    { data: nextTrip },
    { data: recentTrips },
    { data: wishes },
    { count: pendingInvites },
    stats,
    pointsResp,
  ] = await Promise.all([
    supabase
      .from('trips')
      .select('id, title, slug, start_date, end_date, primary_countries, trip_members!inner(user_id)')
      .in('status', ['planning', 'booked'])
      .eq('trip_members.user_id', session.userId)
      .gte('start_date', new Date().toISOString().slice(0, 10))
      .order('start_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('trips')
      .select('id, title, slug, status, updated_at, trip_members!inner(user_id)')
      .eq('trip_members.user_id', session.userId)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('wish_items')
      .select('id, title, country, status, priority')
      .eq('user_id', session.userId)
      .order('priority', { ascending: false })
      .limit(5),
    supabase
      .from('trip_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('invited_email', session.email)
      .eq('status', 'pending'),
    loadGlobalStats(session.userId),
    supabase
      .from('trip_stops')
      .select('trip_id, location, trips!inner(slug, title, status, start_date, end_date, trip_members!inner(user_id))')
      .eq('trips.trip_members.user_id', session.userId)
      .not('location', 'is', null)
      .limit(500),
  ]);

  const days_until = nextTrip?.start_date
    ? Math.max(
        0,
        Math.round((new Date(nextTrip.start_date).getTime() - Date.now()) / 86400000),
      )
    : 0;

  // Build map points from stops' geographies — we receive WKT-ish GeoJSON via supabase-js.
  const points: MapTripPoint[] = [];
  const seen = new Set<string>();
  for (const stop of pointsResp.data ?? []) {
    const tripJoin = stop.trips as unknown as {
      slug: string;
      title: string;
      status: string;
      start_date: string | null;
      end_date: string | null;
    };
    if (!tripJoin || seen.has(stop.trip_id)) continue;
    const coords = extractLngLat(stop.location);
    if (!coords) continue;
    points.push({
      trip_id: stop.trip_id,
      slug: tripJoin.slug,
      title: tripJoin.title,
      status: tripJoin.status,
      lat: coords.lat,
      lng: coords.lng,
      start_date: tripJoin.start_date,
      end_date: tripJoin.end_date,
    });
    seen.add(stop.trip_id);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Bonjour {session.profile.full_name?.split(' ')[0] ?? ''}
        </p>
        <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">
          Quel sera le prochain voyage ?
        </h1>
      </header>

      {nextTrip && (
        <UpcomingTripCard
          trip={{
            id: nextTrip.id,
            title: nextTrip.title,
            slug: nextTrip.slug,
            start_date: nextTrip.start_date,
            end_date: nextTrip.end_date,
            primary_countries: (nextTrip as { primary_countries?: string[] }).primary_countries ?? [],
            days_until,
          }}
        />
      )}

      <section aria-labelledby="map-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="map-heading" className="font-serif text-xl font-semibold">
            Vos voyages sur la carte
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/voyages">Tout voir</Link>
          </Button>
        </div>
        {points.length > 0 ? (
          <WorldMap points={points} />
        ) : (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Vos voyages apparaîtront ici dès que vous aurez ajouté des étapes géolocalisées.
          </div>
        )}
      </section>

      <section aria-labelledby="stats-heading" className="space-y-3">
        <h2 id="stats-heading" className="font-serif text-xl font-semibold">
          Vie de voyageur
        </h2>
        <StatsTiles stats={stats} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WidgetCard
          title="Voyages réalisés"
          icon={Plane}
          count={stats.tripsCompleted}
          href="/voyages"
          emptyHint="Aucun voyage réalisé pour le moment."
        />
        <WidgetCard
          title="Voyages planifiés"
          icon={MapPinned}
          count={stats.tripsPlanned}
          href="/voyages/planifies"
          emptyHint="Aucun voyage en planification."
        />
        <WidgetCard
          title="Mes envies"
          icon={Heart}
          count={(wishes ?? []).length}
          href="/envies"
        >
          {(wishes ?? []).slice(0, 3).map((w) => (
            <div key={w.id} className="flex items-center justify-between border-t pt-2 text-sm">
              <span className="truncate">{w.title}</span>
              <Badge variant="muted">{w.status}</Badge>
            </div>
          ))}
        </WidgetCard>
        <WidgetCard
          title="Invitations en attente"
          icon={Mail}
          count={pendingInvites ?? 0}
          href="/invitations"
          emptyHint="Aucune invitation en attente."
        />
      </section>

      <section aria-labelledby="recent-heading" className="space-y-3">
        <h2 id="recent-heading" className="flex items-center gap-2 font-serif text-xl font-semibold">
          <CalendarClock className="size-5 text-muted-foreground" /> Récemment modifié
        </h2>
        <div className="rounded-xl border bg-card">
          {(recentTrips ?? []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Vous n&apos;avez pas encore de voyage.{' '}
              <Link href="/voyages/nouveau" className="text-primary hover:underline">
                Créer le premier ?
              </Link>
            </div>
          ) : (
            <ul className="divide-y">
              {(recentTrips ?? []).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/voyages/${t.slug}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Modifié le {new Date(t.updated_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant="muted">{t.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-card/60 p-6">
        <header className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="size-4 text-primary" /> Conseil express
        </header>
        <p className="mt-1 max-w-2xl text-sm">
          Pensez à importer vos vieux fichiers Excel dans{' '}
          <Link href="/import" className="font-medium text-primary hover:underline">
            Import
          </Link>{' '}
          — l&apos;assistant détecte automatiquement la zone &quot;planning&quot; et la zone
          &quot;dépenses&quot; dans la plupart des feuilles.
        </p>
      </section>
    </div>
  );
}

function extractLngLat(geo: unknown): { lng: number; lat: number } | null {
  if (!geo) return null;
  // PostGIS via supabase-js returns GeoJSON-like objects, hex EWKB strings, or wkt depending on config.
  if (typeof geo === 'object' && geo !== null && 'coordinates' in geo) {
    const c = (geo as { coordinates: unknown }).coordinates;
    if (Array.isArray(c) && c.length >= 2) return { lng: Number(c[0]), lat: Number(c[1]) };
  }
  if (typeof geo === 'string' && geo.startsWith('POINT')) {
    const m = /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(geo);
    if (m) return { lng: Number(m[1]), lat: Number(m[2]) };
  }
  return null;
}
