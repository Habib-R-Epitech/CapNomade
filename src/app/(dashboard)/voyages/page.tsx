import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Plane } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { asRows } from '@/lib/supabase/helpers';
import { Button } from '@/components/ui/button';
import { TripCard, type TripCardData } from '@/components/dashboard/TripCard';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Mes voyages', robots: { index: false, follow: false } };

export default async function TripsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const resp = await supabase
    .from('trips')
    .select(
      'id, title, slug, status, description, start_date, end_date, cover_image_url, primary_countries, trip_members!inner(user_id)',
    )
    .eq('trip_members.user_id', session.userId)
    .in('status', ['completed', 'archived'])
    .order('end_date', { ascending: false, nullsFirst: false });

  const trips = asRows<TripCardData>(resp);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Carnet</p>
          <h1 className="font-serif text-3xl font-semibold md:text-4xl">Mes voyages</h1>
        </div>
        <Button asChild>
          <Link href="/voyages/nouveau">
            <Plus className="size-4" /> Nouveau voyage
          </Link>
        </Button>
      </header>

      {trips.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="Pas encore de voyage réalisé"
          description="Quand vous marquerez un voyage en cours comme terminé, il apparaîtra ici."
          action={
            <Button asChild variant="outline">
              <Link href="/voyages/planifies">Voir mes voyages planifiés</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => (
            <TripCard
              key={t.id}
              trip={{
                id: t.id,
                title: t.title,
                slug: t.slug,
                status: t.status,
                start_date: t.start_date,
                end_date: t.end_date,
                cover_image_url: t.cover_image_url,
                primary_countries: t.primary_countries ?? [],
                description: t.description,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
