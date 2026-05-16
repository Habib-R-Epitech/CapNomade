import Link from 'next/link';
import { Compass } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { ThemeToggle } from '@/components/marketing/ThemeToggle';
import { Button } from '@/components/ui/button';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-8">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4" />
          </span>
          {siteConfig.name}
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-6 text-sm font-medium md:flex">
          {siteConfig.marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/connexion">Se connecter</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/inscription">Créer un compte</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
