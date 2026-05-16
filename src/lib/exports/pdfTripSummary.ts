import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface TripSummaryInput {
  title: string;
  status: string;
  dateRange: string;
  countries: string[];
  totalCents: number;
  baseCurrency: string;
  members: string[];
  stops: Array<{ name: string; arrival_date: string | null; departure_date: string | null }>;
}

export async function buildTripSummaryPdf(input: TripSummaryInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ocean = rgb(0.16, 0.35, 0.45);
  const text = rgb(0.1, 0.16, 0.21);
  const muted = rgb(0.45, 0.5, 0.55);

  let y = 800;
  page.drawText('CapNomade', { x: 40, y, font: fontBold, size: 11, color: ocean });
  y -= 22;
  page.drawText(input.title, { x: 40, y, font: fontBold, size: 22, color: text });
  y -= 22;
  page.drawText(`${input.status} · ${input.dateRange}`, { x: 40, y, font, size: 11, color: muted });
  y -= 16;
  page.drawText(`Pays : ${input.countries.join(', ') || '—'}`, { x: 40, y, font, size: 11, color: muted });
  y -= 28;
  page.drawText('Voyageurs', { x: 40, y, font: fontBold, size: 12, color: text });
  y -= 16;
  for (const m of input.members) {
    page.drawText(`• ${m}`, { x: 50, y, font, size: 11, color: text });
    y -= 14;
  }
  y -= 14;
  page.drawText('Étapes', { x: 40, y, font: fontBold, size: 12, color: text });
  y -= 16;
  for (const s of input.stops) {
    page.drawText(
      `• ${s.name}${s.arrival_date ? `  (${s.arrival_date}${s.departure_date ? ` → ${s.departure_date}` : ''})` : ''}`,
      { x: 50, y, font, size: 11, color: text },
    );
    y -= 14;
    if (y < 80) break;
  }
  y -= 10;
  page.drawText(
    `Budget total : ${(input.totalCents / 100).toLocaleString('fr-FR')} ${input.baseCurrency}`,
    { x: 40, y, font: fontBold, size: 12, color: ocean },
  );

  return doc.save();
}
