'use client';

import * as React from 'react';
import { loadCountriesGeoJson, type CountryFeature } from '@/lib/geo/countries';
import type { TransportMode } from '@/lib/types/database';

interface CityPin {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

export interface JourneyLegRender {
  from_id: string;
  to_id: string;
  mode: TransportMode;
}

interface Props {
  countries: string[]; // ISO2
  cities: CityPin[];
  legs?: JourneyLegRender[];
  height?: number;
}

// Stroke colour per transport mode — kept readable on both background colours.
const MODE_STROKE: Record<TransportMode, string> = {
  plane: '#ea580c',
  car: '#2563eb',
  motorcycle: '#db2777',
  bus: '#16a34a',
  train: '#7c3aed',
  ferry: '#0891b2',
  other: '#64748b',
};

export function TripCountryMap({ countries, cities, legs = [], height = 280 }: Props) {
  const [data, setData] = React.useState<CountryFeature[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    loadCountriesGeoJson().then((geo) => {
      if (!cancelled) setData(geo?.features ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const upper = React.useMemo(() => new Set(countries.map((c) => c.toUpperCase())), [countries]);

  const features = React.useMemo(() => {
    if (!data) return [];
    return data.filter((f) => {
      const code = (f.properties.ISO_A2 || f.properties.ISO_A2_EH || '').toUpperCase();
      return upper.has(code);
    });
  }, [data, upper]);

  // When cities are known, frame the map on them (with padding). Otherwise
  // fall back to the bounding box of the highlighted countries.
  const bbox = React.useMemo(() => {
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    if (cities.length > 0) {
      for (const p of cities) {
        if (p.lng < minLng) minLng = p.lng;
        if (p.lng > maxLng) maxLng = p.lng;
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
      }
      // For a single city, expand to a reasonable rectangle so we don't end
      // up with a degenerate zero-width bbox.
      if (cities.length === 1) {
        minLng -= 3; maxLng += 3; minLat -= 2; maxLat += 2;
      }
    } else {
      for (const f of features) {
        const rings: number[][][] =
          f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat();
        for (const ring of rings) {
          for (const c of ring) {
            const lng = c[0]; const lat = c[1];
            if (typeof lng === 'number' && typeof lat === 'number') {
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
            }
          }
        }
      }
    }
    return { minLng, maxLng, minLat, maxLat };
  }, [features, cities]);

  const projected = React.useMemo(() => {
    if (!Number.isFinite(bbox.minLng)) return null;
    // Generous padding when zooming on cities, smaller when zooming on a
    // whole country (which is already roomy).
    const padding = cities.length > 0 ? Math.max(1, (bbox.maxLng - bbox.minLng) * 0.15) : 1.5;
    const x1 = bbox.minLng - padding;
    const x2 = bbox.maxLng + padding;
    const y1 = bbox.minLat - padding;
    const y2 = bbox.maxLat + padding;
    const aspect = (x2 - x1) / Math.max(0.001, y2 - y1);
    const W = 800;
    const H = Math.max(80, Math.round(W / Math.max(0.5, aspect)));
    const project = (lng: number, lat: number): [number, number] => [
      ((lng - x1) / (x2 - x1)) * W,
      ((y2 - lat) / (y2 - y1)) * H,
    ];

    const paths = features.map((f) => {
      const rings: number[][][] =
        f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat();
      return rings
        .map((ring) =>
          ring
            .map((coord, i) => {
              const lng = coord[0]; const lat = coord[1];
              if (typeof lng !== 'number' || typeof lat !== 'number') return '';
              const [x, y] = project(lng, lat);
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .filter(Boolean)
            .join('') + 'Z',
        )
        .join('');
    });

    const pinById = new Map<string, { x: number; y: number; name: string }>();
    const pins = cities.map((p) => {
      const [cx, cy] = project(p.lng, p.lat);
      pinById.set(p.id, { x: cx, y: cy, name: p.name });
      return { ...p, cx, cy };
    });

    // Lines between cities, in journey order. Curved for planes (Bézier
    // control point lifted above the midpoint to fake a great-circle arc),
    // straight for ground transports.
    const lines = legs
      .map((leg) => {
        const from = pinById.get(leg.from_id);
        const to = pinById.get(leg.to_id);
        if (!from || !to) return null;
        if (leg.mode === 'plane') {
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          const len = Math.hypot(to.x - from.x, to.y - from.y);
          const lift = Math.min(len * 0.18, 90);
          // Lift perpendicular-ish — for an east-west route this nudges the
          // curve upward, mimicking a great-circle in equirectangular.
          return {
            d: `M${from.x.toFixed(1)},${from.y.toFixed(1)} Q${mx.toFixed(1)},${(my - lift).toFixed(1)} ${to.x.toFixed(1)},${to.y.toFixed(1)}`,
            mode: leg.mode,
            dashed: true,
          };
        }
        return {
          d: `M${from.x.toFixed(1)},${from.y.toFixed(1)} L${to.x.toFixed(1)},${to.y.toFixed(1)}`,
          mode: leg.mode,
          dashed: false,
        };
      })
      .filter((l): l is { d: string; mode: TransportMode; dashed: boolean } => l !== null);

    return { W, H, paths, pins, lines };
  }, [bbox, features, cities, legs]);

  if (countries.length === 0 && cities.length === 0) return null;

  if (!projected) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-xl border bg-muted/20 text-xs text-muted-foreground"
        style={{ height }}
      >
        Chargement de la carte…
      </div>
    );
  }

  const { W, H, paths, pins, lines } = projected;

  return (
    <div className="overflow-hidden rounded-xl border bg-[#dde7ee] dark:bg-[#0f1924]" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="#0d9488"
            fillOpacity={0.35}
            stroke="#0d9488"
            strokeWidth={1}
            strokeOpacity={0.7}
          />
        ))}
        {lines.map((l, i) => (
          <path
            key={`leg-${i}`}
            d={l.d}
            fill="none"
            stroke={MODE_STROKE[l.mode]}
            strokeWidth={2.5}
            strokeOpacity={0.95}
            strokeLinecap="round"
            strokeDasharray={l.dashed ? '6 4' : undefined}
          />
        ))}
        {pins.map((p) => (
          <g key={p.id}>
            <circle cx={p.cx} cy={p.cy} r={10} fill="#f04923" fillOpacity={0.2} />
            <circle cx={p.cx} cy={p.cy} r={4.5} fill="#f04923" stroke="#fff" strokeWidth={1.5} />
            <text
              x={p.cx + 8}
              y={p.cy + 3}
              fontSize={12}
              fontWeight={600}
              fill="hsl(var(--foreground))"
              style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 2px hsl(var(--background)))' }}
            >
              {p.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
