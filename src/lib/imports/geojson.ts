import type { ImportResult, UnifiedFeature, UnifiedGeometry } from './types';

interface RawFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: unknown } | null;
  properties: Record<string, unknown> | null;
}

export function parseGeoJson(json: unknown): ImportResult {
  const features: UnifiedFeature[] = [];
  const warnings: string[] = [];

  const collection = normalize(json);
  for (const f of collection) {
    const geom = normalizeGeometry(f.geometry, warnings);
    if (!geom) continue;
    features.push({
      feature_type: geomKind(geom.type),
      geometry: geom,
      label: ((f.properties?.name ?? f.properties?.title) as string | undefined) ?? null,
      properties: f.properties ?? {},
    });
  }
  return { features, warnings, source_format: 'geojson' };
}

function normalize(json: unknown): RawFeature[] {
  if (json && typeof json === 'object') {
    const j = json as { type?: string; features?: RawFeature[]; geometry?: unknown };
    if (j.type === 'FeatureCollection' && Array.isArray(j.features)) return j.features;
    if (j.type === 'Feature') return [j as unknown as RawFeature];
    if (j.type && j.type.match(/Point|LineString|Polygon/)) {
      return [{ type: 'Feature', geometry: j as any, properties: {} }];
    }
  }
  return [];
}

function normalizeGeometry(
  g: { type: string; coordinates: unknown } | null,
  warnings: string[],
): UnifiedGeometry | null {
  if (!g) return null;
  switch (g.type) {
    case 'Point': {
      const c = g.coordinates as [number, number];
      if (!isLngLat(c)) return null;
      return { type: 'Point', coordinates: [Number(c[0]), Number(c[1])] };
    }
    case 'LineString': {
      const c = g.coordinates as Array<[number, number]>;
      if (!Array.isArray(c) || c.length < 2 || !c.every(isLngLat)) return null;
      return { type: 'LineString', coordinates: c.map((p) => [Number(p[0]), Number(p[1])]) };
    }
    case 'Polygon': {
      const c = g.coordinates as Array<Array<[number, number]>>;
      if (!Array.isArray(c) || !Array.isArray(c[0]) || c[0].length < 3) return null;
      return { type: 'Polygon', coordinates: c.map((ring) => ring.map((p) => [Number(p[0]), Number(p[1])])) };
    }
    case 'MultiPoint':
    case 'MultiLineString':
    case 'MultiPolygon':
      warnings.push(`Géométrie ${g.type} non supportée — éclatez-la avant import.`);
      return null;
    default:
      warnings.push(`Type GeoJSON inconnu: ${g.type}`);
      return null;
  }
}

function isLngLat(v: unknown): v is [number, number] {
  return Array.isArray(v) && v.length >= 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
}

function geomKind(t: UnifiedGeometry['type']): 'point' | 'line' | 'polygon' {
  return t === 'Point' ? 'point' : t === 'LineString' ? 'line' : 'polygon';
}
