'use client';

import * as React from 'react';
import { loadCountriesGeoJson, type CountryFeature } from '@/lib/geo/countries';

interface CityPin {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

interface Props {
  countries: string[]; // ISO2
  cities: CityPin[];
  height?: number;
}

export function TripCountryMap({ countries, cities, height = 280 }: Props) {
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

  const bbox = React.useMemo(() => {
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
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
    for (const p of cities) {
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    }
    return { minLng, maxLng, minLat, maxLat };
  }, [features, cities]);

  const projected = React.useMemo(() => {
    if (!Number.isFinite(bbox.minLng)) return null;
    const padding = 1.5;
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
    const pins = cities.map((p) => {
      const [cx, cy] = project(p.lng, p.lat);
      return { ...p, cx, cy };
    });
    return { W, H, paths, pins };
  }, [bbox, features, cities]);

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

  const { W, H, paths, pins } = projected;

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
