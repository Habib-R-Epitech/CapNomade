'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/server/actions/trips';

const schema = z.object({
  full_name: z.string().min(2).max(120),
  default_currency: z.string().length(3),
  timezone: z.string().min(2).max(64),
});

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Validation' };
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      default_currency: parsed.data.default_currency.toUpperCase(),
      timezone: parsed.data.timezone,
    })
    .eq('id', session.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/parametres');
  revalidatePath('/dashboard');
  return { ok: true };
}
