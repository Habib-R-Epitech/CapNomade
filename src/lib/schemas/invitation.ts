import { z } from 'zod';

export const inviteRoleSchema = z.enum(['owner', 'editor', 'viewer']);

export const createInvitationSchema = z.object({
  trip_id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  role: inviteRoleSchema.default('viewer'),
  message: z.string().max(500).optional().nullable(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const respondInvitationSchema = z.object({
  token: z.string().min(20),
  action: z.enum(['accept', 'decline']),
});

export type RespondInvitationInput = z.infer<typeof respondInvitationSchema>;
