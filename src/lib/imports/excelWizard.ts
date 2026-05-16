import 'server-only';
import * as XLSX from 'xlsx';

export interface ExcelSheetPreview {
  sheet_name: string;
  rows_preview: Array<Array<string | number | null>>;
  total_rows: number;
  total_cols: number;
  detected_zones: {
    /** Lines that look like "Day N", "J1", "Jour 1", etc. */
    planning_start_row: number | null;
    /** Header line of an expenses table (contains "Type" "Montant" "Currency" "Date", etc.). */
    expenses_header_row: number | null;
    /** Columns mapped from the expense header. */
    expense_column_map: Record<string, number>;
  };
}

export function readExcelWorkbook(buffer: ArrayBuffer): {
  sheets: ExcelSheetPreview[];
} {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheets: ExcelSheetPreview[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const data: Array<Array<string | number | null>> = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
      blankrows: false,
    });
    const preview = data.slice(0, 25);
    sheets.push({
      sheet_name: name,
      rows_preview: preview,
      total_rows: data.length,
      total_cols: data.reduce((acc, r) => Math.max(acc, r.length), 0),
      detected_zones: detectZones(data),
    });
  }
  return { sheets };
}

const EXPENSE_HEADERS = [
  ['libellé', 'libelle', 'label', 'description', 'item', 'article'],
  ['type', 'catégorie', 'categorie', 'category'],
  ['montant', 'amount', 'prix', 'price', 'cost', 'coût', 'cout'],
  ['devise', 'currency'],
  ['date', 'jour'],
  ['payé', 'paye', 'paid', 'paye par', 'payeur', 'paye_par'],
  ['ville', 'city', 'lieu'],
];

function detectZones(rows: Array<Array<string | number | null>>) {
  let planningStart: number | null = null;
  let expenseHeader: number | null = null;
  const map: Record<string, number> = {};

  for (let r = 0; r < Math.min(rows.length, 200); r++) {
    const row = rows[r] ?? [];
    const lowerCells = row.map((c) => String(c ?? '').trim().toLowerCase());

    if (planningStart == null) {
      if (lowerCells.some((s) => /^j(our)?\s*\d+|day\s*\d+|jour\s*\d+/i.test(s))) {
        planningStart = r;
      }
    }

    if (expenseHeader == null) {
      const matches = EXPENSE_HEADERS.map((aliases, ix) => {
        const idx = lowerCells.findIndex((cell) => aliases.some((a) => cell === a || cell.startsWith(a)));
        return { ix, idx };
      });
      const hits = matches.filter((m) => m.idx >= 0).length;
      if (hits >= 3) {
        expenseHeader = r;
        EXPENSE_HEADERS.forEach((aliases, ix) => {
          const m = matches[ix]!;
          if (m.idx >= 0) {
            const key = ['label', 'type', 'amount', 'currency', 'date', 'paid_by', 'city'][ix]!;
            map[key] = m.idx;
          }
        });
        break;
      }
    }
  }

  return {
    planning_start_row: planningStart,
    expenses_header_row: expenseHeader,
    expense_column_map: map,
  };
}

export interface MappedExpenseRow {
  label: string;
  type: string;
  amount: number;
  currency: string;
  date: string | null;
  paid_by: string | null;
  city: string | null;
  row_index: number;
}

/**
 * Given a sheet and the detected expenses zone, extract structured rows.
 * The caller is expected to validate them again with Zod before persistence.
 */
export function extractExpenses(
  rows: Array<Array<string | number | null>>,
  zone: ExcelSheetPreview['detected_zones'],
): MappedExpenseRow[] {
  if (zone.expenses_header_row == null) return [];
  const map = zone.expense_column_map;
  const out: MappedExpenseRow[] = [];
  for (let r = zone.expenses_header_row + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    if (row.every((c) => c == null || c === '')) break; // blank line ends the zone

    const labelCell = row[map.label ?? -1];
    const amountCell = row[map.amount ?? -1];
    if (labelCell == null && amountCell == null) continue;

    const amountNumber = Number(String(amountCell ?? '').replace(',', '.').replace(/[^\d.\-]/g, ''));
    if (!Number.isFinite(amountNumber)) continue;

    out.push({
      label: String(labelCell ?? '').trim(),
      type: classifyType(String(row[map.type ?? -1] ?? '')),
      amount: amountNumber,
      currency: String(row[map.currency ?? -1] ?? 'EUR').trim().toUpperCase().slice(0, 3),
      date: parseDate(row[map.date ?? -1]),
      paid_by: row[map.paid_by ?? -1] != null ? String(row[map.paid_by ?? -1]) : null,
      city: row[map.city ?? -1] != null ? String(row[map.city ?? -1]) : null,
      row_index: r,
    });
  }
  return out;
}

function classifyType(raw: string): 'accommodation' | 'transport' | 'activity' | 'food' | 'other' {
  const s = raw.toLowerCase();
  if (/logement|hotel|airbnb|hostel/.test(s)) return 'accommodation';
  if (/vol|avion|train|bus|taxi|voiture|transport|métro/.test(s)) return 'transport';
  if (/activité|activite|visite|excursion|musée|musee|spa|cours/.test(s)) return 'activity';
  if (/repas|nourriture|food|déjeuner|dejeuner|dîner|diner|petit-déj/.test(s)) return 'food';
  return 'other';
}

function parseDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}
