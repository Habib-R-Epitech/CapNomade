import 'server-only';
import { serverEnv } from '@/lib/env';
import type { CarbonMethod, TransportMode } from '@/lib/types/database';

export interface CarbonEstimate {
  emission_kgco2e: number;
  method: CarbonMethod;
  confidence: 'low' | 'medium' | 'high';
  factor_kg_per_km: number;
  notes?: string;
}

export interface CarbonInput {
  mode: TransportMode;
  /** Great-circle distance in km. Required for distance-based methods. */
  distance_km: number;
  /** Optional radiative-forcing multiplier for aviation (defaults to 1.9). */
  radiativeForcing?: number;
  /** Optional IATA codes for future Travel Impact Model lookup. */
  origin_iata?: string | null;
  destination_iata?: string | null;
}

/**
 * Estimates CO2e emissions for a single transport segment.
 * Multi-source by design — adapters can be added (e.g. Travel Impact Model)
 * without changing the call site.
 */
export function estimateCarbon(input: CarbonInput): CarbonEstimate {
  const env = serverEnv();
  const km = Math.max(0, input.distance_km);

  switch (input.mode) {
    case 'plane': {
      const factor = pickPlaneFactor(km, env);
      const rf = input.radiativeForcing ?? 1.9;
      return {
        emission_kgco2e: round(km * factor * rf),
        method: 'distance_factor',
        confidence: 'medium',
        factor_kg_per_km: factor * rf,
        notes: `Distance-based × RF=${rf}. À remplacer par Travel Impact Model si disponible.`,
      };
    }
    case 'car':
      return distance(km, env.CARBON_FACTOR_CAR_KM, 'high');
    case 'train':
      return distance(km, env.CARBON_FACTOR_TRAIN_KM, 'high');
    case 'bus':
      return distance(km, env.CARBON_FACTOR_BUS_KM, 'medium');
    case 'ferry':
      return distance(km, env.CARBON_FACTOR_FERRY_KM, 'low');
    case 'other':
    default:
      return {
        emission_kgco2e: 0,
        method: 'fallback',
        confidence: 'low',
        factor_kg_per_km: 0,
        notes: "Mode 'autre' — saisir manuellement si nécessaire",
      };
  }
}

function pickPlaneFactor(km: number, env: ReturnType<typeof serverEnv>): number {
  if (km < 1500) return env.CARBON_FACTOR_PLANE_SHORT_KM;
  if (km < 4000) return env.CARBON_FACTOR_PLANE_MEDIUM_KM;
  return env.CARBON_FACTOR_PLANE_LONG_KM;
}

function distance(km: number, factor: number, confidence: 'low' | 'medium' | 'high'): CarbonEstimate {
  return {
    emission_kgco2e: round(km * factor),
    method: 'distance_factor',
    confidence,
    factor_kg_per_km: factor,
  };
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Great-circle distance between two points in km (Haversine).
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
