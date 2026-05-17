'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CityAutocomplete } from '@/components/ui/city-autocomplete';
import { quickAddCityAction, deleteStopAction } from '@/server/actions/tripDetail';

export interface TripCity {
  id: string;
  name: string;
  city: string | null;
}

interface Props {
  tripId: string;
  cities: TripCity[];
  countries: string[];
  canEdit: boolean;
}

export function TripCitiesBar({ tripId, cities, countries, canEdit }: Props) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handlePick(city: {
    name: string;
    context: string;
    lng?: number | null;
    lat?: number | null;
  }) {
    const name = city.name.trim();
    if (!name) return;
    setPending(true);
    const res = await quickAddCityAction({
      trip_id: tripId,
      name,
      lng: city.lng ?? null,
      lat: city.lat ?? null,
    });
    setPending(false);
    if (!res.ok) {
      toast.error('Ajout impossible', { description: res.error });
      return;
    }
    setAdding(false);
    router.refresh();
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Retirer "${name}" du voyage ?`)) return;
    const res = await deleteStopAction(id);
    if (!res.ok) {
      toast.error('Suppression impossible', { description: res.error });
      return;
    }
    router.refresh();
  }

  if (cities.length === 0 && !canEdit) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
        <MapPin className="size-3.5" /> Villes visitées
      </span>
      {cities.map((c) => (
        <span
          key={c.id}
          className="group inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-0.5 text-sm"
        >
          <span>{c.name}</span>
          {canEdit && (
            <button
              type="button"
              onClick={() => remove(c.id, c.name)}
              className="opacity-0 transition group-hover:opacity-100 hover:text-destructive"
              aria-label={`Retirer ${c.name}`}
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
      {canEdit && !adding && (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="h-7 rounded-full px-3 text-xs">
          <Plus className="size-3.5" /> Ajouter une ville
        </Button>
      )}
      {canEdit && adding && (
        <CityAutocomplete
          autoFocus
          disabled={pending}
          countries={countries}
          placeholder={countries.length > 0 ? `Ville dans ${countries.join(', ')}…` : 'Rechercher une ville…'}
          onPick={handlePick}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
}
