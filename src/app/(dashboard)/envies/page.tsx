import type { Metadata } from 'next';
import { Heart, Plus } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Mes envies', robots: { index: false, follow: false } };

export default async function WishesPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const { data: wishes = [] } = await supabase
    .from('wish_items')
    .select('*')
    .eq('user_id', session.userId)
    .order('priority', { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Inspirations</p>
          <h1 className="font-serif text-3xl font-semibold md:text-4xl">Mes envies de voyages</h1>
        </div>
        <Button>
          <Plus className="size-4" /> Ajouter une envie
        </Button>
      </header>

      {(wishes ?? []).length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Pas encore d'envie enregistrée"
          description="Stockez ici les destinations qui vous attirent : on les retrouvera quand l'envie deviendra projet."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(wishes ?? []).map((w) => (
            <Card key={w.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-lg font-semibold">{w.title}</h3>
                <Badge variant="muted">{w.status}</Badge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {[w.country, w.city].filter(Boolean).join(' · ') || 'Destination à préciser'}
              </div>
              <ul className="mt-3 flex flex-wrap gap-1">
                {w.tags.map((t) => (
                  <li key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    #{t}
                  </li>
                ))}
              </ul>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {w.budget_estimate_cents != null && (
                  <Pair label="Budget" value={formatCurrency(w.budget_estimate_cents)} />
                )}
                {w.duration_days != null && <Pair label="Durée" value={`${w.duration_days} j`} />}
                {w.best_season && <Pair label="Saison" value={w.best_season} />}
                <Pair label="Avec" value={w.company} />
              </dl>
              {w.notes && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{w.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
