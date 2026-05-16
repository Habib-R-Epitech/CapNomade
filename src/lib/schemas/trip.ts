import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const tripStatusSchema = z.enum(['draft', 'planning', 'booked', 'completed', 'archived']);
export const tripVisibilitySchema = z.enum(['private', 'members', 'public']);

export const createTripSchema = z.object({
  title: z.string().min(2, 'Au moins 2 caractères').max(120),
  description: z.string().max(2000).optional().nullable(),
  status: tripStatusSchema.default('planning'),
  visibility: tripVisibilitySchema.default('private'),
  start_date: z.string().regex(ISO_DATE).optional().nullable(),
  end_date: z.string().regex(ISO_DATE).optional().nullable(),
  primary_countries: z.array(z.string().length(2).regex(/^[A-Z]{2}$/i)).max(20).default([]),
  base_currency: z.string().length(3).default('EUR'),
  total_budget_cents: z.number().int().nonnegative().optional().nullable(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;

export const updateTripSchema = createTripSchema.partial().extend({
  id: z.string().uuid(),
});

export const reviewSchema = z.object({
  trip_id: z.string().uuid(),
  overall: z.number().min(0).max(10),
  accommodation: z.number().min(0).max(10).optional().nullable(),
  transport: z.number().min(0).max(10).optional().nullable(),
  activities_score: z.number().min(0).max(10).optional().nullable(),
  value_for_money: z.number().min(0).max(10).optional().nullable(),
  pace: z.number().min(0).max(10).optional().nullable(),
  destination: z.number().min(0).max(10).optional().nullable(),
  would_return_score: z.number().min(0).max(10).optional().nullable(),
  comment: z.string().max(4000).optional().nullable(),
  feeling_tags: z.array(z.string().min(1).max(40)).max(12).default([]),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
