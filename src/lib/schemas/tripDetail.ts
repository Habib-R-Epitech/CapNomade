import { z } from 'zod';

const UUID = z.string().uuid();
const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const CCY = z.string().regex(/^[A-Z]{3}$/i).transform((s) => s.toUpperCase());

export const expenseFormSchema = z.object({
  id: UUID.optional(),
  trip_id: UUID,
  type: z.enum(['accommodation', 'transport', 'activity', 'food', 'other']),
  label: z.string().min(1).max(200),
  amount_cents: z.number().int().nonnegative(),
  currency: CCY,
  spent_on: ISO_DATE.nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});
export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;

export const transportFormSchema = z.object({
  id: UUID.optional(),
  trip_id: UUID,
  mode: z.enum(['plane', 'car', 'train', 'bus', 'ferry', 'motorcycle', 'other']),
  origin_label: z.string().max(120).nullable().optional(),
  destination_label: z.string().max(120).nullable().optional(),
  depart_at: z.string().nullable().optional(),
  arrive_at: z.string().nullable().optional(),
  carrier: z.string().max(120).nullable().optional(),
  reference: z.string().max(120).nullable().optional(),
  cost_cents: z.number().int().nonnegative().nullable().optional(),
  cost_currency: CCY.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type TransportFormInput = z.infer<typeof transportFormSchema>;

export const stopFormSchema = z.object({
  id: UUID.optional(),
  trip_id: UUID,
  name: z.string().min(1).max(120),
  city: z.string().max(120).nullable().optional(),
  country_code: z.string().length(2).regex(/^[A-Z]{2}$/i).nullable().optional(),
  arrival_date: ISO_DATE.nullable().optional(),
  departure_date: ISO_DATE.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type StopFormInput = z.infer<typeof stopFormSchema>;

export const accommodationFormSchema = z.object({
  id: UUID.optional(),
  trip_id: UUID,
  name: z.string().min(1).max(200),
  kind: z.enum(['hotel', 'airbnb', 'hostel', 'camping', 'friends', 'other']),
  check_in_date: ISO_DATE.nullable().optional(),
  check_out_date: ISO_DATE.nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  booking_url: z.string().url().nullable().optional().or(z.literal('').transform(() => null)),
  cost_cents: z.number().int().nonnegative().nullable().optional(),
  cost_currency: CCY.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type AccommodationFormInput = z.infer<typeof accommodationFormSchema>;

export const activityFormSchema = z.object({
  id: UUID.optional(),
  trip_id: UUID,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  url: z.string().url().nullable().optional().or(z.literal('').transform(() => null)),
  cost_cents: z.number().int().nonnegative().nullable().optional(),
  cost_currency: CCY.nullable().optional(),
});
export type ActivityFormInput = z.infer<typeof activityFormSchema>;

export const dayFormSchema = z.object({
  id: UUID.optional(),
  trip_id: UUID,
  date: ISO_DATE,
  title: z.string().max(120).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type DayFormInput = z.infer<typeof dayFormSchema>;

export const mediaFormSchema = z.object({
  id: UUID.optional(),
  trip_id: UUID,
  kind: z.enum(['youtube', 'drive', 'photo', 'article', 'booking', 'other']),
  url: z.string().url(),
  title: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});
export type MediaFormInput = z.infer<typeof mediaFormSchema>;
