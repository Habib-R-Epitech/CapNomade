'use client';

import { CalendarDays, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface Day {
  id: string;
  date: string;
  title: string | null;
  notes: string | null;
}
interface Activity {
  id: string;
  title: string;
  day_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  category: string | null;
  cost_cents: number | null;
  cost_currency: string | null;
}

export function TripPlanning({
  days,
  activities,
  canEdit: _canEdit,
}: {
  tripId: string;
  days: Day[];
  activities: Activity[];
  canEdit: boolean;
}) {
  if (days.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CalendarDays className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 font-medium">Pas encore de jour planifié</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajoutez des dates au voyage et le planning se construira jour par jour.
        </p>
      </Card>
    );
  }
  return (
    <ol className="relative space-y-4 border-l border-dashed pl-6">
      {days.map((d) => {
        const dayActivities = activities.filter((a) => a.day_id === d.id);
        return (
          <li key={d.id} className="relative">
            <span className="absolute -left-[1.85rem] mt-1.5 inline-flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-[0.6rem] font-semibold text-primary-foreground">
              {new Date(d.date).getDate()}
            </span>
            <Card className="p-4">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {new Date(d.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  {d.title && <h3 className="font-serif text-lg font-semibold">{d.title}</h3>}
                </div>
                {dayActivities.length > 0 && (
                  <Badge variant="muted">
                    {dayActivities.length} activité{dayActivities.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </header>
              {d.notes && <p className="mt-2 text-sm text-muted-foreground">{d.notes}</p>}
              {dayActivities.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {dayActivities.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.starts_at && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(a.starts_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          {a.category && <span className="ml-2">{a.category}</span>}
                        </p>
                      </div>
                      {a.cost_cents != null && (
                        <span className="shrink-0 text-sm font-medium">
                          {formatCurrency(a.cost_cents, a.cost_currency ?? 'EUR')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
