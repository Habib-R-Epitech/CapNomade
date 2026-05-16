import 'server-only';
import { serverEnv } from '@/lib/env';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  /** Distance in meters. */
  distance_m: number;
  /** Duration in seconds. */
  duration_s: number;
  /** Polyline-encoded geometry, decode client-side if needed. */
  polyline: string | null;
  /** Tolls in micro-units of base currency, or null if unknown. */
  toll_info: { currency: string; amount_units: number } | null;
}

/**
 * Compute a driving route between two points using Google Routes API v2.
 * Returns null if the API key isn't configured.
 */
export async function computeDrivingRoute(
  origin: RoutePoint,
  destination: RoutePoint,
): Promise<RouteResult | null> {
  const env = serverEnv();
  if (!env.GOOGLE_MAPS_SERVER_API_KEY) return null;

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_MAPS_SERVER_API_KEY,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      polylineEncoding: 'ENCODED_POLYLINE',
      computeAlternativeRoutes: false,
      extraComputations: ['TOLLS'],
      languageCode: 'fr',
    }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as RoutesResponse;
  const route = json.routes?.[0];
  if (!route) return null;

  const durationSeconds = parseDuration(route.duration);
  const toll = route.travelAdvisory?.tollInfo;
  return {
    distance_m: route.distanceMeters,
    duration_s: durationSeconds,
    polyline: route.polyline?.encodedPolyline ?? null,
    toll_info: toll?.estimatedPrice?.[0]
      ? { currency: toll.estimatedPrice[0].currencyCode, amount_units: Number(toll.estimatedPrice[0].units ?? 0) }
      : null,
  };
}

function parseDuration(d: string | undefined): number {
  if (!d) return 0;
  // Google returns strings like "1234s".
  const m = /^(\d+)s$/.exec(d);
  return m ? Number(m[1]) : 0;
}

interface RoutesResponse {
  routes?: Array<{
    distanceMeters: number;
    duration?: string;
    polyline?: { encodedPolyline: string };
    travelAdvisory?: {
      tollInfo?: {
        estimatedPrice?: Array<{ currencyCode: string; units?: string; nanos?: number }>;
      };
    };
  }>;
}
