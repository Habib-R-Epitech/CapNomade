'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function completeOnboardingAction(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get('full_name') ?? '').trim().slice(0, 120);
  const currency = String(formData.get('default_currency') ?? 'EUR').toUpperCase().slice(0, 3);
  const timezone = String(formData.get('timezone') ?? 'Europe/Paris').slice(0, 64);

  const supabase = await getSupabaseServerClient();
  await supabase
    .from('profiles')
    .update({
      full_name: name || session.profile.full_name,
      default_currency: currency,
      timezone,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', session.userId);

  redirect('/dashboard');
}
