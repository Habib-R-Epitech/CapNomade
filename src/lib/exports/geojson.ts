import type { UnifiedFeature } from '@/lib/imports/types';

export function featuresToGeoJSON(features: UnifiedFeature[]): string {
  return JSON.stringify(
    {
      type: 'FeatureCollection',
      features: features.map((f) => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: { label: f.label, ...f.properties },
      })),
    },
    null,
    2,
  );
}
