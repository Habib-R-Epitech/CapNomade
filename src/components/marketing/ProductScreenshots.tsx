import { CalendarDays, Wallet, MapPinned, Star } from 'lucide-react';

export function ProductScreenshots() {
  return (
    <section className="bg-muted/30 py-24">
      <div className="container space-y-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Aperçu</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Le carnet, en quatre vues</h2>
          <p className="mt-3 text-muted-foreground">
            Pensé pour rester lisible quel que soit le détail du voyage.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Mock title="Planning jour par jour" icon={CalendarDays}>
            <div className="space-y-2">
              {[
                { d: 'J1 · Tokyo', i: 'Shibuya, dîner Yakitori' },
                { d: 'J2 · Tokyo', i: 'Meiji-Jingu, Harajuku' },
                { d: 'J3 · Tokyo → Hakone', i: 'Shinkansen 09:23, ryokan' },
                { d: 'J4 · Hakone', i: 'Mont Fuji & onsen' },
              ].map((row) => (
                <div key={row.d} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                  <span className="font-medium text-muted-foreground">{row.d}</span>
                  <span className="truncate pl-3 text-right">{row.i}</span>
                </div>
              ))}
            </div>
          </Mock>

          <Mock title="Dépenses partagées" icon={Wallet}>
            <ul className="space-y-2 text-sm">
              {[
                { l: 'Vol Paris ↔ Tokyo (x4)', s: 'Payé · réparti à 4', a: '3 200 €' },
                { l: 'Ryokan Hakone (2 nuits)', s: 'Camille a avancé', a: '480 €' },
                { l: 'Dîners cumulés Tokyo', s: 'Réparti par %', a: '215 €' },
                { l: 'Train pass JR', s: '4 passes 7j', a: '1 100 €' },
              ].map((e) => (
                <li key={e.l} className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.l}</p>
                    <p className="text-xs text-muted-foreground">{e.s}</p>
                  </div>
                  <span className="shrink-0 font-medium">{e.a}</span>
                </li>
              ))}
            </ul>
          </Mock>

          <Mock title="Carte interactive" icon={MapPinned}>
            <div className="relative h-44 overflow-hidden rounded-md border bg-gradient-to-br from-ocean-100 via-sand-100 to-lagoon-100 dark:from-ocean-900 dark:via-ocean-800 dark:to-lagoon-900">
              <Dot top="20%" left="35%" />
              <Dot top="42%" left="58%" />
              <Dot top="58%" left="48%" />
              <Dot top="70%" left="65%" />
              <svg className="absolute inset-0 size-full" viewBox="0 0 100 60" preserveAspectRatio="none">
                <path d="M35 20 L58 42 L48 58 L65 70" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="2 2" />
              </svg>
            </div>
          </Mock>

          <Mock title="Notation post-voyage" icon={Star}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { l: 'Global', v: 9.2 },
                { l: 'Logement', v: 8.7 },
                { l: 'Transport', v: 7.5 },
                { l: 'Activités', v: 9.5 },
                { l: 'Budget', v: 7.8 },
                { l: 'Rythme', v: 8.4 },
              ].map((s) => (
                <div key={s.l} className="rounded-md border bg-background px-3 py-2">
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                  <p className="mt-0.5 font-serif text-lg font-semibold">{s.v.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </Mock>
        </div>
      </div>
    </section>
  );
}

function Mock({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border bg-card p-6 shadow-soft">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <h3 className="font-serif text-base font-semibold">{title}</h3>
      </header>
      {children}
    </article>
  );
}

function Dot({ top, left }: { top: string; left: string }) {
  return (
    <span
      className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-coral-500 shadow-soft"
      style={{ top, left }}
    />
  );
}
