import 'server-only';
import { serverEnv } from '@/lib/env';

export interface GeocodeResult {
  formatted_address: string;
  lat: number;
  lng: number;
  country_code: string | null;
  city: string | null;
  region: string | null;
  place_id: string;
}

/**
 * Server-side geocoding via Google Maps Platform.
 * Returns null if the key is not configured (graceful degradation).
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const env = serverEnv();
  if (!env.GOOGLE_MAPS_SERVER_API_KEY) return null;
  if (!address.trim()) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('language', 'fr');
  url.searchParams.set('key', env.GOOGLE_MAPS_SERVER_API_KEY);

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = (await res.json()) as { status: string; results: Array<RawResult> };
  if (json.status !== 'OK' || !json.results[0]) return null;

  const r = json.results[0];
  const get = (type: string): string | null =>
    r.address_components.find((c) => c.types.includes(type))?.short_name ?? null;

  return {
    formatted_address: r.formatted_address,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    country_code: get('country'),
    city: get('locality') ?? get('postal_town'),
    region: get('administrative_area_level_1'),
    place_id: r.place_id,
  };
}

interface RawResult {
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  address_components: Array<{ short_name: string; long_name: string; types: string[] }>;
  place_id: string;
}
