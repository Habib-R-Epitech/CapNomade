import 'server-only';
import * as XLSX from 'xlsx';
import {
  type ExcelSheetPreview,
  type MappedExpenseRow,
  extractExpenses,
} from './excelWizard';

export type ExpenseType = 'accommodation' | 'transport' | 'activity' | 'food' | 'other';
export type TransportMode = 'plane' | 'car' | 'train' | 'bus' | 'ferry' | 'other';

export interface ExtractedExpense {
  label: string;
  type: ExpenseType;
  amount: number;
  currency: string;
  date: string | null;
  city: string | null;
  source_row: number;
}

export interface ExtractedStop {
  name: string;
  city: string | null;
  country_code: string | null;
  arrival_date: string | null;
  departure_date: string | null;
}

export interface ExtractedTransport {
  mode: TransportMode;
  label: string;
  origin_label: string | null;
  destination_label: string | null;
  depart_date: string | null;
  cost_amount: number | null;
  cost_currency: string | null;
}

export interface ExtractedTripMeta {
  title: string;
  start_date: string | null;
  end_date: string | null;
  base_currency: string;
  primary_countries: string[];
  total_budget_cents: number | null;
}

export interface ExtractedTripData {
  meta: ExtractedTripMeta;
  stops: ExtractedStop[];
  transports: ExtractedTransport[];
  expenses: ExtractedExpense[];
  warnings: string[];
}

const SUPPORTED_CURRENCIES = new Set([
  'EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY', 'HKD',
  'SGD', 'THB', 'IDR', 'MAD', 'TND', 'MXN', 'BRL', 'ZAR', 'INR', 'KRW',
  'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'AED',
]);

export async function extractPastTrip(
  buffer: ArrayBuffer,
  filename: string,
): Promise<ExtractedTripData> {
  const isCsv = /\.csv$/i.test(filename);
  if (isCsv) {
    const text = new TextDecoder('utf-8').decode(buffer);
    return extractFromCsv(text, filename);
  }
  return extractFromXlsx(buffer, filename);
}

function extractFromXlsx(buffer: ArrayBuffer, filename: string): ExtractedTripData {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const warnings: string[] = [];
  const allExpenses: MappedExpenseRow[] = [];

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const rows: Array<Array<string | number | null>> = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
      blankrows: false,
    });
    const preview: ExcelSheetPreview = {
      sheet_name: name,
      rows_preview: rows.slice(0, 25),
      total_rows: rows.length,
      total_cols: rows.reduce((a, r) => Math.max(a, r.length), 0),
      detected_zones: detectExpenseZone(rows),
    };
    if (preview.detected_zones.expenses_header_row != null) {
      allExpenses.push(...extractExpenses(rows, preview.detected_zones));
    }
  }

  if (allExpenses.length === 0) {
    warnings.push('Aucune dépense détectée dans le fichier. Vérifiez les en-têtes (Libellé, Type, Montant, Devise, Date…).');
  }

  return synthesize(allExpenses, filename, warnings);
}

function extractFromCsv(text: string, filename: string): ExtractedTripData {
  const lines = text.split(/\r?\n/);
  const rows: Array<Array<string | number | null>> = lines.map((line) =>
    splitCsvLine(line, detectDelim(text)),
  );
  const zone = detectExpenseZone(rows);
  const warnings: string[] = [];
  if (zone.expenses_header_row == null) {
    return {
      meta: defaultMeta(filename),
      stops: [],
      transports: [],
      expenses: [],
      warnings: ['Aucune ligne d\'en-tête de dépense détectée. Colonnes attendues : Libellé, Type, Montant, Devise, Date, Ville.'],
    };
  }
  const expenses = extractExpenses(rows, zone);
  return synthesize(expenses, filename, warnings);
}

