import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDateRange } from '@/lib/utils';
import type { TripStatus } from '@/lib/types/database';

const STATUS_LABEL: Record<TripStatus, { label: string; tone: 'default' | 'success' | 'warning' | 'muted' }> = {
  wishlist: { label: 'Envie', tone: 'default' },
  draft: { label: 'Brouillon', tone: 'muted' },
  planning: { label: 'Planning', tone: 'default' },
  booked: { label: 'Réservé', tone: 'warning' },
  completed: { label: 'Réalisé', tone: 'success' },
  archived: { label: 'Archivé', tone: 'muted' },
};

export interface TripCardData {
  id: string;
  title: string;
  slug: string;
  status: TripStatus;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  primary_countries: string[];
  description: string | null;
}

export function TripCard({ trip }: { trip: TripCardData }) {
  const tone = STATUS_LABEL[trip.status];
  return (
    <Link href={`/voyages/${trip.slug}`} className="group block">
      <Card className="overflow-hidden">
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-ocean-100 via-sand-100 to-coral-100 dark:from-ocean-900 dark:via-ocean-800 dark:to-coral-900">
          {trip.cover_image_url ? (
            // Plain <img> rather than next/image: the cover URL is a Supabase
            // public-bucket file and the optimizer adds latency + a failure
            // point that bit us before. Cards are small so the win is marginal.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.cover_image_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium uppercase tracking-widest text-ocean-700/60 dark:text-ocean-200/50">
              {trip.primary_countries.join(' · ') || 'Sans destination'}
            </div>
          )}
          <Badge variant={tone.tone} className="absolute left-3 top-3 backdrop-blur">
            {tone.label}
          </Badge>
        </div>
        <div className="space-y-1.5 p-4">
          <h3 className="line-clamp-1 font-serif text-lg font-semibold">{trip.title}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {(trip.start_date || trip.end_date) && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3" />
                {formatDateRange(trip.start_date, trip.end_date)}
              </span>
            )}
            {trip.primary_countries.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {trip.primary_countries.slice(0, 2).join(', ')}
              </span>
            )}
          </div>
          {trip.description && (
            <p className="line-clamp-2 pt-1 text-sm text-muted-foreground">{trip.description}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}
