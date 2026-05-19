/**
 * Module-level memoized loader for the world countries GeoJSON (Natural Earth
 * 110m). Used by WorldMap, SVGWorldMap and TripCountryMap — without this each
 * mount of those components fired a fresh ~130KB CDN request.
 *
 * We hit our own route handler so it can hold a Next data-cache copy and serve
 * with strong client-side cache headers (see app/api/geo/countries/route.ts).
 */
const ENDPOINT = '/api/geo/countries';

export interface CountryFeature {
  type: 'Feature';
  properties: { ISO_A2?: string; ISO_A2_EH?: string; NAME?: string };
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
}

export interface CountriesGeoJson {
  type: 'FeatureCollection';
  features: CountryFeature[];
}

/**
 * Read the ISO 3166-1 alpha-2 code from a Natural Earth feature. The 110m
 * dataset historically stores `-99` in `ISO_A2` for a handful of countries
 * (France, Norway, Kosovo…) and the corrected value in `ISO_A2_EH`. We treat
 * `-99` as missing so those countries match correctly.
 */
export function featureIso2(feature: CountryFeature): string {
  const props = feature.properties;
  const primary = props.ISO_A2;
  if (primary && primary !== '-99') return primary.toUpperCase();
  const eh = props.ISO_A2_EH;
  if (eh && eh !== '-99') return eh.toUpperCase();
  return '';
}

let cached: CountriesGeoJson | null = null;
let pending: Promise<CountriesGeoJson | null> | null = null;

export function loadCountriesGeoJson(): Promise<CountriesGeoJson | null> {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = fetch(ENDPOINT, { cache: 'force-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<CountriesGeoJson>) : null))
    .then((geo) => {
      pending = null;
      if (geo && Array.isArray(geo.features)) cached = geo;
      return cached;
    })
    .catch(() => {
      pending = null;
      return null;
    });
  return pending;
}
