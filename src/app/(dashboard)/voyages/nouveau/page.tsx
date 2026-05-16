import type { Metadata } from 'next';
import { NewTripForm } from './NewTripForm';

export const metadata: Metadata = { title: 'Nouveau voyage', robots: { index: false, follow: false } };

export default function NewTripPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Nouveau projet</p>
        <h1 className="font-serif text-3xl font-semibold">Démarrer un voyage</h1>
        <p className="text-sm text-muted-foreground">
          Commencez par le minimum : un titre, une période, une destination. Vous pourrez tout enrichir ensuite.
        </p>
      </header>
      <NewTripForm />
    </div>
  );
}
