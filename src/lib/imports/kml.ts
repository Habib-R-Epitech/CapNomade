import 'server-only';
import { parseStringPromise } from 'xml2js';
import JSZip from 'jszip';
import type { ImportResult, UnifiedFeature, UnifiedGeometry } from './types';

export async function parseKml(xml: string): Promise<ImportResult> {
  const parsed = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
  const features: UnifiedFeature[] = [];
  const warnings: string[] = [];

  walkPlacemarks(parsed?.kml?.Document ?? parsed?.kml, (placemark) => {
    const name = pickString(placemark.name);
    const description = pickString(placemark.description);
    const geometries = extractGeometries(placemark, warnings);
    for (const geom of geometries) {
      features.push({
        feature_type: geomKindToType(geom.type),
        geometry: geom,
        label: name ?? null,
        properties: { description: description ?? null, source: 'kml' },
      });
    }
  });

  return { features, warnings, source_format: 'kml' };
}

export async function parseKmz(buffer: ArrayBuffer): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(buffer);
  const kmlEntry = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.kml') && !f.dir);
  if (!kmlEntry) {
    return { features: [], warnings: ['KMZ vide ou sans fichier .kml interne.'], source_format: 'kmz' };
  }
  const xml = await kmlEntry.async('string');
  const r = await parseKml(xml);
  return { ...r, source_format: 'kmz' };
}

function walkPlacemarks(node: unknown, visit: (p: any) => void) {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  const pm = obj.Placemark;
  if (Array.isArray(pm)) pm.forEach((p) => visit(p));
  else if (pm) visit(pm);
  const folder = obj.Folder;
  if (Array.isArray(folder)) folder.forEach((f) => walkPlacemarks(f, visit));
  else if (folder) walkPlacemarks(folder, visit);
  const doc = obj.Document;
  if (Array.isArray(doc)) doc.forEach((d) => walkPlacemarks(d, visit));
  else if (doc) walkPlacemarks(doc, visit);
}

function extractGeometries(pm: any, warnings: string[]): UnifiedGeometry[] {
  const out: UnifiedGeometry[] = [];
  const point = pm.Point;
  if (point) out.push(...kmlPointToGeo(point, warnings));
  const line = pm.LineString;
  if (line) out.push(...kmlLineToGeo(line, warnings));
  const poly = pm.Polygon;
  if (poly) out.push(...kmlPolyToGeo(poly, warnings));
  const multi = pm.MultiGeometry;
  if (multi) {
    if (multi.Point) out.push(...kmlPointToGeo(multi.Point, warnings));
    if (multi.LineString) out.push(...kmlLineToGeo(multi.LineString, warnings));
    if (multi.Polygon) out.push(...kmlPolyToGeo(multi.Polygon, warnings));
  }
  return out;
}

function kmlPointToGeo(node: any, warnings: string[]): UnifiedGeometry[] {
  const arr = Array.isArray(node) ? node : [node];
  return arr
    .map((n) => parseCoordPair(pickString(n.coordinates), warnings))
    .filter((c): c is [number, number] => !!c)
    .map((coord) => ({ type: 'Point', coordinates: coord }) as UnifiedGeometry);
}

function kmlLineToGeo(node: any, warnings: string[]): UnifiedGeometry[] {
  const arr = Array.isArray(node) ? node : [node];
  return arr
    .map((n) => parseCoordList(pickString(n.coordinates), warnings))
    .filter((c) => c.length >= 2)
    .map((coords) => ({ type: 'LineString', coordinates: coords }) as UnifiedGeometry);
}

function kmlPolyToGeo(node: any, warnings: string[]): UnifiedGeometry[] {
  const arr = Array.isArray(node) ? node : [node];
  return arr
    .map((n) => {
      const outer = parseCoordList(
        pickString(n?.outerBoundaryIs?.LinearRing?.coordinates),
        warnings,
      );
      return outer.length >= 3 ? ({ type: 'Polygon', coordinates: [outer] } as UnifiedGeometry) : null;
    })
    .filter((x): x is UnifiedGeometry => !!x);
}

function parseCoordPair(input: string | null, warnings: string[]): [number, number] | null {
  if (!input) return null;
  const m = input.trim().split(/[\s,]+/).map(Number);
  if (m.length >= 2 && Number.isFinite(m[0]) && Number.isFinite(m[1])) return [m[0]!, m[1]!];
  warnings.push(`Coordonnée KML invalide: "${input}"`);
  return null;
}

function parseCoordList(input: string | null, warnings: string[]): Array<[number, number]> {
  if (!input) return [];
  const out: Array<[number, number]> = [];
  for (const chunk of input.trim().split(/\s+/)) {
    const c = parseCoordPair(chunk, warnings);
    if (c) out.push(c);
  }
  return out;
}

function pickString(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  if (v && typeof v === 'object' && '_' in (v as object)) return String((v as { _: string })._);
  return null;
}

function geomKindToType(t: UnifiedGeometry['type']): 'point' | 'line' | 'polygon' {
  return t === 'Point' ? 'point' : t === 'LineString' ? 'line' : 'polygon';
}
