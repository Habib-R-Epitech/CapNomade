import { Card } from '@/components/ui/card';
import type { GlobalStats } from '@/lib/stats/globalStats';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Globe2, Plane, Car, Wallet, Cloudy, Activity, Clock, Users } from 'lucide-react';

export function StatsTiles({ stats }: { stats: GlobalStats }) {
  const tiles = [
    {
      icon: Globe2,
      label: 'Pays visités',
      value: formatNumber(stats.countriesVisited),
    },
    {
      icon: Activity,
      label: 'Voyages réalisés',
      value: formatNumber(stats.tripsCompleted),
    },
    {
      icon: Plane,
      label: 'Heures de vol cumulées',
      value: `${formatNumber(stats.totalFlightHours, 'fr-FR', 1)} h`,
    },
    {
      icon: Plane,
      label: 'Km parcourus en avion',
      value: `${formatNumber(stats.totalFlightKm)} km`,
    },
    {
      icon: Car,
      label: 'Km parcourus en voiture',
      value: `${formatNumber(stats.totalCarKm)} km`,
    },
    {
      icon: Clock,
      label: 'Heures de voiture',
      value: `${formatNumber(stats.totalCarHours, 'fr-FR', 1)} h`,
    },
    {
      icon: Cloudy,
      label: 'Empreinte CO₂ transports',
      value: `${formatNumber(stats.totalCarbonKg)} kg`,
    },
    {
      icon: Wallet,
      label: 'Total dépensé',
      value: formatCurrency(stats.totalSpentCents),
    },
    {
      icon: Wallet,
      label: 'Moyenne par voyage',
      value: formatCurrency(stats.averageTripSpendCents),
    },
    {
      icon: Wallet,
      label: 'Moyenne par jour',
      value: formatCurrency(stats.averageDailyCents),
    },
    {
      icon: Users,
      label: 'Moyenne par personne',
      value: formatCurrency(stats.averagePerPersonCents),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <t.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs uppercase tracking-wider text-muted-foreground">{t.label}</p>
              <p className="mt-0.5 font-serif text-lg font-semibold">{t.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
