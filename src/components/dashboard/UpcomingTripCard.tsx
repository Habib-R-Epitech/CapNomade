import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateRange } from '@/lib/utils';

export interface UpcomingTrip {
  id: string;
  title: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  primary_countries: string[];
  days_until: number;
}

export function UpcomingTripCard({ trip }: { trip: UpcomingTrip | null }) {
  if (!trip) return null;
  return (
    <Card className="relative overflow-hidden border-coral-200/40 bg-gradient-to-br from-coral-50 via-background to-ocean-50 dark:from-coral-900/30 dark:via-background dark:to-ocean-900/20">
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="accent">Prochain voyage</Badge>
          <span className="text-xs text-muted-foreground">
            Dans {trip.days_until} {trip.days_until === 1 ? 'jour' : 'jours'}
          </span>
        </div>
        <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight">{trip.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {(trip.start_date || trip.end_date) && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" />
              {formatDateRange(trip.start_date, trip.end_date)}
            </span>
          )}
          {trip.primary_countries.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              {trip.primary_countries.join(', ')}
            </span>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/voyages/${trip.slug}`}>Ouvrir le voyage</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/voyages/${trip.slug}/planning`}>Voir le planning</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
