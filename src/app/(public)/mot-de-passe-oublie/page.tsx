import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Mot de passe oublié — CapNomade',
  description: 'Recevez un lien pour réinitialiser votre mot de passe.',
  alternates: { canonical: '/mot-de-passe-oublie' },
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <main className="container max-w-md py-16">
      <header className="mb-8 space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Réinitialisation
        </p>
        <h1 className="font-serif text-3xl font-semibold">Mot de passe oublié</h1>
        <p className="text-sm text-muted-foreground">
          Entrez votre email — nous vous enverrons un lien pour choisir un nouveau mot de passe.
        </p>
      </header>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Vous vous en souvenez ?{' '}
        <Link href="/connexion" className="font-medium text-primary hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
