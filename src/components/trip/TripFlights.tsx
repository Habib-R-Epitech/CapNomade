'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plane, Plus, X, Loader2, Leaf, Clock, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CityAutocomplete } from '@/components/ui/city-autocomplete';
import { setTripFlightsAction } from '@/server/actions/flights';
import { formatDuration } from '@/lib/transport/profiles';

export interface FlightWaypoint {
  name: string;
  lng: number;
  lat: number;
}

export interface TripFlight {
  direction: 'outbound' | 'return';
  waypoints: FlightWaypoint[];
  total_distance_km: number;
  total_duration_minutes: number;
  total_emission_kgco2e: number;
}

interface Props {
  tripId: string;
  countries: string[]; // ISO2 — scopes the autocomplete suggestions
  initialFlights: TripFlight[];
  canEdit: boolean;
}

const HAVERSINE_R = 6371;
function haversineKm(a: FlightWaypoint, b: FlightWaypoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * HAVERSINE_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Same model the server uses — kept here to give the user a live preview
// before they click Enregistrer.
function preview(waypoints: FlightWaypoint[]): {
  km: number;
  minutes: number;
  kgCO2: number;
} {
  if (waypoints.length < 2) return { km: 0, minutes: 0, kgCO2: 0 };
  let km = 0;
  let minutes = 90;
  let co2 = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1]!;
    const b = waypoints[i]!;
    const d = haversineKm(a, b);
    km += d;
    minutes += (d / 800) * 60 + 30;
    // Coarse plane factor (kg CO₂e per pax-km) × radiative-forcing 1.9 — matches
    // server defaults: short ≈ 0.15, medium ≈ 0.12, long ≈ 0.11.
    const factor = d < 1500 ? 0.15 : d < 4000 ? 0.12 : 0.11;
    co2 += d * factor * 1.9;
  }
  return { km: Math.round(km), minutes: Math.round(minutes), kgCO2: Math.round(co2 * 10) / 10 };
}

export function TripFlights({ tripId, countries, initialFlights, canEdit }: Props) {
  const router = useRouter();
  const initialOutbound = initialFlights.find((f) => f.direction === 'outbound');
  const initialReturn = initialFlights.find((f) => f.direction === 'return');

  const [outbound, setOutbound] = React.useState<FlightWaypoint[]>(initialOutbound?.waypoints ?? []);
  const [back, setBack] = React.useState<FlightWaypoint[]>(initialReturn?.waypoints ?? []);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setOutbound(initialOutbound?.waypoints ?? []);
    setBack(initialReturn?.waypoints ?? []);
    setDirty(false);
  }, [initialOutbound, initialReturn]);

  async function save() {
    setSaving(true);
    const res = await setTripFlightsAction({
      trip_id: tripId,
      flights: [
        { direction: 'outbound', waypoints: outbound },
        { direction: 'return', waypoints: back },
      ],
    });
    setSaving(false);
    if (!res.ok) {
      toast.error('Enregistrement impossible', { description: res.error });
      return;
    }
    toast.success('Vols enregistrés');
    setDirty(false);
    router.refresh();
  }

  const anyData = outbound.length > 0 || back.length > 0;
  if (!canEdit && !anyData) return null;

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <Plane className="size-4 text-muted-foreground" /> Vols
        </h3>
        {canEdit && (
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
        )}
      </header>

      <FlightEditor
        label="Vol aller"
        waypoints={outbound}
        onChange={(wp) => {
          setOutbound(wp);
          setDirty(true);
        }}
        countries={countries}
        canEdit={canEdit}
      />

      <FlightEditor
        label="Vol retour"
        waypoints={back}
        onChange={(wp) => {
          setBack(wp);
          setDirty(true);
        }}
        countries={countries}
        canEdit={canEdit}
      />
    </section>
  );
}

