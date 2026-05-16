import { Sparkles, MapPinned, Wallet, Users } from 'lucide-react';
import { SignInButton } from '@/components/auth/SignInButton';
import { Badge } from '@/components/ui/badge';

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden gradient-hero">
      <div className="container relative z-10 grid items-center gap-16 py-24 lg:grid-cols-[1.05fr_1fr] lg:py-32">
        <div className="space-y-7 text-balance">
          <Badge variant="muted" className="w-fit">
            <Sparkles className="size-3" />
            Conçu pour les voyageurs qui détestent le tableur
          </Badge>
          <h1 className="font-serif text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Vos voyages, planifiés à plusieurs, sans le chaos d&apos;Excel.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            CapNomade centralise votre planning jour par jour, vos dépenses détaillées entre voyageurs,
            vos trajets, vos cartes, vos documents et vos notes post-voyage. Un seul carnet, partagé
            avec les bonnes personnes — privé par défaut.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <SignInButton size="xl" />
            <a
              href="#fonctionnalites"
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Voir les fonctionnalités →
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Wallet className="size-4" /> Budget par voyageur</li>
            <li className="flex items-center gap-2"><MapPinned className="size-4" /> Carte interactive</li>
            <li className="flex items-center gap-2"><Users className="size-4" /> Partage par invitation</li>
          </ul>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-ocean-200/40 via-coral-200/30 to-lagoon-200/40 blur-2xl" />
      <div className="rounded-3xl border bg-card/95 p-6 shadow-elevated backdrop-blur">
        <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
          <span>Voyage en cours</span>
          <span className="rounded-full bg-lagoon-500/15 px-2 py-0.5 font-medium text-lagoon-700 dark:text-lagoon-300">Planning</span>
        </div>
        <h3 className="mt-4 font-serif text-2xl font-semibold">Japon — Cerisiers 2026</h3>
        <p className="mt-1 text-sm text-muted-foreground">02 — 22 avril · 4 voyageurs</p>

        <dl className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Étapes" value="4" />
          <Stat label="Budget" value="6 000 €" />
          <Stat label="CO₂" value="1.6 t" />
        </dl>

        <div className="mt-6 space-y-2.5">
          <Row title="Vol Paris → Tokyo" detail="Air France · 11h45 · 9 710 km" tag="Réservé" tone="success" />
          <Row title="Tokyo · Quartier de Shibuya" detail="J1 · découverte du quartier, Shibuya Sky" tag="J1" />
          <Row title="Shinkansen Tokyo → Kyoto" detail="2h13 · Nozomi 215" tag="J8" />
          <Row title="Dîner Hashida Sushi" detail="Tokyo · 180 € pour 4" tag="Repas" tone="warning" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/60 px-3 py-2.5">
      <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-serif text-lg font-semibold">{value}</div>
    </div>
  );
}

function Row({
  title,
  detail,
  tag,
  tone = 'muted',
}: {
  title: string;
  detail: string;
  tag: string;
  tone?: 'muted' | 'success' | 'warning';
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]'
      : tone === 'warning'
        ? 'bg-[hsl(var(--warning)/0.16)] text-[hsl(var(--warning))]'
        : 'bg-muted text-muted-foreground';
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background/60 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{tag}</span>
    </div>
  );
}
