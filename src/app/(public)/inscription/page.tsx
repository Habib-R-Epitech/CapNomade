import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { SignUpForm } from './SignUpForm';

export const metadata: Metadata = {
  title: 'Créer un compte — CapNomade',
  description: 'Inscrivez-vous gratuitement à CapNomade pour planifier vos voyages.',
  alternates: { canonical: '/inscription' },
  robots: { index: false, follow: true },
};

export default async function InscriptionPage() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  return (
    <main className="container max-w-md py-16">
      <header className="mb-8 space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">Bienvenue</p>
        <h1 className="font-serif text-3xl font-semibold">Créer un compte</h1>
        <p className="text-sm text-muted-foreground">
          Gratuit. Aucune carte bancaire requise. Privé par défaut.
        </p>
      </header>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà un compte ?{' '}
        <Link href="/connexion" className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        En créant un compte, vous acceptez nos{' '}
        <Link href="/conditions" className="underline">conditions</Link> et notre{' '}
        <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.
      </p>
    </main>
  );
}
