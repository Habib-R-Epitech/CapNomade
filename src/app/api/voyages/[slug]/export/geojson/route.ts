import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { assertTripAccessBySlug, AuthorizationError } from '@/lib/auth/permissions';
import { asRows } from '@/lib/supabase/helpers';
import type { Json } from '@/lib/types/database';

interface StopExportRow {
  id: string;
  name: string;
  city: string | null;
  country_code: string | null;
  order_index: number;
  location: unknown;
}
interface FeatureExportRow {
  feature_type: 'point' | 'line' | 'polygon';
  geometry: unknown;
  label: string | null;
  properties: Json;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let ctx;
  try {
    ctx = await assertTripAccessBySlug(slug, 'viewer');
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.code }, { status: 403 });
    throw e;
  }
  const supabase = await getSupabaseServerClient();
  const [stopsResp, featuresResp] = await Promise.all([
    supabase
      .from('trip_stops')
      .select('id, name, city, country_code, order_index, location')
      .eq('trip_id', ctx.trip.id),
    supabase
      .from('map_features')
      .select('feature_type, geometry, label, properties')
      .eq('trip_id', ctx.trip.id),
  ]);
  const stops = asRows<StopExportRow>(stopsResp);
  const features = asRows<FeatureExportRow>(featuresResp);

  const collection = {
    type: 'FeatureCollection',
    features: [
      ...stops
        .map((s) => featureFrom(s.location, { name: s.name, city: s.city, country: s.country_code, kind: 'stop' }))
        .filter((f): f is NonNullable<typeof f> => f !== null),
      ...features.map((f) => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: { label: f.label, kind: f.feature_type, ...(f.properties as object) },
      })),
    ],
  };

  return NextResponse.json(collection, {
    headers: {
      'Content-Disposition': `attachment; filename="capnomade-${slug}.geojson"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

function featureFrom(location: unknown, properties: Record<string, unknown>) {
  if (!location || typeof location !== 'object') return null;
  const geo = location as { type?: string; coordinates?: unknown };
  if (!geo.type || !geo.coordinates) return null;
  return { type: 'Feature', geometry: geo, properties };
}
