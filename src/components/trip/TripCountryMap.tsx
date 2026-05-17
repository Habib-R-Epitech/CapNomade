'use client';

import * as React from 'react';

const COUNTRIES_GEOJSON_URL =
  'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/cultural/ne_110m_admin_0_countries.json';

interface CityPin {
  id: string;
  name: string;
  lng: number;
  lat: number;
}

interface CountryFeature {
  type: 'Feature';
  properties: { ISO_A2?: string; ISO_A2_EH?: string; NAME?: string };
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
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
    fetch(COUNTRIES_GEOJSON_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((geo: { features: CountryFeature[] } | null) => {
        if (!cancelled) setData(geo?.features ?? []);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (countries.length === 0 && cities.length === 0) return null;

  const upper = new Set(countries.map((c) => c.toUpperCase()));
  const features = (data ?? []).filter((f) => {
    const code = (f.properties.ISO_A2 || f.properties.ISO_A2_EH || '').toUpperCase();
    return upper.has(code);
  });

  // Compute bbox of relevant features + cities.
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

  const ready = data !== null && Number.isFinite(minLng);
  // Loading or no data → reserve space so layout doesn't jump.
  if (!ready) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-xl border bg-muted/20 text-xs text-muted-foreground"
        style={{ height }}
      >
        Chargement de la carte…
      </div>
    );
  }

  // Add a small padding around the bbox.
  const padding = 1.5; // degrees
  const x1 = minLng - padding;
  const x2 = maxLng + padding;
  const y1 = minLat - padding;
  const y2 = maxLat + padding;

  // SVG coordinate space: project the bbox into a square-ish viewport.
  // We use an equirectangular projection scaled to fit the bbox.
  const aspect = (x2 - x1) / Math.max(0.001, y2 - y1);
  const W = 800;
  const H = Math.max(80, Math.round(W / Math.max(0.5, aspect)));

  function project(lng: number, lat: number): [number, number] {
    const px = ((lng - x1) / (x2 - x1)) * W;
    const py = ((y2 - lat) / (y2 - y1)) * H;
    return [px, py];
  }

  function geometryToPath(g: CountryFeature['geometry']): string {
    const rings: number[][][] = g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
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
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-[#dde7ee] dark:bg-[#0f1924]" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        {features.map((f, i) => (
          <path
            key={i}
            d={geometryToPath(f.geometry)}
            fill="#0d9488"
            fillOpacity={0.35}
            stroke="#0d9488"
            strokeWidth={1}
            strokeOpacity={0.7}
          />
        ))}
        {cities.map((p) => {
          const [cx, cy] = project(p.lng, p.lat);
          return (
            <g key={p.id}>
              <circle cx={cx} cy={cy} r={10} fill="#f04923" fillOpacity={0.2} />
              <circle cx={cx} cy={cy} r={4.5} fill="#f04923" stroke="#fff" strokeWidth={1.5} />
              <text
                x={cx + 8}
                y={cy + 3}
                fontSize={12}
                fontWeight={600}
                fill="hsl(var(--foreground))"
                style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 2px hsl(var(--background)))' }}
              >
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
