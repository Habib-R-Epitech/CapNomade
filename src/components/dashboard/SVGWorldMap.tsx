'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { MapTripPoint } from './WorldMap';

const COUNTRIES_GEOJSON_URL =
  'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/cultural/ne_110m_admin_0_countries.json';

const W = 1000;
const H = 500;

// Equirectangular projection: lng in [-180, 180], lat in [-90, 90] → SVG.
function project(lng: number, lat: number): [number, number] {
  return [((lng + 180) / 360) * W, ((90 - lat) / 180) * H];
}

interface CountryFeature {
  type: 'Feature';
  properties: { ISO_A2?: string; ISO_A2_EH?: string; NAME?: string };
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: CountryFeature[];
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
  const [data, setData] = React.useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = React.useState<MapTripPoint | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch(COUNTRIES_GEOJSON_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((geo) => {
        if (!cancelled) setData(geo);
      })
      .catch(() => {
        // If even the GeoJSON fetch fails, we'll show points only on a blank background.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visitedSet = React.useMemo(
    () => new Set(visitedCountries.map((c) => c.toUpperCase())),
    [visitedCountries],
  );

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-xl border bg-[#dde7ee] dark:bg-[#0f1924]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        aria-label="Carte des voyages (SVG)"
      >
        {data?.features.map((f, i) => {
          const code = (f.properties.ISO_A2 || f.properties.ISO_A2_EH || '').toUpperCase();
          const visited = code && visitedSet.has(code);
          return (
            <path
              key={i}
              d={geometryToPath(f.geometry)}
              fill={visited ? '#0d9488' : 'hsl(var(--card))'}
              fillOpacity={visited ? 0.6 : 1}
              stroke={visited ? '#0d9488' : 'rgba(0,0,0,0.15)'}
              strokeWidth={visited ? 0.8 : 0.4}
            >
              {f.properties.NAME && <title>{f.properties.NAME}</title>}
            </path>
          );
        })}
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
