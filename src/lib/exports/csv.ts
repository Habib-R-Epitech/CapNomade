/**
 * Build a CSV string from rows of objects. Field set is given by the first row keys.
 */
export function toCsv<T extends Record<string, unknown>>(rows: T[], delimiter = ','): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const out = [headers.map(escapeCell).join(delimiter)];
  for (const row of rows) {
    out.push(headers.map((h) => escapeCell(row[h])).join(delimiter));
  }
  return out.join('\n');
}

function escapeCell(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes(';') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
