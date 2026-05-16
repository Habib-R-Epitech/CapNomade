import { describe, expect, it } from 'vitest';
import { parseGeoJson } from '@/lib/imports/geojson';
import { parseCsv } from '@/lib/imports/csv';
import { parseKml } from '@/lib/imports/kml';
import { parseGpx } from '@/lib/imports/gpx';

describe('parseGeoJson', () => {
  it('returns features from a FeatureCollection', () => {
    const r = parseGeoJson({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2.35, 48.86] },
          properties: { name: 'Paris' },
        },
      ],
    });
    expect(r.features.length).toBe(1);
    expect(r.features[0]!.feature_type).toBe('point');
    expect(r.features[0]!.label).toBe('Paris');
  });

  it('warns on unsupported Multi geometries', () => {
    const r = parseGeoJson({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[1, 2]] }, properties: {} },
      ],
    });
    expect(r.features.length).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('parseCsv', () => {
  it('auto-detects delimiter and lat/lng columns', () => {
    const csv = 'name,lat,lng\nTokyo,35.6895,139.6917\nKyoto,35.0116,135.7681';
    const r = parseCsv(csv);
    expect(r.features.length).toBe(2);
    expect(r.features[0]!.label).toBe('Tokyo');
  });

  it('reports invalid rows', () => {
    const csv = 'name;lat;lng\nA;abc;def';
    const r = parseCsv(csv);
    expect(r.features.length).toBe(0);
    expect(r.warnings.length).toBe(1);
  });
});

describe('parseKml', () => {
  it('parses a single Point Placemark', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Tour Eiffel</name>
      <Point><coordinates>2.2945,48.8584,0</coordinates></Point>
    </Placemark>
  </Document>
</kml>`;
    const r = await parseKml(xml);
    expect(r.features.length).toBe(1);
    expect(r.features[0]!.label).toBe('Tour Eiffel');
    expect(r.features[0]!.geometry.type).toBe('Point');
  });
});

describe('parseGpx', () => {
  it('parses a track and a waypoint', async () => {
    const xml = `<?xml version="1.0"?>
<gpx version="1.1">
  <wpt lat="35.6895" lon="139.6917"><name>Tokyo</name></wpt>
  <trk><name>Random</name><trkseg>
    <trkpt lat="35.0116" lon="135.7681"/>
    <trkpt lat="35.6895" lon="139.6917"/>
  </trkseg></trk>
</gpx>`;
    const r = await parseGpx(xml);
    expect(r.features.some((f) => f.feature_type === 'point')).toBe(true);
    expect(r.features.some((f) => f.feature_type === 'line')).toBe(true);
  });
});
