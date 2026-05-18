import { NextResponse } from 'next/server';

// Natural Earth 110m countries — small enough to ship, large enough to matter.
// We proxy a single source and aggressively cache so every map component on
// every page shares one immutable copy.
const SOURCE =
  'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/cultural/ne_110m_admin_0_countries.json';

// Tell the Next data cache to hold this for a full day server-side.
export const revalidate = 86400;

export async function GET() {
  const upstream = await fetch(SOURCE, { next: { revalidate } });
  if (!upstream.ok) {
    return new NextResponse(JSON.stringify({ type: 'FeatureCollection', features: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  const body = await upstream.text();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'application/json',
      // Browser + intermediary CDN cache for 30 days; the dataset is effectively static.
      'cache-control': 'public, max-age=2592000, s-maxage=2592000, immutable',
    },
  });
}
