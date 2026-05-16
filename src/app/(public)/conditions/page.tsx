import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions générales — CapNomade',
  description: "Conditions générales d'utilisation de CapNomade.",
  alternates: { canonical: '/conditions' },
};

export default function TermsPage() {
  return (
    <main className="container py-16">
      <article className="prose prose-slate dark:prose-invert mx-auto max-w-3xl">
        <h1 className="font-serif">Conditions générales d&apos;utilisation</h1>
        <p>Cette page sera complétée lors du lancement public.</p>
      </article>
    </main>
  );
}
