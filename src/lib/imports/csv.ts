import type { ImportResult, UnifiedFeature } from './types';

export interface CsvImportOptions {
  latColumn?: string;
  lngColumn?: string;
  labelColumn?: string;
  delimiter?: ',' | ';' | '\t';
}

/**
 * Minimal CSV parser. Supports quoted fields with doubled quotes for escaping.
 * No external dependency.
 */
export function parseCsv(content: string, options: CsvImportOptions = {}): ImportResult {
  const delimiter = options.delimiter ?? detectDelimiter(content);
  const rows = csvRows(content, delimiter);
  const warnings: string[] = [];
  if (rows.length < 2) return { features: [], warnings: ['CSV vide.'], source_format: 'csv' };

  const header = rows[0]!;
  const latColumn = options.latColumn ?? findColumn(header, ['lat', 'latitude', 'y']);
  const lngColumn = options.lngColumn ?? findColumn(header, ['lng', 'lon', 'longitude', 'x']);
  const labelColumn = options.labelColumn ?? findColumn(header, ['name', 'nom', 'label', 'titre']);

  if (!latColumn || !lngColumn) {
    return {
      features: [],
      warnings: ['Impossible de détecter les colonnes lat/lng — précisez le mapping.'],
      source_format: 'csv',
    };
  }
  const latIndex = header.indexOf(latColumn);
  const lngIndex = header.indexOf(lngColumn);
  const labelIndex = labelColumn ? header.indexOf(labelColumn) : -1;

  const features: UnifiedFeature[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const lat = Number(row[latIndex]?.replace(',', '.'));
    const lng = Number(row[lngIndex]?.replace(',', '.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      warnings.push(`Ligne ${i + 1} ignorée (lat/lng invalide).`);
      continue;
    }
    const properties: Record<string, unknown> = {};
    header.forEach((h, idx) => {
      if (idx === latIndex || idx === lngIndex) return;
      properties[h] = row[idx];
    });
    features.push({
      feature_type: 'point',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      label: (labelIndex >= 0 ? row[labelIndex] : null) ?? null,
      properties,
    });
  }
  return { features, warnings, source_format: 'csv' };
}

function detectDelimiter(content: string): ',' | ';' | '\t' {
  const sample = content.split('\n').slice(0, 5).join('\n');
  const counts = { ',': 0, ';': 0, '\t': 0 } as Record<',' | ';' | '\t', number>;
  for (const ch of sample) {
    if (ch === ',' || ch === ';' || ch === '\t') counts[ch as ',' | ';' | '\t'] += 1;
  }
  const max = (Object.entries(counts) as Array<[',' | ';' | '\t', number]>).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  );
  return max[0];
}

function findColumn(header: string[], candidates: string[]): string | undefined {
  const lower = header.map((h) => h.trim().toLowerCase());
  for (const cand of candidates) {
    const i = lower.indexOf(cand);
    if (i >= 0) return header[i];
  }
  return undefined;
}

function csvRows(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delimiter) {
        row.push(cell);
        cell = '';
      } else if (c === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else if (c === '\r') {
        // ignore
      } else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
