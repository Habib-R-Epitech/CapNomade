import type { Metadata } from 'next';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Nouveau mot de passe — CapNomade',
  description: 'Choisissez un nouveau mot de passe pour votre compte.',
  alternates: { canonical: '/reinitialisation' },
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="container max-w-md py-16">
      <header className="mb-8 space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Nouveau mot de passe
        </p>
        <h1 className="font-serif text-3xl font-semibold">Choisir un nouveau mot de passe</h1>
        <p className="text-sm text-muted-foreground">
          Il doit faire au moins 8 caractères.
        </p>
      </header>
      <ResetPasswordForm />
    </main>
  );
}
