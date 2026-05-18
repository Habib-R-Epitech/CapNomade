import type { TransportMode } from '@/lib/types/database';

/**
 * Speed / overhead profiles used by the journey builder to estimate trip time
 * and ground distance between two city stops. Numbers are coarse averages —
 * they're meant to be "good enough" for a glance, not a routing API result.
 */
export interface TransportProfile {
  label: string;
  /** Average travel speed in km/h. */
  speedKmH: number;
  /**
   * Multiplier applied to great-circle distance to estimate the actual path
   * (e.g. roads are rarely straight). Plane and ferry use 1.0.
   */
  groundFactor: number;
  /**
   * Fixed minutes added to the leg duration (boarding, security, taxi out…).
   */
  fixedMinutes: number;
}

export const TRANSPORT_PROFILES: Record<TransportMode, TransportProfile> = {
  plane:      { label: 'Avion',   speedKmH: 800, groundFactor: 1.0, fixedMinutes: 120 },
  car:        { label: 'Voiture', speedKmH: 80,  groundFactor: 1.3, fixedMinutes: 0 },
  motorcycle: { label: 'Moto',    speedKmH: 75,  groundFactor: 1.3, fixedMinutes: 0 },
  bus:        { label: 'Bus',     speedKmH: 60,  groundFactor: 1.3, fixedMinutes: 15 },
  train:      { label: 'Train',   speedKmH: 110, groundFactor: 1.2, fixedMinutes: 20 },
  ferry:      { label: 'Ferry',   speedKmH: 35,  groundFactor: 1.0, fixedMinutes: 30 },
  other:      { label: 'Autre',   speedKmH: 60,  groundFactor: 1.1, fixedMinutes: 0 },
};

/** Modes shown by default in the journey picker, in display order. */
export const JOURNEY_MODE_ORDER: TransportMode[] = [
  'plane',
  'car',
  'motorcycle',
  'bus',
  'train',
  'ferry',
  'other',
];

export interface LegEstimate {
  /** Great-circle distance in km (unchanged regardless of mode). */
  greatCircleKm: number;
  /** Estimated ground distance (km) for this mode. */
  distanceKm: number;
  /** Estimated total minutes for this leg, fixed overhead included. */
  durationMinutes: number;
}

export function estimateLeg(
  mode: TransportMode,
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
): LegEstimate {
  const profile = TRANSPORT_PROFILES[mode];
  const greatCircleKm = haversineKm(fromLat, fromLng, toLat, toLng);
  const distanceKm = greatCircleKm * profile.groundFactor;
  const moving = (distanceKm / profile.speedKmH) * 60;
  const durationMinutes = Math.round(moving + profile.fixedMinutes);
  return {
    greatCircleKm: Math.round(greatCircleKm),
    distanceKm: Math.round(distanceKm),
    durationMinutes,
  };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}
