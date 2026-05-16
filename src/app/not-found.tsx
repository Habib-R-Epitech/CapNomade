import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="font-serif text-4xl">Cette page a pris un détour</h1>
      <p className="max-w-md text-muted-foreground">
        La destination que vous cherchez n&apos;existe pas (ou plus). Reprenons depuis l&apos;accueil.
      </p>
      <Button asChild>
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </main>
  );
}
