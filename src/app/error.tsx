'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('App error boundary:', error);
  }, [error]);

  return (
    <main className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="font-serif text-3xl">Quelque chose s&apos;est mal passé</h1>
      <p className="max-w-md text-muted-foreground">
        Une erreur inattendue est survenue. Réessayez, ou contactez le support si elle persiste.
      </p>
      <details className="max-w-2xl rounded-md border bg-muted/30 p-3 text-left text-xs">
        <summary className="cursor-pointer font-medium">Détails techniques</summary>
        <pre className="mt-2 whitespace-pre-wrap break-words">
{error.message || 'Erreur sans message'}
{error.digest ? `\n\ndigest: ${error.digest}` : ''}
        </pre>
      </details>
      <div className="flex gap-3">
        <Button onClick={reset}>Réessayer</Button>
        <Button asChild variant="outline">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </main>
  );
}
