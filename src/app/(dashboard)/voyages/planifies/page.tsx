import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, MapPinned } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { TripCard } from '@/components/dashboard/TripCard';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Voyages planifiés', robots: { index: false, follow: false } };

export default async function PlannedTripsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const { data: trips = [] } = await supabase
    .from('trips')
    .select('id, title, slug, status, description, start_date, end_date, cover_image_url, primary_countries, trip_members!inner(user_id)')
    .eq('trip_members.user_id', session.userId)
    .in('status', ['draft', 'planning', 'booked'])
    .order('start_date', { ascending: true, nullsFirst: true });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">À venir</p>
          <h1 className="font-serif text-3xl font-semibold md:text-4xl">Voyages planifiés</h1>
        </div>
        <Button asChild>
          <Link href="/voyages/nouveau">
            <Plus className="size-4" /> Nouveau voyage
          </Link>
        </Button>
      </header>

      {(trips ?? []).length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="Aucun voyage en planification"
          description="Lancez un nouveau projet de voyage ou convertissez une envie en voyage planifié."
          action={
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/voyages/nouveau">Créer un voyage</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/envies">Mes envies</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(trips ?? []).map((t) => (
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
