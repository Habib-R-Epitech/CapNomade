import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { SignInForm } from './SignInForm';

export const metadata: Metadata = {
  title: 'Se connecter — CapNomade',
  description: 'Connectez-vous à votre compte CapNomade pour retrouver vos voyages.',
  alternates: { canonical: '/connexion' },
  robots: { index: false, follow: true },
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await getSession();
  if (session) redirect('/dashboard');
  const { redirect: redirectTo } = await searchParams;

  return (
    <main className="container max-w-md py-16">
      <header className="mb-8 space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">Bon retour</p>
        <h1 className="font-serif text-3xl font-semibold">Se connecter</h1>
        <p className="text-sm text-muted-foreground">
          Continuez vos voyages là où vous les avez laissés.
        </p>
      </header>
      <SignInForm redirectTo={redirectTo} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link href="/inscription" className="font-medium text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
    </main>
  );
}
