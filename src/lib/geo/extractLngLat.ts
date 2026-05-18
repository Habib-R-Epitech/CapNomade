/**
 * Extract a (lng, lat) pair from any of the shapes Supabase / PostgREST may
 * return for a `geography(Point, 4326)` column:
 *   - GeoJSON object: `{ coordinates: [lng, lat], ... }`
 *   - WKT/EWKT string: `POINT(lng lat)` or `SRID=4326;POINT(lng lat)`
 *   - EWKB hex string (default for geography columns): `0101000020E6100000…`
 */
export function extractLngLat(geo: unknown): { lng: number; lat: number } | null {
  if (geo == null) return null;

  if (typeof geo === 'object' && 'coordinates' in (geo as Record<string, unknown>)) {
    const c = (geo as { coordinates: unknown }).coordinates;
    if (Array.isArray(c) && c.length >= 2) {
      const lng = Number(c[0]);
      const lat = Number(c[1]);
      if (Number.isFinite(lng) && Number.isFinite(lat)) return { lng, lat };
    }
    return null;
  }

  if (typeof geo === 'string') {
    const m = /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(geo);
    if (m) {
      const lng = Number(m[1]);
      const lat = Number(m[2]);
      if (Number.isFinite(lng) && Number.isFinite(lat)) return { lng, lat };
    }
    if (/^[0-9a-fA-F]+$/.test(geo) && geo.length >= 42) return parseEwkbHexPoint(geo);
  }

  return null;
}

function parseEwkbHexPoint(hex: string): { lng: number; lat: number } | null {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const dv = new DataView(bytes.buffer);
  const littleEndian = bytes[0] === 1;
  const type = dv.getUint32(1, littleEndian);
  const hasSrid = (type & 0x20000000) !== 0;
  const hasZ = (type & 0x80000000) !== 0;
  const baseType = type & 0xff;
  if (baseType !== 1) return null; // Not a Point
  let offset = 5;
  if (hasSrid) offset += 4;
  if (offset + 16 > bytes.length) return null;
  const lng = dv.getFloat64(offset, littleEndian);
  const lat = dv.getFloat64(offset + 8, littleEndian);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (hasZ) {
    // Just validate we had room; we discard Z.
    if (offset + 24 > bytes.length) return null;
  }
  return { lng, lat };
}
