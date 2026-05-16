import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { OnboardingForm } from './OnboardingForm';

export const metadata = { robots: { index: false, follow: false } };

export default async function OnboardingPage() {
  const session = await requireSession();
  if (session.profile.onboarding_completed_at) redirect('/dashboard');

  return (
    <main className="container max-w-xl py-16">
      <header className="mb-8 space-y-2">
        <p className="text-sm font-medium text-primary">Bienvenue {session.profile.full_name?.split(' ')[0] ?? ''}</p>
        <h1 className="text-3xl font-serif">Quelques infos pour commencer</h1>
        <p className="text-muted-foreground">
          Ces préférences peuvent être modifiées à tout moment depuis vos paramètres.
        </p>
      </header>

      <OnboardingForm initialName={session.profile.full_name ?? ''} initialCurrency={session.profile.default_currency} />
    </main>
  );
}

export async function completeOnboardingAction(formData: FormData) {
  'use server';
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
