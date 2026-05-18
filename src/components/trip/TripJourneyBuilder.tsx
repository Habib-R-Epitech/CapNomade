'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Plane,
  Car,
  Train,
  Bus,
  Ship,
  Bike,
  Move,
  Plus,
  Trash2,
  Loader2,
  Route,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  JOURNEY_MODE_ORDER,
  TRANSPORT_PROFILES,
  estimateLeg,
  formatDuration,
} from '@/lib/transport/profiles';
import { setTripJourneyAction } from '@/server/actions/journey';
import type { TransportMode } from '@/lib/types/database';

export interface JourneyCity {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

export interface JourneyLeg {
  origin_stop_id: string;
  destination_stop_id: string;
  mode: TransportMode;
}

interface Props {
  tripId: string;
  cities: JourneyCity[];
  initialLegs: JourneyLeg[];
  canEdit: boolean;
}

const ICON: Record<TransportMode, typeof Plane> = {
  plane: Plane,
  car: Car,
  motorcycle: Bike,
  bus: Bus,
  train: Train,
  ferry: Ship,
  other: Move,
};

export function TripJourneyBuilder({ tripId, cities, initialLegs, canEdit }: Props) {
  const router = useRouter();
  const [legs, setLegs] = React.useState<JourneyLeg[]>(initialLegs);
  const [saving, setSaving] = React.useState(false);
  // Track whether the user has edited so the Save button is meaningful.
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setLegs(initialLegs);
    setDirty(false);
  }, [initialLegs]);

  const cityById = React.useMemo(() => {
    const m = new Map<string, JourneyCity>();
    for (const c of cities) m.set(c.id, c);
    return m;
  }, [cities]);

  // Compute estimates for each leg; skip legs missing one endpoint.
  const enriched = React.useMemo(() => {
    return legs.map((leg) => {
      const from = cityById.get(leg.origin_stop_id);
      const to = cityById.get(leg.destination_stop_id);
      if (!from || !to) return { leg, from, to, estimate: null };
      return {
        leg,
        from,
        to,
        estimate: estimateLeg(leg.mode, from.lng, from.lat, to.lng, to.lat),
      };
    });
  }, [legs, cityById]);

  // Per-vehicle totals; modes with 0 duration are hidden by design.
  const totals = React.useMemo(() => {
    const acc = new Map<TransportMode, { km: number; minutes: number }>();
    for (const { leg, estimate } of enriched) {
      if (!estimate) continue;
      const prev = acc.get(leg.mode) ?? { km: 0, minutes: 0 };
      acc.set(leg.mode, {
        km: prev.km + estimate.distanceKm,
        minutes: prev.minutes + estimate.durationMinutes,
      });
    }
    return Array.from(acc.entries())
      .filter(([, v]) => v.minutes > 0)
      .map(([mode, v]) => ({ mode, ...v }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [enriched]);

  if (cities.length === 0 && legs.length === 0) {
    return canEdit ? (
      <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Route className="size-4" /> Les étapes
        </p>
        <p className="mt-2">
          Ajoutez d&apos;abord des villes au voyage (barre « Villes visitées » ci-dessus)
          pour construire l&apos;itinéraire entre elles.
        </p>
      </div>
    ) : null;
  }

  function update(index: number, patch: Partial<JourneyLeg>) {
    setLegs((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (!cur) return prev;
      next[index] = { ...cur, ...patch };
      return next;
    });
    setDirty(true);
  }

  function remove(index: number) {
    setLegs((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function addLeg() {
    const lastLeg = legs[legs.length - 1];
    const firstCity = cities[0];
    if (!firstCity) return;
    const origin_stop_id = lastLeg?.destination_stop_id ?? firstCity.id;
    // Pick a destination that isn't the origin if possible.
    const destination_stop_id =
      cities.find((c) => c.id !== origin_stop_id)?.id ?? origin_stop_id;
    setLegs((prev) => [...prev, { origin_stop_id, destination_stop_id, mode: 'plane' }]);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    const res = await setTripJourneyAction({ trip_id: tripId, legs });
    setSaving(false);
    if (!res.ok) {
      toast.error('Enregistrement impossible', { description: res.error });
      return;
    }
    toast.success('Itinéraire enregistré');
    setDirty(false);
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <Route className="size-4 text-muted-foreground" /> Les étapes
        </h3>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addLeg} disabled={cities.length === 0}>
              <Plus className="size-4" /> Ajouter une étape
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        )}
      </header>

      {legs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canEdit
            ? 'Ajoutez une étape pour commencer à tracer votre itinéraire.'
            : 'Pas d’itinéraire enregistré.'}
        </p>
      ) : (
        <ol className="space-y-2">
          {enriched.map(({ leg, from, to, estimate }, i) => {
            const Icon = ICON[leg.mode];
            return (
              <li
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/50 p-3 text-sm"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {i + 1}.
                </span>

                <CitySelect
                  value={leg.origin_stop_id}
                  cities={cities}
                  disabled={!canEdit}
                  onChange={(id) => update(i, { origin_stop_id: id })}
                />

                <span className="text-muted-foreground">→</span>

                <ModeSelect
                  value={leg.mode}
                  disabled={!canEdit}
                  onChange={(m) => update(i, { mode: m })}
                />

                <span className="text-muted-foreground">→</span>

                <CitySelect
                  value={leg.destination_stop_id}
                  cities={cities}
                  disabled={!canEdit}
                  onChange={(id) => update(i, { destination_stop_id: id })}
                />

                <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="size-3.5" />
                  {estimate && from && to ? (
                    <>
                      {estimate.distanceKm} km · {formatDuration(estimate.durationMinutes)}
                    </>
                  ) : (
                    <span className="italic">Coordonnées manquantes</span>
                  )}
                </span>

                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(i)}
                    aria-label="Retirer l'étape"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {totals.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total par moyen
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {totals.map(({ mode, km, minutes }) => {
              const Icon = ICON[mode];
              return (
                <li key={mode} className="flex items-center gap-2 text-sm">
                  <Icon className="size-4 text-primary" />
                  <span className="font-medium">{TRANSPORT_PROFILES[mode].label}</span>
                  <span className="text-muted-foreground">
                    {km} km · {formatDuration(minutes)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function CitySelect({
  value,
  cities,
  disabled,
  onChange,
}: {
  value: string;
  cities: JourneyCity[];
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {cities.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

function ModeSelect({
  value,
  disabled,
  onChange,
}: {
  value: TransportMode;
  disabled: boolean;
  onChange: (m: TransportMode) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as TransportMode)}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {JOURNEY_MODE_ORDER.map((m) => (
        <option key={m} value={m}>
          {TRANSPORT_PROFILES[m].label}
        </option>
      ))}
    </select>
  );
}
