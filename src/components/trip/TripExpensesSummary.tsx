import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { TripStats } from '@/lib/stats/tripStats';

export function TripExpensesSummary({
  slug,
  stats,
  baseCurrency,
}: {
  tripId: string;
  slug: string;
  stats: TripStats;
  baseCurrency: string;
}) {
  const items: Array<{ label: string; cents: number }> = [
    { label: 'Logement', cents: stats.totals.accommodation_cents },
    { label: 'Avion', cents: stats.totals.plane_cents },
    { label: 'Voiture / autres transports', cents: stats.totals.car_cents },
    { label: 'Activités', cents: stats.totals.activities_cents },
    { label: 'Nourriture', cents: stats.totals.food_cents },
    { label: 'Autres', cents: stats.totals.other_cents },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Total" value={formatCurrency(stats.totals.overall_cents, baseCurrency)} accent />
        <Tile label="Payé" value={formatCurrency(stats.totals.paid_cents, baseCurrency)} />
        <Tile label="Reste à payer" value={formatCurrency(stats.totals.pending_cents, baseCurrency)} />
        <Tile
          label={`Par personne (${stats.members_count})`}
          value={formatCurrency(stats.totals.per_person_cents, baseCurrency)}
        />
      </div>

      <Card className="p-5">
        <h3 className="font-serif text-lg font-semibold">Répartition par catégorie</h3>
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li key={it.label} className="flex items-center justify-between text-sm">
              <span>{it.label}</span>
              <span className="font-medium">{formatCurrency(it.cents, baseCurrency)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/voyages/${slug}/depenses`}>Ouvrir le détail des dépenses</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/api/voyages/${slug}/export/expenses.csv`}>Exporter en CSV</Link>
        </Button>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? 'border-primary/30 bg-primary/5' : ''}`}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-serif text-xl font-semibold">{value}</p>
    </Card>
  );
}
