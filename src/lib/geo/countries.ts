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
