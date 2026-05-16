import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { ThemeToggle } from '@/components/marketing/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-8">
        <Link href="/" className="flex items-center" aria-label={siteConfig.name}>
          <Logo size={36} />
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