function detectDelim(text: string): ',' | ';' | '\t' {
  const head = text.split('\n').slice(0, 5).join('\n');
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (const c of head) if (c in counts) counts[c as ',' | ';' | '\t']++;
  return (Object.entries(counts) as Array<[',' | ';' | '\t', number]>).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];
}

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === delim) { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const EXPENSE_HEADERS = [
  ['libellé', 'libelle', 'label', 'description', 'item', 'article'],
  ['type', 'catégorie', 'categorie', 'category'],
  ['montant', 'amount', 'prix', 'price', 'cost', 'coût', 'cout'],
  ['devise', 'currency'],
  ['date', 'jour'],
  ['payé', 'paye', 'paid', 'payeur'],
  ['ville', 'city', 'lieu'],
];

function detectExpenseZone(rows: Array<Array<string | number | null>>) {
  let header: number | null = null;
  const map: Record<string, number> = {};
  const keys = ['label', 'type', 'amount', 'currency', 'date', 'paid_by', 'city'];

  for (let r = 0; r < Math.min(rows.length, 500); r++) {
    const row = rows[r] ?? [];
    const lower = row.map((c) => String(c ?? '').trim().toLowerCase());
    const matches = EXPENSE_HEADERS.map((aliases) =>
      lower.findIndex((cell) => aliases.some((a) => cell === a || cell.startsWith(a))),
    );
    const hits = matches.filter((i) => i >= 0).length;
    if (hits >= 3) {
      header = r;
      EXPENSE_HEADERS.forEach((_, i) => {
        if (matches[i]! >= 0) map[keys[i]!] = matches[i]!;
      });
      break;
    }
  }
  return { planning_start_row: null, expenses_header_row: header, expense_column_map: map };
}

function synthesize(
  raw: MappedExpenseRow[],
  filename: string,
  warnings: string[],
): ExtractedTripData {
  const expenses: ExtractedExpense[] = raw.map((r) => ({
    label: r.label,
    type: r.type as ExpenseType,
    amount: r.amount,
    currency: normalizeCurrency(r.currency),
    date: r.date,
    city: r.city,
    source_row: r.row_index,
  }));

  const dates = expenses.map((e) => e.date).filter((d): d is string => !!d).sort();
  const start = dates[0] ?? null;
  const end = dates[dates.length - 1] ?? null;

  const currency = mostCommon(expenses.map((e) => e.currency)) ?? 'EUR';

  const cityCounts = new Map<string, number>();
  for (const e of expenses) {
    if (e.city) cityCounts.set(e.city, (cityCounts.get(e.city) ?? 0) + 1);
  }
  const stops: ExtractedStop[] = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([city]) => ({
      name: city,
      city,
      country_code: null,
      arrival_date: null,
      departure_date: null,
    }));

  const transports: ExtractedTransport[] = expenses
    .filter((e) => e.type === 'transport')
    .map((e) => ({
      mode: guessTransportMode(e.label),
      label: e.label,
      origin_label: parseOrigin(e.label),
      destination_label: parseDestination(e.label),
      depart_date: e.date,
      cost_amount: e.amount,
      cost_currency: e.currency,
    }));

  const totalCents = expenses
    .filter((e) => e.currency === currency)
    .reduce((s, e) => s + Math.round(e.amount * 100), 0);

  const meta: ExtractedTripMeta = {
    title: titleFromFilename(filename),
    start_date: start,
    end_date: end,
    base_currency: currency,
    primary_countries: [],
    total_budget_cents: totalCents > 0 ? totalCents : null,
  };

  return { meta, stops, transports, expenses, warnings };
}

function defaultMeta(filename: string): ExtractedTripMeta {
  return {
    title: titleFromFilename(filename),
    start_date: null,
    end_date: null,
    base_currency: 'EUR',
    primary_countries: [],
    total_budget_cents: null,
  };
}

function titleFromFilename(name: string): string {
  return name
    .replace(/\.(xlsx|xls|csv)$/i, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Voyage importé';
}

function normalizeCurrency(raw: string): string {
  const up = (raw || 'EUR').toUpperCase().slice(0, 3);
  return SUPPORTED_CURRENCIES.has(up) ? up : 'EUR';
}

function mostCommon<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let max = 0;
  for (const [k, v] of counts) {
    if (v > max) { max = v; best = k; }
  }
  return best;
}

function guessTransportMode(label: string): TransportMode {
  const s = label.toLowerCase();
  if (/vol\b|avion|flight|airline|airways|air\s|af\d|easyjet|ryanair|transavia/.test(s)) return 'plane';
  if (/train|sncf|tgv|eurostar|rail/.test(s)) return 'train';
  if (/bus|car\b|coach|flixbus|blablacar/.test(s)) return 'bus';
  if (/ferry|bateau|boat/.test(s)) return 'ferry';
  if (/voiture|taxi|uber|location auto|car rental/.test(s)) return 'car';
  return 'other';
}

function parseOrigin(label: string): string | null {
  const m = label.match(/([A-Za-zÀ-ÿ\s]{3,})\s*(?:→|->|-|>|\bto\b|\ba\b)\s*[A-Za-zÀ-ÿ]{3,}/i);
  return m ? m[1]!.trim() : null;
}

function parseDestination(label: string): string | null {
  const m = label.match(/[A-Za-zÀ-ÿ]{3,}\s*(?:→|->|-|>|\bto\b|\ba\b)\s*([A-Za-zÀ-ÿ\s]{3,})/i);
  return m ? m[1]!.trim() : null;
}
