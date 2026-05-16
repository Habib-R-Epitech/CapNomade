import { describe, expect, it } from 'vitest';
import { estimateCarbon, haversineKm } from '@/lib/carbon';

describe('haversineKm', () => {
  it('computes CDG → HND ~ 9 700 km', () => {
    const d = haversineKm({ lat: 49.01, lng: 2.55 }, { lat: 35.55, lng: 139.78 });
    expect(d).toBeGreaterThan(9500);
    expect(d).toBeLessThan(10000);
  });
});

describe('estimateCarbon', () => {
  it('uses the long-haul factor for >4000 km flights', () => {
    const r = estimateCarbon({ mode: 'plane', distance_km: 9710 });
    expect(r.method).toBe('distance_factor');
    expect(r.emission_kgco2e).toBeGreaterThan(2000);
    expect(r.confidence).toBe('medium');
  });

  it('falls back gracefully for "other"', () => {
    const r = estimateCarbon({ mode: 'other', distance_km: 100 });
    expect(r.emission_kgco2e).toBe(0);
    expect(r.method).toBe('fallback');
  });

  it('returns higher emissions for car than train at equal distance', () => {
    const car = estimateCarbon({ mode: 'car', distance_km: 100 });
    const train = estimateCarbon({ mode: 'train', distance_km: 100 });
    expect(car.emission_kgco2e).toBeGreaterThan(train.emission_kgco2e);
  });
});
