/**
 * Unified feature model used after parsing any supported map import format.
 */
export type UnifiedGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: Array<[number, number]> }
  | { type: 'Polygon'; coordinates: Array<Array<[number, number]>> };

export interface UnifiedFeature {
  feature_type: 'point' | 'line' | 'polygon';
  geometry: UnifiedGeometry;
  label?: string | null;
  properties: Record<string, unknown>;
}

export interface ImportResult {
  features: UnifiedFeature[];
  warnings: string[];
  source_format: 'kml' | 'kmz' | 'gpx' | 'geojson' | 'csv' | 'xlsx';
}
