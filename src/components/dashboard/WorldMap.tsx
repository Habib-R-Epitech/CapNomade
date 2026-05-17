'use client';

import * as React from 'react';
import maplibregl, { Map as MlMap, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { publicEnvironment } from '@/lib/env';

export interface MapTripPoint {
  trip_id: string;
  slug: string;
  title: string;
  status: string;
  lat: number;
  lng: number;
  start_date: string | null;
  end_date: string | null;
}

const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

function resolveStyle(theme: 'light' | 'dark'): string | maplibregl.StyleSpecification {
  const key = publicEnvironment.NEXT_PUBLIC_MAP_TILES_API_KEY ?? '';
  const url =
    theme === 'dark' && publicEnvironment.NEXT_PUBLIC_MAPLIBRE_STYLE_URL_DARK
      ? publicEnvironment.NEXT_PUBLIC_MAPLIBRE_STYLE_URL_DARK
      : publicEnvironment.NEXT_PUBLIC_MAPLIBRE_STYLE_URL;
  if (!url) return FALLBACK_STYLE;
  return url.replace('{key}', encodeURIComponent(key));
}

const COUNTRIES_GEOJSON_URL =
  'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/cultural/ne_110m_admin_0_countries.json';

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
    let map: MlMap;
    try {
      map = new MlMap({
        container: containerRef.current,
        style: resolveStyle((resolvedTheme as 'light' | 'dark') ?? 'light'),
        center: [10, 25],
        zoom: 1.4,
      });
    } catch (err) {
      // WebGL not available (hardware accel disabled, old browser, sandboxed iframe…)
      setMapError(err instanceof Error ? err.message : 'Carte indisponible');
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
    map.on('error', (e) => {
      const msg = (e?.error as Error | undefined)?.message;
      if (msg && /WebGL/i.test(msg)) setMapError(msg);
    });

    map.on('load', async () => {
      // Visited countries fill layer
      if (visitedCountries.length > 0) {
        try {
          const resp = await fetch(COUNTRIES_GEOJSON_URL);
          if (resp.ok) {
            const geo = await resp.json();
            map.addSource('countries', { type: 'geojson', data: geo });
            const codesUpper = visitedCountries.map((c) => c.toUpperCase());
            map.addLayer({
              id: 'visited-countries-fill',
              type: 'fill',
              source: 'countries',
              filter: [
                'any',
                ['match', ['get', 'ISO_A2'], codesUpper, true, false],
                ['match', ['get', 'ISO_A2_EH'], codesUpper, true, false],
              ],
              paint: {
                'fill-color': '#0d9488',
                'fill-opacity': 0.35,
              },
            });
            map.addLayer({
              id: 'visited-countries-outline',
              type: 'line',
              source: 'countries',
              filter: [
                'any',
                ['match', ['get', 'ISO_A2'], codesUpper, true, false],
                ['match', ['get', 'ISO_A2_EH'], codesUpper, true, false],
              ],
              paint: {
                'line-color': '#0d9488',
                'line-width': 1.2,
                'line-opacity': 0.7,
              },
            });
          }
        } catch {
          // Network error: silently skip the country highlight, keep dots working
        }
      }

      if (!points.length) return;
      const features = points.map((p) => ({
        type: 'Feature' as const,
        properties: { ...p },
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      }));
      map.addSource('trips', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });
      map.addLayer({
        id: 'trips-glow',
        type: 'circle',
        source: 'trips',
        paint: {
          'circle-radius': 14,
          'circle-color': '#f04923',
          'circle-opacity': 0.18,
        },
      });
      map.addLayer({
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

      const popup = new Popup({ closeButton: false, offset: 12 });
      map.on('mouseenter', 'trips-dot', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as MapTripPoint;
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family: system-ui; font-size: 12px;">
              <strong>${escapeHtml(p.title)}</strong><br/>
              <span style="opacity: .7;">${p.status}${p.start_date ? ` · ${p.start_date}` : ''}</span>
            </div>`,
          )
          .addTo(map);
      });
      map.on('mouseleave', 'trips-dot', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });
      map.on('click', 'trips-dot', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as MapTripPoint;
        router.push(`/voyages/${p.slug}`);
      });

      if (points.length > 1) {
        const lngs = points.map((p) => p.lng);
        const lats = points.map((p) => p.lat);
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 60, maxZoom: 4 },
        );
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme, visitedCountries.length, points.length]);

  if (mapError) {
    return (
      <div className="flex h-[420px] w-full flex-col items-center justify-center gap-2 rounded-xl border bg-muted/30 px-6 text-center">
        <p className="text-sm font-medium">Carte indisponible sur cet appareil</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Votre navigateur n’a pas pu initialiser WebGL. Essayez d’activer l’accélération matérielle
          dans les paramètres, de désactiver les extensions qui bloquent le GPU, ou d’utiliser un
          autre navigateur (Chrome, Firefox, Safari).
        </p>
        {visitedCountries.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Pays visités : {visitedCountries.join(', ')}
          </p>
        )}
      </div>
    );
  }
  return <div ref={containerRef} className="h-[420px] w-full rounded-xl border" aria-label="Carte des voyages" />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
