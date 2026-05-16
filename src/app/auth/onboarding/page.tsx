import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { OnboardingForm } from './OnboardingForm';

export const metadata = { robots: { index: false, follow: false } };

export default async function OnboardingPage() {
  const session = await requireSession();
  if (session.profile.onboarding_completed_at) redirect('/dashboard');

  return (
    <main className="container max-w-xl py-16">
      <header className="mb-8 space-y-2">
        <p className="text-sm font-medium text-primary">
          Bienvenue {session.profile.full_name?.split(' ')[0] ?? ''}
        </p>
        <h1 className="text-3xl font-serif">Quelques infos pour commencer</h1>
        <p className="text-muted-foreground">
          Ces préférences peuvent être modifiées à tout moment depuis vos paramètres.
        </p>
      </header>

      <OnboardingForm
        initialName={session.profile.full_name ?? ''}
        initialCurrency={session.profile.default_currency}
      />
    </main>
  );
}
