import type { Metadata } from 'next';
import { FeaturesGrid } from '@/components/marketing/FeaturesGrid';
import { ProductScreenshots } from '@/components/marketing/ProductScreenshots';
import { CtaSection } from '@/components/marketing/CtaSection';

export const metadata: Metadata = {
  title: 'Fonctionnalités — CapNomade',
  description:
    "Planning, dépenses entre voyageurs, carte interactive, trajets et empreinte carbone, vidéos YouTube, documents, notation post-voyage, statistiques de voyageur — toutes les fonctionnalités de CapNomade.",
  alternates: { canonical: '/fonctionnalites' },
};

export default function FeaturesPage() {
  return (
    <>
      <section className="container pb-6 pt-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Tour complet</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-balance font-serif text-4xl font-semibold leading-tight md:text-5xl">
          Toutes les fonctionnalités, sans concession.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          CapNomade ne s&apos;arrête pas au planning : carte, empreinte carbone, exports, imports
          Excel, notations, envies de voyages — tout est pensé pour ne plus jamais ouvrir un tableur.
        </p>
      </section>
      <FeaturesGrid />
      <ProductScreenshots />
      <CtaSection />
    </>
  );
}
