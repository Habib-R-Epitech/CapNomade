import { Plane, Car, Train, Bus, Ship, Bike, Move } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { CarbonMethod, TransportMode } from '@/lib/types/database';

interface Segment {
  id: string;
  mode: TransportMode;
  origin_label: string | null;
  destination_label: string | null;
  depart_at: string | null;
  arrive_at: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  carrier: string | null;
  reference: string | null;
  emission_kgco2e: number | null;
  emission_method: CarbonMethod | null;
  emission_confidence: string | null;
  cost_cents: number | null;
  cost_currency: string | null;
}

const ICON: Record<TransportMode, typeof Plane> = {
  plane: Plane,
  car: Car,
  train: Train,
  bus: Bus,
  ferry: Ship,
  motorcycle: Bike,
  other: Move,
};

const METHOD_LABEL: Record<CarbonMethod, string> = {
  travel_impact_model: 'Travel Impact Model',
  distance_factor: 'Facteur distance',
  fallback: 'Estimation par défaut',
  manual: 'Saisi manuellement',
};

export function TripTransports({ segments, canEdit: _canEdit }: { segments: Segment[]; canEdit: boolean }) {
  if (segments.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Aucun segment de transport enregistré.
      </Card>
    );
  }
  return (
    <ul className="space-y-3">
      {segments.map((s) => {
        const Icon = ICON[s.mode];
        return (
          <li key={s.id}>
            <Card className="flex flex-wrap items-start gap-4 p-4">
              <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium">
                  {s.origin_label ?? '—'} <span className="text-muted-foreground">→</span>{' '}
                  {s.destination_label ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[s.carrier, s.reference].filter(Boolean).join(' · ')}
                  {s.duration_minutes != null && (
                    <span className="ml-2">
                      {Math.floor(s.duration_minutes / 60)} h {s.duration_minutes % 60} min
                    </span>
                  )}
                  {s.distance_km != null && (
                    <span className="ml-2">{formatNumber(Number(s.distance_km))} km</span>
                  )}
                </p>
                {s.emission_kgco2e != null && (
                  <p className="text-xs">
                    <Badge variant="muted">
                      CO₂ : {formatNumber(Number(s.emission_kgco2e), 'fr-FR', 1)} kg
                      {s.emission_method ? ` · ${METHOD_LABEL[s.emission_method]}` : ''}
                      {s.emission_confidence ? ` · confiance ${s.emission_confidence}` : ''}
                    </Badge>
                  </p>
                )}
              </div>
              {s.cost_cents != null && (
                <span className="self-center text-sm font-medium">
                  {formatCurrency(s.cost_cents, s.cost_currency ?? 'EUR')}
                </span>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