function FlightEditor({
  label,
  waypoints,
  onChange,
  countries,
  canEdit,
}: {
  label: string;
  waypoints: FlightWaypoint[];
  onChange: (wp: FlightWaypoint[]) => void;
  countries: string[];
  canEdit: boolean;
}) {
  const totals = preview(waypoints);
  const departure = waypoints[0] ?? null;
  const arrival = waypoints.length >= 2 ? waypoints[waypoints.length - 1] : null;
  const layovers = waypoints.length >= 2 ? waypoints.slice(1, -1) : [];

  // We track which "slot" is in autocomplete-edit mode so we can show the
  // picker without nesting a bunch of state.
  const [editingSlot, setEditingSlot] = React.useState<
    'departure' | 'arrival' | { layoverIndex: number } | 'new-layover' | null
  >(null);

  function setDeparture(wp: FlightWaypoint | null) {
    const rest = waypoints.slice(1);
    if (!wp) {
      onChange(rest.length > 0 ? rest : []);
      return;
    }
    onChange(rest.length > 0 ? [wp, ...rest] : [wp]);
  }

  function setArrival(wp: FlightWaypoint | null) {
    if (waypoints.length === 0) {
      onChange(wp ? [wp] : []);
      return;
    }
    if (waypoints.length === 1) {
      onChange(wp ? [waypoints[0]!, wp] : [waypoints[0]!]);
      return;
    }
    if (!wp) {
      onChange(waypoints.slice(0, -1));
      return;
    }
    onChange([...waypoints.slice(0, -1), wp]);
  }

  function setLayover(index: number, wp: FlightWaypoint | null) {
    // layovers are indices 1..length-2 of waypoints
    const realIndex = index + 1;
    if (!wp) {
      onChange(waypoints.filter((_, i) => i !== realIndex));
      return;
    }
    const next = [...waypoints];
    next[realIndex] = wp;
    onChange(next);
  }

  function addLayover(wp: FlightWaypoint) {
    if (waypoints.length < 2) {
      // No arrival yet — treat the layover as arrival.
      onChange([...waypoints, wp]);
      return;
    }
    const next = [...waypoints];
    next.splice(next.length - 1, 0, wp);
    onChange(next);
  }

  return (
    <div className="space-y-2 rounded-lg border bg-background/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        {waypoints.length >= 2 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Ruler className="size-3.5" /> {totals.km} km
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {formatDuration(totals.minutes)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Leaf className="size-3.5" /> {formatKg(totals.kgCO2)} CO₂e
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        <WaypointRow
          slotLabel="Départ"
          waypoint={departure}
          editing={editingSlot === 'departure'}
          canEdit={canEdit}
          onStartEdit={() => setEditingSlot('departure')}
          onCancel={() => setEditingSlot(null)}
          onPick={(wp) => {
            setDeparture(wp);
            setEditingSlot(null);
          }}
          onClear={() => setDeparture(null)}
          countries={countries}
        />

        {layovers.map((layover, i) => {
          const isEditing =
            editingSlot && typeof editingSlot === 'object' && 'layoverIndex' in editingSlot && editingSlot.layoverIndex === i;
          return (
            <WaypointRow
              key={`layover-${i}`}
              slotLabel={`Escale ${i + 1}`}
              waypoint={layover}
              editing={!!isEditing}
              canEdit={canEdit}
              onStartEdit={() => setEditingSlot({ layoverIndex: i })}
              onCancel={() => setEditingSlot(null)}
              onPick={(wp) => {
                setLayover(i, wp);
                setEditingSlot(null);
              }}
              onClear={() => setLayover(i, null)}
              countries={countries}
            />
          );
        })}

        {canEdit && (
          editingSlot === 'new-layover' ? (
            <div className="flex items-center gap-2 pl-3">
              <CityAutocomplete
                autoFocus
                countries={countries}
                placeholder="Ville d'escale…"
                onPick={(c) => {
                  if (c.lng != null && c.lat != null) {
                    addLayover({ name: c.name, lng: c.lng, lat: c.lat });
                  } else {
                    toast.error('Coordonnées introuvables pour cette ville.');
                  }
                  setEditingSlot(null);
                }}
                onCancel={() => setEditingSlot(null)}
              />
            </div>
          ) : (
            departure && (
              <button
                type="button"
                onClick={() => setEditingSlot('new-layover')}
                className="ml-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <Plus className="size-3.5" /> Ajouter une escale
              </button>
            )
          )
        )}

        <WaypointRow
          slotLabel="Arrivée"
          waypoint={arrival}
          editing={editingSlot === 'arrival'}
          canEdit={canEdit}
          onStartEdit={() => setEditingSlot('arrival')}
          onCancel={() => setEditingSlot(null)}
          onPick={(wp) => {
            setArrival(wp);
            setEditingSlot(null);
          }}
          onClear={() => setArrival(null)}
          countries={countries}
        />
      </div>
    </div>
  );
}

function WaypointRow({
  slotLabel,
  waypoint,
  editing,
  canEdit,
  onStartEdit,
  onCancel,
  onPick,
  onClear,
  countries,
}: {
  slotLabel: string;
  waypoint: FlightWaypoint | null;
  editing: boolean;
  canEdit: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onPick: (wp: FlightWaypoint) => void;
  onClear: () => void;
  countries: string[];
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
          {slotLabel}
        </span>
        <CityAutocomplete
          autoFocus
          countries={countries}
          placeholder="Ville ou aéroport…"
          onPick={(c) => {
            if (c.lng != null && c.lat != null) {
              onPick({ name: c.name, lng: c.lng, lat: c.lat });
            } else {
              toast.error('Coordonnées introuvables pour cette ville.');
            }
          }}
          onCancel={onCancel}
        />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
        {slotLabel}
      </span>
      {waypoint ? (
        <>
          <button
            type="button"
            disabled={!canEdit}
            onClick={onStartEdit}
            className="rounded-md border bg-background px-2.5 py-1 text-sm hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {waypoint.name}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={onClear}
              className="text-muted-foreground transition hover:text-destructive"
              aria-label={`Retirer ${slotLabel}`}
            >
              <X className="size-3.5" />
            </button>
          )}
        </>
      ) : canEdit ? (
        <button
          type="button"
          onClick={onStartEdit}
          className="rounded-md border border-dashed bg-background/40 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
        >
          Choisir une ville
        </button>
      ) : (
        <span className="text-xs italic text-muted-foreground">—</span>
      )}
    </div>
  );
}

function formatKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg.toFixed(1)} kg`;
}
