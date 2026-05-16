import { SignInButton } from '@/components/auth/SignInButton';

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
        <div className="mt-7 flex justify-center">
          <SignInButton size="xl" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Aucune carte bancaire — votre compte est lié à votre Google Account uniquement.
        </p>
      </div>
    </section>
  );
}
