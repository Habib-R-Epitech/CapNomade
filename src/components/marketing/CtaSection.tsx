import Link from 'next/link';
import { SignInButton } from '@/components/auth/SignInButton';
import { Button } from '@/components/ui/button';

export function CtaSection() {
  return (
    <section className="container py-24">
      <div className="relative overflow-hidden rounded-3xl border bg-card px-8 py-16 text-center shadow-elevated md:px-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ocean-100 via-transparent to-coral-100 dark:from-ocean-900/40 dark:to-coral-900/30" />
        <p className="text-sm font-semibold uppercase tracking-widest text-coral-600">Prêt à embarquer ?</p>
        <h2 className="mx-auto mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
          Quel sera le prochain voyage ?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Connectez-vous avec Google, importez votre dernier Excel, et reprenez la main sur vos voyages —
          tout reste privé jusqu&apos;à ce que vous décidiez de partager.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild size="xl">
            <Link href="/inscription">Créer mon compte</Link>
          </Button>
          <SignInButton size="xl" variant="outline" label="Continuer avec Google" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Aucune carte bancaire — vous pouvez vous inscrire avec un email + mot de passe ou via votre compte Google.
        </p>
      </div>
    </section>
  );
}
