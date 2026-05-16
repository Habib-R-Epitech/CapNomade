import { z } from 'zod';

export const expenseTypeSchema = z.enum(['accommodation', 'transport', 'activity', 'food', 'other']);
export const expenseSplitMethodSchema = z.enum(['equal', 'custom', 'percentage', 'fixed_amount']);
export const expensePaymentStatusSchema = z.enum(['paid', 'partial', 'unpaid']);

export const createExpenseSchema = z
  .object({
    trip_id: z.string().uuid(),
    type: expenseTypeSchema,
    subtype: z.string().max(60).optional().nullable(),
    label: z.string().min(1).max(160),
    city: z.string().max(120).optional().nullable(),
    amount_cents: z.number().int().nonnegative(),
    currency: z.string().length(3),
    fx_rate: z.number().positive().optional().nullable(),
    amount_base_cents: z.number().int().nonnegative().optional().nullable(),
    spent_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    payment_status: expensePaymentStatusSchema.default('unpaid'),
    split_method: expenseSplitMethodSchema.default('equal'),
    link: z.string().url().optional().nullable(),
    note: z.string().max(2000).optional().nullable(),
    day_id: z.string().uuid().optional().nullable(),
    stop_id: z.string().uuid().optional().nullable(),
    allocations: z
      .array(
        z.object({
          user_id: z.string().uuid(),
          value: z.number().nonnegative().optional(),
        }),
      )
      .min(1),
    payments: z
      .array(
        z.object({
          user_id: z.string().uuid(),
          paid_cents: z.number().int().nonnegative(),
          paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
          method: z.string().max(60).optional().nullable(),
        }),
      )
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.split_method === 'percentage') {
      const sum = data.allocations.reduce((a, m) => a + (m.value ?? 0), 0);
      if (Math.abs(sum - 100) > 0.05) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['allocations'],
          message: `Les pourcentages doivent totaliser 100 (actuel : ${sum})`,
        });
      }
    }
    if (data.split_method === 'fixed_amount') {
      const sum = data.allocations.reduce((a, m) => a + (m.value ?? 0), 0);
      if (sum !== data.amount_cents) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['allocations'],
          message: `La somme des montants fixes doit égaler ${data.amount_cents}`,
        });
      }
    }
  });

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
