'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { loadCountriesGeoJson, type CountriesGeoJson, type CountryFeature } from '@/lib/geo/countries';
import type { MapTripPoint } from './WorldMap';

const W = 1000;
const H = 500;

// Equirectangular projection: lng in [-180, 180], lat in [-90, 90] → SVG.
function project(lng: number, lat: number): [number, number] {
  return [((lng + 180) / 360) * W, ((90 - lat) / 180) * H];
}

function geometryToPath(geom: CountryFeature['geometry']): string {
  const rings: number[][][] = geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat();
  return rings
    .map((ring) =>
      ring
        .map((coord, i) => {
          const lng = coord[0];
          const lat = coord[1];
          if (typeof lng !== 'number' || typeof lat !== 'number') return '';
          const [x, y] = project(lng, lat);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .filter(Boolean)
        .join('') + 'Z',
    )
    .join('');
}

export function SVGWorldMap({
  points,
  visitedCountries = [],
}: {
  points: MapTripPoint[];
  visitedCountries?: string[];
}) {
  const router = useRouter();
  const [data, setData] = React.useState<CountriesGeoJson | null>(null);
  const [hovered, setHovered] = React.useState<MapTripPoint | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    loadCountriesGeoJson().then((geo) => {
      if (!cancelled) setData(geo);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visitedSet = React.useMemo(
    () => new Set(visitedCountries.map((c) => c.toUpperCase())),
    [visitedCountries],
  );

  // Pre-project paths once; this is the expensive part (~250 polygons).
  const countryPaths = React.useMemo(() => {
    if (!data) return [];
    return data.features.map((f) => {
      const code = (f.properties.ISO_A2 || f.properties.ISO_A2_EH || '').toUpperCase();
      return {
        d: geometryToPath(f.geometry),
        visited: !!(code && visitedSet.has(code)),
        name: f.properties.NAME ?? '',
      };
    });
  }, [data, visitedSet]);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-xl border bg-[#dde7ee] dark:bg-[#0f1924]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        aria-label="Carte des voyages (SVG)"
      >
        {countryPaths.map((c, i) => (
          <path
            key={i}
            d={c.d}
            fill={c.visited ? '#0d9488' : 'hsl(var(--card))'}
            fillOpacity={c.visited ? 0.6 : 1}
            stroke={c.visited ? '#0d9488' : 'rgba(0,0,0,0.15)'}
            strokeWidth={c.visited ? 0.8 : 0.4}
          >
            {c.name && <title>{c.name}</title>}
          </path>
        ))}
        {points.map((p) => {
          const [cx, cy] = project(p.lng, p.lat);
          return (
            <g
              key={p.trip_id}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => router.push(`/voyages/${p.slug}`)}
              className="cursor-pointer"
            >
              <circle cx={cx} cy={cy} r={9} fill="#f04923" fillOpacity={0.2} />
              <circle cx={cx} cy={cy} r={4} fill="#f04923" stroke="#fff" strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
          <div className="font-medium">{hovered.title}</div>
          <div className="text-muted-foreground">
            {hovered.status}
            {hovered.start_date ? ` · ${hovered.start_date}` : ''}
          </div>
        </div>
      )}

      <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/80">
        Carte SVG · Natural Earth
      </div>
    </div>
  );
}
