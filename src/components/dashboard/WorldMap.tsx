'use client';

import * as React from 'react';
import type { Map as MlMap, StyleSpecification } from 'maplibre-gl';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { publicEnvironment } from '@/lib/env';
import { loadCountriesGeoJson } from '@/lib/geo/countries';
import { SVGWorldMap } from './SVGWorldMap';

export interface MapTripPoint {
  id: string; // unique per pin (trip_stops.id)
  trip_id: string;
  slug: string;
  title: string; // trip title
  stop_name: string | null;
  status: string;
  lat: number;
  lng: number;
  start_date: string | null;
  end_date: string | null;
}

function resolveStyle(theme: 'light' | 'dark'): string | StyleSpecification {
  const key = publicEnvironment.NEXT_PUBLIC_MAP_TILES_API_KEY ?? '';
  const url =
    theme === 'dark' && publicEnvironment.NEXT_PUBLIC_MAPLIBRE_STYLE_URL_DARK
      ? publicEnvironment.NEXT_PUBLIC_MAPLIBRE_STYLE_URL_DARK
      : publicEnvironment.NEXT_PUBLIC_MAPLIBRE_STYLE_URL;
  if (!url) {
    return {
      version: 8,
      sources: {
        osm: {
          type: 'raster' as const,
          tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
    } satisfies StyleSpecification;
  }
  return url.replace('{key}', encodeURIComponent(key));
}

function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!ctx;
  } catch {
    return false;
  }
}

export function WorldMap({
  points,
  visitedCountries = [],
}: {
  points: MapTripPoint[];
  visitedCountries?: string[];
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<MlMap | null>(null);
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mapError, setMapError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    // Pre-flight WebGL check: avoids loading MapLibre at all when we know it'll fail.
    if (!hasWebGL()) {
      setMapError('WebGL unavailable');
      return;
    }
    let cancelled = false;
    let map: MlMap | null = null;

    // Dynamic import keeps maplibre-gl (~200 KB gzipped) out of the dashboard's
    // initial JS bundle — the SVG fallback covers users that won't load it.
    (async () => {
      const [{ default: maplibregl }] = await Promise.all([
        import('maplibre-gl'),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error — CSS side-effect import has no type declaration.
        import('maplibre-gl/dist/maplibre-gl.css'),
      ]);
      if (cancelled || !containerRef.current) return;
      try {
        map = new maplibregl.Map({
          container: containerRef.current,
          style: resolveStyle((resolvedTheme as 'light' | 'dark') ?? 'light'),
          center: [10, 25],
          zoom: 1.4,
        });
      } catch (err) {
        setMapError(err instanceof Error ? err.message : 'Carte indisponible');
        return;
      }
      mapRef.current = map;
      const m = map;
      m.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
      m.on('error', (e) => {
        const msg = (e?.error as Error | undefined)?.message;
        if (msg && /WebGL/i.test(msg)) setMapError(msg);
      });

      m.on('load', async () => {
        if (cancelled) return;
        if (visitedCountries.length > 0) {
          const geo = await loadCountriesGeoJson();
          if (geo && !cancelled) {
            m.addSource('countries', { type: 'geojson', data: geo });
            const codesUpper = visitedCountries.map((c) => c.toUpperCase());
            m.addLayer({
              id: 'visited-countries-fill',
              type: 'fill',
              source: 'countries',
              filter: [
                'any',
                ['match', ['get', 'ISO_A2'], codesUpper, true, false],
                ['match', ['get', 'ISO_A2_EH'], codesUpper, true, false],
              ],
              paint: { 'fill-color': '#0d9488', 'fill-opacity': 0.75 },
            });
            m.addLayer({
              id: 'visited-countries-outline',
              type: 'line',
              source: 'countries',
              filter: [
                'any',
                ['match', ['get', 'ISO_A2'], codesUpper, true, false],
                ['match', ['get', 'ISO_A2_EH'], codesUpper, true, false],
              ],
              paint: { 'line-color': '#0d9488', 'line-width': 1.4, 'line-opacity': 1 },
            });
          }
        }

        if (!points.length) return;
        const features = points.map((p) => ({
          type: 'Feature' as const,
          properties: { ...p },
          geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        }));
        m.addSource('trips', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        });
        m.addLayer({
          id: 'trips-glow',
          type: 'circle',
          source: 'trips',
          paint: { 'circle-radius': 14, 'circle-color': '#f04923', 'circle-opacity': 0.18 },
        });
        m.addLayer({
          id: 'trips-dot',
          type: 'circle',
          source: 'trips',
          paint: {
            'circle-radius': 6,
            'circle-color': '#f04923',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });

        const popup = new maplibregl.Popup({ closeButton: false, offset: 12 });
        m.on('mouseenter', 'trips-dot', (e) => {
          m.getCanvas().style.cursor = 'pointer';
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as MapTripPoint;
          const headline = p.stop_name
            ? `<strong>${escapeHtml(p.stop_name)}</strong><br/><span style="opacity:.7;">${escapeHtml(p.title)}</span>`
            : `<strong>${escapeHtml(p.title)}</strong>`;
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family: system-ui; font-size: 12px;">
                ${headline}<br/>
                <span style="opacity: .7;">${p.status}${p.start_date ? ` · ${p.start_date}` : ''}</span>
              </div>`,
            )
            .addTo(m);
        });
        m.on('mouseleave', 'trips-dot', () => {
          m.getCanvas().style.cursor = '';
          popup.remove();
        });
        m.on('click', 'trips-dot', (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as MapTripPoint;
          router.push(`/voyages/${p.slug}`);
        });

        if (points.length > 1) {
          const lngs = points.map((p) => p.lng);
          const lats = points.map((p) => p.lat);
          m.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 60, maxZoom: 4 },
          );
        }
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme, visitedCountries.length, points.length]);

  // WebGL/MapLibre cassé sur cet appareil → on bascule sur la version SVG.
  // Aucune dépendance WebGL ni canvas, marche partout.
  if (mapError) {
    return <SVGWorldMap points={points} visitedCountries={visitedCountries} />;
  }
  return <div ref={containerRef} className="h-[420px] w-full rounded-xl border" aria-label="Carte des voyages" />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
