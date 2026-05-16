import { createEvents, type EventAttributes } from 'ics';

export interface IcsEventInput {
  uid: string;
  title: string;
  description?: string;
  starts_at: Date;
  ends_at?: Date;
  location?: string;
  url?: string;
}

/**
 * Build an ICS string from a list of activities / trip days.
 */
export function toIcs(events: IcsEventInput[]): string {
  const attrs: EventAttributes[] = events.map((e) => ({
    uid: e.uid,
    title: e.title,
    description: e.description,
    location: e.location,
    url: e.url,
    productId: 'CapNomade//Trip//FR',
    start: toIcsTuple(e.starts_at),
    end: e.ends_at ? toIcsTuple(e.ends_at) : toIcsTuple(new Date(e.starts_at.getTime() + 60 * 60_000)),
    startInputType: 'utc',
    endInputType: 'utc',
  }));
  const { error, value } = createEvents(attrs);
  if (error) throw error;
  return value ?? '';
}

function toIcsTuple(d: Date): [number, number, number, number, number] {
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()];
}
