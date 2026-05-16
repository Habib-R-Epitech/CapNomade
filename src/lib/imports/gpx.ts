import 'server-only';
import { parseStringPromise } from 'xml2js';
import type { ImportResult, UnifiedFeature, UnifiedGeometry } from './types';

export async function parseGpx(xml: string): Promise<ImportResult> {
  const parsed = await parseStringPromise(xml, { explicitArray: true, mergeAttrs: true });
  const gpx = parsed?.gpx;
  if (!gpx) return { features: [], warnings: ['Fichier GPX vide'], source_format: 'gpx' };

  const features: UnifiedFeature[] = [];
  const warnings: string[] = [];

  // Waypoints
  for (const wpt of gpx.wpt ?? []) {
    const lat = Number(wpt.lat?.[0] ?? wpt.lat);
    const lon = Number(wpt.lon?.[0] ?? wpt.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      features.push({
        feature_type: 'point',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        label: pick(wpt.name) ?? null,
        properties: { ele: numericOrNull(pick(wpt.ele)), description: pick(wpt.desc), source: 'gpx' },
      });
    }
  }

  // Tracks
  for (const trk of gpx.trk ?? []) {
    const name = pick(trk.name);
    for (const seg of trk.trkseg ?? []) {
      const pts: Array<[number, number]> = [];
      for (const p of seg.trkpt ?? []) {
        const lat = Number(p.lat);
        const lon = Number(p.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push([lon, lat]);
      }
      if (pts.length >= 2) {
        features.push({
          feature_type: 'line',
          geometry: { type: 'LineString', coordinates: pts } as UnifiedGeometry,
          label: name ?? null,
          properties: { source: 'gpx', kind: 'track' },
        });
      }
    }
  }

  // Routes
  for (const rte of gpx.rte ?? []) {
    const name = pick(rte.name);
    const pts: Array<[number, number]> = [];
    for (const p of rte.rtept ?? []) {
      const lat = Number(p.lat);
      const lon = Number(p.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push([lon, lat]);
    }
    if (pts.length >= 2) {
      features.push({
        feature_type: 'line',
        geometry: { type: 'LineString', coordinates: pts },
        label: name ?? null,
        properties: { source: 'gpx', kind: 'route' },
      });
    }
  }

  if (features.length === 0) warnings.push('Aucune feature exploitable dans ce GPX.');
  return { features, warnings, source_format: 'gpx' };
}

function pick(v: unknown): string | null {
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  if (typeof v === 'string') return v;
  return null;
}

function numericOrNull(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
